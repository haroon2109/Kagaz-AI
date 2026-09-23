import logging

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)

# For SQLite, we add connect_args to allow multithreading access
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}


def _make_engine(url: str, args: dict):
    return create_engine(url, connect_args=args, pool_pre_ping=True)


try:
    engine = _make_engine(settings.DATABASE_URL, connect_args)
    # Test connection
    with engine.connect() as conn:
        pass
    logger.info(f"Connected to database: {settings.DATABASE_URL.split('@')[-1]}")
except Exception as e:
    logger.error(f"Primary database connection failed, failing over to local SQLite. Error: {e}")
    # Fallback DB — relative path so it stays inside the working directory
    # (the app's startup sequence ensures the directory exists and is writable).
    engine = _make_engine("sqlite:///./kagaz_edge.db", {"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
