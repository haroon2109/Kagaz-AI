from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime


# ─── Classes ─────────────────────────────────────────────────────────────────

class ClassCreate(BaseModel):
    name: str
    grade: Optional[str] = None
    subject: str = "mathematics"
    language: Optional[str] = None
    classroom_type: str = "single_grade"  # single_grade | multi_grade
    student_names: List[str] = []
    # optional parallel list of per-student grade levels (multi-grade classes);
    # empty/None entries fall back to the class-level `grade`
    student_grades: List[Optional[str]] = []


class ClassResponse(BaseModel):
    id: str
    name: str
    grade: Optional[str] = None
    subject: str
    language: Optional[str] = None
    classroom_type: str
    is_demo: bool = False
    created_at: datetime
    student_count: int = 0

    class Config:
        from_attributes = True


class StudentBrief(BaseModel):
    id: str
    name: str
    roll_no: Optional[str] = None
    grade_level: Optional[str] = None

    class Config:
        from_attributes = True


class ClassDetailResponse(ClassResponse):
    students: List[StudentBrief] = []


# ─── Assessments ─────────────────────────────────────────────────────────────

class AssessmentCreate(BaseModel):
    class_id: str
    subject: str = "mathematics"
    title: Optional[str] = None
    template_key: Optional[str] = None


class AssessmentResponse(BaseModel):
    id: str
    class_id: str
    subject: str
    title: str
    template_key: Optional[str] = None
    is_reassessment: bool = False
    intervention_id: Optional[str] = None
    target_competency: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AssessmentScanRequest(BaseModel):
    """Attach one scanned worksheet (already OCR'd or awaiting OCR) to an assessment."""

    student_id: Optional[str] = None
    student_name: Optional[str] = None
    image_url: str
    title: Optional[str] = None


# ─── Analysis / evidence ─────────────────────────────────────────────────────

class TeacherReviewRequest(BaseModel):
    """Teacher-in-the-loop verdict on an AI inference."""

    verdict: str  # confirmed | edited | verify
    competency_id: Optional[str] = None
    note: Optional[str] = None


class PatternFeedbackRequest(BaseModel):
    """Structured feedback on a detected error pattern (evaluation mode)."""

    pattern_type: str
    ai_prediction: str
    teacher_label: str  # correct | incorrect
    reason: Optional[str] = None
    student_id: Optional[str] = None
    worksheet_id: Optional[str] = None


# ─── Evaluation records (internal testing) ────────────────────────────────────

class EvaluationRecordCreate(BaseModel):
    """Create an internal evaluation record for one AI-analyzed question/student."""

    assessment_id: Optional[str] = None
    worksheet_id: Optional[str] = None
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    subject: str = "mathematics"

    # OCR accuracy
    ai_extracted_answer: Optional[str] = None
    teacher_corrected_answer: Optional[str] = None
    ocr_was_correct: Optional[bool] = None

    # Competency classification
    ai_competency: Optional[str] = None
    ground_truth_competency: Optional[str] = None
    competency_match: Optional[bool] = None

    # Learning-gap prediction
    ai_learning_gap: Optional[str] = None
    teacher_confirmed_gap: Optional[str] = None
    gap_agrees: Optional[bool] = None

    # Confidence & recommendation
    confidence: Optional[str] = None
    recommendation: Optional[str] = None
    teacher_accepted_recommendation: Optional[bool] = None

    # Processing metadata
    processing_time_ms: Optional[float] = None

    # Metadata
    notes: Optional[str] = None


class EvaluationRecordUpdate(BaseModel):
    """Update an existing evaluation record (fill in teacher ground truth)."""

    teacher_corrected_answer: Optional[str] = None
    ocr_was_correct: Optional[bool] = None
    ground_truth_competency: Optional[str] = None
    competency_match: Optional[bool] = None
    teacher_confirmed_gap: Optional[str] = None
    gap_agrees: Optional[bool] = None
    teacher_accepted_recommendation: Optional[bool] = None
    notes: Optional[str] = None


# ─── Groups & interventions ──────────────────────────────────────────────────

class InterventionCompleteRequest(BaseModel):
    completed: bool = True


class ReassessRequest(BaseModel):
    """Trigger a quick reassessment for a group after an intervention."""

    student_ids: Optional[List[str]] = None  # defaults to current group members


# ─── Misc ────────────────────────────────────────────────────────────────────

class WorksheetScanCreate(BaseModel):
    """Direct scan-to-assessment creation payload used by the assess flow."""

    class_id: Optional[str] = None
    assessment_id: Optional[str] = None
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    image_url: str
    title: Optional[str] = None
    template_key: Optional[str] = None
    subject: str = "mathematics"
    kind: str = "assessment"  # assessment | reassessment
    intervention_id: Optional[str] = None
