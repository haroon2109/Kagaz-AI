from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)

    # Relationships
    students = relationship("Student", back_populates="teacher", cascade="all, delete-orphan")
    worksheets = relationship("Worksheet", back_populates="teacher", cascade="all, delete-orphan")
