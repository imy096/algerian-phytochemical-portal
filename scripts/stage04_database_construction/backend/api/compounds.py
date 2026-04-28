from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
from backend.database import get_db

router = APIRouter()


def safe(data):
    return data if data else []


def first_or_none(data):
    return data[0] if data else None


def empty_compound(compound_id: str) -> Dict[str, Any]:
    return {
        "compound_id": compound_id,
        "compound_name_raw": None,
        "compound_name_normalized": None,
        "pubchem_cid": None,
        "molecular_formula": None,
        "molecular_weight": None,
        "smiles": None,
        "inchikey": None,
        "iupac_name": None,
        "xlogp": None,
        "tpsa": None,
        "dtxsid": None,
        "dtxcid": None,
        "logd55": None,
        "logd74": None,
        "ready_bio_deg": None,
        "kegg_ids": None,
        "kegg_names": None,
        "kegg_pathways": None,
        "chembl_ids": None,
        "plants": [],
    }


def set_if_missing(obj: Dict[str, Any], key: str, value: Any):
    if value is None:
        return
    if obj.get(key) in (None, "", []):
        obj[key] = value


def safe_select_one(db, table_name: str, compound_id: str):
    try:
        res = db.table(table_name).select("*").eq("compound_id", compound_id).execute()
        return first_or_none(res.data)
    except Exception:
        return None


def safe_select_many(db, table_name: str, compound_id: str):
    try:
        res = db.table(table_name).select("*").eq("compound_id", compound_id).execute()
        return safe(res.data)
    except Exception:
        return []


def clean_text(value):
    return str(value or "").strip()


def normalize_id(value):
    return (
        str(value or "")
        .strip()
        .lower()
        .replace("\ufeff", "")
        .replace("\u200b", "")
        .replace("\u200c", "")
        .replace("\u200d", "")
    )


def robust_select_by_compound_id(db, table_name: str, compound_id: str):
    """
    Robust lookup for imported tables.

    It tries exact match, case-insensitive match, contains match, then a paged scan
    with normalized Python comparison. This helps when Supabase CSV import creates
    hidden whitespace/encoding characters or when exact REST equality fails.
    """
    clean_id = clean_text(compound_id)
    wanted = normalize_id(compound_id)

    # 1. Exact match
    result = (
        db.table(table_name)
        .select("*")
        .eq("compound_id", clean_id)
        .execute()
    )
    rows = result.data or []
    if rows:
        return rows

    # 2. Case-insensitive exact match
    result = (
        db.table(table_name)
        .select("*")
        .ilike("compound_id", clean_id)
        .execute()
    )
    rows = result.data or []
    if rows:
        return rows

    # 3. Case-insensitive contains match
    result = (
        db.table(table_name)
        .select("*")
        .ilike("compound_id", f"%{clean_id}%")
        .execute()
    )
    rows = result.data or []
    if rows:
        return rows

    # 4. Scan fallback, up to 10,000 rows
    result = (
        db.table(table_name)
        .select("*")
        .range(0, 9999)
        .execute()
    )
    rows = result.data or []

    return [
        row for row in rows
        if normalize_id(row.get("compound_id")) == wanted
    ]


def merge_master(compound: Dict[str, Any], row: Dict[str, Any]):
    if not row:
        return

    for key in [
        "compound_id",
        "compound_name_raw",
        "compound_name_normalized",
        "pubchem_cid",
        "molecular_formula",
        "molecular_weight",
        "smiles",
        "inchikey",
        "iupac_name",
        "xlogp",
        "tpsa",
        "dtxsid",
        "dtxcid",
        "logd55",
        "logd74",
        "ready_bio_deg",
        "kegg_ids",
        "kegg_names",
        "kegg_pathways",
        "chembl_ids",
    ]:
        set_if_missing(compound, key, row.get(key))


def merge_pubchem(compound: Dict[str, Any], row: Dict[str, Any]):
    if not row:
        return

    set_if_missing(compound, "compound_id", row.get("compound_id"))
    set_if_missing(compound, "compound_name_raw", row.get("compound_name_raw"))
    set_if_missing(compound, "compound_name_normalized", row.get("compound_name_raw"))
    set_if_missing(compound, "pubchem_cid", row.get("cid"))
    set_if_missing(compound, "molecular_formula", row.get("molecular_formula"))
    set_if_missing(compound, "molecular_weight", row.get("molecular_weight"))
    set_if_missing(compound, "smiles", row.get("smiles"))
    set_if_missing(compound, "inchikey", row.get("inchikey"))
    set_if_missing(compound, "iupac_name", row.get("iupac_name"))
    set_if_missing(compound, "xlogp", row.get("xlogp"))
    set_if_missing(compound, "tpsa", row.get("tpsa"))


def merge_kegg(compound: Dict[str, Any], row: Dict[str, Any]):
    if not row:
        return

    set_if_missing(compound, "compound_id", row.get("compound_id"))
    set_if_missing(compound, "compound_name_raw", row.get("compound_name_raw"))
    set_if_missing(compound, "compound_name_normalized", row.get("compound_name_raw"))
    set_if_missing(compound, "pubchem_cid", row.get("cid"))
    set_if_missing(compound, "molecular_formula", row.get("molecular_formula"))
    set_if_missing(compound, "inchikey", row.get("inchikey"))
    set_if_missing(compound, "kegg_ids", row.get("kegg_id"))
    set_if_missing(compound, "kegg_names", row.get("kegg_name"))
    set_if_missing(compound, "kegg_pathways", row.get("kegg_pathway"))


def merge_comptox(compound: Dict[str, Any], row: Dict[str, Any]):
    if not row:
        return

    set_if_missing(compound, "compound_id", row.get("compound_id"))
    set_if_missing(compound, "compound_name_raw", row.get("compound_name_raw"))
    set_if_missing(compound, "compound_name_normalized", row.get("compound_name_raw"))
    set_if_missing(compound, "dtxsid", row.get("dtxsid"))
    set_if_missing(compound, "dtxcid", row.get("dtxcid"))
    set_if_missing(compound, "inchikey", row.get("inchikey"))
    set_if_missing(compound, "smiles", row.get("smiles"))
    set_if_missing(compound, "logd55", row.get("logd55"))
    set_if_missing(compound, "logd74", row.get("logd74"))
    set_if_missing(compound, "ready_bio_deg", row.get("ready_bio_deg"))


def build_compound_detail(db, compound_id: str) -> Dict[str, Any]:
    compound = empty_compound(compound_id)
    found_any = False

    master_row = safe_select_one(db, "v_compound_master", compound_id)
    if master_row:
        merge_master(compound, master_row)
        found_any = True

    pubchem_row = safe_select_one(db, "v_compound_pubchem", compound_id)
    if pubchem_row:
        merge_pubchem(compound, pubchem_row)
        found_any = True

    kegg_row = safe_select_one(db, "v_compound_kegg", compound_id)
    if kegg_row:
        merge_kegg(compound, kegg_row)
        found_any = True

    comptox_row = safe_select_one(db, "v_compound_comptox", compound_id)
    if comptox_row:
        merge_comptox(compound, comptox_row)
        found_any = True

    chembl_rows = safe_select_many(db, "v_compound_chembl", compound_id)
    if chembl_rows:
        first = chembl_rows[0]
        set_if_missing(compound, "compound_name_raw", first.get("compound_name_raw"))
        set_if_missing(compound, "compound_name_normalized", first.get("compound_name_raw"))
        chembl_ids = sorted(
            {
                row.get("molecule_chembl_id")
                for row in chembl_rows
                if row.get("molecule_chembl_id")
            }
        )
        if chembl_ids:
            set_if_missing(compound, "chembl_ids", ", ".join(chembl_ids))
        found_any = True

    lincs_rows = safe_select_many(db, "v_compound_lincs", compound_id)
    if lincs_rows:
        first = lincs_rows[0]
        set_if_missing(compound, "compound_name_raw", first.get("compound_name_raw"))
        set_if_missing(compound, "compound_name_normalized", first.get("compound_name_raw"))
        found_any = True

    geo_rows = safe_select_many(db, "v_compound_geo", compound_id)
    if geo_rows:
        first = geo_rows[0]
        set_if_missing(compound, "compound_name_raw", first.get("compound_name_raw"))
        set_if_missing(compound, "compound_name_normalized", first.get("compound_name_raw"))
        found_any = True

    toxicity_rows = safe_select_many(db, "v_compound_toxicity", compound_id)
    if toxicity_rows:
        first = toxicity_rows[0]
        set_if_missing(compound, "compound_name_raw", first.get("compound_name_raw"))
        set_if_missing(compound, "compound_name_normalized", first.get("compound_name_raw"))
        found_any = True

    target_rows = safe_select_many(db, "v_compound_target", compound_id)
    if target_rows:
        first = target_rows[0]
        set_if_missing(compound, "compound_name_raw", first.get("compound_name_raw"))
        set_if_missing(compound, "compound_name_normalized", first.get("compound_name_raw"))
        found_any = True

    if not found_any:
        raise HTTPException(status_code=404, detail="Compound not found")

    compound["plants"] = safe_select_many(db, "v_plant_compound", compound_id)
    return compound


@router.get("/")
async def get_compounds(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    q: Optional[str] = None,
    min_mw: Optional[float] = Query(None),
    max_mw: Optional[float] = Query(None),
):
    db = get_db()

    try:
        query = db.table("v_compound_master").select("*")

        if q:
            query = query.or_(
                f"compound_name_raw.ilike.%{q}%,compound_name_normalized.ilike.%{q}%,iupac_name.ilike.%{q}%,compound_id.ilike.%{q}%"
            )

        if min_mw is not None:
            query = query.gte("molecular_weight", min_mw)

        if max_mw is not None:
            query = query.lte("molecular_weight", max_mw)

        result = query.range(skip, skip + limit - 1).execute()

        return {
            "data": safe(result.data),
            "count": len(result.data or []),
            "skip": skip,
            "limit": limit,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch compounds: {str(e)}")


@router.get("/{compound_id}")
async def get_compound_detail(compound_id: str):
    db = get_db()
    try:
        return build_compound_detail(db, compound_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch compound detail: {str(e)}")


@router.get("/{compound_id}/plants")
async def get_compound_plants(compound_id: str):
    db = get_db()
    try:
        return {"data": safe_select_many(db, "v_plant_compound", compound_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch compound plants: {str(e)}")


@router.get("/{compound_id}/pubchem")
async def get_pubchem(compound_id: str):
    db = get_db()
    try:
        return {"data": safe_select_many(db, "v_compound_pubchem", compound_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch PubChem data: {str(e)}")


@router.get("/{compound_id}/chembl")
async def get_chembl(compound_id: str):
    db = get_db()
    try:
        return {"data": safe_select_many(db, "v_compound_chembl", compound_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch ChEMBL data: {str(e)}")


@router.get("/{compound_id}/kegg")
async def get_kegg(compound_id: str):
    db = get_db()
    try:
        return {"data": safe_select_many(db, "v_compound_kegg", compound_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch KEGG data: {str(e)}")


@router.get("/{compound_id}/pathways")
async def get_pathways(compound_id: str):
    db = get_db()
    try:
        return {"data": safe_select_many(db, "v_compound_kegg", compound_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pathway data: {str(e)}")


@router.get("/{compound_id}/lincs")
async def get_lincs(compound_id: str):
    db = get_db()
    try:
        return {"data": safe_select_many(db, "v_compound_lincs", compound_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch LINCS data: {str(e)}")


@router.get("/{compound_id}/geo")
async def get_geo(compound_id: str):
    db = get_db()
    try:
        return {"data": safe_select_many(db, "v_compound_geo", compound_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch GEO data: {str(e)}")


@router.get("/{compound_id}/toxicity")
async def get_toxicity(compound_id: str):
    db = get_db()
    try:
        return {"data": safe_select_many(db, "v_compound_toxicity", compound_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch toxicity data: {str(e)}")


@router.get("/{compound_id}/targets")
async def get_targets(compound_id: str):
    db = get_db()
    try:
        return {"data": safe_select_many(db, "v_compound_target", compound_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch target data: {str(e)}")


@router.get("/{compound_id}/comptox-properties")
async def get_comptox_properties(compound_id: str):
    db = get_db()
    try:
        return {"data": safe_select_many(db, "v_compound_compotox_propteryt", compound_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch CompTox properties: {str(e)}")

@router.get("/{compound_id}/np-classification")
async def get_np_classification(compound_id: str):
    db = get_db()
    try:
        rows = robust_select_by_compound_id(
            db,
            "compound_np_classification",
            compound_id,
        )
        return {"data": rows}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch NPClassifier data: {str(e)}",
        )


@router.get("/{compound_id}/nmr")
async def get_nmr_data(compound_id: str):
    db = get_db()
    try:
        rows = robust_select_by_compound_id(
            db,
            "compound_nmr_data",
            compound_id,
        )
        return {"data": rows}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch NMR data: {str(e)}",
        )


@router.get("/{compound_id}/np-classification-debug")
async def debug_np_classification(compound_id: str):
    db = get_db()
    try:
        exact = (
            db.table("compound_np_classification")
            .select("*")
            .eq("compound_id", clean_text(compound_id))
            .execute()
        )

        sample = (
            db.table("compound_np_classification")
            .select("id, compound_id, np_pathway, np_superclass, np_class")
            .range(0, 20)
            .execute()
        )

        scan = (
            db.table("compound_np_classification")
            .select("id, compound_id, np_pathway, np_superclass, np_class")
            .range(0, 9999)
            .execute()
        )

        wanted = normalize_id(compound_id)
        normalized_matches = [
            row for row in (scan.data or [])
            if normalize_id(row.get("compound_id")) == wanted
        ]

        return {
            "requested_compound_id": compound_id,
            "exact_count": len(exact.data or []),
            "scan_count": len(scan.data or []),
            "normalized_match_count": len(normalized_matches),
            "normalized_matches": normalized_matches[:10],
            "sample_first_20": sample.data or [],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Debug NP failed: {str(e)}")


@router.get("/{compound_id}/nmr-debug")
async def debug_nmr_data(compound_id: str):
    db = get_db()
    try:
        exact = (
            db.table("compound_nmr_data")
            .select("*")
            .eq("compound_id", clean_text(compound_id))
            .execute()
        )

        sample = (
            db.table("compound_nmr_data")
            .select("id, compound_id, proton_nmr, carbon_nmr, solvent, frequency, doi")
            .range(0, 20)
            .execute()
        )

        scan = (
            db.table("compound_nmr_data")
            .select("id, compound_id, proton_nmr, carbon_nmr, solvent, frequency, doi")
            .range(0, 9999)
            .execute()
        )

        wanted = normalize_id(compound_id)
        normalized_matches = [
            row for row in (scan.data or [])
            if normalize_id(row.get("compound_id")) == wanted
        ]

        return {
            "requested_compound_id": compound_id,
            "exact_count": len(exact.data or []),
            "scan_count": len(scan.data or []),
            "normalized_match_count": len(normalized_matches),
            "normalized_matches": normalized_matches[:10],
            "sample_first_20": sample.data or [],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Debug NMR failed: {str(e)}")

@router.get("/{compound_id}/structure-files")
async def get_structure_files(compound_id: str):
    db = get_db()
    try:
        rows = robust_select_by_compound_id(
            db,
            "compound_structure_files",
            compound_id,
        )
        return {"data": rows}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch structure files: {str(e)}",
        )


@router.get("/{compound_id}/metabolite-context")
async def get_metabolite_context(compound_id: str):
    db = get_db()
    try:
        rows = robust_select_by_compound_id(
            db,
            "v_compound_metabolite_context",
            compound_id,
        )

        return {
            "data": rows,
            "count": len(rows),
            "note": "Metabolite family context derived from NPClassifier mapping.",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch metabolite family context: {str(e)}",
        )
