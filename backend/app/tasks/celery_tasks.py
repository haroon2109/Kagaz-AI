import asyncio
import logging
from app.tasks.celery_app import celery_app
from app.tasks.grading import run_ocr_and_stage, run_llm_grading

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.ocr_worksheet")
def ocr_worksheet_task(worksheet_id: str):
    """Celery task to run Phase 1 OCR extraction."""
    logger.info(f"[Celery] Received OCR task for worksheet: {worksheet_id}")
    try:
        asyncio.run(run_ocr_and_stage(worksheet_id))
    except Exception as e:
        logger.error(f"[Celery] OCR task failed for worksheet {worksheet_id}: {e}")
        raise e
    return f"Worksheet {worksheet_id} OCR processed."

@celery_app.task(name="tasks.grade_worksheet")
def grade_worksheet_task(worksheet_id: str):
    """Celery task to run Phase 2 LLM grading."""
    logger.info(f"[Celery] Received grading task for worksheet: {worksheet_id}")
    try:
        asyncio.run(run_llm_grading(worksheet_id))
    except Exception as e:
        logger.error(f"[Celery] Grading task failed for worksheet {worksheet_id}: {e}")
        raise e
    return f"Worksheet {worksheet_id} graded."
