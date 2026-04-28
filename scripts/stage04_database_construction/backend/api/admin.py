from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from backend.database import get_db
from datetime import datetime

router = APIRouter()

class SubmissionCreate(BaseModel):
    submission_type: str
    data: dict
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    evidence_level: Optional[str] = None

class SubmissionReview(BaseModel):
    status: str
    review_notes: Optional[str] = None

@router.get("/submissions")
async def get_submissions(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    db = get_db()

    query = db.table("submission").select(
        "*, users!submission_submitted_by_fkey(full_name, email)"
    )

    if status:
        query = query.eq("status", status)

    result = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()

    return {
        "data": result.data,
        "count": len(result.data)
    }

@router.get("/submissions/{submission_id}")
async def get_submission_detail(submission_id: str):
    db = get_db()

    result = db.table("submission").select(
        "*, "
        "users!submission_submitted_by_fkey(full_name, email), "
        "users!submission_reviewed_by_fkey(full_name, email)"
    ).eq("submission_id", submission_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Submission not found")

    return result.data[0]

@router.post("/submissions")
async def create_submission(submission: SubmissionCreate):
    db = get_db()

    data = {
        "submission_type": submission.submission_type,
        "data": submission.data,
        "source_type": submission.source_type,
        "source_id": submission.source_id,
        "evidence_level": submission.evidence_level,
        "status": "pending"
    }

    result = db.table("submission").insert(data).execute()

    return result.data[0] if result.data else None

@router.patch("/submissions/{submission_id}/review")
async def review_submission(submission_id: str, review: SubmissionReview):
    db = get_db()

    update_data = {
        "status": review.status,
        "review_notes": review.review_notes,
        "updated_at": datetime.utcnow().isoformat()
    }

    result = db.table("submission").update(update_data).eq(
        "submission_id", submission_id
    ).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Submission not found")

    if review.status == "approved":
        submission_data = result.data[0]
        await process_approved_submission(submission_data)

    return result.data[0]

async def process_approved_submission(submission: dict):
    db = get_db()
    submission_type = submission["submission_type"]
    data = submission["data"]

    if submission_type == "plant_compound":
        db.table("plant_compound").insert(data).execute()
    elif submission_type == "traditional_use":
        db.table("plant_traditional_use").insert(data).execute()
    elif submission_type == "toxicity":
        db.table("compound_toxicity_endpoint").insert(data).execute()

@router.get("/dashboard")
async def get_admin_dashboard():
    db = get_db()

    pending_submissions = db.table("submission").select(
        "submission_id", count="exact"
    ).eq("status", "pending").execute()

    recent_submissions = db.table("submission").select(
        "*, users!submission_submitted_by_fkey(full_name)"
    ).order("created_at", desc=True).limit(10).execute()

    return {
        "pending_count": pending_submissions.count or 0,
        "recent_submissions": recent_submissions.data
    }
