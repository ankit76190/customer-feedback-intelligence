import os
import re
import uuid
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Form
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from app.config import settings
from app.models.feedback import (
    ColumnMapping, 
    UploadPreviewResponse, 
    NormalizationResult,
    DatasetSummaryResponse
)
from app.models.responses import StandardResponse
from app.services.data_cleaner import DataCleanerService
from app.services.dataset_store import dataset_store

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

class NormalizeRequest(BaseModel):
    mapping: ColumnMapping

def sanitize_filename(filename: str) -> str:
    """Sanitizes filename and prevents directory traversal attacks."""
    # Strip any directory path components
    basename = os.path.basename(filename)
    # Remove null bytes and characters outside safe set
    cleaned = re.sub(r'[^a-zA-Z0-9_.-]', '_', basename)
    # Collapse multiple dots or underscores
    cleaned = re.sub(r'\.{2,}', '.', cleaned)
    return cleaned or "uploaded_dataset.csv"

@router.post("/upload", response_model=StandardResponse[UploadPreviewResponse])
async def upload_dataset_file(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None)
):
    """
    Uploads CSV, XLSX, or XLS files.
    Validates file extension, size limit (25MB), row limit (20,000), and safely stores in isolated uploads folder.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected for upload.")

    safe_name = sanitize_filename(file.filename)
    ext = Path(safe_name).suffix.lower()
    if ext not in DataCleanerService.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported formats: {', '.join(sorted(DataCleanerService.ALLOWED_EXTENSIONS))}"
        )

    # Read bytes safely with size check
    contents = await file.read()
    file_size = len(contents)
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")
    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=400, 
            detail=f"File exceeds maximum upload size limit of {max_mb} MB (Uploaded size: {file_size / (1024*1024):.1f} MB)."
        )

    dataset_id = str(uuid.uuid4())[:8]

    # Save to dedicated safe upload directory preventing traversal
    safe_stored_path = settings.UPLOAD_DIR / f"{dataset_id}_{safe_name}"
    try:
        with open(safe_stored_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to securely persist uploaded file: {str(e)}")

    # Parse dataset with Pandas
    try:
        df, sheets, active_sheet = DataCleanerService.read_file(contents, safe_name, sheet_name=sheet_name)
    except ValueError as e:
        # Remove temporary file if validation fails
        if safe_stored_path.exists():
            safe_stored_path.unlink()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if safe_stored_path.exists():
            safe_stored_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

    preview = DataCleanerService.generate_preview(
        df=df,
        filename=safe_name,
        dataset_id=dataset_id,
        file_size_bytes=file_size,
        sheet_names=sheets,
        active_sheet=active_sheet
    )

    dataset_store.save_dataset(
        dataset_id=dataset_id,
        filename=safe_name,
        df=df,
        file_size_bytes=file_size,
        sheet_names=sheets,
        active_sheet=active_sheet
    )

    sheet_msg = f" (Sheet: {active_sheet})" if active_sheet else ""
    return StandardResponse(
        data=preview,
        message=f"Successfully uploaded and validated {safe_name}{sheet_msg} ({len(df):,} rows)."
    )

@router.get("/{dataset_id}/preview", response_model=StandardResponse[dict])
async def get_dataset_preview(
    dataset_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    sheet_name: Optional[str] = Query(None)
):
    """Returns paginated, searchable preview rows of the raw uploaded table."""
    dataset = dataset_store.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    # If sheet_name was passed and differs from current active sheet, switch sheet
    if sheet_name and sheet_name != dataset.get("active_sheet") and dataset.get("sheet_names"):
        # Re-read from stored file
        safe_name = dataset["filename"]
        stored_path = settings.UPLOAD_DIR / f"{dataset_id}_{safe_name}"
        if stored_path.exists():
            with open(stored_path, "rb") as f:
                raw_bytes = f.read()
            df, sheets, active_sheet = DataCleanerService.read_file(raw_bytes, safe_name, sheet_name=sheet_name)
            dataset_store.save_dataset(
                dataset_id=dataset_id,
                filename=safe_name,
                df=df,
                file_size_bytes=len(raw_bytes),
                sheet_names=sheets,
                active_sheet=active_sheet
            )

    rows, total, columns = dataset_store.query_raw_preview(
        dataset_id=dataset_id,
        page=page,
        limit=limit,
        search=search
    )
    total_pages = max(1, (total + limit - 1) // limit)

    return StandardResponse(
        data={
            "dataset_id": dataset_id,
            "filename": dataset["filename"],
            "sheet_names": dataset.get("sheet_names", []),
            "active_sheet": dataset.get("active_sheet"),
            "columns": columns,
            "total_rows": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "rows": rows
        }
    )

@router.get("/{dataset_id}/summary", response_model=StandardResponse[DatasetSummaryResponse])
async def get_dataset_summary(dataset_id: str):
    """Returns dataset summary, accepted/flagged/skipped record counts, and audit flags."""
    summary = dataset_store.get_summary(dataset_id)
    if not summary:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")
    return StandardResponse(data=summary)

@router.post("/{dataset_id}/normalize", response_model=StandardResponse[NormalizationResult])
async def normalize_dataset(dataset_id: str, payload: NormalizeRequest):
    """Normalizes dataset with user-selected column mappings non-destructively."""
    dataset = dataset_store.get_dataset(dataset_id)
    if not dataset or "df" not in dataset or dataset["df"] is None:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found or has no loaded data.")

    try:
        records, summary = DataCleanerService.normalize_dataset(
            df=dataset["df"],
            mapping=payload.mapping,
            dataset_id=dataset_id,
            filename=dataset["filename"]
        )
        dataset_store.save_dataset(
            dataset_id=dataset_id,
            filename=dataset["filename"],
            df=dataset["df"],
            file_size_bytes=dataset.get("file_size_bytes", 0),
            sheet_names=dataset.get("sheet_names", []),
            active_sheet=dataset.get("active_sheet"),
            mapping=payload.mapping,
            records=records,
            summary=summary
        )
        return StandardResponse(
            data=summary,
            message=(
                f"Normalized {summary.total_raw_rows:,} rows: {summary.accepted_records:,} accepted, "
                f"{summary.flagged_records:,} flagged with audit notes, {summary.skipped_blank_rows} blank rows skipped."
            )
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Normalization failed: {str(e)}")

@router.get("/sample-csv")
async def download_sample_csv():
    """Streams the synthetic 500-entry customer feedback sample CSV file."""
    sample_file = Path(__file__).parent.parent / "data" / "sample_feedback_500.csv"
    if not sample_file.exists():
        # Fallback to base sample file if 500 isn't present
        sample_file = Path(__file__).parent.parent / "data" / "sample_feedback.csv"

    if not sample_file.exists():
        raise HTTPException(status_code=404, detail="Sample CSV dataset not found.")

    return FileResponse(
        path=str(sample_file),
        filename="customer_feedback_sample_500.csv",
        media_type="text/csv"
    )
