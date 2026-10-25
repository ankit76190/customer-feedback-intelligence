import hashlib
import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple

from app.services.database import get_db
from app.models.feedback import FeedbackRecord, ColumnMapping, NormalizationResult, DatasetSummaryResponse
from app.models.analysis import FeedbackItemAnalysis, AnalysisJobResponse

logger = logging.getLogger("feedback_intelligence.repository")

def compute_input_hash(text: str) -> str:
    """Computes SHA-256 hash of normalized text for caching."""
    return hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()

def make_cache_key(model_name: str, prompt_version: str, input_hash: str) -> str:
    """Creates a deterministic cache key."""
    return f"{model_name}:{prompt_version}:{input_hash}"

class DatasetRepository:
    """Persistent storage manager backed by local SQLite database."""

    @staticmethod
    def save_dataset(
        dataset_id: str,
        filename: str,
        file_size_bytes: int,
        sheet_names: List[str] = [],
        active_sheet: Optional[str] = None,
        total_raw_rows: int = 0,
        mapping: Optional[ColumnMapping] = None,
        summary: Optional[NormalizationResult] = None
    ):
        with get_db() as conn:
            conn.execute("""
            INSERT INTO datasets (
                dataset_id, filename, file_size_bytes, created_at,
                sheet_names, active_sheet, total_raw_rows, mapping_json, summary_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(dataset_id) DO UPDATE SET
                filename=excluded.filename,
                file_size_bytes=excluded.file_size_bytes,
                sheet_names=excluded.sheet_names,
                active_sheet=excluded.active_sheet,
                total_raw_rows=excluded.total_raw_rows,
                mapping_json=coalesce(excluded.mapping_json, datasets.mapping_json),
                summary_json=coalesce(excluded.summary_json, datasets.summary_json);
            """, (
                dataset_id,
                filename,
                file_size_bytes,
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                json.dumps(sheet_names),
                active_sheet,
                total_raw_rows,
                mapping.model_dump_json() if mapping else None,
                summary.model_dump_json() if summary else None
            ))

    @staticmethod
    def get_dataset(dataset_id: str) -> Optional[Dict[str, Any]]:
        with get_db() as conn:
            row = conn.execute("SELECT * FROM datasets WHERE dataset_id = ?", (dataset_id,)).fetchone()
            if not row:
                return None
            return {
                "dataset_id": row["dataset_id"],
                "filename": row["filename"],
                "file_size_bytes": row["file_size_bytes"],
                "created_at": row["created_at"],
                "sheet_names": json.loads(row["sheet_names"] or "[]"),
                "active_sheet": row["active_sheet"],
                "total_raw_rows": row["total_raw_rows"],
                "mapping": ColumnMapping.model_validate_json(row["mapping_json"]) if row["mapping_json"] else None,
                "summary": NormalizationResult.model_validate_json(row["summary_json"]) if row["summary_json"] else None,
            }

    @staticmethod
    def list_datasets() -> List[Dict[str, Any]]:
        with get_db() as conn:
            rows = conn.execute("""
            SELECT d.dataset_id, d.filename, d.file_size_bytes, d.total_raw_rows,
                   COUNT(r.id) as total_records,
                   SUM(CASE WHEN r.analysis_json IS NOT NULL THEN 1 ELSE 0 END) as analyzed_records
            FROM datasets d
            LEFT JOIN records r ON d.dataset_id = r.dataset_id
            GROUP BY d.dataset_id
            ORDER BY d.created_at DESC;
            """).fetchall()

            return [
                {
                    "dataset_id": r["dataset_id"],
                    "filename": r["filename"],
                    "file_size_bytes": r["file_size_bytes"],
                    "total_records": r["total_records"] or r["total_raw_rows"],
                    "analyzed_records": r["analyzed_records"] or 0
                }
                for r in rows
            ]

    @staticmethod
    def save_records(dataset_id: str, records: List[FeedbackRecord]):
        with get_db() as conn:
            for r in records:
                analysis_json = r.analysis.model_dump_json() if r.analysis else None
                conn.execute("""
                INSERT INTO records (
                    dataset_id, id, original_row_number, original_text, cleaned_text,
                    customer_id, product, date, rating, category,
                    is_valid, is_duplicate, flagged_reasons_json, analysis_json, status, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(dataset_id, id) DO UPDATE SET
                    original_row_number=excluded.original_row_number,
                    original_text=excluded.original_text,
                    cleaned_text=excluded.cleaned_text,
                    customer_id=excluded.customer_id,
                    product=excluded.product,
                    date=excluded.date,
                    rating=excluded.rating,
                    category=excluded.category,
                    is_valid=excluded.is_valid,
                    is_duplicate=excluded.is_duplicate,
                    flagged_reasons_json=excluded.flagged_reasons_json,
                    analysis_json=coalesce(excluded.analysis_json, records.analysis_json),
                    status=case when excluded.analysis_json is not null then 'analyzed' else records.status end,
                    error_message=excluded.error_message;
                """, (
                    dataset_id,
                    r.id,
                    r.original_row_number,
                    r.original_text,
                    r.cleaned_text,
                    r.customer_id,
                    r.product,
                    r.date,
                    r.rating,
                    r.category,
                    1 if r.is_valid else 0,
                    1 if r.is_duplicate else 0,
                    json.dumps(r.flagged_reasons),
                    analysis_json,
                    "analyzed" if analysis_json else "pending",
                    None
                ))

    @staticmethod
    def update_record_analysis(
        dataset_id: str, 
        record_id: str, 
        analysis: FeedbackItemAnalysis,
        status: str = "analyzed"
    ):
        with get_db() as conn:
            conn.execute("""
            UPDATE records 
            SET analysis_json = ?, status = ?, error_message = NULL
            WHERE dataset_id = ? AND id = ?
            """, (analysis.model_dump_json(), status, dataset_id, record_id))

    @staticmethod
    def mark_record_failed(dataset_id: str, record_id: str, error_message: str):
        with get_db() as conn:
            conn.execute("""
            UPDATE records 
            SET status = 'failed', error_message = ?
            WHERE dataset_id = ? AND id = ?
            """, (error_message[:200], dataset_id, record_id))

    @staticmethod
    def get_records(
        dataset_id: str,
        status: Optional[str] = None
    ) -> List[FeedbackRecord]:
        with get_db() as conn:
            query = "SELECT * FROM records WHERE dataset_id = ?"
            params = [dataset_id]
            if status:
                query += " AND status = ?"
                params.append(status)
            query += " ORDER BY original_row_number ASC"
            rows = conn.execute(query, params).fetchall()

            records: List[FeedbackRecord] = []
            for row in rows:
                analysis = (
                    FeedbackItemAnalysis.model_validate_json(row["analysis_json"]) 
                    if row["analysis_json"] else None
                )
                rec = FeedbackRecord(
                    id=row["id"],
                    original_row_number=row["original_row_number"],
                    original_text=row["original_text"],
                    cleaned_text=row["cleaned_text"],
                    customer_id=row["customer_id"],
                    product=row["product"],
                    date=row["date"],
                    rating=row["rating"],
                    category=row["category"],
                    is_valid=bool(row["is_valid"]),
                    is_duplicate=bool(row["is_duplicate"]),
                    flagged_reasons=json.loads(row["flagged_reasons_json"] or "[]"),
                    analysis=analysis
                )
                records.append(rec)
            return records

    @staticmethod
    def get_cached_analysis(
        model_name: str, 
        prompt_version: str, 
        text: str
    ) -> Optional[FeedbackItemAnalysis]:
        """Checks cache using stable hash of model, prompt_version, and verbatim text."""
        input_hash = compute_input_hash(text)
        cache_key = make_cache_key(model_name, prompt_version, input_hash)
        with get_db() as conn:
            row = conn.execute(
                "SELECT analysis_json FROM analysis_cache WHERE cache_key = ?", 
                (cache_key,)
            ).fetchone()
            if row and row["analysis_json"]:
                try:
                    return FeedbackItemAnalysis.model_validate_json(row["analysis_json"])
                except Exception as e:
                    logger.warning(f"Failed to deserialize cached analysis: {e}")
                    return None
            return None

    @staticmethod
    def set_cached_analysis(
        model_name: str, 
        prompt_version: str, 
        text: str, 
        analysis: FeedbackItemAnalysis
    ):
        """Stores structured evaluation in cache."""
        input_hash = compute_input_hash(text)
        cache_key = make_cache_key(model_name, prompt_version, input_hash)
        with get_db() as conn:
            conn.execute("""
            INSERT OR REPLACE INTO analysis_cache (
                cache_key, model_name, prompt_version, input_hash, analysis_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                cache_key,
                model_name,
                prompt_version,
                input_hash,
                analysis.model_dump_json(),
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ))

    # Background Job Management
    @staticmethod
    def create_job(
        job_id: str,
        dataset_id: str,
        total_records: int,
        batch_size: int,
        model_used: str,
        prompt_version: str
    ) -> AnalysisJobResponse:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with get_db() as conn:
            conn.execute("""
            INSERT INTO analysis_jobs (
                job_id, dataset_id, status, total_records, processed_records,
                failed_records, cached_records, batch_size, model_used,
                prompt_version, error_message, created_at, updated_at, duration_seconds
            ) VALUES (?, ?, 'pending', ?, 0, 0, 0, ?, ?, ?, NULL, ?, ?, 0.0)
            """, (
                job_id, dataset_id, total_records, batch_size,
                model_used, prompt_version, now, now
            ))
        return DatasetRepository.get_job(job_id)

    @staticmethod
    def update_job_progress(
        job_id: str,
        processed_delta: int = 0,
        failed_delta: int = 0,
        cached_delta: int = 0,
        status: Optional[str] = None,
        error_message: Optional[str] = None,
        duration_seconds: Optional[float] = None
    ):
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with get_db() as conn:
            updates = ["updated_at = ?"]
            params = [now]

            if processed_delta > 0:
                updates.append("processed_records = processed_records + ?")
                params.append(processed_delta)
            if failed_delta > 0:
                updates.append("failed_records = failed_records + ?")
                params.append(failed_delta)
            if cached_delta > 0:
                updates.append("cached_records = cached_records + ?")
                params.append(cached_delta)
            if status:
                updates.append("status = ?")
                params.append(status)
            if error_message is not None:
                updates.append("error_message = ?")
                params.append(error_message[:300])
            if duration_seconds is not None:
                updates.append("duration_seconds = ?")
                params.append(duration_seconds)

            params.append(job_id)
            query = f"UPDATE analysis_jobs SET {', '.join(updates)} WHERE job_id = ?"
            conn.execute(query, params)

    @staticmethod
    def get_job(job_id: str) -> Optional[AnalysisJobResponse]:
        with get_db() as conn:
            row = conn.execute("SELECT * FROM analysis_jobs WHERE job_id = ?", (job_id,)).fetchone()
            if not row:
                return None
            return AnalysisJobResponse(
                job_id=row["job_id"],
                dataset_id=row["dataset_id"],
                status=row["status"],
                total_records=row["total_records"],
                processed_records=row["processed_records"],
                failed_records=row["failed_records"],
                cached_records=row["cached_records"],
                batch_size=row["batch_size"],
                model_used=row["model_used"],
                prompt_version=row["prompt_version"],
                duration_seconds=row["duration_seconds"],
                error_message=row["error_message"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )
