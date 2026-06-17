import base64
import jwt
from typing import Union, Dict, Any
from app.core.config import settings

def get_supabase_secret() -> bytes:
    """
    Decodes the Supabase JWT secret. If it is base64-encoded (default for Supabase),
    it decodes it, ensuring proper padding. Otherwise, returns it as bytes.
    """
    secret = settings.SUPABASE_JWT_SECRET
    try:
        # Add padding if missing
        missing_padding = len(secret) % 4
        if missing_padding:
            secret += '=' * (4 - missing_padding)
        return base64.b64decode(secret)
    except Exception:
        return secret.encode('utf-8')

def verify_supabase_jwt(token: str) -> Union[Dict[str, Any], None]:
    """
    Verifies a JWT token issued by Supabase Auth using the project's JWT secret.
    Returns the decoded token claims (payload) if valid, or None if invalid.
    """
    try:
        secret_bytes = get_supabase_secret()
        # Decode using HS256 (standard Supabase JWT signature algorithm)
        # Note: we disable audience checking by default as Supabase tokens may contain specific aud claims (e.g. 'authenticated')
        payload = jwt.decode(
            token,
            secret_bytes,
            algorithms=[settings.JWT_ALGORITHM],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        # Token is expired
        return None
    except jwt.PyJWTError:
        # Invalid signature, claims, or padding issues
        # Try decoding without audience constraint as fallback
        try:
            payload = jwt.decode(
                token,
                secret_bytes,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_aud": False}
            )
            return payload
        except jwt.PyJWTError:
            return None
