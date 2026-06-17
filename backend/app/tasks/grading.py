from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.worksheet import Worksheet, WorksheetItem
from app.services.ocr import ocr_service
from app.services.llm import llm_service
import uuid

@celery_app.task(name="tasks.grade_worksheet")
def grade_worksheet_task(worksheet_id: str):
    """
    Celery task that retrieves worksheet, runs mock OCR & LLM feedback,
    and saves results to the local database.
    """
    db = SessionLocal()
    try:
        worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
        if not worksheet:
            return f"Worksheet {worksheet_id} not found"

        # Mock OCR call
        ocr_result = ocr_service.process_worksheet(worksheet.image_url)
        
        # Populate items
        correct_count = 0
        total_questions = len(ocr_result["extracted_items"])
        
        for item in ocr_result["extracted_items"]:
            # Simple grading stub (compare student answers)
            is_correct = "correct"
            if item["question_no"] == "2":  # Let's say Q2 is incorrect for mock purposes
                is_correct = "incorrect"
            
            if is_correct == "correct":
                correct_count += 1
                
            db_item = WorksheetItem(
                id=str(uuid.uuid4()),
                worksheet_id=worksheet_id,
                question_no=item["question_no"],
                question_text=item["question_text"],
                student_answer=item["student_answer"],
                correct_answer=item["student_answer"] if is_correct == "correct" else "Incorrect Answer",
                is_correct=is_correct
            )
            db.add(db_item)
            
        # Mock LLM feedback call
        feedback = llm_service.analyze_results(ocr_result["student_name"], ocr_result["extracted_items"])
        
        # Update worksheet status
        worksheet.status = "completed"
        worksheet.final_score = (correct_count / total_questions) * 100 if total_questions > 0 else 0.0
        worksheet.ai_feedback = feedback
        db.commit()
        
        return f"Worksheet {worksheet_id} graded successfully. Score: {worksheet.final_score}%"
    except Exception as e:
        if worksheet:
            worksheet.status = "failed"
            db.commit()
        return f"Grading failed: {str(e)}"
    finally:
        db.close()
