from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class WorksheetItemBase(BaseModel):
    question_no: str
    question_text: Optional[str] = None
    correct_answer: Optional[str] = None
    student_answer: Optional[str] = None
    is_correct: Optional[str] = "pending"

class WorksheetItemResponse(WorksheetItemBase):
    id: str
    worksheet_id: str

    class Config:
        from_attributes = True

class WorksheetBase(BaseModel):
    title: str
    image_url: Optional[str] = None

class WorksheetCreate(WorksheetBase):
    student_id: Optional[str] = None

class WorksheetResponse(WorksheetBase):
    id: str
    status: str
    final_score: Optional[float] = None
    ai_feedback: Optional[Any] = None
    created_at: datetime
    teacher_id: str
    student_id: Optional[str] = None
    items: List[WorksheetItemResponse] = []

    class Config:
        from_attributes = True

class WorksheetItemUpdate(BaseModel):
    id: str
    student_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    is_correct: Optional[str] = None  # correct, incorrect, pending

class WorksheetUpdate(BaseModel):
    title: Optional[str] = None
    student_name: Optional[str] = None
    roll_no: Optional[str] = None
    student_id: Optional[str] = None
    items: List[WorksheetItemUpdate] = []
