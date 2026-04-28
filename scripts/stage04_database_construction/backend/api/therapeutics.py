from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.database import get_db

router = APIRouter()


def safe(data):
    return data if data else []


@router.get("/concepts")
async def list_therapeutic_concepts(
    q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Public overview of normalized therapeutic concepts.
    Source: v_therapeutic_concepts
    """
    try:
        db = get_db()
        query = db.table("v_therapeutic_concepts").select("*")

        if q:
            query = query.ilike("concept_normalized", f"%{q}%")

        result = query.range(offset, offset + limit - 1).execute()

        rows = safe(result.data)
        return {
            "data": rows,
            "count": len(rows),
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch therapeutic concepts: {str(e)}")


@router.get("/concepts/{concept_name}")
async def get_therapeutic_concept_detail(
    concept_name: str,
    plant_limit: int = Query(100, ge=1, le=500),
    evidence_limit: int = Query(100, ge=1, le=500),
):
    """
    Detail page payload for one therapeutic concept.
    Uses only:
    - v_therapeutic_concepts
    - v_therapeutic_plants
    - v_therapeutic_evidence

    We intentionally do NOT include compounds/targets here yet.
    """
    try:
        db = get_db()

        summary_result = (
            db.table("v_therapeutic_concepts")
            .select("*")
            .eq("concept_normalized", concept_name)
            .limit(1)
            .execute()
        )

        if not summary_result.data:
            raise HTTPException(status_code=404, detail="Therapeutic concept not found")

        summary = summary_result.data[0]

        plants_result = (
            db.table("v_therapeutic_plants")
            .select("*")
            .eq("concept_normalized", concept_name)
            .limit(plant_limit)
            .execute()
        )

        evidence_result = (
            db.table("v_therapeutic_evidence")
            .select("*")
            .eq("concept_normalized", concept_name)
            .limit(evidence_limit)
            .execute()
        )

        plants = safe(plants_result.data)
        evidence = safe(evidence_result.data)

        ethnobotany_evidence = [
            row for row in evidence
            if (row.get("evidence_group") or "").strip().lower() == "ethnobotany"
        ]
        medicinal_evidence = [
            row for row in evidence
            if (row.get("evidence_group") or "").strip().lower() == "medicinal_potential"
        ]

        return {
            "concept": summary,
            "plants": plants,
            "evidence": evidence,
            "evidence_split": {
                "ethnobotany": ethnobotany_evidence,
                "medicinal_potential": medicinal_evidence,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch therapeutic concept detail: {str(e)}")


@router.get("/plants/{plant_id}")
async def get_plant_therapeutics(plant_id: str):
    """
    Therapeutic profile for a single plant.
    Uses plant-level therapeutics + evidence-level therapeutics.
    """
    try:
        db = get_db()

        plant_concepts_result = (
            db.table("v_therapeutic_plants")
            .select("*")
            .eq("plant_id", plant_id)
            .execute()
        )

        evidence_result = (
            db.table("v_therapeutic_evidence")
            .select("*")
            .eq("plant_id", plant_id)
            .execute()
        )

        concept_rows = safe(plant_concepts_result.data)
        evidence_rows = safe(evidence_result.data)

        concepts = sorted(
            list(
                {
                    row.get("concept_normalized")
                    for row in concept_rows
                    if row.get("concept_normalized")
                }
            )
        )

        ethnobotany = [
            row for row in evidence_rows
            if (row.get("evidence_group") or "").strip().lower() == "ethnobotany"
        ]
        medicinal = [
            row for row in evidence_rows
            if (row.get("evidence_group") or "").strip().lower() == "medicinal_potential"
        ]

        return {
            "plant_id": plant_id,
            "concepts": concepts,
            "concept_rows": concept_rows,
            "evidence": evidence_rows,
            "evidence_split": {
                "ethnobotany": ethnobotany,
                "medicinal_potential": medicinal,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch plant therapeutics: {str(e)}")