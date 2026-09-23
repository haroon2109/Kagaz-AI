import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, Base
from app.api import deps
from app.api.v1 import api_router
from app.core.middleware import SecurityHeaderMiddleware
from app.core.rate_limit import global_rate_limiter
from app.core.security import verify_local_jwt
from app.models.worksheet import Worksheet
from app.services.ai_provider import ai_provider

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure writable data directory exists BEFORE the engine is used — the
    # SQLite file lives here (derived from DATABASE_URL) on Render/VPS deploys.
    os.makedirs(settings.DATA_DIR, exist_ok=True)

    # Initialize database tables
    Base.metadata.create_all(bind=engine)

    # Add learning-loop columns to pre-existing tables (idempotent)
    from app.core.migrations import run_migrations
    try:
        run_migrations()
    except Exception as mig_err:
        logger.warning(f"[Startup] Schema migration skipped: {mig_err}")

    # Ensure local uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Validate production secrets — refuse to boot insecurely in production
    if settings.ENV_MODE.lower() in ("production", "prod"):
        weak_key = (
            not settings.SECRET_KEY
            or len(settings.SECRET_KEY) < 32
            or settings.SECRET_KEY.startswith(("dev_only", "CHANGE_ME", "change_me"))
        )
        if weak_key:
            raise RuntimeError(
                "Refusing to start in production: SECRET_KEY is missing or weak. "
                "Generate one with: openssl rand -hex 32"
            )
        if settings.ALLOWED_ORIGINS == ["*"]:
            raise RuntimeError(
                "Refusing to start in production: ALLOWED_ORIGINS must list explicit "
                "origins instead of '*'."
            )
    else:
        if settings.SECRET_KEY.startswith(("dev_only", "CHANGE_ME", "change_me")):
            logger.warning(
                "[SECURITY] Running with the default development SECRET_KEY — "
                "set a real one (openssl rand -hex 32) before any real deployment."
            )

    yield

# Instantiate application with global rate limiting dependency
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    dependencies=[Depends(global_rate_limiter)],
    lifespan=lifespan
)

# Register secure header injection and error-logging middleware
app.add_middleware(SecurityHeaderMiddleware)

# CORS configurations using ALLOWED_ORIGINS from settings instead of wildcard * with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include main router mapping to API endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)


# ── Auth-protected worksheet image serving ───────────────────────────────────
# Uploaded scans contain student PII, so they are NOT served as public static
# files. Every request must carry a valid JWT — via the Authorization header
# (fetch/xhr) or a ?token= query param (<img> tags cannot send headers; same
# pattern as the SSE stream endpoint) — and the requesting teacher must own a
# worksheet that references the file.
@app.get("/uploads/{filename}")
def serve_worksheet_upload(
    filename: str,
    request: Request,
    token: str = Query(default=None),
    db: Session = Depends(deps.get_db),
):
    raw_token = token
    if not raw_token:
        auth_header = request.headers.get("Authorization") or ""
        if auth_header.startswith("Bearer "):
            raw_token = auth_header[len("Bearer "):].strip()
    if not raw_token:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    payload = verify_local_jwt(raw_token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    teacher_id = payload["sub"]

    # Path-traversal guard: only a bare filename inside UPLOAD_DIR is ever served
    safe_name = os.path.basename(filename)
    if safe_name != filename or safe_name in ("", ".", ".."):
        raise HTTPException(status_code=404, detail="Not found")
    upload_root = os.path.abspath(settings.UPLOAD_DIR)
    file_path = os.path.abspath(os.path.join(upload_root, safe_name))
    local_ok = os.path.dirname(file_path) == upload_root and os.path.isfile(file_path)

    # Ownership check — 404 (not 403) so unknown paths can't be probed for existence
    owns = (
        db.query(Worksheet.id)
        .filter(
            Worksheet.teacher_id == teacher_id,
            Worksheet.image_url == f"/uploads/{safe_name}",
        )
        .first()
    )
    if not owns:
        raise HTTPException(status_code=404, detail="Not found")

    if local_ok:
        return FileResponse(file_path)

    # Local file is gone (ephemeral-disk restart/redeploy) — fall back to the
    # R2 mirror. Rehydrate the local cache first so later requests (and the
    # OCR pipeline) read from disk; otherwise stream directly from R2.
    from app.services import r2
    if r2.configured():
        if r2.download_to(safe_name, file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        stream = r2.open_stream(safe_name)
        if stream is not None:
            body, content_type = stream
            from fastapi.responses import StreamingResponse
            return StreamingResponse(body, media_type=content_type)

    raise HTTPException(status_code=404, detail="Not found")


@app.get("/health")
def health_check():
    """Liveness + AI engine transparency (which engines are configured/reachable,
    which models, and which engine answered the last AI call)."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ai_engines": {
            "priority_order": ["gemini", "frontier", "ollama", "groq"],
            "gemini": {
                "configured": ai_provider.gemini_ready,
                "vision_model": settings.GEMINI_VISION_MODEL,
                "text_model": settings.GEMINI_TEXT_MODEL,
            },
            "frontier": {
                "configured": ai_provider.frontier_ready,
                "vision_model": settings.OPENAI_VISION_MODEL,
                "text_model": settings.OPENAI_TEXT_MODEL,
            },
            "ollama": {
                "reachable": ai_provider.check_ollama(),
                "vision_model": settings.OLLAMA_VISION_MODEL,
                "text_model": settings.OLLAMA_TEXT_MODEL,
            },
            "groq": {
                "configured": bool(settings.GROQ_API_KEY),
                "model": settings.GROQ_MODEL,
            },
        },
        "last_engine_used": ai_provider.last_engine,
    }
