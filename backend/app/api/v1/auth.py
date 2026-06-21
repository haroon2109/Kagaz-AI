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
    Self-hosted local JWT login. No external SaaS databases used.
    """
    teacher = db.query(Teacher).filter(Teacher.email == form_data.username).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )
    
    import jwt
    from datetime import datetime, timezone, timedelta

    payload = {
        "sub": str(teacher.id),
        "email": teacher.email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "aud": "authenticated"
    }

    # Using a local secret key instead of a Supabase external secret
    secret_key = settings.SECRET_KEY if hasattr(settings, "SECRET_KEY") else "local_self_hosted_jwt_secret"
    encoded = jwt.encode(payload, secret_key, algorithm=settings.JWT_ALGORITHM)
    return {"access_token": encoded, "token_type": "bearer"}

from pydantic import BaseModel
class MockSignupRequest(BaseModel):
    email: str
    password: str
    name: str

@router.post("/mock_signup")
def mock_signup(req: MockSignupRequest, db: Session = Depends(deps.get_db)):
    """Mock signup for local dev without Supabase"""
    import jwt, uuid
    from datetime import datetime, timezone, timedelta
    
    teacher = db.query(Teacher).filter(Teacher.email == req.email).first()
    if not teacher:
        teacher = Teacher(id=str(uuid.uuid4()), email=req.email, name=req.name)
        db.add(teacher)
        db.commit()
        db.refresh(teacher)

    payload = {
        "sub": teacher.id,
        "email": teacher.email,
        "user_metadata": {"full_name": teacher.name},
        "exp": datetime.now(timezone.utc) + timedelta(days=365),
        "aud": "authenticated"
    }
    from app.core.security import get_supabase_secret
    encoded = jwt.encode(payload, get_supabase_secret(), algorithm=settings.JWT_ALGORITHM)
    return {"access_token": encoded, "user": {"id": teacher.id, "email": teacher.email, "user_metadata": payload["user_metadata"]}}

@router.post("/mock_login")
def mock_login(req: MockSignupRequest, db: Session = Depends(deps.get_db)):
    """Mock login for local dev without Supabase"""
    teacher = db.query(Teacher).filter(Teacher.email == req.email).first()
    if not teacher:
        raise HTTPException(status_code=401, detail="User not found")
        
    import jwt
    from datetime import datetime, timezone, timedelta
    payload = {
        "sub": teacher.id,
        "email": teacher.email,
        "user_metadata": {"full_name": teacher.name},
        "exp": datetime.now(timezone.utc) + timedelta(days=365),
        "aud": "authenticated"
    }
    from app.core.security import get_supabase_secret
    encoded = jwt.encode(payload, get_supabase_secret(), algorithm=settings.JWT_ALGORITHM)
    return {"access_token": encoded, "user": {"id": teacher.id, "email": teacher.email, "user_metadata": payload["user_metadata"]}}


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
