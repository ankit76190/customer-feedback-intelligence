from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from app.models.analysis import FeedbackItemAnalysis

class ColumnMapping(BaseModel):
    feedback_text_col: str = Field(..., description="Column containing verbatim customer feedback")
    id_col: Optional[str] = Field(None, description="Column containing unique customer or ticket ID")
    date_col: Optional[str] = Field(None, description="Column containing date or timestamp")
    product_col: Optional[str] = Field(None, description="Column containing product name or SKU")
    rating_col: Optional[str] = Field(None, description="Column containing numerical rating (e.g. 1-5)")
    category_col: Optional[str] = Field(None, description="Column containing existing raw category or channel")

class FeedbackRecord(BaseModel):
    id: str
    original_row_number: int = Field(..., description="1-indexed row number from the source spreadsheet/CSV")
    original_text: str = Field(..., description="Verbatim customer comment strictly preserved")
    cleaned_text: str = Field(..., description="Normalized text stored separately")
    customer_id: Optional[str] = None
    product: Optional[str] = None
    date: Optional[str] = None
    rating: Optional[float] = None
    category: Optional[str] = None
    is_valid: bool = True
    is_duplicate: bool = False
    flagged_reasons: List[str] = Field(default_factory=list)
    analysis: Optional[FeedbackItemAnalysis] = None

class UploadPreviewResponse(BaseModel):
    dataset_id: str
    filename: str
    file_size_bytes: int
    sheet_names: List[str] = Field(default_factory=list)
    active_sheet: Optional[str] = None
    total_rows: int
    detected_columns: List[str]
    suggested_mapping: ColumnMapping
    preview_rows: List[Dict[str, Any]]

class NormalizationResult(BaseModel):
    dataset_id: str
    filename: str
    total_raw_rows: int
    accepted_records: int
    flagged_records: int
    skipped_blank_rows: int
    duplicate_records_count: int
    flagged_reasons_summary: Dict[str, int]
    sample_cleaned_records: List[FeedbackRecord]

class DatasetSummaryResponse(BaseModel):
    dataset_id: str
    filename: str
    file_size_bytes: int
    created_at: str
    sheet_names: List[str] = Field(default_factory=list)
    active_sheet: Optional[str] = None
    total_raw_rows: int
    accepted_records: int
    flagged_records: int
    skipped_blank_rows: int
    mapping: Optional[ColumnMapping] = None
    flagged_reasons_summary: Dict[str, int] = Field(default_factory=dict)
