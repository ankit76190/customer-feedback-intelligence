from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.analysis import AiExecutiveReport
from app.models.responses import StandardResponse
from app.services.analytics_engine import AnalyticsEngine
from app.services.insights_reporter import InsightsReporterService
from app.services.dataset_store import dataset_store

router = APIRouter(prefix="/api/feedback", tags=["AI Insights"])

@router.get("/insights", response_model=StandardResponse[AiExecutiveReport])
async def get_ai_insights_report(
    dataset_id: str = Query("sample-saas", description="Target dataset identifier"),
    start_date: Optional[str] = Query(None, description="Start date filter YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date filter YYYY-MM-DD"),
    sentiment: Optional[str] = Query(None, description="Filter by sentiment: Positive, Negative, Neutral, Needs_Review"),
    theme: Optional[str] = Query(None, description="Filter by theme category"),
    product: Optional[str] = Query(None, description="Filter by product name"),
    category: Optional[str] = Query(None, description="Filter by channel/category"),
    search: Optional[str] = Query(None, description="Filter by text keyword")
):
    """
    Generates a dataset-level AI executive insights report strictly derived from analyzed customer feedback.
    Surfaces:
    - Factual executive summary distinguishing observed counts from AI interpretations.
    - Top recurring themes with verbatim quotes and record IDs.
    - Most frequent negative pain points and urgency classifications.
    - Positive customer highlights.
    - Temporal sentiment shift observations where sufficient calendar data exists.
    - Actionable recommendations supported by verbatim evidence.
    - Representative feedback records across sentiments.
    - Comprehensive data quality audit and limitations disclosures.
    """
    dataset = dataset_store.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    records = dataset.get("records", [])

    # Filter records if requested
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

    report = InsightsReporterService.generate_report(records, dataset_id=dataset_id)
    return StandardResponse(data=report)
