from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import verify_supabase_jwt
from app.models.teacher import Teacher

# Set up OAuth2 flow pointing to the local login page or token url
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> Teacher:
    """
    Decodes and validates the Supabase JWT.
    If the teacher profile does not exist locally, it auto-provisions it (just-in-time sync).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_supabase_jwt(token)
    if not payload:
        raise credentials_exception
        
    user_id: str = payload.get("sub")
    email: str = payload.get("email")
    
    if not user_id or not email:
        raise credentials_exception
        
    # Query for the teacher in the local database
    teacher = db.query(Teacher).filter(Teacher.id == user_id).first()
    
    # If the teacher does not exist, provision them automatically (just-in-time sync)
    if not teacher:
        # Extract name from user metadata if available and sanitize it
        user_metadata = payload.get("user_metadata", {})
        name_candidate = user_metadata.get("full_name") or user_metadata.get("name") or ""
        name = name_candidate.strip()
        if not name:
            name = email.split("@")[0]
        
        teacher = Teacher(

            id=user_id,
            email=email,
            name=name
        )
        db.add(teacher)
        from sqlalchemy.exc import IntegrityError
        try:
            db.commit()
            db.refresh(teacher)
        except IntegrityError:
            db.rollback()
            # If another concurrent request created this user, query again
            teacher = db.query(Teacher).filter(Teacher.id == user_id).first()
            if not teacher:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error auto-provisioning teacher profile"
                )
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during auto-provisioning: {str(e)}"
            )

                
    return teacher
