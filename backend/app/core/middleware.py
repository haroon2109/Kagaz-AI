import time
import logging
import traceback
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Configure a dedicated security audit logger
logger = logging.getLogger("security_audit")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class SecurityHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Identify client request details
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        path = request.url.path
        
        try:
            response: Response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log successful requests
            logger.info(
                f"AUDIT - IP: {client_ip} | Method: {method} | Path: {path} | "
                f"Status: {response.status_code} | Process Time: {process_time:.4f}s"
            )
            
            # Inject OWASP security headers
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
            
            # Enforce HSTS (HTTPS) if requested over TLS
            is_https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
            if is_https:
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
                
            return response
            
        except Exception as exc:
            # Catch all server errors and log traceback to secure backend file
            process_time = time.time() - start_time
            logger.error(
                f"CRITICAL ERROR - IP: {client_ip} | Method: {method} | Path: {path} | "
                f"Exception: {str(exc)}\n{traceback.format_exc()}"
            )
            
            # Return clean generic JSON to client to avoid information disclosure
            return JSONResponse(
                status_code=500,
                content={"detail": "An unexpected server error occurred. Please contact the system administrator."}
            )
