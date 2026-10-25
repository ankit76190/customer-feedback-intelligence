from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.analysis import ExecutiveInsights
from app.models.responses import StandardResponse
from app.services.analytics_engine import AnalyticsEngine
from app.services.dataset_store import dataset_store

router = APIRouter(prefix="/api/feedback", tags=["Analytics"])

@router.get("/analytics", response_model=StandardResponse[ExecutiveInsights])
async def get_analytics(
    dataset_id: str = Query("sample-saas", description="Target dataset identifier"),
    start_date: Optional[str] = Query(None, description="Filter records starting from YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Filter records up to YYYY-MM-DD"),
    sentiment: Optional[str] = Query(None, description="Filter by sentiment: Positive, Negative, Neutral, Needs_Review"),
    theme: Optional[str] = Query(None, description="Filter by theme category"),
    product: Optional[str] = Query(None, description="Filter by product name"),
    category: Optional[str] = Query(None, description="Filter by channel/category"),
    search: Optional[str] = Query(None, description="Filter by text keyword")
):
    """
    Returns production-grade, data-driven executive metrics, time-series distributions,
    product/category breakdowns, recurring themes, and pain points.
    All calculations adapt dynamically to active filter parameters.
    """
    dataset = dataset_store.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    records = dataset.get("records", [])

    # Apply filters if any are provided
    if any([start_date, end_date, sentiment, theme, product, category, search]):
        records = AnalyticsEngine.filter_records(
            records=records,
            start_date=start_date,
            end_date=end_date,
            sentiment=sentiment,
            theme=theme,
            product=product,
            category=category,
            search=search
        )

    insights = AnalyticsEngine.calculate_insights(records)
    return StandardResponse(data=insights)
