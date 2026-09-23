import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from app.core.database import Base

class BiasCorrection(Base):
    """
    Log of teacher overrides of AI grades — used to build the evaluation
    dataset (AI prediction vs teacher ground truth) and to measure agreement
    rates. Teacher corrections are data, never silent rewrites.
    """
    __tablename__ = "bias_corrections"

    id = Column(String, primary_key=True, index=True)
    worksheet_id = Column(String, ForeignKey("worksheets.id"), nullable=False)
    question_text = Column(Text, nullable=True)
    expected_answer = Column(Text, nullable=True)
    student_answer = Column(Text, nullable=True)
    original_ai_grade = Column(String, nullable=True)
    teacher_corrected_grade = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# NOTE (honesty): the previous "AlgorithmicBiasMitigator" silently rewrote
# students' extracted answers (e.g. 'skool' → 'school') before storage and
# analysis. That corrupted the evidence base and hid OCR errors from the
# teacher. It was removed: student answers are stored exactly as read, and
# the teacher corrects them explicitly in review.
