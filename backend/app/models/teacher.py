from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    # Local credential storage — bcrypt hash. Nullable so pre-existing rows
    # (created via the old mock flow) don't break until they reset a password.
    password_hash = Column(String, nullable=True)

    # Relationships
    students = relationship("Student", back_populates="teacher", cascade="all, delete-orphan")
    worksheets = relationship("Worksheet", back_populates="teacher", cascade="all, delete-orphan")
