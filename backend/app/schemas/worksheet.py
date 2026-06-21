from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class StudentResponse(BaseModel):
    """Nested student info included in WorksheetResponse."""
    id: str
    name: str
    roll_no: Optional[str] = None

    class Config:
        from_attributes = True


class WorksheetItemBase(BaseModel):
    question_no: Optional[str] = "Unknown"
    question_text: Optional[str] = None
    correct_answer: Optional[str] = None
    student_answer: Optional[str] = None
    confidence: Optional[float] = None
    is_correct: Optional[str] = "pending"

    class Config:
        extra = "allow"


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
    # Possible statuses:
    #   processing   → OCR queued, not yet started
    #   ocr_complete → OCR done, awaiting teacher review
    #   completed    → LLM graded, feedback available
    #   failed       → OCR or LLM pipeline error
    status: str
    final_score: Optional[float] = None
    ai_feedback: Optional[Any] = None
    created_at: datetime
    teacher_id: str
    student_id: Optional[str] = None
    student: Optional[StudentResponse] = None   # ← nested for name display
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


class UploadResponse(BaseModel):
    image_url: str


