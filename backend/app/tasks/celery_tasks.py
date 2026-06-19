import asyncio
import logging
from app.tasks.celery_app import celery_app
from app.tasks.grading import run_ocr_and_stage, run_llm_grading

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.grade_worksheet")
def grade_worksheet_task(worksheet_id: str):
    """Celery-compatible wrapper around the full OCR + LLM pipeline."""
    logger.info(f"[Celery] Received task for worksheet: {worksheet_id}")
    
    async def run_pipeline():
        await run_ocr_and_stage(worksheet_id)
        await run_llm_grading(worksheet_id)
        
    try:
        asyncio.run(run_pipeline())
    except Exception as e:
        logger.error(f"[Celery] Task execution failed for worksheet {worksheet_id}: {e}")
        raise e

    return f"Worksheet {worksheet_id} processed via Celery."
