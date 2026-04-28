from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client
from backend.database import get_db

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

router = APIRouter()


class SubmissionStatusUpdate(BaseModel):
    status: str


ALLOWED_STATUSES = {
    "pending",
    "under_review",
    "approved",
    "rejected",
    "needs_revision",
}


def get_storage_client() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_SERVICE_KEY")
    )

    if not supabase_url:
        raise RuntimeError("Missing SUPABASE_URL")

    if not service_role_key:
        raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY")

    return create_client(supabase_url, service_role_key)


@router.get("/submissions")
async def list_collaboration_submissions(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    try:
        db = get_db()

        query = (
            db.table("collaboration_submissions")
            .select("*")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if status:
            query = query.eq("status", status)

        result = query.execute()
        rows = result.data or []

        return {
            "data": rows,
            "count": len(rows),
            "limit": limit,
            "offset": offset,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/submissions/{submission_id}")
async def get_collaboration_submission(submission_id: str):
    try:
        db = get_db()

        result = (
            db.table("collaboration_submissions")
            .select("*")
            .eq("submission_id", submission_id)
            .limit(1)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Submission not found.")

        return {"data": result.data[0]}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/submissions/{submission_id}/files")
async def get_collaboration_submission_files(submission_id: str):
    try:
        db = get_db()
        storage = get_storage_client()

        files_result = (
            db.table("submission_files")
            .select("*")
            .eq("submission_id", submission_id)
            .order("uploaded_at", desc=True)
            .execute()
        )

        files = files_result.data or []
        enriched_files = []

        for item in files:
            signed = storage.storage.from_("collaboration-uploads").create_signed_url(
                item["storage_path"],
                3600,
            )

            signed_url = None
            if isinstance(signed, dict):
                signed_url = signed.get("signedURL") or signed.get("signedUrl")

            enriched_files.append({
                **item,
                "signed_url": signed_url,
            })

        return {
            "data": enriched_files,
            "count": len(enriched_files),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/submissions/{submission_id}/validation-reports")
async def get_submission_validation_reports(submission_id: str):
    try:
        db = get_db()

        result = (
            db.table("submission_validation_reports")
            .select("*")
            .eq("submission_id", submission_id)
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "data": result.data or [],
            "count": len(result.data or []),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/submissions/{submission_id}/status")
async def update_collaboration_submission_status(
    submission_id: str,
    payload: SubmissionStatusUpdate,
):
    try:
        if payload.status not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed: {', '.join(sorted(ALLOWED_STATUSES))}",
            )

        db = get_db()

        existing = (
            db.table("collaboration_submissions")
            .select("submission_id,status")
            .eq("submission_id", submission_id)
            .limit(1)
            .execute()
        )

        if not existing.data:
            raise HTTPException(status_code=404, detail="Submission not found.")

        result = (
            db.table("collaboration_submissions")
            .update({"status": payload.status})
            .eq("submission_id", submission_id)
            .execute()
        )

        return {
            "success": True,
            "message": "Submission status updated successfully.",
            "data": result.data[0] if result.data else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))