from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.database import get_db

router = APIRouter()

@router.get("/")
async def get_genes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    symbol: Optional[str] = None,
    organism: Optional[str] = None
):
    db = get_db()

    query = db.table("gene").select("*")

    if symbol:
        query = query.ilike("symbol", f"%{symbol}%")
    if organism:
        query = query.eq("organism", organism)

    result = query.range(skip, skip + limit - 1).execute()

    return {
        "data": result.data,
        "count": len(result.data),
        "skip": skip,
        "limit": limit
    }

@router.get("/{gene_id}")
async def get_gene_detail(gene_id: str):
    db = get_db()

    result = db.table("gene").select("*").eq("gene_id", gene_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Gene not found")

    return result.data[0]

@router.get("/{gene_id}/pathways")
async def get_gene_pathways(gene_id: str):
    db = get_db()

    result = db.table("gene_pathway").select(
        "*, pathway(*)"
    ).eq("gene_id", gene_id).execute()

    return {"data": result.data}

@router.get("/{gene_id}/signatures")
async def get_gene_signatures(gene_id: str):
    db = get_db()

    result = db.table("signature_gene").select(
        "*, signature(*, compound(common_name, pubchem_cid), plant_taxon(scientific_name))"
    ).eq("gene_id", gene_id).limit(100).execute()

    return {"data": result.data}
