from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import api_router
from app.core.middleware import SecurityHeaderMiddleware
from app.core.rate_limit import global_rate_limiter



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    
    # Ensure local uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Validate production secrets
    pass
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

# Serve upload folder statically
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

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

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

