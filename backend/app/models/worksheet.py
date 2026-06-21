from sqlalchemy import Column, String, Float, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Worksheet(Base):
    __tablename__ = "worksheets"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    status = Column(String, default="processing")  # processing, completed, failed
    final_score = Column(Float, nullable=True)
    ai_feedback = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    teacher_id = Column(String, ForeignKey("teachers.id"), nullable=False, index=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=True, index=True)

    # Relationships
    teacher = relationship("Teacher", back_populates="worksheets")
    student = relationship("Student", back_populates="worksheets")
    items = relationship("WorksheetItem", back_populates="worksheet", cascade="all, delete-orphan")


class WorksheetItem(Base):
    __tablename__ = "worksheet_items"

    id = Column(String, primary_key=True, index=True)
    worksheet_id = Column(String, ForeignKey("worksheets.id"), nullable=False, index=True)
    question_no = Column(String, nullable=False)
    question_text = Column(String, nullable=True)
    correct_answer = Column(String, nullable=True)
    student_answer = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    is_correct = Column(String, default="pending")  # correct, incorrect, pending

    # Relationships
    worksheet = relationship("Worksheet", back_populates="items")
