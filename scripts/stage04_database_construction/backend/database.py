import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

_supabase_client: Client | None = None


def get_db() -> Client:
    global _supabase_client

    if _supabase_client is None:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("SUPABASE_SERVICE_KEY")
        )

        print("SUPABASE_URL =", supabase_url)
        print("SERVICE KEY PREFIX =", (supabase_service_key or "")[:20])

        if not supabase_url:
            raise RuntimeError("Missing SUPABASE_URL in environment.")

        if not supabase_service_key:
            raise RuntimeError(
                "Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY in environment."
            )

        _supabase_client = create_client(supabase_url, supabase_service_key)

    return _supabase_client


def get_supabase_admin_client() -> Client:
    return get_db()