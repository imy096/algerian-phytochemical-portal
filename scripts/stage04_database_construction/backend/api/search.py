from fastapi import APIRouter, Query
from typing import Optional
from backend.database import get_db

router = APIRouter()

@router.get("/")
async def global_search(
    q: str = Query(..., min_length=2),
    entity_type: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100)
):
    db = get_db()
    results = {}

    search_types = ["plants", "compounds", "genes", "pathways", "diseases", "references"] if not entity_type else [entity_type]

    if "plants" in search_types:
        plants = db.table("plant_taxon").select(
            "plant_taxon_id, scientific_name, genus, family, endemic_flag"
        ).or_(
            f"scientific_name.ilike.%{q}%,genus.ilike.%{q}%,family.ilike.%{q}%"
        ).limit(limit).execute()
        results["plants"] = plants.data

    if "compounds" in search_types:
        compounds = db.table("compound").select(
            "compound_id, common_name, iupac_name, pubchem_cid, chemical_class"
        ).or_(
            f"common_name.ilike.%{q}%,iupac_name.ilike.%{q}%,pubchem_cid.ilike.%{q}%,chemical_class.ilike.%{q}%"
        ).limit(limit).execute()

        synonyms = db.table("compound_synonym").select(
            "compound_id, synonym"
        ).ilike("synonym", f"%{q}%").limit(limit).execute()

        compound_ids = [s["compound_id"] for s in synonyms.data]
        if compound_ids:
            synonym_compounds = db.table("compound").select(
                "compound_id, common_name, iupac_name, pubchem_cid, chemical_class"
            ).in_("compound_id", compound_ids).execute()
            compounds.data.extend(synonym_compounds.data)

        results["compounds"] = compounds.data

    if "genes" in search_types:
        genes = db.table("gene").select(
            "gene_id, symbol, entrez_id, description"
        ).or_(
            f"symbol.ilike.%{q}%,description.ilike.%{q}%,entrez_id.ilike.%{q}%"
        ).limit(limit).execute()
        results["genes"] = genes.data

    if "pathways" in search_types:
        pathways = db.table("pathway").select(
            "pathway_id, name, source_db, description"
        ).or_(
            f"name.ilike.%{q}%,description.ilike.%{q}%"
        ).limit(limit).execute()
        results["pathways"] = pathways.data

    if "diseases" in search_types:
        diseases = db.table("disease").select(
            "disease_id, name, mesh_id, description"
        ).or_(
            f"name.ilike.%{q}%,description.ilike.%{q}%,mesh_id.ilike.%{q}%"
        ).limit(limit).execute()
        results["diseases"] = diseases.data

    if "references" in search_types:
        references = db.table("reference").select(
            "reference_id, title, authors, journal, pubmed_id, year"
        ).or_(
            f"title.ilike.%{q}%,authors.ilike.%{q}%,pubmed_id.ilike.%{q}%"
        ).limit(limit).execute()
        results["references"] = references.data

    return results

@router.get("/autocomplete")
async def autocomplete(
    q: str = Query(..., min_length=1),
    entity_type: str = Query("plants"),
    limit: int = Query(10, ge=1, le=50)
):
    db = get_db()

    if entity_type == "plants":
        result = db.table("plant_taxon").select(
            "plant_taxon_id, scientific_name"
        ).ilike("scientific_name", f"{q}%").limit(limit).execute()
        return [{"id": r["plant_taxon_id"], "label": r["scientific_name"]} for r in result.data]

    elif entity_type == "compounds":
        result = db.table("compound").select(
            "compound_id, common_name, pubchem_cid"
        ).or_(
            f"common_name.ilike.{q}%,pubchem_cid.ilike.{q}%"
        ).limit(limit).execute()
        return [{"id": r["compound_id"], "label": r["common_name"] or r["pubchem_cid"]} for r in result.data]

    elif entity_type == "genes":
        result = db.table("gene").select(
            "gene_id, symbol"
        ).ilike("symbol", f"{q}%").limit(limit).execute()
        return [{"id": r["gene_id"], "label": r["symbol"]} for r in result.data]

    return []
