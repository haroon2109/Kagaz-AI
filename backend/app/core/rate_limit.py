import time
from threading import Lock
from collections import defaultdict
from fastapi import Request, HTTPException, status

class InMemoryRateLimiter:
    def __init__(self, limit: int, window_seconds: int = 60):
        self.limit = limit
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
        self.lock = Lock()

    def __call__(self, request: Request):
        # Identify client by IP address
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        
        with self.lock:
            # Filter timestamps outside the sliding window
            timestamps = self.requests[client_ip]
            valid_timestamps = [t for t in timestamps if current_time - t < self.window_seconds]
            
            if len(valid_timestamps) >= self.limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {self.limit} requests per {self.window_seconds} seconds. Please try again later."
                )
            
            valid_timestamps.append(current_time)
            self.requests[client_ip] = valid_timestamps

# Rate limiter instances:
# 1. Global general limiter (60 req / min)
global_rate_limiter = InMemoryRateLimiter(limit=60, window_seconds=60)

# 2. Strict limiter for auth, generation & sync (5 req / min)
strict_rate_limiter = InMemoryRateLimiter(limit=5, window_seconds=60)
