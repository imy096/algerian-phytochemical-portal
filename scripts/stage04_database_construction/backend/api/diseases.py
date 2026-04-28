from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.database import get_db

router = APIRouter()

@router.get("/")
async def get_diseases(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[str] = None
):
    db = get_db()

    query = db.table("disease").select("*")

    if category:
        query = query.eq("category", category)

    result = query.range(skip, skip + limit - 1).execute()

    return {
        "data": result.data,
        "count": len(result.data),
        "skip": skip,
        "limit": limit
    }

@router.get("/{disease_id}")
async def get_disease_detail(disease_id: str):
    db = get_db()

    result = db.table("disease").select("*").eq("disease_id", disease_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Disease not found")

    return result.data[0]

@router.get("/{disease_id}/compounds")
async def get_disease_compounds(disease_id: str):
    db = get_db()

    result = db.table("compound_disease").select(
        "*, compound(*, compound_synonym(*))"
    ).eq("disease_id", disease_id).execute()

    return {"data": result.data}

@router.get("/{disease_id}/plants")
async def get_disease_plants(disease_id: str):
    db = get_db()

    result = db.rpc("get_disease_plants", {"p_disease_id": disease_id}).execute()

    return {"data": result.data if result.data else []}
