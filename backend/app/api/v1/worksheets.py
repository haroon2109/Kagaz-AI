from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import uuid
import os
from app.api import deps
from app.schemas.worksheet import WorksheetResponse, WorksheetCreate, WorksheetUpdate
from app.models.worksheet import Worksheet, WorksheetItem
from app.models.student import Student
from app.models.teacher import Teacher
from app.services.storage import storage_service
from app.services.llm import llm_service

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

@router.post("/upload")
def upload_worksheet(
    file: UploadFile = File(...),
    current_user: Teacher = Depends(deps.get_current_user)
):
    # Save the file using the storage service stub
    file_url = storage_service.save_file(file)
    return {"image_url": file_url}

@router.post("", response_model=WorksheetResponse)
def create_worksheet(
    worksheet_in: WorksheetCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
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
    
    # Trigger background processing stub
    # In a full run, this would trigger Celery, e.g. celery_app.send_task("tasks.grade", args=[worksheet_id])
    return db_worksheet

@router.post("/batch", response_model=List[WorksheetResponse])
def create_batch_worksheets(
    worksheets_in: List[WorksheetCreate],
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    """
    Creates multiple worksheet records at once.
    """
    db_worksheets = []
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
        db_worksheets.append(db_worksheet)
    db.commit()
    for db_worksheet in db_worksheets:
        db.refresh(db_worksheet)
    return db_worksheets

@router.post("/{id}/grade", response_model=WorksheetResponse)
def trigger_grading(
    id: str,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    worksheet = db.query(Worksheet).filter(Worksheet.id == id, Worksheet.teacher_id == current_user.id).first()
    if not worksheet:
        raise HTTPException(status_code=404, detail="Worksheet not found")
    
    worksheet.status = "processing"
    db.commit()
    db.refresh(worksheet)
    
    # Trigger grading task stub
    return worksheet

@router.put("/{id}", response_model=WorksheetResponse)
def update_worksheet(
    id: str,
    worksheet_in: WorksheetUpdate,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    """
    Saves teacher corrections (Human-in-the-Loop) and runs LLM evaluation to update insights.
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
            db.commit()
            db.refresh(student)
            
        worksheet.student_id = student.id
    elif worksheet_in.student_id:
        worksheet.student_id = worksheet_in.student_id

    # Update worksheet items
    for item_in in worksheet_in.items:
        db_item = db.query(WorksheetItem).filter(
            WorksheetItem.id == item_in.id,
            WorksheetItem.worksheet_id == worksheet.id
        ).first()
        
        if db_item:
            if item_in.student_answer is not None:
                db_item.student_answer = item_in.student_answer
            if item_in.correct_answer is not None:
                db_item.correct_answer = item_in.correct_answer
            if item_in.is_correct is not None:
                db_item.is_correct = item_in.is_correct

    db.commit()
    db.refresh(worksheet)

    # Recalculate final score
    items = worksheet.items
    correct_count = sum(1 for item in items if item.is_correct == "correct")
    total_count = len(items)
    worksheet.final_score = (correct_count / total_count) * 100 if total_count > 0 else 0.0

    # Call LLM service to re-analyze gaps/remedies
    questions_data = []
    for item in items:
        questions_data.append({
            "question_no": item.question_no,
            "question_text": item.question_text,
            "student_answer": item.student_answer,
            "correct_answer": item.correct_answer,
            "is_correct": item.is_correct
        })

    active_student_name = student_name or (worksheet.student.name if worksheet.student else "Student")
    feedback_result = llm_service.analyze_results(active_student_name, questions_data)
    
    # Save feedback & complete
    worksheet.ai_feedback = feedback_result
    worksheet.status = "completed"
    
    db.commit()
    db.refresh(worksheet)
    return worksheet
