import re
import io
import uuid
import unicodedata
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Set
import pandas as pd
import numpy as np
import openpyxl

from app.config import settings
from app.models.feedback import (
    ColumnMapping, 
    FeedbackRecord, 
    NormalizationResult, 
    UploadPreviewResponse,
    DatasetSummaryResponse
)

logger = logging.getLogger("feedback_intelligence.cleaner")

class DataCleanerService:
    """Enterprise non-destructive customer feedback ingestion and preprocessing service."""

    FEEDBACK_CANDIDATES = [
        "feedback", "customer_feedback", "review", "customer_review", 
        "comment", "comments", "text", "description", "message", "verbatim", "body"
    ]
    ID_CANDIDATES = [
        "id", "feedback_id", "ticket_id", "customer_id", "user_id", "uuid", "ref", "record_id"
    ]
    DATE_CANDIDATES = [
        "date", "created_at", "timestamp", "time", "submitted_at", "datetime"
    ]
    PRODUCT_CANDIDATES = [
        "product", "item", "service", "feature", "sku", "plan", "tier", "offering"
    ]
    RATING_CANDIDATES = [
        "rating", "score", "stars", "csat", "nps", "sentiment_score"
    ]
    CATEGORY_CANDIDATES = [
        "channel", "category", "source", "type", "department", "topic", "tag"
    ]

    ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}

    @classmethod
    def get_sheet_names(cls, file_bytes: bytes, filename: str) -> List[str]:
        """Returns available sheet names for Excel workbooks."""
        filename_lower = filename.lower()
        if filename_lower.endswith(".xlsx"):
            try:
                wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True)
                return wb.sheetnames
            except Exception as e:
                logger.warning(f"Could not read sheet names with openpyxl: {e}")
                return ["Sheet1"]
        elif filename_lower.endswith(".xls"):
            try:
                import xlrd
                wb = xlrd.open_workbook(file_contents=file_bytes, on_demand=True)
                return wb.sheet_names()
            except Exception as e:
                logger.warning(f"Could not read sheet names with xlrd: {e}")
                return ["Sheet1"]
        return []

    @classmethod
    def read_file(
        cls, 
        file_bytes: bytes, 
        filename: str, 
        sheet_name: Optional[str] = None
    ) -> Tuple[pd.DataFrame, List[str], Optional[str]]:
        """Reads CSV or Excel bytes into a Pandas DataFrame safely handling encodings and sheets."""
        if len(file_bytes) == 0:
            raise ValueError(f"Uploaded file '{filename}' is empty (0 bytes).")
        
        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
            raise ValueError(f"File size exceeds maximum permitted limit of {max_mb:.0f} MB.")

        filename_lower = filename.lower()
        ext = Path(filename_lower).suffix
        if ext not in cls.ALLOWED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file format '{ext}'. Supported formats: {', '.join(cls.ALLOWED_EXTENSIONS)}"
            )

        sheets: List[str] = []
        active_sheet: Optional[str] = None

        if ext == ".csv":
            # Attempt diverse encodings safely
            encodings = ["utf-8-sig", "utf-8", "latin1", "cp1252"]
            df = None
            for enc in encodings:
                try:
                    df = pd.read_csv(io.BytesIO(file_bytes), encoding=enc)
                    break
                except (UnicodeDecodeError, Exception):
                    continue

            if df is None:
                raise ValueError(f"Unable to parse CSV file '{filename}'. Invalid text encoding.")
        else:
            # Excel workbook
            sheets = cls.get_sheet_names(file_bytes, filename)
            chosen_sheet = sheet_name if sheet_name and sheet_name in sheets else (sheets[0] if sheets else None)
            active_sheet = chosen_sheet

            try:
                if ext == ".xlsx":
                    df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=chosen_sheet, engine="openpyxl")
                else:
                    df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=chosen_sheet, engine="xlrd")
            except Exception as e:
                raise ValueError(f"Failed to read Excel workbook '{filename}': {str(e)}")

        if df is None or len(df.columns) == 0:
            raise ValueError(f"File '{filename}' contains no readable columns or data table.")

        if len(df) == 0:
            raise ValueError(f"File '{filename}' contains headers but zero data rows.")

        if len(df) > settings.MAX_ROW_COUNT:
            raise ValueError(
                f"Dataset exceeds maximum allowed limit of {settings.MAX_ROW_COUNT} rows (Found: {len(df)} rows)."
            )

        # Clean and sanitize column headers
        clean_columns = []
        for i, col in enumerate(df.columns):
            col_str = str(col).strip()
            if not col_str or col_str.lower().startswith("unnamed:"):
                col_str = f"Column_{i + 1}"
            clean_columns.append(col_str)
        df.columns = clean_columns

        return df, sheets, active_sheet

    @classmethod
    def auto_detect_mapping(cls, columns: List[str]) -> ColumnMapping:
        """Heuristically detects which columns correspond to feedback, id, date, product, rating, and category."""
        col_lower = {col.lower().replace(" ", "_").replace("-", "_"): col for col in columns}

        def find_match(candidates: List[str], exclude_id_patterns: bool = False) -> Optional[str]:
            # Pass 1: Exact match
            for cand in candidates:
                for norm_col, orig_col in col_lower.items():
                    if exclude_id_patterns and (norm_col.endswith("_id") or norm_col.startswith("id_") or norm_col == "id"):
                        continue
                    if cand == norm_col:
                        return orig_col

            # Pass 2: Substring match
            for cand in candidates:
                for norm_col, orig_col in col_lower.items():
                    if exclude_id_patterns and (norm_col.endswith("_id") or norm_col.startswith("id_") or norm_col == "id"):
                        continue
                    if cand in norm_col:
                        return orig_col
            return None

        # Feedback text should exclude id patterns so feedback_id isn't picked over customer_feedback
        feedback_col = find_match(cls.FEEDBACK_CANDIDATES, exclude_id_patterns=True)
        if not feedback_col:
            # Fallback if no non-id feedback candidate found
            feedback_col = find_match(cls.FEEDBACK_CANDIDATES) or (columns[0] if columns else "")

        id_col = find_match(cls.ID_CANDIDATES)
        date_col = find_match(cls.DATE_CANDIDATES)
        product_col = find_match(cls.PRODUCT_CANDIDATES)
        rating_col = find_match(cls.RATING_CANDIDATES)
        category_col = find_match(cls.CATEGORY_CANDIDATES)

        return ColumnMapping(
            feedback_text_col=feedback_col,
            id_col=id_col,
            date_col=date_col,
            product_col=product_col,
            rating_col=rating_col,
            category_col=category_col,
        )

    @classmethod
    def generate_preview(
        cls, 
        df: pd.DataFrame, 
        filename: str, 
        dataset_id: str,
        file_size_bytes: int,
        sheet_names: List[str] = [],
        active_sheet: Optional[str] = None
    ) -> UploadPreviewResponse:
        """Generates preview rows and detects column mapping for client verification."""
        columns = [str(c) for c in df.columns.tolist()]
        suggested_mapping = cls.auto_detect_mapping(columns)
        
        # Replace NaN with None for clean JSON serialization
        preview_df = df.head(10).replace({np.nan: None})
        preview_rows = preview_df.to_dict(orient="records")

        # Add 1-indexed original_row_number to each preview row
        for idx, row in enumerate(preview_rows):
            row["_original_row_number"] = idx + 2  # Row 1 is header

        return UploadPreviewResponse(
            dataset_id=dataset_id,
            filename=filename,
            file_size_bytes=file_size_bytes,
            sheet_names=sheet_names,
            active_sheet=active_sheet,
            total_rows=len(df),
            detected_columns=columns,
            suggested_mapping=suggested_mapping,
            preview_rows=preview_rows
        )

    @staticmethod
    def clean_text(raw_val: Any) -> Tuple[str, List[str]]:
        """
        Cleans and normalizes feedback text without deleting records.
        Preserves original verbatim and returns cleaned text with audit flags.
        """
        flags: List[str] = []
        if raw_val is None or pd.isna(raw_val):
            return "", ["missing_feedback_text"]
        
        raw_str = str(raw_val)
        if not raw_str.strip():
            return "", ["blank_feedback_text"]

        # 1. Unicode normalization (NFKC)
        normalized = unicodedata.normalize("NFKC", raw_str)

        # 2. Strip zero-width spaces and unprintable control characters (retain tabs and newlines)
        cleaned = re.sub(r"[\u200B-\u200D\uFEFF]", "", normalized)
        cleaned = "".join(ch for ch in cleaned if ch in ("\n", "\r", "\t") or unicodedata.category(ch)[0] != "C")

        # 3. Normalize multiple whitespace and linebreaks
        cleaned = re.sub(r"\r\n|\r", "\n", cleaned)
        cleaned = re.sub(r"[ \t]+", " ", cleaned)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        cleaned = cleaned.strip()

        if len(cleaned) == 0:
            flags.append("blank_feedback_text")
        elif len(cleaned) < 3:
            flags.append("short_feedback_text")

        if len(cleaned) > settings.MAX_TEXT_LENGTH:
            flags.append("excessive_text_length")

        return cleaned, flags

    @classmethod
    def normalize_dataset(
        cls, 
        df: pd.DataFrame, 
        mapping: ColumnMapping, 
        dataset_id: str,
        filename: str = "dataset.csv"
    ) -> Tuple[List[FeedbackRecord], NormalizationResult]:
        """
        Normalizes dataset rows into validated FeedbackRecord objects.
        CRITICAL: Never silently discards records.
        - Completely blank rows are audited as skipped_blank_rows.
        - Records with missing or malformed fields are flagged and retained.
        - Original verbatim is strictly preserved alongside cleaned text.
        """
        records: List[FeedbackRecord] = []
        flag_counts: Dict[str, int] = {}
        seen_verbatims: Set[str] = set()

        total_raw_rows = len(df)
        accepted_count = 0
        flagged_count = 0
        skipped_blank_rows = 0
        duplicate_count = 0

        feedback_col = mapping.feedback_text_col
        if feedback_col not in df.columns:
            raise ValueError(
                f"Selected feedback column '{feedback_col}' not found in dataset columns: {list(df.columns)}"
            )

        for idx, row in df.iterrows():
            orig_row_num = idx + 2  # Row 1 is header row in spreadsheets

            # Check if row is completely blank across all columns
            row_vals = [row.get(col) for col in df.columns]
            is_completely_blank = all(
                v is None or pd.isna(v) or (isinstance(v, str) and not v.strip())
                for v in row_vals
            )
            if is_completely_blank:
                skipped_blank_rows += 1
                flag_counts["skipped_blank_row"] = flag_counts.get("skipped_blank_row", 0) + 1
                continue

            row_flags: List[str] = []
            
            # 1. Feedback Text (Original preserved + cleaned)
            raw_text = row.get(feedback_col)
            cleaned_text, text_flags = cls.clean_text(raw_text)
            row_flags.extend(text_flags)

            # 2. Duplicate Detection
            is_duplicate = False
            if cleaned_text:
                normalized_key = cleaned_text.lower()
                if normalized_key in seen_verbatims:
                    is_duplicate = True
                    duplicate_count += 1
                    row_flags.append("duplicate_feedback_verbatim")
                else:
                    seen_verbatims.add(normalized_key)

            # 3. Record ID & Customer ID
            customer_id = None
            if mapping.id_col and mapping.id_col in df.columns:
                val = row.get(mapping.id_col)
                if val is not None and not pd.isna(val) and str(val).strip():
                    customer_id = str(val).strip()

            stable_id = customer_id or f"FB-{dataset_id}-{idx + 1:04d}"

            # 4. Submission Date
            date_str = None
            if mapping.date_col and mapping.date_col in df.columns:
                raw_date = row.get(mapping.date_col)
                if raw_date is not None and not pd.isna(raw_date):
                    raw_date_str = str(raw_date).strip()
                    if raw_date_str:
                        try:
                            date_str = pd.to_datetime(raw_date).strftime("%Y-%m-%d %H:%M:%S")
                        except Exception:
                            date_str = raw_date_str
                            row_flags.append("invalid_date_format")

            # 5. Product / Feature / SKU
            product_val = None
            if mapping.product_col and mapping.product_col in df.columns:
                raw_prod = row.get(mapping.product_col)
                if raw_prod is not None and not pd.isna(raw_prod) and str(raw_prod).strip():
                    product_val = str(raw_prod).strip()

            # 6. Rating (e.g. 1-5, CSAT)
            rating_val = None
            if mapping.rating_col and mapping.rating_col in df.columns:
                raw_rating = row.get(mapping.rating_col)
                if raw_rating is not None and not pd.isna(raw_rating):
                    try:
                        rating_val = float(raw_rating)
                        if rating_val < 0 or rating_val > 10:
                            row_flags.append("unusual_rating_range")
                    except (ValueError, TypeError):
                        row_flags.append("invalid_numeric_rating")

            # 7. Category / Channel
            category_val = None
            if mapping.category_col and mapping.category_col in df.columns:
                raw_cat = row.get(mapping.category_col)
                if raw_cat is not None and not pd.isna(raw_cat) and str(raw_cat).strip():
                    category_val = str(raw_cat).strip()

            # Validity determination
            # A record is valid if it contains non-blank feedback text
            has_fatal_error = any(f in row_flags for f in ["missing_feedback_text", "blank_feedback_text"])
            is_valid = not has_fatal_error and len(cleaned_text) > 0

            if is_valid and len(row_flags) == 0:
                accepted_count += 1
            else:
                flagged_count += 1

            for flag in row_flags:
                flag_counts[flag] = flag_counts.get(flag, 0) + 1

            rec = FeedbackRecord(
                id=stable_id,
                original_row_number=orig_row_num,
                original_text=str(raw_text) if raw_text is not None and not pd.isna(raw_text) else "",
                cleaned_text=cleaned_text,
                customer_id=customer_id,
                product=product_val,
                date=date_str,
                rating=rating_val,
                category=category_val,
                is_valid=is_valid,
                is_duplicate=is_duplicate,
                flagged_reasons=row_flags,
                analysis=None
            )
            records.append(rec)

        summary = NormalizationResult(
            dataset_id=dataset_id,
            filename=filename,
            total_raw_rows=total_raw_rows,
            accepted_records=accepted_count,
            flagged_records=flagged_count,
            skipped_blank_rows=skipped_blank_rows,
            duplicate_records_count=duplicate_count,
            flagged_reasons_summary=flag_counts,
            sample_cleaned_records=records[:5]
        )

        logger.info(
            f"Normalized dataset '{dataset_id}': total={total_raw_rows}, accepted={accepted_count}, "
            f"flagged={flagged_count}, skipped={skipped_blank_rows}"
        )

        return records, summary
