import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from supabase import Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BaseLoader:
    def __init__(self, supabase_client: Client, data_dir: str = "./data"):
        self.db = supabase_client
        self.data_dir = Path(data_dir)

    def load_csv(self, filepath: str) -> pd.DataFrame:
        full_path = self.data_dir / filepath
        logger.info(f"Loading CSV: {full_path}")

        if not full_path.exists():
            logger.warning(f"File not found: {full_path}")
            return pd.DataFrame()

        df = pd.read_csv(full_path)
        df.columns = [str(c).strip() for c in df.columns]
        logger.info(f"Loaded {len(df)} rows from {filepath}")
        return df

    def batch_insert(self, table: str, records: List[Dict[str, Any]], batch_size: int = 500):
        records = [r for r in records if r]
        if not records:
            logger.info(f"No records to insert into {table}")
            return

        logger.info(f"Inserting {len(records)} records into {table}")
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                self.db.table(table).insert(batch).execute()
                logger.info(f"Inserted batch {i // batch_size + 1} ({len(batch)} records) into {table}")
            except Exception as e:
                logger.error(f"Error inserting batch into {table}: {e}")
                raise

    def upsert_batch(
        self,
        table: str,
        records: List[Dict[str, Any]],
        on_conflict: Optional[str] = None,
        batch_size: int = 500,
    ):
        records = [r for r in records if r]
        if not records:
            logger.info(f"No records to upsert into {table}")
            return

        logger.info(f"Upserting {len(records)} records into {table}")
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                kwargs = {"on_conflict": on_conflict} if on_conflict else {}
                self.db.table(table).upsert(batch, **kwargs).execute()
                logger.info(f"Upserted batch {i // batch_size + 1} ({len(batch)} records) into {table}")
            except Exception as e:
                logger.error(f"Error upserting batch into {table}: {e}")
                raise

    def clean_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        cleaned: Dict[str, Any] = {}
        for key, value in record.items():
            if isinstance(value, str):
                value = value.strip()
            if self.is_empty(value):
                cleaned[key] = None
            elif isinstance(value, (dict, list)):
                cleaned[key] = value
            else:
                cleaned[key] = value
        return cleaned

    @staticmethod
    def is_empty(value: Any) -> bool:
        if value is None:
            return True
        if isinstance(value, float) and pd.isna(value):
            return True
        if isinstance(value, str) and value.strip().lower() in {"", "nan", "none", "null", "na", "n/a"}:
            return True
        return False

    @staticmethod
    def normalize_text(value: Any) -> Optional[str]:
        if value is None:
            return None
        text = str(value).strip()
        if text.lower() in {"", "nan", "none", "null", "na", "n/a"}:
            return None
        return text

    def first_non_empty(self, row: pd.Series, *candidates: str) -> Optional[str]:
        for col in candidates:
            if col in row.index:
                value = self.normalize_text(row.get(col))
                if value is not None:
                    return value
        return None

    def parse_float(self, value: Any) -> Optional[float]:
        if self.is_empty(value):
            return None
        try:
            return float(str(value).strip())
        except Exception:
            return None

    def parse_int(self, value: Any) -> Optional[int]:
        if self.is_empty(value):
            return None
        try:
            return int(float(str(value).strip()))
        except Exception:
            return None

    def parse_bool(self, value: Any) -> Optional[bool]:
        if self.is_empty(value):
            return None
        if isinstance(value, bool):
            return value
        text = str(value).strip().lower()
        if text in {"true", "1", "yes", "y"}:
            return True
        if text in {"false", "0", "no", "n"}:
            return False
        return None

    def parse_json_array(self, value: Any) -> List[Any]:
        if self.is_empty(value):
            return []
        if isinstance(value, list):
            return value
        text = str(value).strip()
        try:
            parsed = json.loads(text)
            return parsed if isinstance(parsed, list) else [parsed]
        except Exception:
            return [part.strip() for part in text.split(";") if part.strip()]
