from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from backend.database import get_db

router = APIRouter()

class Publication(BaseModel):
    reference_id: str
    pubmed_id: Optional[str]
    doi: Optional[str]
    title: str
    authors: Optional[str]
    journal: Optional[str]
    year: Optional[int]
    abstract: Optional[str]
    url: Optional[str]

@router.get("/", response_model=List[dict])
async def list_publications(
    query: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    journal: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0
):
    """
    List publications with optional filters
    """
    db = get_db()

    db_query = db.from_("reference").select("*").range(offset, offset + limit - 1)

    if query:
        db_query = db_query.textSearch("search_vector", query)

    if year_from:
        db_query = db_query.gte("year", year_from)

    if year_to:
        db_query = db_query.lte("year", year_to)

    if journal:
        db_query = db_query.ilike("journal", f"%{journal}%")

    db_query = db_query.order("year", desc=True)

    result = db_query.execute()
    return result.data

@router.get("/{reference_id}")
async def get_publication(reference_id: str):
    """
    Get publication details
    """
    db = get_db()

    result = db.from_("reference")\
        .select("*")\
        .eq("reference_id", reference_id)\
        .maybeSingle()\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Publication not found")

    return result.data

@router.get("/pubmed/{pubmed_id}")
async def get_publication_by_pubmed(pubmed_id: str):
    """
    Get publication by PubMed ID
    """
    db = get_db()

    result = db.from_("reference")\
        .select("*")\
        .eq("pubmed_id", pubmed_id)\
        .maybeSingle()\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Publication not found")

    return result.data

@router.get("/{reference_id}/related-data")
async def get_publication_related_data(reference_id: str):
    """
    Get all data entries linked to a publication
    """
    db = get_db()

    plant_compounds_result = db.from_("plant_compound_reference")\
        .select("plant_compound:plant_compound_id(*)")\
        .eq("reference_id", reference_id)\
        .execute()

    return {
        "reference_id": reference_id,
        "plant_compounds": plant_compounds_result.data
    }

@router.get("/stats/overview")
async def get_publications_stats():
    """
    Get publication statistics
    """
    db = get_db()

    total_result = db.from_("reference").select("*", count="exact").execute()

    year_dist_result = db.rpc("get_publication_year_distribution").execute()

    journal_dist_result = db.from_("reference")\
        .select("journal")\
        .limit(1000)\
        .execute()

    journals = {}
    for row in journal_dist_result.data:
        if row['journal']:
            journals[row['journal']] = journals.get(row['journal'], 0) + 1

    top_journals = sorted(journals.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "total_publications": total_result.count,
        "top_journals": [{"journal": j, "count": c} for j, c in top_journals]
    }
