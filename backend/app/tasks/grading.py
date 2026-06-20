"""
Background grading pipeline for Kagaz AI.

This module provides two execution modes:
  1. FastAPI BackgroundTasks (no Redis/Celery needed) — used by default.
  2. Celery task wrapper — available for future scale-out, wraps the same core logic.
"""

import os
import uuid
import asyncio
import logging
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.worksheet import Worksheet, WorksheetItem
from app.models.student import Student
from app.services.ocr import ocr_service
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

# Concurrency throttle to prevent database pool starvation and LLM rate limits
grading_semaphore = asyncio.Semaphore(2)

# ---------------------------------------------------------------------------
# Core pipeline functions (used by both BackgroundTasks and Celery)
# ---------------------------------------------------------------------------

def _resolve_image_path(image_url: str) -> str:
    """
    Converts a stored image_url (which may be an absolute URL like /uploads/xxx.jpg
    or a bare filename) into a local filesystem path that OpenCV can read.
    Validates that the path is within the safe sandbox directory to prevent traversal.
    """
    base_upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    resolved_path = None

    # Case 1: already a local absolute path
    if os.path.isabs(image_url) and os.path.exists(image_url):
        resolved_path = os.path.abspath(image_url)

    # Case 2: URL-style path like /uploads/abc.jpg → strip leading slash
    elif image_url.startswith("/"):
        candidate = os.path.abspath(image_url.lstrip("/"))
        if os.path.exists(candidate):
            resolved_path = candidate

    # Case 3: bare filename
    else:
        candidate = os.path.abspath(os.path.join(settings.UPLOAD_DIR, os.path.basename(image_url)))
        if os.path.exists(candidate):
            resolved_path = candidate

    if resolved_path:
        # Verify sandbox confinement
        if resolved_path.startswith(base_upload_dir + os.sep) or resolved_path == base_upload_dir:
            return resolved_path

    # Safe fallback if validation fails
    return os.path.abspath(os.path.join(settings.UPLOAD_DIR, os.path.basename(image_url)))


async def run_ocr_and_stage(worksheet_id: str):
    """
    Phase 1 — OCR extraction.
    
    Called as a FastAPI BackgroundTask immediately after worksheet creation.
    Extracts student answers via PaddleOCR, creates WorksheetItem DB rows,
    and advances the worksheet to 'ocr_complete' for teacher review.
    """
    async with grading_semaphore:
        db: Session = SessionLocal()
        try:
            worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
            if not worksheet:
                logger.error(f"[Grading] Worksheet {worksheet_id} not found — aborting OCR.")
                return

            # Resolve the physical image path
            image_path = _resolve_image_path(worksheet.image_url or "")

            # Run OCR (PaddleOCR or mock fallback) in a threadpool to prevent event loop blocking
            ocr_result = await asyncio.to_thread(ocr_service.process_worksheet, image_path)


            extracted_items = ocr_result.get("extracted_items", [])
            detected_name = ocr_result.get("student_name", "")
            detected_roll = ocr_result.get("roll_no", "N/A")

            # ── Cascade-safe delete of stale items from a prior OCR run ──────────
            items_to_delete = db.query(WorksheetItem).filter(WorksheetItem.worksheet_id == worksheet_id).all()
            for item in items_to_delete:
                db.delete(item)

            # ── Persist extracted Q&A as WorksheetItems and Pre-Grade ───────────
            for item in extracted_items:
                q_text = str(item.get("question_text", ""))
                s_ans = str(item.get("student_answer", ""))
                c_ans = str(item.get("correct_answer", ""))
                
                is_correct = "pending"
                if q_text and s_ans and c_ans:
                    # 1. Strict Guardrails on Semantic Similarity
                    sts_score = await llm_service.compute_semantic_similarity(expected=c_ans, student=s_ans)
                    if sts_score >= 0.85:
                        is_correct = "correct"
                    else:
                        # 2. Split & Blind Evaluation (Dual-Engine Verifier)
                        score_card = await llm_service.evaluate_single_answer(
                            question=q_text,
                            expected=c_ans,
                            student=s_ans
                        )
                        is_correct = score_card.get("overridden_grade", "incorrect")
                
                db_item = WorksheetItem(
                    id=str(uuid.uuid4()),
                    worksheet_id=worksheet_id,
                    question_no=item.get("question_no", "?"),
                    question_text=q_text,
                    student_answer=s_ans,
                    correct_answer=c_ans,
                    is_correct=is_correct,
                )
                db.add(db_item)

            # ── Auto-detect student from OCR header if not already set ───────────
            if detected_name and detected_name != "Unknown Student" and not worksheet.student_id:
                student = db.query(Student).filter(
                    Student.name == detected_name,
                    Student.teacher_id == worksheet.teacher_id,
                ).first()

                if not student:
                    student = Student(
                        id=str(uuid.uuid4()),
                        name=detected_name,
                        roll_no=detected_roll,
                        teacher_id=worksheet.teacher_id,
                    )
                    db.add(student)
                    db.flush()  # get student.id without committing yet

                worksheet.student_id = student.id

            # ── Advance status ────────────────────────────────────────────────────
            worksheet.status = "ocr_complete" if extracted_items else "failed"
            db.commit()

            logger.info(
                f"[Grading] OCR complete for {worksheet_id}. "
                f"Extracted {len(extracted_items)} items. Status → {worksheet.status}"
            )

        except Exception as e:
            logger.error(f"[Grading] OCR pipeline crashed for {worksheet_id}: {e}")
            try:
                db.rollback()
                worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
                if worksheet:
                    worksheet.status = "failed"
                    db.commit()
            except Exception as db_err:
                logger.critical(f"[Grading] Failed to update worksheet status to failed for {worksheet_id}: {db_err}")
        finally:
            db.close()


async def run_llm_grading_logic(db: Session, worksheet: Worksheet):
    """
    Shared helper to calculate scores, run LLM analysis and update status/feedback.
    """
    items = worksheet.items

    # Compute score from teacher markings
    correct_count = sum(1 for it in items if it.is_correct == "correct")
    total_count = len(items)
    worksheet.final_score = (correct_count / total_count * 100) if total_count > 0 else 0.0

    # Build questions payload for LLM
    questions_data = [
        {
            "question_no": it.question_no,
            "question_text": it.question_text or "",
            "student_answer": it.student_answer or "",
            "correct_answer": it.correct_answer or "",
            "is_correct": it.is_correct,
        }
        for it in items
    ]

    student_name = worksheet.student.name if (worksheet.student and worksheet.student.name) else "Student"

    feedback = await llm_service.analyze_results(student_name, questions_data)

    worksheet.ai_feedback = feedback
    worksheet.status = "completed"
    db.commit()
    return worksheet


async def run_llm_grading(worksheet_id: str):
    """
    Phase 2 — LLM analysis.

    Called when the teacher clicks 'Grade Now' after reviewing OCR output and
    marking correct/incorrect toggles. Runs LLM analysis and saves ai_feedback.
    """
    async with grading_semaphore:
        db: Session = SessionLocal()
        try:
            worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
            if not worksheet:
                logger.error(f"[Grading] Worksheet {worksheet_id} not found — aborting LLM.")
                return

            await run_llm_grading_logic(db, worksheet)
            logger.info(
                f"[Grading] LLM grading complete for {worksheet_id}. "
                f"Score: {worksheet.final_score:.1f}%"
            )

        except Exception as e:
            logger.error(f"[Grading] LLM grading crashed for {worksheet_id}: {e}")
            try:
                db.rollback()
                worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
                if worksheet:
                    worksheet.status = "failed"
                    db.commit()
            except Exception as db_err:
                logger.critical(f"[Grading] Failed to update worksheet status to failed for {worksheet_id}: {db_err}")
        finally:
            db.close()

