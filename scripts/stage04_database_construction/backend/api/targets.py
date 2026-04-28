from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.database import get_db

router = APIRouter()


@router.get("/")
async def get_targets(
    skip: int = Query(0, ge=0),
    limit: int = Query(60, ge=1, le=500),
    q: Optional[str] = None,
    status: Optional[str] = None,
):
    try:
        db = get_db()

        query = (
            db.table("v_target_summary")
            .select("*", count="exact")
            .order("linked_compounds_count", desc=True)
            .range(skip, skip + limit - 1)
        )

        if q:
            safe_q = q.replace(",", " ").strip()
            query = query.or_(
                f"display_name.ilike.%{safe_q}%,gene_name.ilike.%{safe_q}%,target_external_id.ilike.%{safe_q}%"
            )

        if status in {"named", "unresolved"}:
            query = query.eq("target_status", status)

        result = query.execute()
        rows = result.data or []

        return {
            "data": rows,
            "count": len(rows),
            "total_count": result.count or len(rows),
            "skip": skip,
            "limit": limit,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{target_key}")
async def get_target_detail(target_key: str):
    try:
        db = get_db()

        summary_result = (
            db.table("v_target_summary")
            .select("*")
            .eq("target_key", target_key)
            .limit(1)
            .execute()
        )

        if not summary_result.data:
            raise HTTPException(status_code=404, detail="Target not found")

        summary = summary_result.data[0]

        gene_name = summary.get("gene_name")
        target_external_id = summary.get("target_external_id")

        compounds_query = (
            db.table("compound_target_interaction")
            .select(
                "interaction_id,compound_id,compound_pubchem_cid,"
                "gene_name,target_external_id,target_species,score,action,mode"
            )
        )

        if gene_name:
            compounds_result = compounds_query.eq("gene_name", gene_name).execute()
        else:
            compounds_result = compounds_query.eq("target_external_id", target_external_id).execute()

        lincs_result = (
            db.table("lincs_signature_long")
            .select("feature_name,experiment_label,value")
            .eq("feature_name", target_key)
            .limit(100)
            .execute()
        )

        return {
            "summary": summary,
            "compound_links": compounds_result.data or [],
            "lincs_rows": lincs_result.data or [],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))