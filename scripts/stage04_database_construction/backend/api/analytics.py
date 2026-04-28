from fastapi import APIRouter, HTTPException
from backend.database import get_db

router = APIRouter()


def safe_exact_count(db, table_name: str, id_column: str) -> int:
    try:
        result = db.table(table_name).select(id_column, count="exact").execute()
        return result.count or 0
    except Exception as e:
        print(f"Exact count failed for {table_name}.{id_column}: {e}")
        return 0


def safe_rpc_rows(db, function_name: str, limit: int | None = None) -> list:
    try:
        query = db.rpc(function_name)
        if limit is not None:
            query = query.limit(limit)
        result = query.execute()
        return result.data or []
    except Exception as e:
        print(f"RPC rows failed for {function_name}: {e}")
        return []


def safe_gap_summary_map(db) -> dict[str, int]:
    # 1) Best path: RPC wrapper around SQL view
    try:
        result = db.rpc("get_gap_priority_summary").execute()
        rows = result.data or []
        if rows:
            return {row["gap_type"]: int(row["record_count"]) for row in rows}
    except Exception as e:
        print(f"Gap summary RPC failed: {e}")

    # 2) Fallback: read the view directly
    try:
        result = db.table("v_gap_priority_summary").select("gap_type,record_count").execute()
        rows = result.data or []
        if rows:
            return {row["gap_type"]: int(row["record_count"]) for row in rows}
    except Exception as e:
        print(f"Gap summary view read failed: {e}")

    # 3) Last resort: return empty dict, caller can fallback
    return {}


@router.get("/coverage")
async def get_coverage_stats():
    try:
        db = get_db()

        total_plants = safe_exact_count(db, "plant_taxon", "plant_id")
        total_compounds = safe_exact_count(db, "compound", "compound_id")
        total_plant_compound_links = safe_exact_count(
            db, "plant_compound", "plant_compound_id"
        )

        gap_counts = safe_gap_summary_map(db)

        # Fallbacks only for small categories if summary map fails completely.
        # Large compound categories must come from summary map to avoid 1000-row truncation.
        if not gap_counts:
            plants_without_compounds = len(
                safe_rpc_rows(db, "get_plants_without_compounds_report", limit=1000)
            )
            plants_with_missing_taxonomy = len(
                safe_rpc_rows(db, "get_plants_with_missing_taxonomy_report", limit=1000)
            )
            partial_plant_attributes = len(
                safe_rpc_rows(db, "get_partial_plant_attributes_report", limit=1000)
            )

            compounds_without_toxicity = 0
            compounds_with_missing_identifiers = 0
            compounds_without_kegg = 0
            compounds_without_omics = 0
            compounds_with_geo_only_omics = len(
                safe_rpc_rows(db, "get_compounds_with_geo_only_omics_report", limit=1000)
            )
            compounds_with_lincs_only_omics = len(
                safe_rpc_rows(db, "get_compounds_with_lincs_only_omics_report", limit=1000)
            )
        else:
            plants_without_compounds = gap_counts.get("plants_without_compounds", 0)
            plants_with_missing_taxonomy = gap_counts.get("plants_with_missing_taxonomy", 0)
            partial_plant_attributes = gap_counts.get("partial_plant_attributes", 0)

            compounds_without_toxicity = gap_counts.get("compounds_without_toxicity", 0)
            compounds_with_missing_identifiers = gap_counts.get(
                "compounds_with_missing_identifiers", 0
            )
            compounds_without_kegg = gap_counts.get("compounds_without_kegg", 0)
            compounds_without_omics = gap_counts.get("compounds_without_omics", 0)
            compounds_with_geo_only_omics = gap_counts.get(
                "compounds_with_geo_only_omics", 0
            )
            compounds_with_lincs_only_omics = gap_counts.get(
                "compounds_with_lincs_only_omics", 0
            )

        coverage = {
            "plants_with_compounds": max(total_plants - plants_without_compounds, 0),
            "plants_without_compounds": plants_without_compounds,
            "plants_with_complete_taxonomy": max(
                total_plants - plants_with_missing_taxonomy, 0
            ),
            "plants_with_missing_taxonomy": plants_with_missing_taxonomy,
            "plants_with_complete_core_attributes": max(
                total_plants - partial_plant_attributes, 0
            ),
            "partial_plant_attributes": partial_plant_attributes,
            "compounds_with_toxicity": max(
                total_compounds - compounds_without_toxicity, 0
            ),
            "compounds_without_toxicity": compounds_without_toxicity,
            "compounds_with_complete_identifiers": max(
                total_compounds - compounds_with_missing_identifiers, 0
            ),
            "compounds_with_missing_identifiers": compounds_with_missing_identifiers,
            "compounds_with_kegg": max(total_compounds - compounds_without_kegg, 0),
            "compounds_without_kegg": compounds_without_kegg,
            "compounds_with_omics": max(total_compounds - compounds_without_omics, 0),
            "compounds_without_omics": compounds_without_omics,
            "compounds_with_geo_only_omics": compounds_with_geo_only_omics,
            "compounds_with_lincs_only_omics": compounds_with_lincs_only_omics,
        }

        return {
            "total_plants": total_plants,
            "total_compounds": total_compounds,
            "total_plant_compound_links": total_plant_compound_links,
            "endemic_plants": 0,
            "coverage": coverage,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gaps")
async def get_knowledge_gaps():
    try:
        db = get_db()

        gap_counts = safe_gap_summary_map(db)

        plants_without_compounds = safe_rpc_rows(
            db, "get_plants_without_compounds_report", limit=500
        )
        plants_with_missing_taxonomy = safe_rpc_rows(
            db, "get_plants_with_missing_taxonomy_report", limit=500
        )
        partial_plant_attributes = safe_rpc_rows(
            db, "get_partial_plant_attributes_report", limit=500
        )
        compounds_without_toxicity = safe_rpc_rows(
            db, "get_compounds_without_toxicity_report", limit=500
        )
        compounds_with_missing_identifiers = safe_rpc_rows(
            db, "get_compounds_with_missing_identifiers_report", limit=500
        )
        compounds_without_kegg = safe_rpc_rows(
            db, "get_compounds_without_kegg_report", limit=500
        )
        compounds_without_omics = safe_rpc_rows(
            db, "get_compounds_without_omics_report", limit=500
        )
        compounds_with_geo_only_omics = safe_rpc_rows(
            db, "get_compounds_with_geo_only_omics_report", limit=500
        )
        compounds_with_lincs_only_omics = safe_rpc_rows(
            db, "get_compounds_with_lincs_only_omics_report", limit=500
        )

        if not gap_counts:
            summary = {
                "plants_without_compounds_count": len(plants_without_compounds),
                "plants_with_missing_taxonomy_count": len(plants_with_missing_taxonomy),
                "partial_plant_attributes_count": len(partial_plant_attributes),
                "compounds_without_toxicity_count": 0,
                "compounds_with_missing_identifiers_count": 0,
                "compounds_without_kegg_count": 0,
                "compounds_without_omics_count": 0,
                "compounds_with_geo_only_omics_count": len(compounds_with_geo_only_omics),
                "compounds_with_lincs_only_omics_count": len(compounds_with_lincs_only_omics),
            }
        else:
            summary = {
                "plants_without_compounds_count": gap_counts.get(
                    "plants_without_compounds", 0
                ),
                "plants_with_missing_taxonomy_count": gap_counts.get(
                    "plants_with_missing_taxonomy", 0
                ),
                "partial_plant_attributes_count": gap_counts.get(
                    "partial_plant_attributes", 0
                ),
                "compounds_without_toxicity_count": gap_counts.get(
                    "compounds_without_toxicity", 0
                ),
                "compounds_with_missing_identifiers_count": gap_counts.get(
                    "compounds_with_missing_identifiers", 0
                ),
                "compounds_without_kegg_count": gap_counts.get(
                    "compounds_without_kegg", 0
                ),
                "compounds_without_omics_count": gap_counts.get(
                    "compounds_without_omics", 0
                ),
                "compounds_with_geo_only_omics_count": gap_counts.get(
                    "compounds_with_geo_only_omics", 0
                ),
                "compounds_with_lincs_only_omics_count": gap_counts.get(
                    "compounds_with_lincs_only_omics", 0
                ),
            }

        return {
            "summary": summary,
            "plants_without_compounds": plants_without_compounds,
            "plants_with_missing_taxonomy": plants_with_missing_taxonomy,
            "partial_plant_attributes": partial_plant_attributes,
            "compounds_without_toxicity": compounds_without_toxicity,
            "compounds_with_missing_identifiers": compounds_with_missing_identifiers,
            "compounds_without_kegg": compounds_without_kegg,
            "compounds_without_omics": compounds_without_omics,
            "compounds_with_geo_only_omics": compounds_with_geo_only_omics,
            "compounds_with_lincs_only_omics": compounds_with_lincs_only_omics,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_database_stats():
    try:
        db = get_db()

        return {
            "plant_taxon": safe_exact_count(db, "plant_taxon", "plant_id"),
            "compound": safe_exact_count(db, "compound", "compound_id"),
            "plant_compound": safe_exact_count(
                db, "plant_compound", "plant_compound_id"
            ),
            "plant_attribute_evidence": safe_exact_count(
                db, "plant_attribute_evidence", "evidence_id"
            ),
            "geo_molecule_mentions": safe_exact_count(
                db, "geo_molecule_mentions", "compound_id"
            ),
            "lincs_compound_map": safe_exact_count(
                db, "lincs_compound_map", "compound_id"
            ),
            "compound_toxicity_clean": safe_exact_count(
                db, "compound_toxicity_clean", "compound_id"
            ),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/regions")
async def get_region_distribution():
    try:
        db = get_db()
        result = db.rpc("get_plants_by_region").execute()
        return {"data": result.data or []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))