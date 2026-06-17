from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from app.api import deps
from app.schemas.student import StudentResponse, StudentCreate
from app.models.student import Student
from app.models.teacher import Teacher

router = APIRouter()

@router.get("", response_model=List[StudentResponse])
def list_students(
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    students = db.query(Student).filter(Student.teacher_id == current_user.id).all()
    return students

@router.post("", response_model=StudentResponse)
def create_student(
    student_in: StudentCreate,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    # Verify if roll number is already taken
    if student_in.roll_no:
        existing = db.query(Student).filter(
            Student.roll_no == student_in.roll_no,
            Student.teacher_id == current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Student with this roll number already exists")

    student_id = str(uuid.uuid4())
    db_student = Student(
        id=student_id,
        name=student_in.name,
        roll_no=student_in.roll_no,
        teacher_id=current_user.id
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student
