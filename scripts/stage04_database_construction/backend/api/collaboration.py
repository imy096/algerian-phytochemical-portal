from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import uuid

from supabase import create_client, Client
from backend.database import get_db

router = APIRouter()


class CollaborationSubmission(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    institution: Optional[str] = None
    contribution_type: str
    message: str


def get_storage_client() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    return create_client(supabase_url, service_role_key)


@router.post("/submit")
async def submit_collaboration(payload: CollaborationSubmission):
    try:
        db = get_db()

        result = db.table("collaboration_submissions").insert({
            "submission_type": "quick_message",
            "full_name": payload.full_name,
            "email": payload.email,
            "institution": payload.institution,
            "title": payload.contribution_type,
            "message": payload.message,
            "status": "pending",
        }).execute()

        return {
            "success": True,
            "message": "Submission created successfully.",
            "data": result.data[0] if result.data else None,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-file")
async def upload_collaboration_file(
    file: UploadFile = File(...),
    submission_id: str = Form(...),
):
    try:
        allowed_types = {
            "text/csv",
            "application/pdf",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }

        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Only CSV, XLS, XLSX, and PDF files are allowed.",
            )

        db = get_db()

        submission_check = db.table("collaboration_submissions").select("submission_id,status").eq(
            "submission_id", submission_id
        ).limit(1).execute()

        if not submission_check.data:
            raise HTTPException(status_code=404, detail="Submission not found.")

        file_bytes = await file.read()
        file_size = len(file_bytes)

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        random_id = uuid.uuid4().hex[:8]
        safe_name = file.filename.replace(" ", "_")
        storage_path = f"{submission_id}/{timestamp}_{random_id}_{safe_name}"

        supabase = get_storage_client()

        supabase.storage.from_("collaboration-uploads").upload(
            storage_path,
            file_bytes,
            {"content-type": file.content_type}
        )

        result = db.table("submission_files").insert({
            "submission_id": submission_id,
            "original_filename": file.filename,
            "storage_path": storage_path,
            "mime_type": file.content_type,
            "file_size": file_size,
        }).execute()

        return {
            "success": True,
            "message": "File uploaded successfully and linked to pending submission.",
            "data": result.data[0] if result.data else None,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))