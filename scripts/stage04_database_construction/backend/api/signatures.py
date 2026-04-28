from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from backend.database import get_db

router = APIRouter()


class SignatureGene(BaseModel):
    gene_id: str
    symbol: Optional[str] = None
    log_fc: Optional[float] = None
    p_value: Optional[float] = None
    adj_p_value: Optional[float] = None
    direction: Optional[str] = None


class Signature(BaseModel):
    signature_id: str
    level: Optional[str] = None
    compound_id: Optional[str] = None
    plant_id: Optional[str] = None
    source: Optional[str] = None
    experiment_id: Optional[str] = None
    metadata: dict = {}
    genes: List[SignatureGene] = []


def safe(data):
    return data if data else []


def try_execute(query):
    try:
        result = query.execute()
        return result.data if result.data else []
    except Exception:
        return []


def get_lincs_compound_name(row: Dict[str, Any]) -> Optional[str]:
    if row.get("compound_name_raw"):
        return row.get("compound_name_raw")

    lincs_data = row.get("lincs_data") or {}
    if isinstance(lincs_data, dict):
        return lincs_data.get("compound_name_raw")

    return None


def get_lincs_ref(row: Dict[str, Any]) -> Optional[str]:
    lincs_data = row.get("lincs_data") or {}
    if isinstance(lincs_data, dict):
        return lincs_data.get("brd_id")
    return None


def get_geo_title(row: Dict[str, Any]) -> Optional[str]:
    return (
        row.get("series_title")
        or row.get("sample_title")
        or row.get("gse")
        or row.get("gsm")
    )


def parse_lincs_experiment_label(label: Optional[str]) -> Dict[str, Optional[str]]:
    if not label:
        return {
            "brd_id": None,
            "compound_name": None,
            "cell_line": None,
            "time_value": None,
            "time_unit": None,
            "dose_value": None,
            "dose_unit": None,
        }

    parts = str(label).split("_")

    if len(parts) >= 6:
        brd_id = parts[0]
        dose_unit = parts[-1]
        dose_value = parts[-2]
        time_unit = parts[-3]
        time_value = parts[-4]
        cell_line = parts[-5]
        compound_name = "_".join(parts[1:-5]) if len(parts) > 6 else parts[1]

        return {
            "brd_id": brd_id,
            "compound_name": compound_name,
            "cell_line": cell_line,
            "time_value": time_value,
            "time_unit": time_unit,
            "dose_value": dose_value,
            "dose_unit": dose_unit,
        }

    return {
        "brd_id": parts[0] if parts else None,
        "compound_name": None,
        "cell_line": None,
        "time_value": None,
        "time_unit": None,
        "dose_value": None,
        "dose_unit": None,
    }


def load_lincs_signature_long_rows(db, brd_refs: List[str]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []

    for ref in brd_refs:
        if not ref:
            continue

        query = (
            db.table("lincs_signature_long")
            .select("*")
            .ilike("experiment_label", f"{ref}%")
            .limit(20000)
        )

        result_rows = try_execute(query)
        rows.extend(result_rows)

    return rows


def build_lincs_experiments_and_genes(long_rows: List[Dict[str, Any]]):
    experiments: Dict[str, List[Dict[str, Any]]] = {}

    for row in long_rows:
        label = row.get("experiment_label")
        if label:
            experiments.setdefault(label, []).append(row)

    sorted_labels = sorted(experiments.keys())

    experiment_summaries = []
    for label in sorted_labels:
        rows = experiments[label]
        parsed = parse_lincs_experiment_label(label)

        up_count = 0
        down_count = 0
        for row in rows:
            raw_value = str(row.get("value", "")).strip()
            if raw_value.startswith("-"):
                down_count += 1
            elif raw_value:
                up_count += 1

        experiment_summaries.append(
            {
                "experiment_label": label,
                "brd_id": parsed.get("brd_id"),
                "compound_name": parsed.get("compound_name"),
                "cell_line": parsed.get("cell_line"),
                "time_value": parsed.get("time_value"),
                "time_unit": parsed.get("time_unit"),
                "dose_value": parsed.get("dose_value"),
                "dose_unit": parsed.get("dose_unit"),
                "upregulated_count": up_count,
                "downregulated_count": down_count,
                "total_genes": len(rows),
            }
        )

    selected_label = sorted_labels[0] if sorted_labels else None
    selected_rows = experiments.get(selected_label, []) if selected_label else []

    genes = []
    for row in selected_rows:
        raw_value = str(row.get("value", "")).strip()

        direction = None
        if raw_value.startswith("-"):
            direction = "-1"
        elif raw_value:
            direction = "+1"

        genes.append(
            {
                "gene_id": row.get("feature_name"),
                "symbol": row.get("feature_name"),
                "log_fc": None,
                "p_value": None,
                "adj_p_value": None,
                "direction": direction,
            }
        )

    return experiment_summaries, selected_label, genes


def build_lincs_signature_rows(db, compound_id: Optional[str] = None):
    query = db.table("v_compound_lincs").select("*")
    if compound_id:
        query = query.eq("compound_id", compound_id)

    rows = safe(try_execute(query))

    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for row in rows:
        cid = row.get("compound_id")
        if cid:
            grouped.setdefault(cid, []).append(row)

    signatures = []
    for cid, items in grouped.items():
        first = items[0]
        compound_name = get_lincs_compound_name(first)
        refs = sorted({get_lincs_ref(item) for item in items if get_lincs_ref(item)})

        signatures.append(
            {
                "signature_id": f"LINCS__{cid}",
                "level": "compound",
                "compound_id": cid,
                "plant_id": None,
                "source": "LINCS",
                "experiment_id": refs[0] if refs else f"LINCS profile for {cid}",
                "metadata": {
                    "compound_name": compound_name,
                    "profile_count": len(items),
                    "references": refs[:20],
                    "summary": f"{len(items)} LINCS profile(s) available for this compound",
                },
                "genes": [],
            }
        )

    return signatures


def build_geo_signature_rows(db, compound_id: Optional[str] = None):
    query = db.table("v_compound_geo").select("*")
    if compound_id:
        query = query.eq("compound_id", compound_id)

    rows = safe(try_execute(query))

    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for row in rows:
        cid = row.get("compound_id")
        if cid:
            grouped.setdefault(cid, []).append(row)

    signatures = []
    for cid, items in grouped.items():
        first = items[0]
        titles = sorted({get_geo_title(item) for item in items if get_geo_title(item)})
        gse_ids = sorted({item.get("gse") for item in items if item.get("gse")})

        signatures.append(
            {
                "signature_id": f"GEO__{cid}",
                "level": "compound",
                "compound_id": cid,
                "plant_id": None,
                "source": "GEO",
                "experiment_id": titles[0] if titles else f"GEO study for {cid}",
                "metadata": {
                    "compound_name": first.get("compound_name_raw"),
                    "study_count": len(gse_ids) if gse_ids else len(items),
                    "gse_ids": gse_ids[:20],
                    "titles": titles[:20],
                    "summary": f"{len(gse_ids) if gse_ids else len(items)} GEO-linked study record(s) available for this compound",
                },
                "genes": [],
            }
        )

    return signatures


def build_synthetic_signature_list(
    db,
    level: Optional[str] = None,
    compound_id: Optional[str] = None,
    plant_id: Optional[str] = None,
    source: Optional[str] = None,
    q: Optional[str] = None,
):
    if plant_id:
        return []

    if level and level != "compound":
        return []

    signatures: List[Dict[str, Any]] = []
    normalized_source = (source or "").upper().strip()

    if not normalized_source or normalized_source == "LINCS":
        signatures.extend(build_lincs_signature_rows(db, compound_id=compound_id))

    if not normalized_source or normalized_source == "GEO":
        signatures.extend(build_geo_signature_rows(db, compound_id=compound_id))

    if q:
        q_lower = q.lower()

        def matches(sig: Dict[str, Any]) -> bool:
            metadata = sig.get("metadata") or {}
            searchable = [
                sig.get("signature_id"),
                sig.get("compound_id"),
                sig.get("experiment_id"),
                sig.get("source"),
                metadata.get("compound_name"),
            ]
            searchable.extend(metadata.get("gse_ids", []))
            searchable.extend(metadata.get("titles", []))
            searchable.extend(metadata.get("references", []))
            joined = " ".join([str(x) for x in searchable if x])
            return q_lower in joined.lower()

        signatures = [sig for sig in signatures if matches(sig)]

    signatures.sort(
        key=lambda s: (
            str(s.get("source") or ""),
            str((s.get("metadata") or {}).get("compound_name") or ""),
            str(s.get("compound_id") or ""),
        )
    )

    return signatures


def build_synthetic_signature_detail(db, signature_id: str):
    if signature_id.startswith("LINCS__"):
        compound_id = signature_id.split("LINCS__", 1)[1]
        rows = try_execute(
            db.table("v_compound_lincs").select("*").eq("compound_id", compound_id)
        )

        if not rows:
            raise HTTPException(status_code=404, detail="LINCS signature not found")

        first = rows[0]
        refs = sorted({get_lincs_ref(item) for item in rows if get_lincs_ref(item)})
        compound_name = get_lincs_compound_name(first)

        long_rows = load_lincs_signature_long_rows(db, refs)
        experiment_summaries, selected_experiment, genes = build_lincs_experiments_and_genes(long_rows)

        selected_meta = parse_lincs_experiment_label(selected_experiment)

        up_count = len([g for g in genes if g.get("direction") == "+1"])
        down_count = len([g for g in genes if g.get("direction") == "-1"])

        return {
            "signature_id": signature_id,
            "level": "compound",
            "compound_id": compound_id,
            "plant_id": None,
            "source": "LINCS",
            "experiment_id": selected_experiment or (refs[0] if refs else f"LINCS profile for {compound_id}"),
            "metadata": {
                "compound_name": compound_name,
                "profile_count": len(rows),
                "references": refs[:50],
                "selected_experiment": selected_experiment,
                "selected_brd_id": selected_meta.get("brd_id"),
                "selected_cell_line": selected_meta.get("cell_line"),
                "selected_time": (
                    f"{selected_meta.get('time_value')} {selected_meta.get('time_unit')}"
                    if selected_meta.get("time_value") and selected_meta.get("time_unit")
                    else None
                ),
                "selected_dose": (
                    f"{selected_meta.get('dose_value')} {selected_meta.get('dose_unit')}"
                    if selected_meta.get("dose_value") and selected_meta.get("dose_unit")
                    else None
                ),
                "experiment_count": len(experiment_summaries),
                "experiments": experiment_summaries[:50],
                "upregulated_count": up_count,
                "downregulated_count": down_count,
                "summary": (
                    f"{len(rows)} LINCS profile mapping row(s) and "
                    f"{len(experiment_summaries)} long-signature experiment(s) available for this compound"
                ),
            },
            "genes": genes,
        }

    if signature_id.startswith("GEO__"):
        compound_id = signature_id.split("GEO__", 1)[1]
        rows = try_execute(
            db.table("v_compound_geo").select("*").eq("compound_id", compound_id)
        )

        if not rows:
            raise HTTPException(status_code=404, detail="GEO signature not found")

        first = rows[0]
        titles = sorted({get_geo_title(item) for item in rows if get_geo_title(item)})
        gse_ids = sorted({item.get("gse") for item in rows if item.get("gse")})

        return {
            "signature_id": signature_id,
            "level": "compound",
            "compound_id": compound_id,
            "plant_id": None,
            "source": "GEO",
            "experiment_id": titles[0] if titles else f"GEO study for {compound_id}",
            "metadata": {
                "compound_name": first.get("compound_name_raw"),
                "study_count": len(gse_ids) if gse_ids else len(rows),
                "gse_ids": gse_ids[:50],
                "titles": titles[:50],
                "summary": f"{len(gse_ids) if gse_ids else len(rows)} GEO-linked study record(s) available for this compound",
            },
            "genes": [],
        }

    raise HTTPException(status_code=404, detail="Synthetic signature not found")


@router.get("/")
async def list_signatures(
    level: Optional[str] = None,
    compound_id: Optional[str] = None,
    plant_id: Optional[str] = None,
    source: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0
):
    """
    List transcriptomic signatures.

    Priority:
    1. real rows from `signature`
    2. fallback rows built from `v_compound_lincs` / `v_compound_geo`
    """
    db = get_db()

    real_rows = []
    try:
        query = db.table("signature").select("*")

        if level:
            query = query.eq("level", level)
        if compound_id:
            query = query.eq("compound_id", compound_id)
        if plant_id:
            query = query.eq("plant_id", plant_id)
        if source:
            query = query.eq("source", source)
        if q:
            query = query.or_(
                f"experiment_id.ilike.%{q}%,signature_id.ilike.%{q}%,compound_id.ilike.%{q}%,plant_id.ilike.%{q}%"
            )

        query = query.range(offset, offset + limit - 1)
        real_rows = safe(try_execute(query))
    except Exception:
        real_rows = []

    if real_rows:
        return {
            "data": real_rows,
            "count": len(real_rows),
            "limit": limit,
            "offset": offset,
        }

    synthetic_rows = build_synthetic_signature_list(
        db=db,
        level=level,
        compound_id=compound_id,
        plant_id=plant_id,
        source=source,
        q=q,
    )

    paged = synthetic_rows[offset: offset + limit]

    return {
        "data": paged,
        "count": len(synthetic_rows),
        "limit": limit,
        "offset": offset,
    }


@router.get("/{signature_id}")
async def get_signature(signature_id: str, include_genes: bool = True):
    """
    Get detailed signature with differential expression data.
    Supports:
    - real signature IDs from `signature`
    - synthetic IDs: LINCS__<compound_id>, GEO__<compound_id>
    """
    try:
        if signature_id.startswith("LINCS__") or signature_id.startswith("GEO__"):
            db = get_db()
            return build_synthetic_signature_detail(db, signature_id)

        db = get_db()

        sig_result = (
            db.table("signature")
            .select("*")
            .eq("signature_id", signature_id)
            .execute()
        )

        if not sig_result.data:
            raise HTTPException(status_code=404, detail="Signature not found")

        signature = sig_result.data[0]

        if include_genes:
            try:
                genes_result = (
                    db.table("signature_gene")
                    .select("*, gene:gene_id(symbol, description)")
                    .eq("signature_id", signature_id)
                    .limit(500)
                    .execute()
                )
                signature["genes"] = genes_result.data if genes_result.data else []
            except Exception:
                signature["genes"] = []
        else:
            signature["genes"] = []

        if "metadata" not in signature or signature["metadata"] is None:
            signature["metadata"] = {}

        return signature
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{signature_id}/top-genes")
async def get_top_signature_genes(
    signature_id: str,
    direction: Optional[str] = Query(None, pattern="^(up|down)$"),
    limit: int = Query(50, le=500)
):
    """
    Get top differentially expressed genes for a real signature.
    Synthetic overview signatures return empty data.
    """
    try:
        if signature_id.startswith("LINCS__") or signature_id.startswith("GEO__"):
            db = get_db()
            synthetic = build_synthetic_signature_detail(db, signature_id)
            genes = synthetic.get("genes", [])

            if direction == "up":
                genes = [g for g in genes if g.get("direction") in ("+1", "up", "1")]
            elif direction == "down":
                genes = [g for g in genes if g.get("direction") in ("-1", "down")]

            return {"data": genes[:limit]}

        db = get_db()

        query = (
            db.table("signature_gene")
            .select("*, gene:gene_id(symbol, description, entrez_id)")
            .eq("signature_id", signature_id)
        )

        if direction:
            query = query.eq("direction", direction)

        result = query.limit(limit).execute()
        return {"data": result.data if result.data else []}
    except Exception:
        return {"data": []}


@router.get("/compound/{compound_id}/signatures")
async def get_compound_signatures(compound_id: str):
    """
    Get all transcriptomic signatures for a compound.
    Falls back to synthetic LINCS/GEO overview signatures if real table is empty.
    """
    try:
        db = get_db()

        real_rows = try_execute(
            db.table("signature")
            .select("*")
            .eq("compound_id", compound_id)
            .eq("level", "compound")
        )

        if real_rows:
            return {"data": real_rows}

        synthetic = build_synthetic_signature_list(
            db=db,
            level="compound",
            compound_id=compound_id,
            plant_id=None,
            source=None,
            q=None,
        )
        return {"data": synthetic}
    except Exception:
        return {"data": []}


@router.get("/compare/signatures")
async def compare_signatures(
    signature_ids: str = Query(..., description="Comma-separated signature IDs"),
    top_n: int = Query(100, le=500)
):
    """
    Compare multiple real signatures by overlapping genes.
    Synthetic overview signatures are skipped.
    """
    try:
        db = get_db()

        sig_ids = [
            sig_id
            for sig_id in signature_ids.split(",")
            if not sig_id.startswith("LINCS__") and not sig_id.startswith("GEO__")
        ]

        if len(sig_ids) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least 2 real gene-level signatures are required for comparison"
            )

        signatures_data = {}

        for sig_id in sig_ids:
            try:
                result = (
                    db.table("signature_gene")
                    .select("gene_id, log_fc, direction, gene:gene_id(symbol)")
                    .eq("signature_id", sig_id)
                    .limit(top_n)
                    .execute()
                )
                signatures_data[sig_id] = result.data if result.data else []
            except Exception:
                signatures_data[sig_id] = []

        all_genes = set()
        for _, genes in signatures_data.items():
            all_genes.update([g["gene_id"] for g in genes if "gene_id" in g])

        comparison = {
            "total_unique_genes": len(all_genes),
            "signatures": signatures_data,
            "overlapping_genes": []
        }

        for gene_id in all_genes:
            gene_in_sigs = {}
            for sig_id, genes in signatures_data.items():
                gene_data = next((g for g in genes if g.get("gene_id") == gene_id), None)
                if gene_data:
                    gene_in_sigs[sig_id] = {
                        "log_fc": gene_data.get("log_fc"),
                        "direction": gene_data.get("direction")
                    }

            if len(gene_in_sigs) > 1:
                comparison["overlapping_genes"].append({
                    "gene_id": gene_id,
                    "signatures": gene_in_sigs
                })

        return comparison
    except HTTPException:
        raise
    except Exception:
        return {
            "total_unique_genes": 0,
            "signatures": {},
            "overlapping_genes": []
        }


@router.get("/geo-studies/")
async def list_geo_studies(
    organism: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0
):
    try:
        db = get_db()

        query = db.table("geo_study").select("*").range(offset, offset + limit - 1)

        if organism:
            query = query.eq("organism", organism)

        result = query.execute()

        return {
            "data": result.data if result.data else [],
            "count": len(result.data) if result.data else 0,
            "limit": limit,
            "offset": offset,
        }
    except Exception:
        return {
            "data": [],
            "count": 0,
            "limit": limit,
            "offset": offset,
        }


@router.get("/geo-studies/{gse_accession}")
async def get_geo_study(gse_accession: str):
    try:
        db = get_db()

        study_result = (
            db.table("geo_study")
            .select("*")
            .eq("gse_accession", gse_accession)
            .execute()
        )

        if not study_result.data:
            raise HTTPException(status_code=404, detail="GEO study not found")

        study = study_result.data[0]

        try:
            samples_result = (
                db.table("geo_sample")
                .select("*")
                .eq("geo_id", study["geo_id"])
                .execute()
            )
            samples = samples_result.data if samples_result.data else []
        except Exception:
            samples = []

        return {
            **study,
            "samples": samples
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))