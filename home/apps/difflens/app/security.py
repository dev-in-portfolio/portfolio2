import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import Header, HTTPException, Request


async def get_user_key(x_user_key: str = Header(None)) -> str:
    if not x_user_key or not isinstance(x_user_key, str):
        raise HTTPException(status_code=400, detail="Missing x-user-key header.")
    if len(x_user_key) > 200:
        raise HTTPException(status_code=400, detail="Invalid x-user-key header.")
    return x_user_key


class RateLimiter:
    def __init__(self, max_requests: int = 60, window_seconds: int = 600):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.time()
        window_start = now - self.window_seconds
        hits = self._hits[key]
        while hits and hits[0] < window_start:
            hits.popleft()
        if len(hits) >= self.max_requests:
            return False
        hits.append(now)
        return True


def rate_limit_key(request: Request) -> str:
    user_key = request.headers.get("x-user-key", "anon")
    client_ip = request.client.host if request.client else "unknown"
    return f"{client_ip}:{user_key}"
