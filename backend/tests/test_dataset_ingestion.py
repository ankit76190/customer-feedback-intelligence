import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.services.data_cleaner import DataCleanerService
from app.models.feedback import ColumnMapping
from app.config import settings

client = TestClient(app)

def test_valid_csv_upload_and_preview():
    csv_content = b"customer_feedback,rating,created_at,channel\n\"Great platform!\",5,2025-01-01,In-App\n\"Too slow\",2,2025-01-02,Support\n"
    files = {"file": ("test_feedback.csv", io.BytesIO(csv_content), "text/csv")}
    
    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_rows"] == 2
    assert "customer_feedback" in data["data"]["detected_columns"]
    assert data["data"]["suggested_mapping"]["feedback_text_col"] == "customer_feedback"
    
    dataset_id = data["data"]["dataset_id"]
    
    # Test preview endpoint
    preview_res = client.get(f"/api/datasets/{dataset_id}/preview?page=1&limit=10")
    assert preview_res.status_code == 200
    p_data = preview_res.json()
    assert p_data["data"]["total_rows"] == 2
    assert len(p_data["data"]["rows"]) == 2
    assert p_data["data"]["rows"][0]["_original_row_number"] == 2

def test_valid_xlsx_upload_and_sheet_handling():
    # Create an in-memory Excel workbook with two sheets
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df1 = pd.DataFrame({
            "User_Review": ["Loving the fast sync!", "Awesome tool"],
            "Score": [5, 4],
            "Date": ["2025-02-01", "2025-02-02"]
        })
        df2 = pd.DataFrame({
            "Archive_Comment": ["Old review from 2024"],
            "Score": [3]
        })
        df1.to_excel(writer, sheet_name="Q1_Feedback", index=False)
        df2.to_excel(writer, sheet_name="Archive", index=False)
    
    output.seek(0)
    files = {"file": ("multi_sheet.xlsx", output, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    
    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Q1_Feedback" in data["data"]["sheet_names"]
    assert "Archive" in data["data"]["sheet_names"]
    assert data["data"]["active_sheet"] == "Q1_Feedback"
    assert data["data"]["total_rows"] == 2

def test_empty_file_rejected():
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

def test_unsupported_format_rejected():
    files = {"file": ("document.pdf", io.BytesIO(b"%PDF-1.4 simulated"), "application/pdf")}
    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 400
    assert "unsupported" in response.json()["detail"].lower()

def test_oversized_file_rejected(monkeypatch):
    # Temporarily set max upload to 100 bytes for testing
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 100)
    large_bytes = b"a" * 200
    files = {"file": ("large.csv", io.BytesIO(large_bytes), "text/csv")}
    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 400
    assert "exceeds" in response.json()["detail"].lower()

def test_normalization_with_unicode_multiline_and_duplicates():
    csv_text = (
        "id,feedback,rating,date\n"
        "1,\"Line 1\nLine 2 with \u200Bzero-width and \u00e9moji 🚀\",5,2025-01-01\n"
        "2,\"Line 1\nLine 2 with \u200Bzero-width and \u00e9moji 🚀\",5,2025-01-02\n"  # Duplicate verbatim
        "3,\"   \",1,2025-01-03\n"                                                # Blank feedback
        ",,,\n"                                                                     # Entirely blank row
        "4,\"Invalid date test\",3,not-a-real-date\n"                               # Invalid date
    )
    df = pd.read_csv(io.StringIO(csv_text))
    mapping = ColumnMapping(
        feedback_text_col="feedback",
        id_col="id",
        rating_col="rating",
        date_col="date"
    )

    records, summary = DataCleanerService.normalize_dataset(df, mapping, dataset_id="test-norm", filename="test.csv")

    # Assert no silent record discarding
    assert summary.total_raw_rows == 5
    assert summary.skipped_blank_rows == 1  # The entirely blank row was safely skipped and reported
    assert len(records) == 4

    # Record 0: Unicode cleaned, multiline retained, valid
    assert "🚀" in records[0].cleaned_text
    assert "\u200b" not in records[0].cleaned_text
    assert records[0].is_valid is True
    assert records[0].is_duplicate is False

    # Record 1: Flagged as duplicate but preserved
    assert records[1].is_duplicate is True
    assert "duplicate_feedback_verbatim" in records[1].flagged_reasons

    # Record 2: Blank feedback preserved but flagged
    assert records[2].is_valid is False
    assert "blank_feedback_text" in records[2].flagged_reasons

    # Record 3: Invalid date preserved but flagged
    assert "invalid_date_format" in records[3].flagged_reasons
    assert records[3].date == "not-a-real-date"

def test_missing_feedback_column_raises_error():
    df = pd.DataFrame({"some_other_col": [1, 2, 3]})
    mapping = ColumnMapping(feedback_text_col="missing_col")
    with pytest.raises(ValueError, match="not found in dataset"):
        DataCleanerService.normalize_dataset(df, mapping, dataset_id="err-test")

def test_sample_csv_download_endpoint():
    response = client.get("/api/datasets/sample-csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "customer_feedback_sample_500.csv" in response.headers["content-disposition"]
    # Check that 500 rows are present
    lines = response.text.strip().split("\n")
    assert len(lines) >= 500
