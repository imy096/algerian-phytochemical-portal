#!/usr/bin/env python3
"""Filter raw Elicit rows to rows that discuss the target plant.

Input: folder of plant Excel files.
Output: one filtered Excel per plant + filtering_summary.csv.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

TARGET_COLS = ["Title", "Summary", "Results"]
NOT_RELEVANT_RE = re.compile(r"\bnot\s*relevant\b", re.IGNORECASE)
EXCEL_EXTS = {".xlsx", ".xls"}


def infer_plant_name(path: Path) -> str:
    return path.stem.replace("_", " ").replace("-", " ").strip()


def build_plant_pattern(plant_name: str) -> re.Pattern:
    clean = re.sub(r"[^A-Za-z ]+", " ", plant_name)
    parts = [p for p in clean.split() if p]
    if len(parts) < 2:
        return re.compile(re.escape(clean), re.IGNORECASE)
    genus, species = re.escape(parts[0]), re.escape(parts[1])
    genus_abbrev = re.escape(parts[0][0]) + r"\."
    patterns = [
        rf"\b{genus}\s+{species}\b",
        rf"\b{genus_abbrev}\s*{species}\b",
        rf"\b{genus}\s+{species}\s+[A-Za-z\.]+\b",
    ]
    return re.compile("|".join(patterns), re.IGNORECASE)


def filter_file(path: Path, out_path: Path) -> dict:
    plant_name = infer_plant_name(path)
    pat = build_plant_pattern(plant_name)
    df = pd.read_excel(path)
    existing = [c for c in TARGET_COLS if c in df.columns]
    if not existing:
        filtered = df.iloc[0:0].copy()
    else:
        plant_mask = pd.Series(False, index=df.index)
        for col in existing:
            plant_mask |= df[col].fillna("").astype(str).str.contains(pat, na=False)
        if "Summary" in df.columns:
            bad_mask = df["Summary"].fillna("").astype(str).str.contains(NOT_RELEVANT_RE, na=False)
        else:
            bad_mask = pd.Series(False, index=df.index)
        filtered = df[plant_mask & ~bad_mask].copy()
    filtered.to_excel(out_path, index=False)
    return {"file": path.name, "plant": plant_name, "input_rows": len(df), "kept_rows": len(filtered), "output_file": out_path.name}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    inp, out = Path(args.input), Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for fp in sorted(inp.iterdir()):
        if fp.suffix.lower() not in EXCEL_EXTS:
            continue
        try:
            rows.append(filter_file(fp, out / fp.with_suffix(".xlsx").name))
        except Exception as e:
            rows.append({"file": fp.name, "error": str(e)})
    pd.DataFrame(rows).to_csv(out / "filtering_summary.csv", index=False)
    print(f"Filtered {len(rows)} files into {out}")


if __name__ == "__main__":
    main()
