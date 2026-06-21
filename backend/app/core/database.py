from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

import logging

logger = logging.getLogger(__name__)

# For SQLite, we add connect_args to allow multithreading access
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

try:
    engine = create_engine(
        settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True
    )
    # Test connection
    with engine.connect() as conn:
        pass
    logger.info("Connected to primary cloud database.")
except Exception as e:
    logger.error(f"Primary database connection failed. Failing over to local edge replica. Error: {e}")
    # Edge fallback DB
    edge_db_url = "sqlite:///./kagaz_edge.db"
    engine = create_engine(
        edge_db_url, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
