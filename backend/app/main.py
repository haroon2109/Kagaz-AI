from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import api_router
from app.core.middleware import SecurityHeaderMiddleware
from app.core.rate_limit import global_rate_limiter

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Ensure local uploads directory exists
os.makedirs("uploads", exist_ok=True)

# Instantiate application with global rate limiting dependency
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    dependencies=[Depends(global_rate_limiter)]
)

# Register secure header injection and error-logging middleware
app.add_middleware(SecurityHeaderMiddleware)

# Serve upload folder statically
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include main router mapping to API endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def check_production_secrets():
    """
    Validates that authenticating secrets are set securely if mode is production.
    Blocks startup if default mock secrets are detected.
    """
    if settings.ENV_MODE == "production":
        is_mock_secret = settings.SUPABASE_JWT_SECRET == "mock-supabase-jwt-secret-for-local-testing-purposes-only-1234567"
        if not settings.SUPABASE_JWKS_URL and is_mock_secret:
            logging.error(
                "CRITICAL SECURITY CONFIGURATION ERROR: "
                "The application is configured in PRODUCTION mode, but using default mock credentials. "
                "Terminating startup to prevent token authentication bypass."
            )
            raise RuntimeError(
                "Insecure credentials in production mode. "
                "Provide a valid SUPABASE_JWKS_URL or SUPABASE_JWT_SECRET."
            )

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }
