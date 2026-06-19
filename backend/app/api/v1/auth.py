from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.auth import Token, ProfileSyncRequest, TeacherResponse
from app.models.teacher import Teacher
from app.core.config import settings
from app.core.rate_limit import strict_rate_limiter

router = APIRouter()

@router.post("/login", response_model=Token, dependencies=[Depends(strict_rate_limiter)])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(deps.get_db)):
    """
    Development login stub to support Swagger UI authentication.
    Returns a mock token mapped to the teacher's email.
    DISABLED in production mode.
    """
    if settings.ENV_MODE == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insecure development login is disabled in production mode. Access via frontend Supabase Auth."
        )

    teacher = db.query(Teacher).filter(Teacher.email == form_data.username).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found. Please log in first via the Next.js frontend."
        )
    
    import jwt
    from datetime import datetime, timezone, timedelta
    
    payload = {
        "sub": teacher.id,
        "email": teacher.email,
        "exp": datetime.now(timezone.utc) + timedelta(days=1),
        "aud": "authenticated"
    }

    encoded = jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return {"access_token": encoded, "token_type": "bearer"}

@router.post("/sync", response_model=TeacherResponse, dependencies=[Depends(strict_rate_limiter)])
def sync_profile(
    profile_in: ProfileSyncRequest,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user)
):
    """
    Syncs additional profile fields (e.g. name update) from the frontend.
    """
    current_user.name = profile_in.name
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/me", response_model=TeacherResponse)
def read_current_user(current_user: Teacher = Depends(deps.get_current_user)):
    """
    Returns the authenticated teacher details.
    """
    return current_user
