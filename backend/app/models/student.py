from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, index=True)
    roll_no = Column(String, index=True, nullable=True)
    name = Column(String, nullable=False)
    # Individual student's grade level — meaningful in multi-grade classrooms
    # where one class contains students of several grades. Groups are still
    # formed by demonstrated competency, not by grade (per Challenge 2), but
    # the teacher can see each child's grade inside their group.
    grade_level = Column(String, nullable=True)
    teacher_id = Column(String, ForeignKey("teachers.id"), nullable=False, index=True)


    # Relationships
    teacher = relationship("Teacher", back_populates="students")
    worksheets = relationship("Worksheet", back_populates="student")
