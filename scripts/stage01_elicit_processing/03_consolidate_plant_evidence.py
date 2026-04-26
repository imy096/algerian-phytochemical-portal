#!/usr/bin/env python3
"""Consolidate each filtered plant Excel into one evidence row.

Input: filtered plant Excel files.
Output: one consolidated Excel per plant + consolidation_summary.csv.
"""
from __future__ import annotations

import argparse
import math
import re
from pathlib import Path
from typing import Any

import pandas as pd

OUTPUT_COLUMNS = [
    "Title", "Authors", "DOI", "Year", "Summary",
    "chemical composition and constituents of plant",
    "Allochemicals and Allelochemistry of plant",
    "Valorization of plant waste", "metabolites and metabolomics",
    "geography and climate for the searched plant", "ethnobotany uses",
    "botanical classification", "Medicinal Potential", "Extraction Methodology",
    "Results", "part of plant used",
]
CONTENT_COLUMNS = set(OUTPUT_COLUMNS) - {"Title", "Authors", "DOI", "Year"}
PART_TERMS = [
    "leaf", "leaves", "root", "roots", "stem", "stems", "flower", "flowers", "seed", "seeds",
    "fruit", "fruits", "bark", "wood", "needle", "needles", "aerial part", "aerial parts",
    "whole plant", "rhizome", "rhizomes", "bulb", "bulbs", "tuber", "tubers", "peel",
    "berry", "berries", "shoot", "shoots", "branch", "branches", "resin", "latex", "gum",
]
PART_NORMALIZE = {"leaves":"leaf", "roots":"root", "stems":"stem", "flowers":"flower", "seeds":"seed", "fruits":"fruit", "needles":"needle", "aerial parts":"aerial part", "rhizomes":"rhizome", "bulbs":"bulb", "tubers":"tuber", "berries":"berry", "shoots":"shoot", "branches":"branch"}
NOT_MENTIONED_RE = re.compile(r"^\s*[-•]?\s*(not mentioned|not specified|not provided|not discussed|no information|no specific|no data|n/a|none mentioned|not explicitly|not stated|not reported|not available|not applicable|not included|no details|the abstract does not|the source does not|does not specifically|no mention of|not provide information|the study does not|this source does not|no relevant|none provided|none specified)", re.I)
SUP_TABLE = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")
EXCEL_EXTS = {".xlsx", ".xls"}


def norm(x: Any) -> str:
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return ""
    return re.sub(r"\s+", " ", str(x)).strip()


def to_sup(n: int) -> str:
    return str(n).translate(SUP_TABLE)


def parse_target_species(path: Path) -> tuple[str, str]:
    name = path.stem
    name_norm = re.sub(r"[_ ]+", "-", name.strip().lower())
    name_norm = re.sub(r"-\d+$", "", name_norm)
    name_norm = re.sub(r"\(.*?\)", "", name_norm).strip().rstrip("-")
    parts = [p.strip().rstrip(".") for p in name_norm.split("-") if p.strip()]
    if len(parts) < 2:
        return name_norm, ""
    return parts[0], parts[1]


def classify_paper(row: pd.Series, genus: str, species: str) -> str:
    text = f"{norm(row.get('Title',''))} {norm(row.get('botanical classification',''))} {norm(row.get('Summary',''))}".lower()
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


def is_filler(text: str) -> bool:
    return len(text.strip()) <= 220 and bool(NOT_MENTIONED_RE.search(text.strip()))


def clean_cell(text: str) -> str:
    parts = [x.strip() for x in re.split(r"[\n]+", text) if x.strip()]
    parts = [x for x in parts if not is_filler(x)]
    return " ".join(parts)


def extract_parts(text: str) -> list[str]:
    found = set()
    low = text.lower()
    for term in PART_TERMS:
        if re.search(rf"\b{re.escape(term)}\b", low):
            found.add(PART_NORMALIZE.get(term, term))
    return sorted(found)


class DOIIndexer:
    def __init__(self) -> None:
        self.mapping: dict[str, int] = {}
        self.counter = 1
        self.no_doi_counter = 0
    def register(self, doi: str) -> int:
        doi = norm(doi)
        if doi.lower() in {"", "-", "nan", "n/a", "none", "no doi", "–", "—"}:
            self.no_doi_counter += 1
            key = f"__NO_DOI_{self.no_doi_counter}__"
        else:
            key = doi
        if key not in self.mapping:
            self.mapping[key] = self.counter
            self.counter += 1
        return self.mapping[key]
    def ref_list(self) -> str:
        items = [(k, v) for k, v in self.mapping.items() if not k.startswith("__NO_DOI_")]
        return "; ".join(f"{to_sup(v)} {k}" for k, v in sorted(items, key=lambda x: x[1]))


def consolidate_file(fp: Path, out_fp: Path) -> dict:
    df = pd.read_excel(fp)
    df.columns = [str(c).strip() for c in df.columns]
    for col in OUTPUT_COLUMNS:
        if col not in df.columns:
            df[col] = ""
    genus, species = parse_target_species(fp)
    labels = {i: classify_paper(row, genus, species) for i, row in df.iterrows()}
    target = [i for i, label in labels.items() if label == "TARGET_SPECIES"]
    genus_level = [i for i, label in labels.items() if label == "GENUS_LEVEL"]
    include = target or genus_level
    doi_ix = DOIIndexer()
    row_sup = {i: doi_ix.register(norm(df.loc[i, "DOI"])) for i in df.index}
    buckets = {c: [] for c in OUTPUT_COLUMNS}
    for i in include:
        row = df.loc[i]
        sp = to_sup(row_sup[i])
        for col in OUTPUT_COLUMNS:
            if col == "DOI":
                continue
            cell = norm(row.get(col, ""))
            if not cell:
                continue
            if col in CONTENT_COLUMNS:
                cell = clean_cell(cell)
                if not cell:
                    continue
            buckets[col].append(f"{cell}{sp}")
            for part in extract_parts(cell):
                entry = f"{part}{sp}"
                if entry not in buckets["part of plant used"]:
                    buckets["part of plant used"].append(entry)
    final = {}
    for col in OUTPUT_COLUMNS:
        if col == "DOI":
            final[col] = doi_ix.ref_list()
        else:
            seen, vals = set(), []
            for item in buckets[col]:
                if item not in seen:
                    seen.add(item); vals.append(item)
            final[col] = "; ".join(vals)
    pd.DataFrame([final], columns=OUTPUT_COLUMNS).to_excel(out_fp, index=False)
    return {"file": fp.name, "plant": fp.stem, "input_rows": len(df), "included_rows": len(include), "target_rows": len(target), "genus_fallback_rows": 0 if target else len(genus_level), "output_file": out_fp.name}


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
            rows.append(consolidate_file(fp, out / fp.with_suffix(".xlsx").name))
        except Exception as e:
            rows.append({"file": fp.name, "error": str(e)})
    pd.DataFrame(rows).to_csv(out / "consolidation_summary.csv", index=False)
    print(f"Consolidated {len(rows)} files into {out}")


if __name__ == "__main__":
    main()
