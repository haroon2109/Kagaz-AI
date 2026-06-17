from pydantic import BaseModel, EmailStr
from typing import Optional

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ProfileSyncRequest(BaseModel):
    name: str

class TeacherResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None

    class Config:
        from_attributes = True
