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
    Verifies a JWT token issued by Supabase Auth using the project's JWT secret
    or dynamically fetched JWKS (JSON Web Key Set) if SUPABASE_JWKS_URL is set.
    Returns the decoded token claims (payload) if valid, or None if invalid.
    """
    
    # ── Option 0: Offline/Mock Auth Bypass ──────────────────────────────────
    if token.startswith("mock_token_"):
        return {
            "sub": "mock_teacher_id_123",
            "email": "teacher@kagaz.ai",
            "user_metadata": {
                "full_name": "Offline Teacher"
            }
        }
    # ── Option A: Asymmetric verification using JWKS (ES256 / RS256) ───────
    if settings.SUPABASE_JWKS_URL:
        try:
            from jwt import PyJWKClient
            jwks_client = PyJWKClient(settings.SUPABASE_JWKS_URL)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated"
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except Exception as e:
            # Avoid using unverified fallbacks. Log warning instead.
            import logging
            logging.getLogger(__name__).warning(f"[Auth] JWKS validation error: {str(e)}. Attempting symmetric fallback.")

    # ── Option B: Symmetric verification using JWT Secret (HS256) ──────────


    try:
        secret_bytes = get_supabase_secret()

        # Decode using HS256 (standard Supabase JWT signature algorithm)
        payload = jwt.decode(
            token,
            secret_bytes,
            algorithms=[settings.JWT_ALGORITHM],
            audience="authenticated"
        )
        return payload
    except (jwt.ExpiredSignatureError, jwt.PyJWTError):
        # Do not use verify_aud=False fallbacks. Fail immediately if validation fails.
        return None

