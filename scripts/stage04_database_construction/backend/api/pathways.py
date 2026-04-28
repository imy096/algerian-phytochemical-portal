from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.database import get_db

router = APIRouter()

@router.get("/")
async def get_pathways(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    source_db: Optional[str] = None
):
    db = get_db()

    query = db.table("pathway").select("*")

    if source_db:
        query = query.eq("source_db", source_db)

    result = query.range(skip, skip + limit - 1).execute()

    return {
        "data": result.data,
        "count": len(result.data),
        "skip": skip,
        "limit": limit
    }

@router.get("/{pathway_id}")
async def get_pathway_detail(pathway_id: str):
    db = get_db()

    result = db.table("pathway").select("*").eq("pathway_id", pathway_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Pathway not found")

    return result.data[0]

@router.get("/{pathway_id}/compounds")
async def get_pathway_compounds(pathway_id: str):
    db = get_db()

    result = db.table("compound_pathway").select(
        "*, compound(*, compound_synonym(*))"
    ).eq("pathway_id", pathway_id).execute()

    return {"data": result.data}

@router.get("/{pathway_id}/genes")
async def get_pathway_genes(pathway_id: str):
    db = get_db()

    result = db.table("gene_pathway").select(
        "*, gene(*)"
    ).eq("pathway_id", pathway_id).execute()

    return {"data": result.data}
