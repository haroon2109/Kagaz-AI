from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, index=True)
    roll_no = Column(String, index=True, nullable=True)
    name = Column(String, nullable=False)
    teacher_id = Column(String, ForeignKey("teachers.id"), nullable=False, index=True)


    # Relationships
    teacher = relationship("Teacher", back_populates="students")
    worksheets = relationship("Worksheet", back_populates="student")
