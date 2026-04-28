from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.database import get_db

router = APIRouter()


def group_evidence_rows(rows):
    grouped = {}

    for row in rows or []:
        key = row.get("attribute_type") or "other"
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(row)

    return grouped


def count_visible_evidence_rows(rows):
    blocked = {
        "not applicable",
        "not applicable.",
        "not specified",
        "not specified.",
        "no information available",
        "no information available.",
        "",
    }

    count = 0
    for row in rows or []:
        text = (
            row.get("display_text")
            or row.get("clean_text")
            or row.get("raw_text")
            or ""
        ).strip().lower()

        if text not in blocked:
            count += 1

    return count


@router.get("/")
async def get_plants(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    genus: Optional[str] = None,
    family: Optional[str] = None,
    endemic: Optional[bool] = None,
    region: Optional[str] = None,
    q: Optional[str] = None
):
    try:
        db = get_db()

        query = db.table("plant_taxon").select("*")

        if q:
            query = query.ilike("plant_name_raw", f"%{q}%")

        if genus:
            query = query.ilike("genus", f"%{genus}%")

        if family:
            query = query.ilike("family", f"%{family}%")

        if endemic is not None:
            query = query.eq("endemic_flag", endemic)

        if region:
            query = query.ilike("region", f"%{region}%")

        query = query.order("plant_name_raw", desc=False)

        result = query.range(skip, skip + limit - 1).execute()
        plants = result.data if result.data else []

        return {
            "data": plants,
            "count": len(plants),
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{plant_id}")
async def get_plant_detail(plant_id: str):
    try:
        db = get_db()

        plant_result = db.table("plant_taxon").select("*").eq(
            "plant_id", plant_id
        ).execute()

        if not plant_result.data:
            raise HTTPException(status_code=404, detail="Plant not found")

        plant = plant_result.data[0]

        compounds_result = db.table("v_plant_compound").select("*").eq(
            "plant_id", plant_id
        ).execute()

        evidence_result = db.table("plant_attribute_evidence").select("*").eq(
            "plant_id", plant_id
        ).execute()

        compounds = compounds_result.data if compounds_result.data else []
        evidence_rows = evidence_result.data if evidence_result.data else []
        evidence_groups = group_evidence_rows(evidence_rows)

        plant["compounds"] = compounds
        plant["compound_count"] = len(compounds)

        plant["evidence"] = evidence_rows
        plant["evidence_groups"] = evidence_groups
        plant["evidence_count"] = len(evidence_rows)
        plant["visible_evidence_count"] = count_visible_evidence_rows(evidence_rows)
        plant["evidence_types"] = list(evidence_groups.keys())

        plant["section_counts"] = {
            "botanical_overview": len(evidence_groups.get("botanical_characteristics", [])),
            "geography_climate": len(evidence_groups.get("geography_climate", [])),
            "ethnobotany": len(evidence_groups.get("ethnobotany", [])),
            "medicinal_potential": len(evidence_groups.get("medicinal_potential", [])),
            "plant_part_used": len(evidence_groups.get("plant_part_used", [])),
            "extraction_methodology": len(evidence_groups.get("extraction_methodology", [])),
            "plant_valorization": len(evidence_groups.get("plant_valorization", [])),
        }

        return plant

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{plant_id}/compounds")
async def get_plant_compounds(plant_id: str):
    try:
        db = get_db()

        result = db.table("v_plant_compound").select("*").eq(
            "plant_id", plant_id
        ).execute()

        return {"data": result.data if result.data else []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{plant_id}/evidence")
async def get_plant_evidence(plant_id: str):
    try:
        db = get_db()

        result = db.table("plant_attribute_evidence").select("*").eq(
            "plant_id", plant_id
        ).execute()

        rows = result.data if result.data else []

        return {
            "data": rows,
            "grouped": group_evidence_rows(rows),
            "count": len(rows),
            "visible_count": count_visible_evidence_rows(rows),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{plant_id}/signatures")
async def get_plant_signatures(plant_id: str):
    return {"data": []}


@router.get("/{plant_id}/pathways")
async def get_plant_pathways(plant_id: str):
    try:
        db = get_db()

        compounds_result = db.table("v_plant_compound").select(
            "compound_id"
        ).eq("plant_id", plant_id).execute()

        compound_ids = [
            row["compound_id"] for row in compounds_result.data
        ] if compounds_result.data else []

        if not compound_ids:
            return {"data": []}

        result = db.table("v_compound_kegg").select("*").in_(
            "compound_id", compound_ids
        ).execute()

        return {"data": result.data if result.data else []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{plant_id}/traditional_uses")
async def get_plant_traditional_uses(plant_id: str):
    try:
        db = get_db()

        result = db.table("plant_attribute_evidence").select("*").eq(
            "plant_id", plant_id
        ).eq("attribute_type", "ethnobotany").execute()

        return {"data": result.data if result.data else []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{plant_id}/genus-context")
async def get_plant_genus_context(plant_id: str):
    try:
        db = get_db()

        result = db.table("v_plant_genus_context").select("*").eq(
            "plant_id", plant_id
        ).execute()

        rows = result.data if result.data else []

        return {
            "data": rows,
            "grouped": group_evidence_rows(rows),
            "count": len(rows),
            "note": "These records describe genus-level knowledge and are not species-specific evidence.",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch genus context: {str(e)}",
        )
