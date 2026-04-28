from fastapi import APIRouter, HTTPException, Query
from backend.database import get_db

router = APIRouter()


def normalize_text(value: str | None) -> str:
    return (value or "").strip().lower()


def score_band(score: float | int | None) -> str:
    if score is None:
        return "unknown"
    if score >= 800:
        return "high"
    if score >= 400:
        return "moderate"
    return "low"


def build_plant_compound_graph(rows: list[dict]) -> dict:
    plant_nodes = {}
    compound_nodes = {}
    edges = []
    seen_edges = set()

    for row in rows:
        plant_id = row.get("plant_id")
        plant_name = row.get("plant_name_raw") or plant_id
        compound_id = row.get("compound_id")
        compound_name = row.get("compound_name_raw") or compound_id

        if plant_id and plant_id not in plant_nodes:
            plant_nodes[plant_id] = {
                "id": plant_id,
                "label": plant_name,
                "type": "plant",
            }

        if compound_id and compound_id not in compound_nodes:
            compound_nodes[compound_id] = {
                "id": compound_id,
                "label": compound_name,
                "type": "compound",
            }

        if plant_id and compound_id:
            edge_key = (plant_id, compound_id)
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                edges.append(
                    {
                        "source": plant_id,
                        "target": compound_id,
                        "type": "plant_compound",
                    }
                )

    nodes = list(plant_nodes.values()) + list(compound_nodes.values())

    return {
        "nodes": nodes,
        "edges": edges,
        "meta": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "plant_count": len(plant_nodes),
            "compound_count": len(compound_nodes),
        },
    }


def build_compound_target_graph(rows: list[dict]) -> dict:
    compound_nodes = {}
    target_nodes = {}
    edges = []
    seen_edges = set()

    for row in rows:
        compound_id = row.get("compound_id")
        compound_label = row.get("compound_id") or compound_id

        target_label = row.get("gene_name") or row.get("target_external_id")
        target_external_id = row.get("target_external_id")
        score = row.get("score")
        action = row.get("action")
        mode = row.get("mode")

        if not compound_id or not target_label:
            continue

        target_id = (
            f"target::{row.get('gene_name')}"
            if row.get("gene_name")
            else f"target::{target_external_id}"
        )

        if compound_id not in compound_nodes:
            compound_nodes[compound_id] = {
                "id": compound_id,
                "label": compound_label,
                "type": "compound",
            }

        if target_id not in target_nodes:
            target_nodes[target_id] = {
                "id": target_id,
                "label": target_label,
                "type": "target",
                "target_external_id": target_external_id,
            }

        edge_key = (compound_id, target_id)
        if edge_key not in seen_edges:
            seen_edges.add(edge_key)
            edges.append(
                {
                    "source": compound_id,
                    "target": target_id,
                    "type": "compound_target",
                    "score": score,
                    "score_band": score_band(score),
                    "action": action,
                    "mode": mode,
                }
            )

    nodes = list(compound_nodes.values()) + list(target_nodes.values())

    return {
        "nodes": nodes,
        "edges": edges,
        "meta": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "compound_count": len(compound_nodes),
            "target_count": len(target_nodes),
        },
    }


def row_matches_exact_plant_compound(row: dict, query: str) -> bool:
    plant_id = normalize_text(row.get("plant_id"))
    plant_name = normalize_text(row.get("plant_name_raw"))
    compound_id = normalize_text(row.get("compound_id"))
    compound_name = normalize_text(row.get("compound_name_raw"))
    return query in {plant_id, plant_name, compound_id, compound_name}


def row_matches_partial_plant_compound(row: dict, query: str) -> bool:
    plant_id = normalize_text(row.get("plant_id"))
    plant_name = normalize_text(row.get("plant_name_raw"))
    compound_id = normalize_text(row.get("compound_id"))
    compound_name = normalize_text(row.get("compound_name_raw"))
    return (
        query in plant_id
        or query in plant_name
        or query in compound_id
        or query in compound_name
    )


def row_matches_exact_compound_target(row: dict, query: str) -> bool:
    compound_id = normalize_text(row.get("compound_id"))
    gene_name = normalize_text(row.get("gene_name"))
    target_external_id = normalize_text(row.get("target_external_id"))
    return query in {compound_id, gene_name, target_external_id}


def row_matches_partial_compound_target(row: dict, query: str) -> bool:
    compound_id = normalize_text(row.get("compound_id"))
    gene_name = normalize_text(row.get("gene_name"))
    target_external_id = normalize_text(row.get("target_external_id"))
    return (
        query in compound_id
        or query in gene_name
        or query in target_external_id
    )


def collect_match_metadata_plant_compound(rows: list[dict], query: str) -> dict:
    matched_plant_labels = sorted(
        {
            row.get("plant_name_raw")
            for row in rows
            if row.get("plant_name_raw")
            and (
                query == normalize_text(row.get("plant_id"))
                or query == normalize_text(row.get("plant_name_raw"))
                or query in normalize_text(row.get("plant_id"))
                or query in normalize_text(row.get("plant_name_raw"))
            )
        }
    )

    matched_compound_labels = sorted(
        {
            row.get("compound_name_raw")
            for row in rows
            if row.get("compound_name_raw")
            and (
                query == normalize_text(row.get("compound_id"))
                or query == normalize_text(row.get("compound_name_raw"))
                or query in normalize_text(row.get("compound_id"))
                or query in normalize_text(row.get("compound_name_raw"))
            )
        }
    )

    return {
        "matched_plant_labels": matched_plant_labels,
        "matched_compound_labels": matched_compound_labels,
    }


def collect_match_metadata_compound_target(rows: list[dict], query: str) -> dict:
    matched_compound_labels = sorted(
        {
            row.get("compound_id")
            for row in rows
            if row.get("compound_id")
            and query in normalize_text(row.get("compound_id"))
        }
    )

    matched_target_labels = sorted(
        {
            row.get("gene_name") or row.get("target_external_id")
            for row in rows
            if (row.get("gene_name") or row.get("target_external_id"))
            and (
                query in normalize_text(row.get("gene_name"))
                or query in normalize_text(row.get("target_external_id"))
            )
        }
    )

    return {
        "matched_compound_labels": matched_compound_labels,
        "matched_target_labels": matched_target_labels,
    }


@router.get("/graph")
async def get_knowledge_graph(
    mode: str = Query(default="plant_compound"),
    limit: int = Query(default=150, ge=20, le=1000),
    min_score: int = Query(default=400, ge=0, le=1000),
):
    try:
        db = get_db()

        if mode == "compound_target":
            result = (
                db.table("compound_target_interaction")
                .select("compound_id,target_external_id,gene_name,score,action,mode")
                .gte("score", min_score)
                .limit(limit)
                .execute()
            )

            rows = result.data or []
            graph = build_compound_target_graph(rows)
            graph["meta"]["limit"] = limit
            graph["meta"]["mode"] = "global"
            graph["meta"]["graph_mode"] = "compound_target"
            graph["meta"]["min_score"] = min_score
            graph["meta"]["description"] = (
                "Global mode shows a sample of compound-target links filtered by minimum STITCH score."
            )
            return graph

        result = (
            db.table("plant_compound")
            .select("plant_id,plant_name_raw,compound_id,compound_name_raw")
            .limit(limit)
            .execute()
        )

        rows = result.data or []
        graph = build_plant_compound_graph(rows)
        graph["meta"]["limit"] = limit
        graph["meta"]["mode"] = "global"
        graph["meta"]["graph_mode"] = "plant_compound"
        graph["meta"]["description"] = (
            "Global mode shows a sample of plant-compound links based on the selected edge limit."
        )
        return graph

    except Exception as e:
        print(f"/api/graph error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/focus")
async def get_focused_graph(
    q: str = Query(..., min_length=2),
    graph_mode: str = Query(default="plant_compound"),
    pool_limit: int = Query(default=3000, ge=100, le=10000),
    min_score: int = Query(default=400, ge=0, le=1000),
):
    try:
        db = get_db()
        query = normalize_text(q)

        if graph_mode == "compound_target":
            result = (
                db.table("compound_target_interaction")
                .select("compound_id,target_external_id,gene_name,score,action,mode")
                .gte("score", min_score)
                .limit(pool_limit)
                .execute()
            )

            rows = result.data or []
            exact_rows = [row for row in rows if row_matches_exact_compound_target(row, query)]
            partial_rows = [row for row in rows if row_matches_partial_compound_target(row, query)]
            matched_rows = exact_rows if exact_rows else partial_rows

            graph = build_compound_target_graph(matched_rows)
            graph["meta"]["limit"] = pool_limit
            graph["meta"]["mode"] = "focus"
            graph["meta"]["graph_mode"] = "compound_target"
            graph["meta"]["query"] = q
            graph["meta"]["query_normalized"] = query
            graph["meta"]["match_strategy"] = "exact" if exact_rows else "partial"
            graph["meta"]["matched_rows"] = len(matched_rows)
            graph["meta"]["min_score"] = min_score
            graph["meta"]["description"] = (
                "Focus mode shows the matched compound or target and its direct compound-target neighborhood."
            )
            graph["meta"].update(collect_match_metadata_compound_target(matched_rows, query))
            return graph

        result = (
            db.table("plant_compound")
            .select("plant_id,plant_name_raw,compound_id,compound_name_raw")
            .limit(pool_limit)
            .execute()
        )

        rows = result.data or []
        exact_rows = [row for row in rows if row_matches_exact_plant_compound(row, query)]
        partial_rows = [row for row in rows if row_matches_partial_plant_compound(row, query)]
        matched_rows = exact_rows if exact_rows else partial_rows

        graph = build_plant_compound_graph(matched_rows)
        graph["meta"]["limit"] = pool_limit
        graph["meta"]["mode"] = "focus"
        graph["meta"]["graph_mode"] = "plant_compound"
        graph["meta"]["query"] = q
        graph["meta"]["query_normalized"] = query
        graph["meta"]["match_strategy"] = "exact" if exact_rows else "partial"
        graph["meta"]["matched_rows"] = len(matched_rows)
        graph["meta"]["description"] = (
            "Focus mode shows the matched plant or compound and its direct plant-compound neighborhood."
        )
        graph["meta"].update(collect_match_metadata_plant_compound(matched_rows, query))
        return graph

    except Exception as e:
        print(f"/api/graph/focus error: {e}")
        raise HTTPException(status_code=500, detail=str(e))