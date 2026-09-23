import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.auth import Token, UserLogin, UserRegister, ProfileSyncRequest, TeacherResponse
from app.models.teacher import Teacher
from app.core.config import settings
from app.core.security import create_access_token
from app.core.rate_limit import strict_rate_limiter

router = APIRouter()


def hash_password(password: str) -> str:
    """Hash a password with bcrypt (open source, industry standard)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


@router.post("/signup", response_model=Token, dependencies=[Depends(strict_rate_limiter)])
def signup(req: UserRegister, db: Session = Depends(deps.get_db)):
    """
    Create a real local teacher account. Passwords are bcrypt-hashed;
    tokens are signed locally. No external auth SaaS involved.
    """
    email = req.email.strip().lower()
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = db.query(Teacher).filter(Teacher.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    teacher = Teacher(
        id=str(uuid.uuid4()),
        email=email,
        name=(req.name or email.split("@")[0]).strip(),
        password_hash=hash_password(req.password),
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    token = create_access_token(subject=teacher.id, email=teacher.email, name=teacher.name)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=Token, dependencies=[Depends(strict_rate_limiter)])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(deps.get_db)):
    """
    Self-hosted JWT login with real password verification. No external SaaS.
    """
    teacher = db.query(Teacher).filter(Teacher.email == form_data.username.strip().lower()).first()
    if not teacher or not teacher.password_hash or not verify_password(form_data.password, teacher.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=teacher.id, email=teacher.email, name=teacher.name)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/token", response_model=Token, dependencies=[Depends(strict_rate_limiter)])
def token_json(req: UserLogin, db: Session = Depends(deps.get_db)):
    """JSON-body variant of login for clients that don't use form encoding."""
    teacher = db.query(Teacher).filter(Teacher.email == req.email.strip().lower()).first()
    if not teacher or not teacher.password_hash or not verify_password(req.password, teacher.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = create_access_token(subject=teacher.id, email=teacher.email, name=teacher.name)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=TeacherResponse)
def read_current_user(current_user: Teacher = Depends(deps.get_current_user)):
    """Returns the authenticated teacher details."""
    return current_user


@router.post("/sync", response_model=TeacherResponse, dependencies=[Depends(strict_rate_limiter)])
def sync_profile(
    profile_in: ProfileSyncRequest,
    db: Session = Depends(deps.get_db),
    current_user: Teacher = Depends(deps.get_current_user),
):
    """Syncs additional profile fields (e.g. name update) from the frontend."""
    current_user.name = profile_in.name
    db.commit()
    db.refresh(current_user)
    return current_user
