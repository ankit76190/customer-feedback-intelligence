import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.dataset_store import dataset_store
from app.services.insights_reporter import InsightsReporterService

client = TestClient(app)

def test_ai_insights_endpoint_sample_saas():
    response = client.get("/api/feedback/insights?dataset_id=sample-saas")
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    data = res_data["data"]
    
    assert data["dataset_id"] == "sample-saas"
    assert data["total_records"] == 50
    assert data["analyzed_records"] == 50
    assert data["completion_rate"] == 100.0
    assert "OBSERVED EVIDENCE" in data["executive_summary"]
    assert "AI SYNTHESIS" in data["executive_summary"]
    
    # Verify recurring themes have quotes and real record IDs
    assert len(data["top_recurring_themes"]) > 0
    theme = data["top_recurring_themes"][0]
    assert theme["observed_count"] > 0
    assert len(theme["sample_record_ids"]) > 0
    assert theme["sample_record_ids"][0].startswith("FB-")

    # Verify pain points have frequency, urgency, and sample quotes
    assert len(data["frequent_pain_points"]) > 0
    pp = data["frequent_pain_points"][0]
    assert pp["frequency"] > 0
    assert pp["urgency"] in ["High", "Medium", "Low"]
    assert len(pp["referenced_record_ids"]) > 0

    # Verify positive highlights
    assert len(data["positive_highlights"]) > 0
    ph = data["positive_highlights"][0]
    assert ph["frequency"] > 0

    # Verify temporal trends observation
    assert data["temporal_trends"]["has_sufficient_data"] is True
    assert data["temporal_trends"]["dated_count"] == 50

    # Verify actionable recommendations
    assert len(data["actionable_recommendations"]) > 0
    rec = data["actionable_recommendations"][0]
    assert len(rec["supporting_evidence"]) > 0
    assert len(rec["referenced_record_ids"]) > 0

    # Verify representative examples
    assert len(data["representative_examples"]) > 0
    ex = data["representative_examples"][0]
    assert ex["record_id"].startswith("FB-")
    assert ex["verbatim_text"] != ""

    # Verify limitations and manual review disclosures
    assert len(data["limitations_and_disclosures"]) >= 3
    assert any("Manual Review Queue" in d for d in data["limitations_and_disclosures"])

def test_ai_insights_zero_records():
    response = client.get("/api/feedback/insights?dataset_id=fixture-zero-records")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total_records"] == 0
    assert data["analyzed_records"] == 0
    assert "No customer feedback records were found" in data["executive_summary"]
    assert data["temporal_trends"]["has_sufficient_data"] is False

def test_ai_insights_missing_dates():
    response = client.get("/api/feedback/insights?dataset_id=fixture-missing-dates")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total_records"] == 3
    # Less than 2 distinct dates and <5 records means insufficient data disclosure
    assert data["temporal_trends"]["has_sufficient_data"] is False
    assert "Chronological trends omitted" in data["temporal_trends"]["observation"]

def test_csv_export_endpoint():
    response = client.get("/api/feedback/export/csv?dataset_id=sample-saas")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]
    content = response.content.decode("utf-8-sig")
    assert "Record ID,Row #,Date" in content
    assert "FB-1001" in content
    assert "Performance" in content

def test_export_with_filters():
    # Filter by sentiment=Positive
    res_excel = client.get("/api/feedback/export/excel?dataset_id=sample-saas&sentiment=Positive")
    assert res_excel.status_code == 200
    assert len(res_excel.content) > 1000

    res_csv = client.get("/api/feedback/export/csv?dataset_id=sample-saas&sentiment=Negative")
    assert res_csv.status_code == 200
    content = res_csv.content.decode("utf-8-sig")
    assert "Negative" in content
