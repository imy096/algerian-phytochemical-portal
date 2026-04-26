#!/usr/bin/env python3
"""Audit extraction quality by comparing filtered raw files and consolidated processed files.

Input:
  --raw folder: filtered raw plant Excel files
  --processed folder: consolidated plant Excel files
Output:
  audit_summary.csv
  audit_details.csv
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

COLUMNS_TO_AUDIT = [
    "chemical composition and constituents of plant",
    "Allochemicals and Allelochemistry of plant",
    "Valorization of plant waste", "metabolites and metabolomics",
    "geography and climate for the searched plant", "ethnobotany uses",
    "botanical classification", "Medicinal Potential", "Extraction Methodology",
    "Results", "part of plant used",
]
SUPERSCRIPT_MAP = {"⁰":0,"¹":1,"²":2,"³":3,"⁴":4,"⁵":5,"⁶":6,"⁷":7,"⁸":8,"⁹":9}


def norm(x) -> str:
    if x is None or pd.isna(x):
        return ""
    return str(x).strip()


def parse_species(path: Path) -> tuple[str, str]:
    name = path.stem.lower()
    name = re.sub(r"[_ ]+", "-", name)
    name = re.sub(r"-\d+$", "", name)
    name = re.sub(r"\(.*?\)", "", name).strip("-")
    parts = [p for p in name.split("-") if p]
    return (parts[0], parts[1]) if len(parts) >= 2 else (name, "")


def classify_raw_row(row: pd.Series, genus: str, species: str) -> str:
    text = f"{norm(row.get('Title'))} {norm(row.get('botanical classification'))} {norm(row.get('Summary'))}".lower()
    full = f"{genus} {species}".strip()
    if full and full in text:
        return "TARGET_SPECIES"
    if genus and genus in text and species and species not in text:
        m = re.search(rf"\b{re.escape(genus)}\s+([a-z]+)\b", text)
        if m and m.group(1) != species:
            return "OTHER_SPECIES_SAME_GENUS"
        return "GENUS_LEVEL"
    if genus and genus not in text:
        return "OTHER_GENUS"
    return "AMBIGUOUS"


def extract_citations(text) -> list[int]:
    s = str(text)
    out = set()
    for ch in s:
        if ch in SUPERSCRIPT_MAP:
            out.add(SUPERSCRIPT_MAP[ch])
    return sorted(out)


def audit_pair(raw_fp: Path, proc_fp: Path) -> tuple[dict, list[dict]]:
    raw = pd.read_excel(raw_fp)
    proc = pd.read_excel(proc_fp)
    if len(proc) == 0:
        proc_row = {}
    else:
        proc_row = proc.iloc[0].to_dict()
    genus, species = parse_species(raw_fp)
    labels = {i + 1: classify_raw_row(row, genus, species) for i, row in raw.iterrows()}
    detail_rows = []
    used_all = []
    high_over_cols = 0
    high_under_cols = 0
    for col in COLUMNS_TO_AUDIT:
        if col not in raw.columns:
            raw[col] = ""
        cites = extract_citations(proc_row.get(col, ""))
        used_labels = {labels.get(c, "UNKNOWN") for c in cites}
        used_all.extend(cites)
        raw_target_with_data = [i + 1 for i, row in raw.iterrows() if labels.get(i + 1) == "TARGET_SPECIES" and norm(row.get(col))]
        unused_target = [i for i in raw_target_with_data if i not in cites]
        if not cites and raw[col].fillna("").astype(str).str.strip().replace("nan", "").any():
            under = "HIGH"
        elif unused_target:
            under = "HIGH"
        else:
            under = "NONE"
        if "OTHER_GENUS" in used_labels or "OTHER_SPECIES_SAME_GENUS" in used_labels:
            over = "HIGH"
        elif "GENUS_LEVEL" in used_labels or "AMBIGUOUS" in used_labels:
            over = "MEDIUM"
        else:
            over = "NONE"
        if over == "HIGH":
            high_over_cols += 1
        if under == "HIGH":
            high_under_cols += 1
        detail_rows.append({
            "plant": raw_fp.stem,
            "column": col,
            "citations_used": ",".join(map(str, cites)),
            "source_labels_used": ",".join(sorted(used_labels)),
            "over_extraction_risk": over,
            "under_extraction_risk": under,
            "unused_target_papers_with_data": ",".join(map(str, unused_target)),
        })
    used_labels_all = {labels.get(c, "UNKNOWN") for c in used_all}
    species_safe = not ({"OTHER_GENUS", "OTHER_SPECIES_SAME_GENUS"} & used_labels_all)
    genus_leakage = "GENUS_LEVEL" in used_labels_all
    score = 100 - high_over_cols * 8 - high_under_cols * 5
    if not species_safe:
        score -= 20
    if genus_leakage:
        score -= 5
    score = max(0, min(100, score))
    if score >= 90:
        confidence = "Publication-grade"
    elif score >= 75:
        confidence = "Strong with minor loss"
    elif score >= 60:
        confidence = "Usable with caution"
    else:
        confidence = "Not reliable"
    summary = {
        "plant": raw_fp.stem,
        "raw_rows": len(raw),
        "species_safe": species_safe,
        "genus_leakage": genus_leakage,
        "high_over_extraction_columns": high_over_cols,
        "high_under_extraction_columns": high_under_cols,
        "score": score,
        "confidence_class": confidence,
    }
    return summary, detail_rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--processed", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    raw_dir, proc_dir, out = Path(args.raw), Path(args.processed), Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    summaries, details = [], []
    for raw_fp in sorted(raw_dir.glob("*.xls*")):
        proc_fp = proc_dir / raw_fp.with_suffix(".xlsx").name
        if not proc_fp.exists():
            summaries.append({"plant": raw_fp.stem, "error": "processed file missing"})
            continue
        try:
            summary, detail = audit_pair(raw_fp, proc_fp)
            summaries.append(summary); details.extend(detail)
        except Exception as e:
            summaries.append({"plant": raw_fp.stem, "error": str(e)})
    pd.DataFrame(summaries).to_csv(out / "audit_summary.csv", index=False)
    pd.DataFrame(details).to_csv(out / "audit_details.csv", index=False)
    print(f"Audit complete. Output: {out}")


if __name__ == "__main__":
    main()
