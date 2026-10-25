import uuid
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel

from app.models.responses import StandardResponse
from app.models.analysis import AnalysisJobResponse
from app.services.gemini_analyzer import GeminiAnalyzerService, MissingApiKeyError, PROMPT_VERSION
from app.services.repository import DatasetRepository
from app.services.dataset_store import dataset_store

logger = logging.getLogger("feedback_intelligence.routes_analysis")

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

class StartAnalysisRequest(BaseModel):
    dataset_id: str
    batch_size: Optional[int] = 5
    limit: Optional[int] = None
    only_failed: Optional[bool] = False

@router.post("/start", response_model=StandardResponse[AnalysisJobResponse])
async def start_analysis_job(payload: StartAnalysisRequest, background_tasks: BackgroundTasks):
    """
    Initiates a Gemini batch analysis job in the background.
    Checks API key, leverages caching to prevent duplicate calls, and updates progress.
    """
    analyzer = GeminiAnalyzerService()
    if not analyzer.is_configured():
        raise HTTPException(
            status_code=400,
            detail="Gemini API Key is not configured. Please configure GEMINI_API_KEY in your environment or via the Key Settings drawer."
        )

    # Ensure dataset records are in SQLite
    records = DatasetRepository.get_records(payload.dataset_id)
    if not records:
        # Check dataset_store fallback if uploaded before restart
        mem_dataset = dataset_store.get_dataset(payload.dataset_id)
        if mem_dataset and mem_dataset.get("records"):
            DatasetRepository.save_dataset(
                dataset_id=payload.dataset_id,
                filename=mem_dataset["filename"],
                file_size_bytes=mem_dataset.get("file_size_bytes", 0),
                total_raw_rows=len(mem_dataset["records"])
            )
            DatasetRepository.save_records(payload.dataset_id, mem_dataset["records"])
            records = DatasetRepository.get_records(payload.dataset_id)

    if not records:
        raise HTTPException(
            status_code=404,
            detail=f"Dataset '{payload.dataset_id}' not found or contains zero preprocessed records. Please upload and normalize data first."
        )

    target_count = len(records[:payload.limit]) if payload.limit else len(records)
    job_id = str(uuid.uuid4())[:8]

    # Create job in database
    job = DatasetRepository.create_job(
        job_id=job_id,
        dataset_id=payload.dataset_id,
        total_records=target_count,
        batch_size=payload.batch_size or 5,
        model_used=analyzer.model_name,
        prompt_version=PROMPT_VERSION
    )

    # Dispatch to background task
    background_tasks.add_task(
        analyzer.analyze_dataset_job,
        job_id=job_id,
        dataset_id=payload.dataset_id,
        batch_size=payload.batch_size or 5,
        limit=payload.limit,
        only_failed=payload.only_failed or False
    )

    return StandardResponse(
        data=job,
        message=f"Analysis job {job_id} successfully queued for {target_count} records."
    )

@router.get("/status/{job_id}", response_model=StandardResponse[AnalysisJobResponse])
async def get_analysis_job_status(job_id: str):
    """Retrieves real-time progress, processed count, failed count, and status of an analysis job."""
    job = DatasetRepository.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Analysis job '{job_id}' not found.")
    return StandardResponse(data=job)

@router.post("/retry-failed/{job_id}", response_model=StandardResponse[AnalysisJobResponse])
async def retry_failed_analysis(job_id: str, background_tasks: BackgroundTasks):
    """Retries only the records that previously failed during an analysis job."""
    prev_job = DatasetRepository.get_job(job_id)
    if not prev_job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    analyzer = GeminiAnalyzerService()
    if not analyzer.is_configured():
        raise HTTPException(status_code=400, detail="Gemini API Key is not configured.")

    new_job_id = str(uuid.uuid4())[:8]
    job = DatasetRepository.create_job(
        job_id=new_job_id,
        dataset_id=prev_job.dataset_id,
        total_records=prev_job.failed_records or 1,
        batch_size=prev_job.batch_size,
        model_used=analyzer.model_name,
        prompt_version=PROMPT_VERSION
    )

    background_tasks.add_task(
        analyzer.analyze_dataset_job,
        job_id=new_job_id,
        dataset_id=prev_job.dataset_id,
        batch_size=prev_job.batch_size,
        only_failed=True
    )

    return StandardResponse(
        data=job,
        message=f"Retry job {new_job_id} dispatched for failed records."
    )

@router.get("/results/{dataset_id}", response_model=StandardResponse[dict])
async def get_analysis_results(dataset_id: str):
    """Returns dataset records along with their structured AI analysis."""
    records = DatasetRepository.get_records(dataset_id)
    if not records:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    analyzed_count = sum(1 for r in records if r.analysis is not None)
    failed_count = sum(1 for r in records if not r.is_valid or "failed" in r.flagged_reasons)

    return StandardResponse(
        data={
            "dataset_id": dataset_id,
            "total_records": len(records),
            "analyzed_records": analyzed_count,
            "failed_records": failed_count,
            "records": records
        }
    )
