import uuid
from typing import Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from pydantic import BaseModel

from app.models.feedback import ColumnMapping, UploadPreviewResponse, NormalizationResult
from app.models.responses import StandardResponse, PaginatedRecordsResponse
from app.services.data_cleaner import DataCleanerService
from app.services.gemini_analyzer import GeminiAnalyzerService, MissingApiKeyError
from app.services.dataset_store import dataset_store

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

class NormalizeRequest(BaseModel):
    dataset_id: str
    mapping: ColumnMapping

class AnalyzeRequest(BaseModel):
    dataset_id: str
    batch_size: Optional[int] = 10
    limit: Optional[int] = None

@router.post("/upload", response_model=StandardResponse[UploadPreviewResponse])
async def upload_feedback_file(file: UploadFile = File(...)):
    """Uploads CSV or Excel file, auto-detects columns, and returns a preview."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    contents = await file.read()
    try:
        df = DataCleanerService.read_file(contents, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    dataset_id = str(uuid.uuid4())[:8]
    dataset_store.save_dataset(dataset_id=dataset_id, filename=file.filename, df=df)
    
    preview = DataCleanerService.generate_preview(df, file.filename, dataset_id=dataset_id)
    return StandardResponse(data=preview, message=f"Successfully parsed {file.filename} with {len(df)} records")

@router.post("/normalize", response_model=StandardResponse[NormalizationResult])
async def normalize_dataset(payload: NormalizeRequest):
    """Applies column mappings and normalizes data non-destructively."""
    dataset = dataset_store.get_dataset(payload.dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset '{payload.dataset_id}' not found.")

    try:
        records, summary = DataCleanerService.normalize_dataset(
            df=dataset["df"], 
            mapping=payload.mapping, 
            dataset_id=payload.dataset_id
        )
        dataset_store.save_dataset(
            dataset_id=payload.dataset_id,
            filename=dataset["filename"],
            df=dataset["df"],
            mapping=payload.mapping,
            records=records
        )
        return StandardResponse(data=summary, message=f"Normalized {summary.total_rows} records ({summary.valid_rows} valid, {summary.flagged_rows} flagged)")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Normalization failed: {str(e)}")

@router.post("/analyze", response_model=StandardResponse[dict])
async def analyze_dataset_with_gemini(payload: AnalyzeRequest):
    """
    Executes real Gemini API calls using the official Google Gen AI SDK.
    Batch parses unstructured verbatim comments into typed sentiment, themes, pain points, and summaries.
    """
    dataset = dataset_store.get_dataset(payload.dataset_id)
    if not dataset or not dataset["records"]:
        raise HTTPException(
            status_code=404, 
            detail=f"Dataset '{payload.dataset_id}' not found or contains no normalized records."
        )

    records = dataset["records"]
    analyzer = GeminiAnalyzerService()

    if not analyzer.is_configured():
        raise HTTPException(
            status_code=400,
            detail="Gemini API Key is not configured. Please set GEMINI_API_KEY in your environment or enter it via the Settings drawer."
        )

    try:
        analyzed_records, metadata = analyzer.analyze_dataset(
            records=records,
            batch_size=payload.batch_size or 10,
            limit=payload.limit
        )
        dataset_store.update_records(payload.dataset_id, analyzed_records)

        return StandardResponse(
            data=metadata,
            message=f"Gemini analysis complete: {metadata['successfully_analyzed']} records processed in {metadata['duration_seconds']}s"
        )
    except MissingApiKeyError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini analysis error: {str(e)}")

@router.get("/records", response_model=StandardResponse[PaginatedRecordsResponse])
async def get_records(
    dataset_id: str = Query("sample-saas", description="Active dataset identifier"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
    theme: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    category: Optional[str] = Query(None)
):
    """Returns paginated, searchable, and filtered feedback records."""
    records, total, themes, sentiment_counts = dataset_store.query_records(
        dataset_id=dataset_id,
        page=page,
        limit=limit,
        search=search,
        sentiment=sentiment,
        theme=theme,
        start_date=start_date,
        end_date=end_date,
        product=product,
        category=category
    )
    total_pages = max(1, (total + limit - 1) // limit)

    return StandardResponse(
        data=PaginatedRecordsResponse(
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            records=records,
            available_themes=themes,
            sentiment_filter_counts=sentiment_counts
        )
    )
