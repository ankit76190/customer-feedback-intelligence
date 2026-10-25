from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class StandardResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[T] = None
    error: Optional[str] = None

class PaginatedRecordsResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    records: List[Any]
    available_themes: List[str]
    sentiment_filter_counts: dict
