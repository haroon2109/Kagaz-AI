from fastapi import APIRouter
from app.api.v1 import auth, worksheets, students, learning

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(worksheets.router, prefix="/worksheets", tags=["worksheets"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(learning.router, tags=["learning"])
