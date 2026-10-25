import os
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings
from app.models.responses import StandardResponse
from app.services.gemini_analyzer import GeminiAnalyzerService
from app.services.dataset_store import dataset_store

router = APIRouter(prefix="/api/system", tags=["System"])

class ApiKeyUpdate(BaseModel):
    api_key: str
    model: Optional[str] = "gemini-2.5-flash"

@router.get("/status", response_model=StandardResponse[dict])
async def get_system_status():
    """Returns the operational status of the Gemini API client and server configuration."""
    analyzer = GeminiAnalyzerService()
    is_configured = analyzer.is_configured()

    masked_key = ""
    if is_configured and analyzer.api_key:
        clean = analyzer.api_key.strip()
        if len(clean) > 8:
            masked_key = clean[:4] + "..." + clean[-4:]
        else:
            masked_key = "***"

    return StandardResponse(
        data={
            "api_key_configured": is_configured,
            "masked_key": masked_key,
            "gemini_model": analyzer.model_name,
            "environment": settings.ENVIRONMENT,
            "active_datasets": dataset_store.list_datasets()
        }
    )

@router.post("/configure-key", response_model=StandardResponse[dict])
async def configure_api_key(payload: ApiKeyUpdate):
    """Allows setting or updating the Gemini API key during user session."""
    key = payload.api_key.strip()
    if not key:
        return StandardResponse(success=False, error="API key cannot be empty")

    os.environ["GEMINI_API_KEY"] = key
    if payload.model:
        os.environ["GEMINI_MODEL"] = payload.model.strip()

    analyzer = GeminiAnalyzerService(api_key=key, model_name=payload.model)
    return StandardResponse(
        data={
            "api_key_configured": analyzer.is_configured(),
            "gemini_model": analyzer.model_name,
            "masked_key": key[:4] + "..." + key[-4:] if len(key) > 8 else "***"
        },
        message="Gemini API credentials successfully updated for this session."
    )

@router.post("/load-sample", response_model=StandardResponse[dict])
async def reload_sample_data():
    """Resets or re-loads the realistic enterprise sample dataset."""
    dataset_store._load_default_sample()
    dataset = dataset_store.get_dataset("sample-saas")
    count = len(dataset["records"]) if dataset else 0
    return StandardResponse(
        data={"dataset_id": "sample-saas", "total_records": count},
        message=f"Sample dataset loaded with {count} enterprise customer records."
    )
