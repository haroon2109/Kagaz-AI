import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
# SQLite database fallback broker
SQLITE_DB_URL = "sqla+sqlite:///celery_db.sqlite"

# Check if Redis is expected or if we fallback
broker_url = REDIS_URL if os.getenv("USE_REDIS", "false").lower() == "true" else SQLITE_DB_URL

celery_app = Celery(
    "kagaz_ai_tasks",
    broker=broker_url,
    backend="db+sqlite:///celery_results.sqlite"
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)
