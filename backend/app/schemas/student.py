from pydantic import BaseModel
from typing import Optional

class StudentBase(BaseModel):
    name: str
    roll_no: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentResponse(StudentBase):
    id: str
    teacher_id: str

    class Config:
        from_attributes = True
