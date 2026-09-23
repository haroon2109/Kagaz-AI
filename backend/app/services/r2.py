"""
Cloudflare R2 mirror (optional).

R2 is S3-compatible with zero egress fees and a free tier that never expires or
pauses — used to persist uploaded worksheet scans on hosts with ephemeral disks
(e.g. Render free tier), where local files are wiped on every restart/redeploy.

Design: strictly best-effort. If R2 is unconfigured, unreachable, or errors,
callers fall back to local-disk behavior and the app keeps working. The
`/uploads/{filename}` URL scheme is unchanged — R2 is invisible to the client.
"""

import logging
import os

from app.core.config import settings

logger = logging.getLogger(__name__)


def configured() -> bool:
    """True when all R2 credentials are present."""
    return bool(
        settings.R2_ACCOUNT_ID
        and settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
        and settings.R2_BUCKET
    )


def _client():
    # Imported lazily so environments without boto3 (local dev) still work
    # as long as R2 is not configured.
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(
            signature_version="s3v4",
            connect_timeout=10,
            read_timeout=30,
            retries={"max_attempts": 2, "mode": "standard"},
        ),
    )


def upload_file(local_path: str, key: str, content_type: str = "application/octet-stream") -> bool:
    """Mirror a local file into the R2 bucket. Returns success (best-effort)."""
    if not configured():
        return False
    try:
        _client().upload_file(
            local_path,
            settings.R2_BUCKET,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        return True
    except Exception as e:
        logger.warning(f"[R2] Upload failed for {key}: {e}")
        return False


def download_to(key: str, local_path: str) -> bool:
    """Fetch an object from R2 into a local path (used as an OCR read cache)."""
    if not configured():
        return False
    try:
        os.makedirs(os.path.dirname(local_path) or ".", exist_ok=True)
        _client().download_file(settings.R2_BUCKET, key, local_path)
        return True
    except Exception as e:
        logger.warning(f"[R2] Download failed for {key}: {e}")
        return False


def open_stream(key: str):
    """
    Return (stream, content_type) for direct proxying, or None if unavailable.
    Caller must close the stream.
    """
    if not configured():
        return None
    try:
        resp = _client().get_object(Bucket=settings.R2_BUCKET, Key=key)
        return resp["Body"], resp.get("ContentType") or "application/octet-stream"
    except Exception as e:
        logger.warning(f"[R2] GetObject failed for {key}: {e}")
        return None
