import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import numpy as np

from app.models.feedback import FeedbackRecord, ColumnMapping, DatasetSummaryResponse, NormalizationResult
from app.services.data_cleaner import DataCleanerService
from app.config import settings

class DatasetStore:
    """In-memory and session store for raw DataFrames, uploaded datasets, and normalized records."""

    def __init__(self):
        self._datasets: Dict[str, Dict[str, Any]] = {}
        self._load_default_sample()

    def _load_default_sample(self):
        """Pre-loads the default synthetic sample dataset under ID 'sample-saas'."""
        sample_path = Path(__file__).parent.parent / "data" / "sample_feedback.csv"
        if sample_path.exists():
            try:
                df = pd.read_csv(sample_path)
                mapping = ColumnMapping(
                    feedback_text_col="customer_feedback",
                    id_col="feedback_id",
                    date_col="created_at",
                    rating_col="rating",
                    category_col="channel"
                )
                records, summary = DataCleanerService.normalize_dataset(
                    df, mapping, dataset_id="sample-saas", filename="sample_feedback.csv"
                )
                from app.services.sample_seeder import SAMPLE_ANALYSES
                for r in records:
                    if r.id in SAMPLE_ANALYSES:
                        r.analysis = SAMPLE_ANALYSES[r.id]

                self._datasets["sample-saas"] = {
                    "dataset_id": "sample-saas",
                    "filename": "sample_feedback.csv",
                    "file_size_bytes": sample_path.stat().st_size,
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "df": df,
                    "sheet_names": [],
                    "active_sheet": None,
                    "mapping": mapping,
                    "records": records,
                    "summary": summary
                }
                # Persist default sample to SQLite
                from app.services.repository import DatasetRepository
                DatasetRepository.save_dataset(
                    dataset_id="sample-saas",
                    filename="sample_feedback.csv",
                    file_size_bytes=sample_path.stat().st_size,
                    total_raw_rows=len(df),
                    mapping=mapping,
                    summary=summary
                )
                DatasetRepository.save_records("sample-saas", records)

                # Seed production test fixtures for automated and UI edge case verification
                self._seed_test_fixtures()
            except Exception as e:
                print(f"Failed to auto-load sample dataset: {e}")

    def _seed_test_fixtures(self):
        """Seeds test fixtures: zero-records, missing dates, partially analyzed, and no optional columns."""
        from app.models.analysis import FeedbackItemAnalysis, SentimentEnum, UrgencyLevel
        from app.services.repository import DatasetRepository

        def make_summary(did: str, fname: str, total: int, recs: List[FeedbackRecord]):
            return NormalizationResult(
                dataset_id=did,
                filename=fname,
                total_raw_rows=total,
                accepted_records=len(recs),
                flagged_records=0,
                skipped_blank_rows=0,
                duplicate_records_count=0,
                flagged_reasons_summary={},
                sample_cleaned_records=recs[:5]
            )

        # 1. Zero records fixture
        sum_zero = make_summary("fixture-zero-records", "empty_dataset.csv", 0, [])
        self._datasets["fixture-zero-records"] = {
            "dataset_id": "fixture-zero-records",
            "filename": "empty_dataset.csv",
            "file_size_bytes": 0,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "df": pd.DataFrame(),
            "sheet_names": [],
            "active_sheet": None,
            "mapping": ColumnMapping(feedback_text_col="feedback"),
            "records": [],
            "summary": sum_zero
        }
        DatasetRepository.save_dataset(
            dataset_id="fixture-zero-records",
            filename="empty_dataset.csv",
            file_size_bytes=0,
            total_raw_rows=0,
            mapping=ColumnMapping(feedback_text_col="feedback"),
            summary=sum_zero
        )

        # 2. Missing dates fixture
        missing_date_records = [
            FeedbackRecord(
                id="NO-DATE-1", original_row_number=1, original_text="Login interface is fast and reliable.",
                cleaned_text="Login interface is fast and reliable.", date=None, rating=5.0, category="Web",
                analysis=FeedbackItemAnalysis(
                    sentiment=SentimentEnum.POSITIVE, sentiment_reason="Customer praised login interface speed.",
                    primary_theme="Performance", secondary_themes=[], pain_points=[], positive_aspects=["Fast login"],
                    urgency=UrgencyLevel.LOW, summary="Login is fast and reliable."
                )
            ),
            FeedbackRecord(
                id="NO-DATE-2", original_row_number=2, original_text="Unable to export invoice PDF.",
                cleaned_text="Unable to export invoice PDF.", date="not-a-valid-date", rating=1.0, category="Billing",
                analysis=FeedbackItemAnalysis(
                    sentiment=SentimentEnum.NEGATIVE, sentiment_reason="Customer unable to export invoice PDF.",
                    primary_theme="Billing", secondary_themes=[], pain_points=["Cannot export invoice PDF"], positive_aspects=[],
                    urgency=UrgencyLevel.HIGH, summary="Invoice export is broken."
                )
            ),
            FeedbackRecord(
                id="NO-DATE-3", original_row_number=3, original_text="Standard functional capabilities.",
                cleaned_text="Standard functional capabilities.", date="NaN", rating=3.0, category="Web",
                analysis=FeedbackItemAnalysis(
                    sentiment=SentimentEnum.NEUTRAL, sentiment_reason="Neutral evaluation.",
                    primary_theme="Usability", secondary_themes=[], pain_points=[], positive_aspects=[],
                    urgency=UrgencyLevel.LOW, summary="Standard capabilities."
                )
            )
        ]
        sum_dates = make_summary("fixture-missing-dates", "missing_dates.csv", 3, missing_date_records)
        self._datasets["fixture-missing-dates"] = {
            "dataset_id": "fixture-missing-dates",
            "filename": "missing_dates.csv",
            "file_size_bytes": 1024,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "df": pd.DataFrame(),
            "sheet_names": [],
            "active_sheet": None,
            "mapping": ColumnMapping(feedback_text_col="feedback", date_col="date"),
            "records": missing_date_records,
            "summary": sum_dates
        }
        DatasetRepository.save_dataset(
            dataset_id="fixture-missing-dates",
            filename="missing_dates.csv",
            file_size_bytes=1024,
            total_raw_rows=3,
            mapping=ColumnMapping(feedback_text_col="feedback", date_col="date"),
            summary=sum_dates
        )
        DatasetRepository.save_records("fixture-missing-dates", missing_date_records)

        # 3. Partially analyzed fixture (6 total: 3 analyzed, 3 unanalyzed)
        partial_records = [
            FeedbackRecord(
                id="PART-1", original_row_number=1, original_text="Great experience with customer support.",
                cleaned_text="Great experience with customer support.", date="2025-01-10", rating=5.0, category="Support",
                analysis=FeedbackItemAnalysis(
                    sentiment=SentimentEnum.POSITIVE, sentiment_reason="Praised support team.",
                    primary_theme="Customer Support", secondary_themes=[], pain_points=[], positive_aspects=["Great support"],
                    urgency=UrgencyLevel.LOW, summary="Support was great."
                )
            ),
            FeedbackRecord(
                id="PART-2", original_row_number=2, original_text="App takes 10 seconds to load dashboard.",
                cleaned_text="App takes 10 seconds to load dashboard.", date="2025-01-11", rating=1.0, category="In-App",
                analysis=FeedbackItemAnalysis(
                    sentiment=SentimentEnum.NEGATIVE, sentiment_reason="10-second load time complaint.",
                    primary_theme="Performance", secondary_themes=[], pain_points=["Slow 10s load time"], positive_aspects=[],
                    urgency=UrgencyLevel.HIGH, summary="Dashboard load is slow."
                )
            ),
            FeedbackRecord(
                id="PART-3", original_row_number=3, original_text="Neutral general feedback.",
                cleaned_text="Neutral general feedback.", date="2025-01-12", rating=3.0, category="In-App",
                analysis=FeedbackItemAnalysis(
                    sentiment=SentimentEnum.NEUTRAL, sentiment_reason="Neutral statement.",
                    primary_theme="Usability", secondary_themes=[], pain_points=[], positive_aspects=[],
                    urgency=UrgencyLevel.LOW, summary="Neutral statement."
                )
            ),
            FeedbackRecord(
                id="PART-4", original_row_number=4, original_text="Unanalyzed record waiting for batch job.",
                cleaned_text="Unanalyzed record waiting for batch job.", date="2025-01-13", rating=4.0, category="Email",
                analysis=None
            ),
            FeedbackRecord(
                id="PART-5", original_row_number=5, original_text="Second unanalyzed record in queue.",
                cleaned_text="Second unanalyzed record in queue.", date="2025-01-14", rating=2.0, category="Support",
                analysis=None
            ),
            FeedbackRecord(
                id="PART-6", original_row_number=6, original_text="Third pending feedback record.",
                cleaned_text="Third pending feedback record.", date="2025-01-15", rating=3.0, category="Web",
                analysis=None
            )
        ]
        sum_part = make_summary("fixture-partially-analyzed", "partially_analyzed.csv", 6, partial_records)
        self._datasets["fixture-partially-analyzed"] = {
            "dataset_id": "fixture-partially-analyzed",
            "filename": "partially_analyzed.csv",
            "file_size_bytes": 2048,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "df": pd.DataFrame(),
            "sheet_names": [],
            "active_sheet": None,
            "mapping": ColumnMapping(feedback_text_col="feedback", date_col="date", rating_col="rating", category_col="category"),
            "records": partial_records,
            "summary": sum_part
        }
        DatasetRepository.save_dataset(
            dataset_id="fixture-partially-analyzed",
            filename="partially_analyzed.csv",
            file_size_bytes=2048,
            total_raw_rows=6,
            mapping=ColumnMapping(feedback_text_col="feedback", date_col="date", rating_col="rating", category_col="category"),
            summary=sum_part
        )
        DatasetRepository.save_records("fixture-partially-analyzed", partial_records)

        # 4. No optional columns fixture (no product, no category)
        no_opt_records = [
            FeedbackRecord(
                id="NO-OPT-1", original_row_number=1, original_text="Software is intuitive.",
                cleaned_text="Software is intuitive.", date="2025-01-01", product=None, category=None,
                analysis=FeedbackItemAnalysis(
                    sentiment=SentimentEnum.POSITIVE, sentiment_reason="Praised intuitive interface.",
                    primary_theme="Usability", secondary_themes=[], pain_points=[], positive_aspects=["Intuitive software"],
                    urgency=UrgencyLevel.LOW, summary="Software is intuitive."
                )
            ),
            FeedbackRecord(
                id="NO-OPT-2", original_row_number=2, original_text="Export feature crashed.",
                cleaned_text="Export feature crashed.", date="2025-01-02", product=None, category=None,
                analysis=FeedbackItemAnalysis(
                    sentiment=SentimentEnum.NEGATIVE, sentiment_reason="Crash in export.",
                    primary_theme="Performance", secondary_themes=[], pain_points=["Export crash"], positive_aspects=[],
                    urgency=UrgencyLevel.HIGH, summary="Export feature crashed."
                )
            )
        ]
        sum_no_opt = make_summary("fixture-no-optional-cols", "no_optional_columns.csv", 2, no_opt_records)
        self._datasets["fixture-no-optional-cols"] = {
            "dataset_id": "fixture-no-optional-cols",
            "filename": "no_optional_columns.csv",
            "file_size_bytes": 1024,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "df": pd.DataFrame(),
            "sheet_names": [],
            "active_sheet": None,
            "mapping": ColumnMapping(feedback_text_col="feedback", date_col="date"),
            "records": no_opt_records,
            "summary": sum_no_opt
        }
        DatasetRepository.save_dataset(
            dataset_id="fixture-no-optional-cols",
            filename="no_optional_columns.csv",
            file_size_bytes=1024,
            total_raw_rows=2,
            mapping=ColumnMapping(feedback_text_col="feedback", date_col="date"),
            summary=sum_no_opt
        )
        DatasetRepository.save_records("fixture-no-optional-cols", no_opt_records)

    def save_dataset(
        self, 
        dataset_id: str, 
        filename: str, 
        df: pd.DataFrame, 
        file_size_bytes: int = 0,
        sheet_names: List[str] = [],
        active_sheet: Optional[str] = None,
        mapping: Optional[ColumnMapping] = None,
        records: Optional[List[FeedbackRecord]] = None,
        summary: Optional[NormalizationResult] = None
    ):
        existing = self._datasets.get(dataset_id, {})
        self._datasets[dataset_id] = {
            "dataset_id": dataset_id,
            "filename": filename,
            "file_size_bytes": file_size_bytes or existing.get("file_size_bytes", 0),
            "created_at": existing.get("created_at") or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "df": df,
            "sheet_names": sheet_names or existing.get("sheet_names", []),
            "active_sheet": active_sheet or existing.get("active_sheet"),
            "mapping": mapping or existing.get("mapping"),
            "records": records if records is not None else existing.get("records", []),
            "summary": summary or existing.get("summary")
        }

        # Persist to SQLite
        try:
            from app.services.repository import DatasetRepository
            DatasetRepository.save_dataset(
                dataset_id=dataset_id,
                filename=filename,
                file_size_bytes=file_size_bytes or existing.get("file_size_bytes", 0),
                sheet_names=sheet_names or existing.get("sheet_names", []),
                active_sheet=active_sheet or existing.get("active_sheet"),
                total_raw_rows=len(df) if df is not None else 0,
                mapping=mapping or existing.get("mapping"),
                summary=summary or existing.get("summary")
            )
            if records:
                DatasetRepository.save_records(dataset_id, records)
        except Exception as e:
            print(f"SQLite persistence notice: {e}")

    def get_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        if dataset_id in self._datasets:
            # Refresh records from SQLite if available to reflect background updates
            try:
                from app.services.repository import DatasetRepository
                sqlite_records = DatasetRepository.get_records(dataset_id)
                if sqlite_records:
                    self._datasets[dataset_id]["records"] = sqlite_records
            except Exception:
                pass
            return self._datasets[dataset_id]

        # Check SQLite if not in memory
        try:
            from app.services.repository import DatasetRepository
            db_dataset = DatasetRepository.get_dataset(dataset_id)
            if db_dataset:
                records = DatasetRepository.get_records(dataset_id)
                db_dataset["records"] = records
                safe_name = db_dataset.get("filename", "")
                stored_path = settings.UPLOAD_DIR / f"{dataset_id}_{safe_name}"
                if stored_path.exists():
                    try:
                        with open(stored_path, "rb") as f:
                            raw_bytes = f.read()
                        df, _, _ = DataCleanerService.read_file(raw_bytes, safe_name, sheet_name=db_dataset.get("active_sheet"))
                        db_dataset["df"] = df
                    except Exception:
                        pass
                if "df" not in db_dataset or db_dataset["df"] is None:
                    if records:
                        db_dataset["df"] = pd.DataFrame([
                            {
                                "id": r.id,
                                "date": r.date,
                                "rating": r.rating,
                                "category": r.category,
                                "customer_id": r.customer_id,
                                "product": r.product,
                                "feedback": r.original_text
                            } for r in records
                        ])
                self._datasets[dataset_id] = db_dataset
                return db_dataset
        except Exception:
            pass

        return None

    def update_records(self, dataset_id: str, records: List[FeedbackRecord]):
        if dataset_id in self._datasets:
            self._datasets[dataset_id]["records"] = records

    def get_summary(self, dataset_id: str) -> Optional[DatasetSummaryResponse]:
        dataset = self.get_dataset(dataset_id)
        if not dataset:
            return None

        records: List[FeedbackRecord] = dataset.get("records", [])
        summary: Optional[NormalizationResult] = dataset.get("summary")
        total_raw = len(dataset["df"]) if "df" in dataset and dataset["df"] is not None else len(records)

        accepted = summary.accepted_records if summary else sum(1 for r in records if r.is_valid and not r.flagged_reasons)
        flagged = summary.flagged_records if summary else sum(1 for r in records if r.flagged_reasons)
        skipped = summary.skipped_blank_rows if summary else 0
        reasons = summary.flagged_reasons_summary if summary else {}

        return DatasetSummaryResponse(
            dataset_id=dataset_id,
            filename=dataset["filename"],
            file_size_bytes=dataset.get("file_size_bytes", 0),
            created_at=dataset.get("created_at", ""),
            sheet_names=dataset.get("sheet_names", []),
            active_sheet=dataset.get("active_sheet"),
            total_raw_rows=total_raw,
            accepted_records=accepted,
            flagged_records=flagged,
            skipped_blank_rows=skipped,
            mapping=dataset.get("mapping"),
            flagged_reasons_summary=reasons
        )

    def list_datasets(self) -> List[Dict[str, Any]]:
        try:
            from app.services.repository import DatasetRepository
            db_list = DatasetRepository.list_datasets()
            seen_ids = set()
            results = []
            for d in db_list:
                seen_ids.add(d["dataset_id"])
                results.append(d)
            for did, d in self._datasets.items():
                if did not in seen_ids:
                    results.append({
                        "dataset_id": did,
                        "filename": d.get("filename", "unknown.csv"),
                        "file_size_bytes": d.get("file_size_bytes", 0),
                        "total_records": len(d.get("records", [])),
                        "analyzed_records": sum(1 for r in d.get("records", []) if r.analysis is not None)
                    })
            return results
        except Exception:
            return [
                {
                    "dataset_id": d["dataset_id"],
                    "filename": d["filename"],
                    "file_size_bytes": d.get("file_size_bytes", 0),
                    "total_records": len(d.get("records", [])),
                    "analyzed_records": sum(1 for r in d.get("records", []) if r.analysis is not None)
                }
                for d in self._datasets.values()
            ]

    def query_records(
        self,
        dataset_id: str,
        page: int = 1,
        limit: int = 25,
        search: Optional[str] = None,
        sentiment: Optional[str] = None,
        theme: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        product: Optional[str] = None,
        category: Optional[str] = None
    ) -> Tuple[List[FeedbackRecord], int, List[str], Dict[str, int]]:
        dataset = self.get_dataset(dataset_id)
        if not dataset:
            return [], 0, [], {"Positive": 0, "Negative": 0, "Neutral": 0, "Needs_Review": 0}

        all_records: List[FeedbackRecord] = dataset.get("records", [])
        
        # Calculate available themes and sentiment counts across full dataset
        available_themes = sorted(list({
            r.analysis.primary_theme 
            for r in all_records 
            if r.analysis and r.analysis.primary_theme
        }))

        from app.services.analytics_engine import normalize_sentiment_label, AnalyticsEngine

        sentiment_counts = {"Positive": 0, "Negative": 0, "Neutral": 0, "Needs_Review": 0}
        for r in all_records:
            if r.analysis:
                val = normalize_sentiment_label(r.analysis.sentiment)
                sentiment_counts[val] = sentiment_counts.get(val, 0) + 1

        # Apply multi-faceted filters
        filtered = AnalyticsEngine.filter_records(
            records=all_records,
            start_date=start_date,
            end_date=end_date,
            sentiment=sentiment,
            theme=theme,
            product=product,
            category=category,
            search=search
        )

        total = len(filtered)
        start = (page - 1) * limit
        end = start + limit
        paginated = filtered[start:end]

        return paginated, total, available_themes, sentiment_counts

    def query_raw_preview(
        self,
        dataset_id: str,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int, List[str]]:
        """Returns paginated and searchable preview rows directly from the raw dataframe."""
        dataset = self.get_dataset(dataset_id)
        if not dataset or "df" not in dataset or dataset["df"] is None:
            return [], 0, []

        df = dataset["df"]
        columns = [str(c) for c in df.columns.tolist()]

        clean_df = df.replace({np.nan: None})
        records = clean_df.to_dict(orient="records")

        # Attach original row numbers (Row 1 is header)
        for idx, row in enumerate(records):
            row["_original_row_number"] = idx + 2

        if search:
            q = search.lower().strip()
            records = [
                row for row in records 
                if any(q in str(val).lower() for val in row.values() if val is not None)
            ]

        total = len(records)
        start = (page - 1) * limit
        end = start + limit
        paginated = records[start:end]

        return paginated, total, columns

dataset_store = DatasetStore()
