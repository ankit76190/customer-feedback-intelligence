import pytest
import pandas as pd
from app.services.data_cleaner import DataCleanerService
from app.models.feedback import ColumnMapping

def test_auto_detect_columns():
    cols = ["customer_feedback", "feedback_id", "created_at", "rating", "channel"]
    mapping = DataCleanerService.auto_detect_mapping(cols)
    assert mapping.feedback_text_col == "customer_feedback"
    assert mapping.id_col == "feedback_id"
    assert mapping.date_col == "created_at"
    assert mapping.rating_col == "rating"
    assert mapping.category_col == "channel"

def test_auto_detect_columns_feedback_id_first():
    cols = ["feedback_id", "customer_id", "created_at", "product_name", "rating", "channel", "industry", "customer_feedback"]
    mapping = DataCleanerService.auto_detect_mapping(cols)
    assert mapping.feedback_text_col == "customer_feedback"
    assert mapping.id_col == "feedback_id"
    assert mapping.date_col == "created_at"
    assert mapping.product_col == "product_name"
    assert mapping.rating_col == "rating"
    assert mapping.category_col == "channel"

def test_non_destructive_cleaning_preserves_rows():
    # DataFrame with one good row, one row with missing feedback, and one row with whitespace
    data = {
        "text": ["Great product!", None, "   Too expensive   "],
        "id": ["1", "2", "3"]
    }
    df = pd.DataFrame(data)
    mapping = ColumnMapping(feedback_text_col="text", id_col="id")
    
    records, summary = DataCleanerService.normalize_dataset(df, mapping, dataset_id="test-1")
    
    # Assert NO records were silently dropped
    assert len(records) == 3
    assert summary.total_raw_rows == 3
    assert summary.accepted_records == 2
    assert summary.flagged_records == 1
    
    # Assert second record is flagged with missing_feedback_text
    assert records[1].is_valid is False
    assert "missing_feedback_text" in records[1].flagged_reasons
    
    # Assert third record has whitespace stripped
    assert records[2].cleaned_text == "Too expensive"
    assert records[2].is_valid is True
