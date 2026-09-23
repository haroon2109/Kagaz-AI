"""
Kagaz AI — lightweight idempotent schema migrations.

The learning-loop upgrade adds nullable columns to existing tables (students,
worksheets, worksheet_items). SQLite's CREATE TABLE IF NOT EXISTS does not add
columns to tables that already exist, so we ALTER TABLE for any missing column
at startup. Safe to run repeatedly; no destructive changes.
"""

import logging

from sqlalchemy import inspect, text

from app.core.database import engine

logger = logging.getLogger(__name__)

# table → [(column, column DDL), ...]
_NEW_COLUMNS = {
    "students": [
        ("class_id", "VARCHAR REFERENCES class_rooms(id)"),
        ("grade_level", "VARCHAR"),
    ],
    "worksheets": [
        ("class_id", "VARCHAR REFERENCES class_rooms(id)"),
        ("assessment_id", "VARCHAR REFERENCES assessments(id)"),
        ("kind", "VARCHAR DEFAULT 'assessment'"),
    ],
    "assessments": [
        ("group_id", "VARCHAR REFERENCES learning_groups(id)"),
    ],
    "worksheet_items": [
        ("teacher_corrected_answer", "VARCHAR"),
    ],
}


def run_migrations() -> None:
    """Add any missing learning-loop columns to existing tables."""
    inspector = inspect(engine)
    with engine.connect() as conn:
        for table, columns in _NEW_COLUMNS.items():
            if table not in inspector.get_table_names():
                # Fresh database: Base.metadata.create_all handles it.
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for col, ddl in columns:
                if col not in existing:
                    logger.info(f"[Migration] Adding column {table}.{col}")
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))
        conn.commit()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migrations()
    print("Migrations complete.")
