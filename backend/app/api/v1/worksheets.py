import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import uuid
import os
from app.api import deps
from app.schemas.worksheet import WorksheetResponse, WorksheetCreate, WorksheetUpdate, UploadResponse
from app.models.worksheet import Worksheet, WorksheetItem
from app.models.bias_correction import BiasCorrection
from app.models.student import Student
from app.models.teacher import Teacher
from app.services.storage import storage_service
from app.tasks.grading import run_ocr_and_stage, run_llm_grading, run_llm_grading_logic

class WorksheetUploadResponse(BaseModel):
    image_url: str

class BiasCorrectionRequest(BaseModel):
    item_id: str
    question_text: str
    expected_answer: str
    student_answer: str
    original_ai_grade: str
    teacher_corrected_grade: str

router = APIRouter()

@router.get("", response_model=List[WorksheetResponse])
def list_worksheets(
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    worksheets = db.query(Worksheet).filter(Worksheet.teacher_id == current_user.id).all()
    return worksheets

@router.get("/{id}", response_model=WorksheetResponse)
def get_worksheet(
    id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    worksheet = db.query(Worksheet).filter(Worksheet.id == id, Worksheet.teacher_id == current_user.id).first()
    if not worksheet:
        raise HTTPException(status_code=404, detail="Worksheet not found")
    return worksheet

@router.post("/upload", response_model=UploadResponse)
async def upload_worksheet(
    file: UploadFile = File(...),
    current_user: Teacher = Depends(deps.get_current_user)
):
    """
    Saves the worksheet image to local disk and returns the URL.
    The storage service writes the file and returns a URL-style path (/uploads/...).
    """
    file_url = await storage_service.save_file(file)
    return {"image_url": file_url}



@router.post("", response_model=WorksheetResponse)
def create_worksheet(
    worksheet_in: WorksheetCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    """
    Creates a worksheet record and immediately triggers the OCR pipeline.
    The response is returned instantly.
    """
    worksheet_id = str(uuid.uuid4())
    db_worksheet = Worksheet(
        id=worksheet_id,
        title=worksheet_in.title,
        image_url=worksheet_in.image_url,
        status="processing",
        teacher_id=current_user.id,
        student_id=worksheet_in.student_id
    )
    db.add(db_worksheet)
    db.commit()
    db.refresh(db_worksheet)

    # ── Fire OCR pipeline (Celery vs BackgroundTasks) ───────────────────
    from app.core.config import settings
    if settings.USE_CELERY:
        from app.tasks.celery_tasks import ocr_worksheet_task
        ocr_worksheet_task.delay(worksheet_id)
    else:
        background_tasks.add_task(run_ocr_and_stage, worksheet_id)

    return db_worksheet

@router.post("/batch", response_model=List[WorksheetResponse])
def create_batch_worksheets(
    worksheets_in: List[WorksheetCreate],
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    """
    Creates multiple worksheet records and queues an OCR task for each.
    """
    db_worksheets = []
    worksheet_ids = []
    for worksheet_in in worksheets_in:
        worksheet_id = str(uuid.uuid4())
        db_worksheet = Worksheet(
            id=worksheet_id,
            title=worksheet_in.title,
            image_url=worksheet_in.image_url,
            status="processing",
            teacher_id=current_user.id,
            student_id=worksheet_in.student_id
        )
        db.add(db_worksheet)
        worksheet_ids.append(worksheet_id)
    db.commit()
    
    # Optimize N+1 refreshes: load all worksheets in a single batch query
    db_worksheets = db.query(Worksheet).filter(Worksheet.id.in_(worksheet_ids)).all()

    # Fire OCR for each worksheet in the background
    from app.core.config import settings
    if settings.USE_CELERY:
        from app.tasks.celery_tasks import ocr_worksheet_task
        for wid in worksheet_ids:
            ocr_worksheet_task.delay(wid)
    else:
        for wid in worksheet_ids:
            background_tasks.add_task(run_ocr_and_stage, wid)

    return db_worksheets

@router.post("/{id}/grade", response_model=WorksheetResponse)
def trigger_grading(
    id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    """
    Triggers LLM analysis on a worksheet as an asynchronous background task.
    """
    worksheet = db.query(Worksheet).filter(Worksheet.id == id, Worksheet.teacher_id == current_user.id).first()
    if not worksheet:
        raise HTTPException(status_code=404, detail="Worksheet not found")

    # Set status to processing and trigger grading
    worksheet.status = "processing"
    db.commit()
    db.refresh(worksheet)

    from app.core.config import settings
    if settings.USE_CELERY:
        from app.tasks.celery_tasks import grade_worksheet_task
        grade_worksheet_task.delay(id)
    else:
        background_tasks.add_task(run_llm_grading, id)
    return worksheet


@router.post("/process/{id}", response_model=WorksheetResponse)
def reprocess_ocr(
    id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    """
    Re-triggers OCR on an existing worksheet.
    """
    worksheet = db.query(Worksheet).filter(Worksheet.id == id, Worksheet.teacher_id == current_user.id).first()
    if not worksheet:
        raise HTTPException(status_code=404, detail="Worksheet not found")

    worksheet.status = "processing"
    db.commit()
    db.refresh(worksheet)

    from app.core.config import settings
    if settings.USE_CELERY:
        from app.tasks.celery_tasks import ocr_worksheet_task
        ocr_worksheet_task.delay(id)
    else:
        background_tasks.add_task(run_ocr_and_stage, id)
    return worksheet


@router.put("/{id}", response_model=WorksheetResponse)
async def update_worksheet(
    id: str,
    worksheet_in: WorksheetUpdate,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    """
    Saves teacher corrections (Human-in-the-Loop) and runs LLM evaluation to update insights.
    All database operations are performed in memory (using flush for student key creation)
    and committed atomically at the end.
    """
    worksheet = db.query(Worksheet).filter(Worksheet.id == id, Worksheet.teacher_id == current_user.id).first()
    if not worksheet:
        raise HTTPException(status_code=404, detail="Worksheet not found")

    if worksheet_in.title is not None:
        worksheet.title = worksheet_in.title

    # Resolve student association
    student_name = worksheet_in.student_name
    if student_name:
        roll_no = worksheet_in.roll_no or "N/A"
        # Look up or create the student
        student = db.query(Student).filter(
            Student.name == student_name,
            Student.teacher_id == current_user.id
        ).first()
        
        if not student:
            student = Student(
                id=str(uuid.uuid4()),
                name=student_name,
                roll_no=roll_no,
                teacher_id=current_user.id
            )
            db.add(student)
            db.flush()  # Use flush instead of commit to avoid midway transaction commit
            
        worksheet.student_id = student.id
    elif worksheet_in.student_id:
        worksheet.student_id = worksheet_in.student_id

    # Optimize N+1 Query: Fetch all worksheet items for this worksheet in one batch query
    db_items = db.query(WorksheetItem).filter(WorksheetItem.worksheet_id == worksheet.id).all()
    items_map = {item.id: item for item in db_items}

    # Update worksheet items
    for item_in in worksheet_in.items:
        db_item = items_map.get(item_in.id)
        if db_item:
            if item_in.student_answer is not None:
                db_item.student_answer = item_in.student_answer
            if item_in.correct_answer is not None:
                db_item.correct_answer = item_in.correct_answer
            if item_in.is_correct is not None:
                db_item.is_correct = item_in.is_correct

    # Perform grading and LLM re-analysis using the shared logic (async, commits at the end)
    await run_llm_grading_logic(db, worksheet)
    
    db.refresh(worksheet)
    return worksheet

@router.get("/stream/{id}")
async def stream_worksheet_progress(
    id: str,
    token: str = Query(None),
    db: Session = Depends(deps.get_db)
):
    """
    Server-Sent Events endpoint to stream worksheet status updates to the client.
    """
    # Simple token validation for SSE (since EventSource cannot send headers easily)
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")
    
    current_user = deps.get_current_user_from_token_direct(token) if hasattr(deps, "get_current_user_from_token_direct") else None
    
    async def event_generator():
        last_status = None
        while True:
            # Re-fetch from DB to get the latest status
            worksheet = db.query(Worksheet).filter(Worksheet.id == id).first()
            if not worksheet:
                yield f"data: {{\"status\": \"error\", \"message\": \"Not found\"}}\n\n"
                break
            
            if worksheet.status != last_status:
                last_status = worksheet.status
                yield f"data: {{\"status\": \"{worksheet.status}\"}}\n\n"
                
                if worksheet.status in ["completed", "failed", "ocr_complete"]:
                    break
            
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/{id}/bias-correction")
def log_bias_correction(
    id: str,
    payload: BiasCorrectionRequest,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    """
    Logs when a teacher overrides an AI grade to help build a fine-tuning dataset.
    """
    correction = BiasCorrection(
        id=str(uuid.uuid4()),
        worksheet_id=id,
        question_text=payload.question_text,
        expected_answer=payload.expected_answer,
        student_answer=payload.student_answer,
        original_ai_grade=payload.original_ai_grade,
        teacher_corrected_grade=payload.teacher_corrected_grade
    )
    db.add(correction)
    db.commit()
    return {"status": "logged"}

