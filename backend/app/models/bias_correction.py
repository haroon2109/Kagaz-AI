import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from app.core.database import Base

class BiasCorrection(Base):
    __tablename__ = "bias_corrections"

    id = Column(String, primary_key=True, index=True)
    worksheet_id = Column(String, ForeignKey("worksheets.id"), nullable=False)
    question_text = Column(Text, nullable=True)
    expected_answer = Column(Text, nullable=True)
    student_answer = Column(Text, nullable=True)
    original_ai_grade = Column(String, nullable=True)
    teacher_corrected_grade = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
