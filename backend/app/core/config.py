import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = "Kagaz AI Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENV_MODE: str = os.getenv("ENV_MODE", "development")

    # ─── Database ────────────────────────────────────────────────────────────
    # Free self-hosted stack: SQLite by default (zero config), Postgres optional.
    # On Render's free tier the disk is ephemeral — point DATABASE_URL at a
    # persistent path (e.g. a Render Disk mounted at /var/data) or a managed
    # Postgres URL, or data will be wiped on every deploy/restart.
    _db_url = os.getenv("DATABASE_URL", "sqlite:///kagaz_ai.db")
    # Support Render/Heroku-style URLs: postgres:// → postgresql://
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)
    DATABASE_URL: str = _db_url

    # Directory that must exist and be writable for the SQLite file / uploads.
    # Derive it from DATABASE_URL so a plain sqlite:///data/kagaz_ai.db works
    # without extra env vars; falls back to CWD otherwise. Set DATA_DIR
    # explicitly (e.g. /var/data on a Render Disk) to pin the location.
    _explicit_data_dir = os.getenv("DATA_DIR", "")
    if _explicit_data_dir:
        DATA_DIR: str = os.path.abspath(_explicit_data_dir)
    elif DATABASE_URL.startswith("sqlite:"):
        # Both "sqlite:///relative.db" and "sqlite:////abs/path.db" strip to a
        # usable path after removing the scheme+3 slashes.
        _sqlite_path = DATABASE_URL.replace("sqlite:///", "", 1)
        DATA_DIR = os.path.dirname(os.path.abspath(_sqlite_path)) or os.getcwd()
    else:
        DATA_DIR = os.getcwd()

    # ─── Auth (fully local, no SaaS) ─────────────────────────────────────────
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "CHANGE_ME_dev_secret_run_openssl_rand_hex_32_to_generate"
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_DAYS: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))

    # ─── AI engines (free & open source) ─────────────────────────────────────
    # Primary: Ollama — fully local, open weights, offline-capable, zero cost.
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    # Vision model for worksheet OCR (multimodal). Pull with:
    #   ollama pull qwen2.5vl:7b     (recommended balance of speed/accuracy)
    OLLAMA_VISION_MODEL: str = os.getenv("OLLAMA_VISION_MODEL", "qwen2.5vl:7b")
    # Smaller/faster text model for grading analysis. Pull with:
    #   ollama pull qwen2.5:3b
    OLLAMA_TEXT_MODEL: str = os.getenv("OLLAMA_TEXT_MODEL", "qwen2.5:3b")
    # Optional local embedding model for semantic similarity. Pull with:
    #   ollama pull nomic-embed-text
    OLLAMA_EMBED_MODEL: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

    # Fallback: Groq free tier (optional, get a free key at groq.com/keys)
    GROQ_API_BASE: str = os.getenv("GROQ_API_BASE", "https://api.groq.com/openai/v1")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

    # Frontier models (optional, highest priority when configured). Any
    # OpenAI-compatible endpoint works: OpenAI, OpenRouter, Google Gemini's
    # OpenAI-compatible endpoint, Together, DeepSeek, etc. When a key is
    # present, frontier models handle OCR + analysis for maximum accuracy,
    # with local Ollama / Groq as automatic fallbacks.
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_API_BASE: str = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
    OPENAI_VISION_MODEL: str = os.getenv("OPENAI_VISION_MODEL", "gpt-4o")
    OPENAI_TEXT_MODEL: str = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")

    # Native Gemini (Google AI) — first-class integration using the
    # generativelanguage REST API with structured output (responseSchema).
    # Get a free key at https://aistudio.google.com/apikey
    # Takes priority over OPENAI_* / Ollama when set.
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_API_BASE: str = os.getenv(
        "GEMINI_API_BASE", "https://generativelanguage.googleapis.com/v1beta"
    )
    GEMINI_VISION_MODEL: str = os.getenv("GEMINI_VISION_MODEL", "gemini-2.0-flash")
    GEMINI_TEXT_MODEL: str = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.0-flash")

    # Request budgets (local models on CPU can be slow — be generous)
    AI_TIMEOUT_SECONDS: int = int(os.getenv("AI_TIMEOUT_SECONDS", "180"))
    AI_VISION_TIMEOUT_SECONDS: int = int(os.getenv("AI_VISION_TIMEOUT_SECONDS", "600"))

    # Max long-edge size (px) for images sent to the vision model.
    # Downscaling massively cuts CPU inference time with no practical
    # accuracy loss for handwriting recognition.
    AI_VISION_MAX_EDGE: int = int(os.getenv("AI_VISION_MAX_EDGE", "1280"))

    # ─── Storage ─────────────────────────────────────────────────────────────
    # Local filesystem — free and self-hosted. Uploads served at /uploads.
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")

    # ─── R2 mirror (optional, for ephemeral-disk hosts like Render free) ────
    # Cloudflare R2 is S3-compatible with zero egress fees and a free tier that
    # never expires or pauses. When all four vars are set, every upload is
    # mirrored to the bucket and /uploads serving falls back to R2 for files
    # missing from local disk (e.g. after a Render restart/redeploy). Local
    # behavior is unchanged when unset.
    R2_ACCOUNT_ID: str = os.getenv("R2_ACCOUNT_ID", "")
    R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
    R2_SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
    R2_BUCKET: str = os.getenv("R2_BUCKET", "")

    # ─── Concurrency: Celery distribution toggle (Redis optional) ────────────
    USE_CELERY: bool = os.getenv("USE_CELERY", "false").lower() == "true"

    # ─── CORS Configuration ──────────────────────────────────────────────────
    _origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    if _origins and _origins != "*":
        ALLOWED_ORIGINS: list = [origin.strip() for origin in _origins.split(",") if origin.strip()]
    else:
        ALLOWED_ORIGINS: list = ["*"]

settings = Settings()
