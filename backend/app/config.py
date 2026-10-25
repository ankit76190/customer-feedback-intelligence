import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    PORT: int = 8000
    HOST: str = "127.0.0.1"
    ENVIRONMENT: str = "development"
    MAX_BATCH_SIZE: int = 10
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB max upload
    MAX_ROW_COUNT: int = 20000                     # 20,000 rows max
    MAX_TEXT_LENGTH: int = 5000                    # 5,000 chars text length threshold
    UPLOAD_DIR: Path = Path(__file__).parent.parent / "data" / "uploads"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ]

    model_config = SettingsConfigDict(
        env_file=os.path.join(Path(__file__).parent.parent, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
# Ensure upload directory exists safely
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
