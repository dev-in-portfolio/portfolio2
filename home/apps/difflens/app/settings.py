import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    app_env: str
    port: int
    max_body_chars: int = 250_000
    max_body_bytes: int = 600_000
    max_json_depth: int = 40
    max_json_ops: int = 5_000


def load_settings() -> Settings:
    database_url = os.getenv("DATABASE_URL", "").strip()
    app_env = os.getenv("APP_ENV", "development")
    port = int(os.getenv("PORT", "8000"))
    return Settings(database_url=database_url, app_env=app_env, port=port)
