"""
Background grading pipeline for Kagaz AI.

This module provides two execution modes:
  1. FastAPI BackgroundTasks (no Redis/Celery needed) — used by default.
  2. Celery task wrapper — available for future scale-out, wraps the same core logic.

The core function `run_ocr_and_stage` handles:
  - Image path resolution from the stored image_url
  - PaddleOCR (or mock fallback) extraction
  - Persisting WorksheetItem rows into the database
  - OCR-level student name auto-detection → updates student association
  - Setting status to "ocr_complete" so the teacher can review before AI grading
"""

import os
import uuid
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.worksheet import Worksheet, WorksheetItem
from app.models.student import Student
from app.services.ocr import ocr_service
from app.services.llm import llm_service


# ---------------------------------------------------------------------------
# Core pipeline functions (used by both BackgroundTasks and Celery)
# ---------------------------------------------------------------------------

def _resolve_image_path(image_url: str) -> str:
    """
    Converts a stored image_url (which may be an absolute URL like /uploads/xxx.jpg
    or a bare filename) into a local filesystem path that OpenCV can read.
    """
    # Case 1: already a local absolute path
    if os.path.isabs(image_url) and os.path.exists(image_url):
        return image_url

    # Case 2: URL-style path like /uploads/abc.jpg → strip leading slash
    if image_url.startswith("/"):
        candidate = image_url.lstrip("/")
        if os.path.exists(candidate):
            return candidate

    # Case 3: bare filename
    candidate = os.path.join("uploads", os.path.basename(image_url))
    if os.path.exists(candidate):
        return candidate

    return image_url  # Let OCR service handle missing-file gracefully


def run_ocr_and_stage(worksheet_id: str):
    """
    Phase 1 — OCR extraction.
    
    Called as a FastAPI BackgroundTask immediately after worksheet creation.
    Extracts student answers via PaddleOCR, creates WorksheetItem DB rows,
    and advances the worksheet to 'ocr_complete' for teacher review.
    """
    db: Session = SessionLocal()
    try:
        worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
        if not worksheet:
            print(f"[Grading] Worksheet {worksheet_id} not found — aborting OCR.")
            return

        # Resolve the physical image path
        image_path = _resolve_image_path(worksheet.image_url or "")

        # Run OCR (PaddleOCR or mock fallback)
        ocr_result = ocr_service.process_worksheet(image_path)

        extracted_items = ocr_result.get("extracted_items", [])
        detected_name = ocr_result.get("student_name", "")
        detected_roll = ocr_result.get("roll_no", "N/A")

        # ── Delete any stale items from a prior OCR run ──────────────────────
        db.query(WorksheetItem).filter(WorksheetItem.worksheet_id == worksheet_id).delete()

        # ── Persist extracted Q&A as WorksheetItems ─────────────────────────
        for item in extracted_items:
            db_item = WorksheetItem(
                id=str(uuid.uuid4()),
                worksheet_id=worksheet_id,
                question_no=item.get("question_no", "?"),
                question_text=item.get("question_text", ""),
                student_answer=item.get("student_answer", ""),
                correct_answer="",        # Teacher fills this in during review
                is_correct="pending",
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

        print(
            f"[Grading] OCR complete for {worksheet_id}. "
            f"Extracted {len(extracted_items)} items. Status → {worksheet.status}"
        )

    except Exception as e:
        print(f"[Grading] OCR pipeline crashed for {worksheet_id}: {e}")
        try:
            worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
            if worksheet:
                worksheet.status = "failed"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def run_llm_grading(worksheet_id: str):
    """
    Phase 2 — LLM analysis.

    Called when the teacher clicks 'Grade Now' after reviewing OCR output and
    marking correct/incorrect toggles. Runs LLM analysis and saves ai_feedback.
    """
    db: Session = SessionLocal()
    try:
        worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
        if not worksheet:
            print(f"[Grading] Worksheet {worksheet_id} not found — aborting LLM.")
            return

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

        student_name = (
            worksheet.student.name if worksheet.student else
            worksheet.title.replace("Worksheet - ", "") or "Student"
        )

        feedback = llm_service.analyze_results(student_name, questions_data)

        worksheet.ai_feedback = feedback
        worksheet.status = "completed"
        db.commit()

        print(
            f"[Grading] LLM grading complete for {worksheet_id}. "
            f"Score: {worksheet.final_score:.1f}%"
        )

    except Exception as e:
        print(f"[Grading] LLM grading crashed for {worksheet_id}: {e}")
        try:
            worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
            if worksheet:
                worksheet.status = "failed"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Celery task wrappers (optional — requires Redis + worker)
# ---------------------------------------------------------------------------

try:
    from app.tasks.celery_app import celery_app  # type: ignore

    @celery_app.task(name="tasks.grade_worksheet")
    def grade_worksheet_task(worksheet_id: str):
        """Celery-compatible wrapper around the full OCR + LLM pipeline."""
        run_ocr_and_stage(worksheet_id)
        run_llm_grading(worksheet_id)
        return f"Worksheet {worksheet_id} processed via Celery."

except ImportError:
    pass  # Celery not configured — FastAPI BackgroundTasks path is used instead
