import jwt
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from app.core.config import settings


def create_access_token(subject: str, email: str, name: str = "") -> str:
    """Create a locally-signed JWT access token (HS256, local SECRET_KEY)."""
    payload = {
        "sub": subject,
        "email": email,
        "user_metadata": {"full_name": name or email.split("@")[0]},
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS),
        "aud": "authenticated",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_local_jwt(token: str) -> Dict[str, Any] | None:
    """
    Verify a locally-issued JWT. Returns decoded claims if valid, else None.
    No external auth service involved — the backend is the sole issuer.
    """
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            audience="authenticated",
        )
    except jwt.PyJWTError:
        return None
