from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional

from backend.database import get_db

router = APIRouter()

ALLOWED_REVIEW_STATUSES = {
    "unreviewed",
    "approved",
    "rejected",
    "needs_revision",
}


class RowReviewUpdate(BaseModel):
    review_status: str
    curator_notes: Optional[str] = None


class BulkRowReviewUpdate(BaseModel):
    parsed_row_ids: List[str]
    review_status: str
    curator_notes: Optional[str] = None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def validate_review_status(status: str) -> None:
    if status not in ALLOWED_REVIEW_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid review_status. Allowed: {', '.join(sorted(ALLOWED_REVIEW_STATUSES))}",
        )


@router.get("/submission/{submission_id}/rows")
async def get_submission_parsed_rows(
    submission_id: str,
    report_id: Optional[str] = Query(None),
    review_status: Optional[str] = Query(None),
    valid_only: Optional[bool] = Query(None),
    approved_for_import: Optional[bool] = Query(None),
    limit: int = Query(200, ge=1, le=2000),
    offset: int = Query(0, ge=0),
):
    try:
        db = get_db()

        query = (
            db.table("submission_parsed_rows")
            .select("*")
            .eq("submission_id", submission_id)
        )

        if report_id:
            query = query.eq("report_id", report_id)

        if review_status:
            validate_review_status(review_status)
            query = query.eq("review_status", review_status)

        if valid_only is not None:
            query = query.eq("is_valid", valid_only)

        if approved_for_import is not None:
            query = query.eq("approved_for_import", approved_for_import)

        result = (
            query
            .order("row_number", desc=False)
            .range(offset, offset + limit - 1)
            .execute()
        )

        rows = result.data or []

        return {
            "data": rows,
            "count": len(rows),
            "limit": limit,
            "offset": offset,
            "filters": {
                "submission_id": submission_id,
                "report_id": report_id,
                "review_status": review_status,
                "valid_only": valid_only,
                "approved_for_import": approved_for_import,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/submission/{submission_id}/approved-rows")
async def get_submission_approved_rows(
    submission_id: str,
    limit: int = Query(500, ge=1, le=5000),
    offset: int = Query(0, ge=0),
):
    try:
        db = get_db()

        result = (
            db.table("submission_parsed_rows")
            .select("*")
            .eq("submission_id", submission_id)
            .eq("review_status", "approved")
            .eq("approved_for_import", True)
            .order("row_number", desc=False)
            .range(offset, offset + limit - 1)
            .execute()
        )

        rows = result.data or []

        return {
            "submission_id": submission_id,
            "data": rows,
            "count": len(rows),
            "limit": limit,
            "offset": offset,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/rows/{parsed_row_id}")
async def update_parsed_row_review(parsed_row_id: str, payload: RowReviewUpdate):
    try:
        validate_review_status(payload.review_status)

        db = get_db()

        update_data = {
            "review_status": payload.review_status,
            "curator_notes": payload.curator_notes,
            "approved_for_import": payload.review_status == "approved",
            "reviewed_at": utc_now_iso(),
        }

        result = (
            db.table("submission_parsed_rows")
            .update(update_data)
            .eq("parsed_row_id", parsed_row_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Parsed row not found.")

        return {
            "success": True,
            "data": result.data[0],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rows/bulk-review")
async def bulk_update_parsed_rows(payload: BulkRowReviewUpdate):
    try:
        validate_review_status(payload.review_status)

        if not payload.parsed_row_ids:
            raise HTTPException(status_code=400, detail="No parsed_row_ids provided.")

        db = get_db()

        update_data = {
            "review_status": payload.review_status,
            "curator_notes": payload.curator_notes,
            "approved_for_import": payload.review_status == "approved",
            "reviewed_at": utc_now_iso(),
        }

        result = (
            db.table("submission_parsed_rows")
            .update(update_data)
            .in_("parsed_row_id", payload.parsed_row_ids)
            .execute()
        )

        updated_rows = result.data or []

        return {
            "success": True,
            "updated_count": len(updated_rows),
            "data": updated_rows,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/submission/{submission_id}/summary")
async def get_submission_curation_summary(submission_id: str):
    try:
        db = get_db()

        result = (
            db.table("submission_parsed_rows")
            .select("*")
            .eq("submission_id", submission_id)
            .execute()
        )

        rows = result.data or []

        summary = {
            "total_rows": len(rows),
            "valid_rows": len([r for r in rows if r.get("is_valid") is True]),
            "invalid_rows": len([r for r in rows if r.get("is_valid") is False]),
            "unreviewed_rows": len([r for r in rows if r.get("review_status") == "unreviewed"]),
            "approved_rows": len([r for r in rows if r.get("review_status") == "approved"]),
            "rejected_rows": len([r for r in rows if r.get("review_status") == "rejected"]),
            "needs_revision_rows": len([r for r in rows if r.get("review_status") == "needs_revision"]),
            "approved_for_import_rows": len([r for r in rows if r.get("approved_for_import") is True]),
        }

        return {
            "submission_id": submission_id,
            "summary": summary,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))