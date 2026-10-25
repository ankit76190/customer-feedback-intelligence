import sqlite3
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

from app.config import settings

logger = logging.getLogger("feedback_intelligence.database")

DB_PATH = Path(__file__).parent.parent / "data" / "feedback_intelligence.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

@contextmanager
def get_db():
    """Provides a transactional database connection context."""
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for high concurrency
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initializes tables for datasets, records, caching, and analysis background jobs."""
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS datasets (
            dataset_id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            file_size_bytes INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            sheet_names TEXT DEFAULT '[]',
            active_sheet TEXT,
            total_raw_rows INTEGER DEFAULT 0,
            mapping_json TEXT,
            summary_json TEXT
        );

        CREATE TABLE IF NOT EXISTS records (
            dataset_id TEXT NOT NULL,
            id TEXT NOT NULL,
            original_row_number INTEGER NOT NULL,
            original_text TEXT NOT NULL,
            cleaned_text TEXT NOT NULL,
            customer_id TEXT,
            product TEXT,
            date TEXT,
            rating REAL,
            category TEXT,
            is_valid INTEGER DEFAULT 1,
            is_duplicate INTEGER DEFAULT 0,
            flagged_reasons_json TEXT DEFAULT '[]',
            analysis_json TEXT,
            status TEXT DEFAULT 'pending',
            error_message TEXT,
            PRIMARY KEY (dataset_id, id),
            FOREIGN KEY (dataset_id) REFERENCES datasets(dataset_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_records_dataset_status ON records(dataset_id, status);

        CREATE TABLE IF NOT EXISTS analysis_cache (
            cache_key TEXT PRIMARY KEY,
            model_name TEXT NOT NULL,
            prompt_version TEXT NOT NULL,
            input_hash TEXT NOT NULL,
            analysis_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_cache_hash ON analysis_cache(input_hash);

        CREATE TABLE IF NOT EXISTS analysis_jobs (
            job_id TEXT PRIMARY KEY,
            dataset_id TEXT NOT NULL,
            status TEXT NOT NULL,
            total_records INTEGER DEFAULT 0,
            processed_records INTEGER DEFAULT 0,
            failed_records INTEGER DEFAULT 0,
            cached_records INTEGER DEFAULT 0,
            batch_size INTEGER DEFAULT 5,
            model_used TEXT NOT NULL,
            prompt_version TEXT NOT NULL,
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            duration_seconds REAL DEFAULT 0.0,
            FOREIGN KEY (dataset_id) REFERENCES datasets(dataset_id) ON DELETE CASCADE
        );
        """)
        logger.info(f"Database initialized at {DB_PATH}")

# Run schema init on import
init_db()
