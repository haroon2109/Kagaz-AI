import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = "Kagaz AI Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENV_MODE: str = os.getenv("ENV_MODE", "development")

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///kagaz_ai_dev.db")
    
    # Supabase Auth configuration
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "mock-supabase-jwt-secret-for-local-testing-purposes-only-1234567")
    SUPABASE_JWKS_URL: str = os.getenv("SUPABASE_JWKS_URL", "")
    JWT_ALGORITHM: str = "HS256"

    # Llama LLM Service configuration
    LLAMA_API_BASE: str = os.getenv("LLAMA_API_BASE", "https://api.groq.com/openai/v1")
    LLAMA_API_KEY: str = os.getenv("LLAMA_API_KEY", "")
    LLAMA_MODEL: str = os.getenv("LLAMA_MODEL", "llama3-8b-8192")

    # Google Gemini API configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # Centralized directory configuration
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    
    # Development auth credentials stub config
    DEV_PASSWORD: str = os.getenv("DEV_PASSWORD", "kagaz-dev-pass-2026")
    
    # Concurrency and scale: Celery distribution toggle
    USE_CELERY: bool = os.getenv("USE_CELERY", "false").lower() == "true"
    
    # CORS Configuration
    _origins = os.getenv("ALLOWED_ORIGINS", "")
    if _origins:
        ALLOWED_ORIGINS: list = [origin.strip() for origin in _origins.split(",") if origin.strip()]
    else:
        ALLOWED_ORIGINS: list = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000"
        ]

settings = Settings()

