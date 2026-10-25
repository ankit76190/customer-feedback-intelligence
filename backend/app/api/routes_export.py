from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.models.responses import StandardResponse
from app.services.analytics_engine import AnalyticsEngine
from app.services.excel_exporter import ExcelExporterService
from app.services.dataset_store import dataset_store

router = APIRouter(prefix="/api/feedback", tags=["Export"])

@router.get("/export/excel")
async def export_excel_report(
    dataset_id: str = Query("sample-saas", description="Target dataset ID"),
    start_date: Optional[str] = Query(None, description="Start date filter YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date filter YYYY-MM-DD"),
    sentiment: Optional[str] = Query(None, description="Sentiment filter: Positive, Negative, Neutral, Needs_Review"),
    theme: Optional[str] = Query(None, description="Theme category filter"),
    product: Optional[str] = Query(None, description="Product filter"),
    category: Optional[str] = Query(None, description="Channel/category filter"),
    search: Optional[str] = Query(None, description="Keyword text filter")
):
    """
    Generates and streams a professional 4-sheet OpenPyXL executive report:
    Sheets: Feedback, Sentiment Summary, Theme Summary, Data Quality.
    Protects against spreadsheet formula injection across all untrusted text fields.
    Dynamically respects active filtering parameters.
    """
    dataset = dataset_store.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    records = dataset.get("records", [])
    if not records:
        raise HTTPException(status_code=400, detail="Cannot export an empty dataset.")

    # Apply active filters if requested
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
        if not records:
            raise HTTPException(status_code=400, detail="No records matched the selected filter criteria for export.")

    insights = AnalyticsEngine.calculate_insights(records)
    excel_stream = ExcelExporterService.generate_workbook(records, insights)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    filename = f"feedback_report_{dataset_id}_{timestamp}.xlsx"

    return Response(
        content=excel_stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.get("/export/csv")
async def export_csv_report(
    dataset_id: str = Query("sample-saas", description="Target dataset ID"),
    start_date: Optional[str] = Query(None, description="Start date filter YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date filter YYYY-MM-DD"),
    sentiment: Optional[str] = Query(None, description="Sentiment filter: Positive, Negative, Neutral, Needs_Review"),
    theme: Optional[str] = Query(None, description="Theme category filter"),
    product: Optional[str] = Query(None, description="Product filter"),
    category: Optional[str] = Query(None, description="Channel/category filter"),
    search: Optional[str] = Query(None, description="Keyword text filter")
):
    """
    Generates and streams a sanitized CSV file encoded with UTF-8 with BOM (utf-8-sig)
    for seamless Excel / cross-platform viewing, with full formula injection protection.
    """
    dataset = dataset_store.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    records = dataset.get("records", [])
    if not records:
        raise HTTPException(status_code=400, detail="Cannot export an empty dataset.")

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
        if not records:
            raise HTTPException(status_code=400, detail="No records matched the selected filter criteria for export.")

    csv_stream = ExcelExporterService.generate_csv(records)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    filename = f"feedback_records_{dataset_id}_{timestamp}.csv"

    return Response(
        content=csv_stream.getvalue(),
        media_type="text/csv; charset=utf-8-sig",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
