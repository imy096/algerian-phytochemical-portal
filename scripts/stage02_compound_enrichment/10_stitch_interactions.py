#!/usr/bin/env python3
"""
STAGE 2 - STITCH compound-target interaction enrichment

This script merges the original STITCH helper scripts into one reproducible pipeline:
1. Read PubChem CIDs from the Stage 2 PubChem output.
2. Convert each CID to possible STITCH chemical IDs: CID########, CIDm########, CIDs########.
3. Filter a local STITCH human actions TSV file for rows involving those compound IDs.
4. Add PubChem CID columns back to the filtered interaction table.
5. Extract human ENSP protein IDs from the interactions.
6. Map ENSP protein IDs to gene symbols with mygene.info.
7. Save all intermediate and final outputs.

Required external STITCH file:
    9606.actions.v5.0.tsv

Typical run:
    python scripts/stage02_compound_enrichment/10_stitch_interactions.py \
        --pubchem data/stage02_compound_enrichment/pubchem/pubchem_compound_identifiers.xlsx \
        --actions-file data/stage02_compound_enrichment/external/stitch/9606.actions.v5.0.tsv \
        --output data/stage02_compound_enrichment/stitch
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
import time
from pathlib import Path
from typing import Iterable, Optional

import pandas as pd

try:
    import mygene
except ImportError:  # handled at runtime with a clear message
    mygene = None


ACTION_COLUMNS = ["item_id_a", "item_id_b", "mode", "action", "a_is_acting", "score"]
CID_PATTERN = re.compile(r"^CID[m,s]?(0*)(\d+)$")
ENSP_PATTERN = re.compile(r"^(?:9606\.)?ENSP\d+")


def normalize_cid(value) -> Optional[str]:
    """Return a clean PubChem CID string, or None."""
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "not_found", "n/a"}:
        return None
    # Handles Excel floats like 5280343.0
    if re.fullmatch(r"\d+\.0", text):
        text = text[:-2]
    digits = re.sub(r"\D", "", text)
    return digits if digits else None


def read_pubchem_cids(pubchem_file: Path, cid_column: str = "CID") -> list[str]:
    """Read unique PubChem CIDs from PubChem Stage 2 output."""
    if not pubchem_file.exists():
        raise FileNotFoundError(f"PubChem input not found: {pubchem_file}")
    if pubchem_file.suffix.lower() in {".xlsx", ".xls"}:
        df = pd.read_excel(pubchem_file)
    else:
        df = pd.read_csv(pubchem_file)
    if cid_column not in df.columns:
        raise ValueError(f"Column '{cid_column}' not found. Available columns: {list(df.columns)}")
    cids = []
    seen = set()
    for value in df[cid_column].tolist():
        cid = normalize_cid(value)
        if cid and cid not in seen:
            seen.add(cid)
            cids.append(cid)
    return cids


def make_stitch_ids(cids: Iterable[str]) -> list[str]:
    """Generate STITCH compound IDs from PubChem CIDs."""
    ids = []
    for cid in cids:
        cid8 = str(cid).zfill(8)
        ids.extend([f"CID{cid8}", f"CIDm{cid8}", f"CIDs{cid8}"])
    return ids


def cid_from_stitch_id(stitch_id: str) -> Optional[str]:
    """Recover PubChem CID from a STITCH chemical ID."""
    if not isinstance(stitch_id, str):
        return None
    match = CID_PATTERN.match(stitch_id)
    if match:
        return match.group(2)
    return None


def is_ensp(value: str) -> bool:
    return isinstance(value, str) and bool(ENSP_PATTERN.match(value.strip()))


def filter_stitch_actions(actions_file: Path, stitch_ids: set[str], output_tsv: Path) -> int:
    """Filter STITCH actions rows where either item_id_a or item_id_b is one of our compound STITCH IDs."""
    if not actions_file.exists():
        raise FileNotFoundError(f"STITCH actions file not found: {actions_file}")
    output_tsv.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with actions_file.open("r", encoding="utf-8", errors="replace") as inp, output_tsv.open("w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out, delimiter="\t", lineterminator="\n")
        for line_no, line in enumerate(inp, 1):
            line = line.rstrip("\n")
            if not line:
                continue
            parts = line.split("\t")
            if len(parts) < 2:
                continue
            # Skip a possible header row.
            if line_no == 1 and (parts[0] in {"item_id_a", "item_id_a\r"} or parts[0].lower().startswith("item")):
                continue
            if parts[0] in stitch_ids or parts[1] in stitch_ids:
                writer.writerow(parts[:6])
                count += 1
    return count


def load_filtered_actions(filtered_tsv: Path) -> pd.DataFrame:
    if not filtered_tsv.exists() or filtered_tsv.stat().st_size == 0:
        return pd.DataFrame(columns=ACTION_COLUMNS)
    return pd.read_csv(filtered_tsv, sep="\t", header=None, names=ACTION_COLUMNS, dtype=str)


def add_cid_columns(actions: pd.DataFrame) -> pd.DataFrame:
    out = actions.copy()
    out["item_a_pubchem_cid"] = out["item_id_a"].apply(cid_from_stitch_id)
    out["item_b_pubchem_cid"] = out["item_id_b"].apply(cid_from_stitch_id)
    out["compound_pubchem_cid"] = out["item_a_pubchem_cid"].fillna(out["item_b_pubchem_cid"])
    out["protein_ensp_id"] = out.apply(
        lambda r: r["item_id_b"] if cid_from_stitch_id(r["item_id_a"]) else r["item_id_a"], axis=1
    )
    return out


def extract_ensp_ids(actions: pd.DataFrame) -> list[str]:
    ids = set()
    for col in ["item_id_a", "item_id_b", "protein_ensp_id"]:
        if col not in actions.columns:
            continue
        for value in actions[col].dropna().astype(str):
            value = value.strip()
            if is_ensp(value):
                ids.add(value)
    return sorted(ids)


def map_ensp_to_gene(ensp_ids: list[str], species: str = "human") -> pd.DataFrame:
    """Map ENSP IDs to gene symbols using mygene.info."""
    if not ensp_ids:
        return pd.DataFrame(columns=["Ensembl_Protein_ID", "Gene_Symbol"])
    if mygene is None:
        raise ImportError("Package 'mygene' is required for ENSP to gene mapping. Install with: pip install mygene")

    query_ids = [x.split(".", 1)[1] if "." in x else x for x in ensp_ids]
    mg = mygene.MyGeneInfo()
    results = mg.querymany(query_ids, scopes="ensembl.protein", fields="symbol", species=species, verbose=False)
    id_to_symbol = {res.get("query"): res.get("symbol", "NotFound") for res in results if isinstance(res, dict)}
    return pd.DataFrame({
        "Ensembl_Protein_ID": ensp_ids,
        "Gene_Symbol": [id_to_symbol.get(qid, "NotFound") for qid in query_ids],
    })


def merge_gene_symbols(actions: pd.DataFrame, gene_map: pd.DataFrame) -> pd.DataFrame:
    if actions.empty:
        actions["Gene_Symbol"] = []
        return actions
    gene_map = gene_map.copy()
    gene_map["protein_ensp_id_clean"] = gene_map["Ensembl_Protein_ID"].astype(str).str.replace(r"^9606\.", "", regex=True)
    out = actions.copy()
    out["protein_ensp_id_clean"] = out["protein_ensp_id"].astype(str).str.replace(r"^9606\.", "", regex=True)
    out = out.merge(gene_map[["protein_ensp_id_clean", "Gene_Symbol"]], on="protein_ensp_id_clean", how="left")
    out.drop(columns=["protein_ensp_id_clean"], inplace=True)
    return out


def run_pipeline(pubchem_file: Path, actions_file: Path, output_dir: Path, cid_column: str = "CID", species: str = "human") -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Reading PubChem CIDs...")
    cids = read_pubchem_cids(pubchem_file, cid_column=cid_column)
    print(f"Found {len(cids)} unique PubChem CIDs")

    # 1) cids.txt
    cids_path = output_dir / "cids.txt"
    cids_path.write_text("\n".join(cids) + ("\n" if cids else ""), encoding="utf-8")

    # 2) stitch_ids.txt
    stitch_ids = make_stitch_ids(cids)
    stitch_ids_path = output_dir / "stitch_ids.txt"
    stitch_ids_path.write_text("\n".join(stitch_ids) + ("\n" if stitch_ids else ""), encoding="utf-8")
    print(f"Generated {len(stitch_ids)} STITCH IDs")

    # 3) filter actions
    filtered_tsv = output_dir / "my_compounds_actions.tsv"
    print("Filtering STITCH actions file. This can take time for large files...")
    n_rows = filter_stitch_actions(actions_file, set(stitch_ids), filtered_tsv)
    print(f"Filtered STITCH action rows: {n_rows}")

    # 4) add PubChem CID columns
    actions = load_filtered_actions(filtered_tsv)
    actions_with_cid = add_cid_columns(actions)
    actions_csv = output_dir / "my_compounds_actions_with_cid.csv"
    actions_with_cid.to_csv(actions_csv, index=False)

    # 5) extract ENSP IDs
    ensp_ids = extract_ensp_ids(actions_with_cid)
    ensps_path = output_dir / "ensps.txt"
    ensps_path.write_text("\n".join(ensp_ids) + ("\n" if ensp_ids else ""), encoding="utf-8")
    print(f"Extracted ENSP protein IDs: {len(ensp_ids)}")

    # 6) gene names
    print("Mapping ENSP IDs to gene symbols with mygene.info...")
    gene_map = map_ensp_to_gene(ensp_ids, species=species)
    gene_map_path = output_dir / "gene_names.csv"
    gene_map.to_csv(gene_map_path, index=False)

    # 7) final enriched actions
    enriched = merge_gene_symbols(actions_with_cid, gene_map)
    enriched_path = output_dir / "stitch_compound_target_actions_enriched.csv"
    enriched.to_csv(enriched_path, index=False)

    # 8) summary
    summary = pd.DataFrame([{
        "pubchem_cids": len(cids),
        "stitch_ids_generated": len(stitch_ids),
        "filtered_action_rows": len(actions_with_cid),
        "unique_ensp_targets": len(ensp_ids),
        "mapped_gene_symbols": int((gene_map.get("Gene_Symbol", pd.Series(dtype=str)) != "NotFound").sum()) if not gene_map.empty else 0,
        "actions_file": str(actions_file),
    }])
    summary.to_csv(output_dir / "stitch_summary.csv", index=False)

    print("DONE. Main final output:", enriched_path)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Filter STITCH human actions for PubChem CIDs and map ENSP targets to gene symbols.")
    parser.add_argument("--pubchem", required=True, type=Path, help="PubChem output Excel/CSV containing CID column.")
    parser.add_argument("--actions-file", required=True, type=Path, help="Local STITCH actions TSV, e.g. 9606.actions.v5.0.tsv.")
    parser.add_argument("--output", required=True, type=Path, help="Output folder for STITCH results.")
    parser.add_argument("--cid-column", default="CID", help="CID column in PubChem output. Default: CID")
    parser.add_argument("--species", default="human", help="Species for mygene mapping. Default: human")
    return parser


if __name__ == "__main__":
    args = build_arg_parser().parse_args()
    run_pipeline(args.pubchem, args.actions_file, args.output, args.cid_column, args.species)
