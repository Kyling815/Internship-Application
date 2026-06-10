import json
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(ROOT_ENV_FILE, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "AI-Powered Internship Application Tracker"
    ENVIRONMENT: str = "development"
    APP_DEBUG: bool = True

    DATABASE_URL: str = "sqlite:///./local_dev.db"
    SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    STORAGE_BACKEND: str = "local"
    LOCAL_UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_UPLOAD_EXTENSIONS: str = ".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"

    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AWS_SESSION_TOKEN: str | None = None
    S3_BUCKET: str | None = None
    S3_ENDPOINT_URL: str | None = None
    S3_PUBLIC_BASE_URL: str | None = None

    @staticmethod
    def _parse_list(value: str) -> list[str]:
        raw = value.strip()
        if not raw:
            return []
        if raw.startswith("["):
            return json.loads(raw)
        return [item.strip() for item in raw.split(",") if item.strip()]

    @property
    def cors_origins(self) -> list[str]:
        return self._parse_list(self.BACKEND_CORS_ORIGINS)

    @property
    def allowed_upload_extensions(self) -> list[str]:
        return [extension.lower() for extension in self._parse_list(self.ALLOWED_UPLOAD_EXTENSIONS)]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
