#!/usr/bin/env python3
"""
GEO / genus-level literature processing utility.

This is separate from the PubChem-dependent molecule enrichment chain. It processes
raw genus-level Excel files, filters rows that mention the target genus, extracts
clean genus-level scientific evidence, and audits the extraction.

Typical input
-------------
A folder of genus Excel files, one file per genus, for example:
  data/stage02_compound_enrichment/external/geo_genus_excels/

Typical output
--------------
  filtered_genus_excels/
  extracted_genus_evidence/
  genus_audit_reports/
  genus_pipeline_summary.xlsx
"""

from __future__ import annotations

import argparse
import math
import re
import zipfile
from dataclasses import dataclass
from enum import Enum, auto
from pathlib import Path
from typing import Any

import pandas as pd

TARGET_COLS = ["Title", "Summary", "Results"]
NOT_RELEVANT_RE = re.compile(r"\bnot\s*relevant\b", re.IGNORECASE)
SUPERSCRIPTS = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")
SUPERSCRIPT_MAP = {"⁰": 0, "¹": 1, "²": 2, "³": 3, "⁴": 4, "⁵": 5, "⁶": 6, "⁷": 7, "⁸": 8, "⁹": 9}

OUTPUT_COLUMNS = [
    "Title", "Authors", "DOI", "Year", "Summary",
    "Phytochemical Composition", "Ethnobotanical Context", "botanical characteristics",
    "Geography and climate", "Allelochemistry", "Results", "part of plant used",
]

PART_TERMS = [
    "leaf", "leaves", "root", "roots", "stem", "stems", "flower", "flowers",
    "seed", "seeds", "fruit", "fruits", "bark", "wood", "needle", "needles",
    "aerial part", "aerial parts", "whole plant", "rhizome", "rhizomes",
    "bulb", "bulbs", "tuber", "tubers",
]
PART_NORMALIZE = {
    "leaves": "leaf", "roots": "root", "stems": "stem", "flowers": "flower",
    "seeds": "seed", "fruits": "fruit", "needles": "needle",
    "aerial parts": "aerial part", "rhizomes": "rhizome", "bulbs": "bulb", "tubers": "tuber",
}

CHEM_RE = re.compile(r"([A-Z][a-z]{2,}|acid|ene|ine|one|ol|oid|glycoside|alkaloid|terpene)", re.I)
QUANTITY_RE = re.compile(r"\d+(\.\d+)?\s*(%|mg|µg|ug|g|ml|mmol|µm|μm|mm|ppm|IC50|MIC)", re.I)
METHOD_RE = re.compile(r"(extracted|isolated|identified|quantified|analyzed|characterized|detected|obtained)", re.I)
BIO_RE = re.compile(r"(antioxidant|antimicrobial|antifungal|cytotoxic|inhibitory|activity)", re.I)
USELESS_RE = re.compile(r"(traditionally used|is known for|review|this study discusses|background|generally used)", re.I)


def normalize_text(value: Any) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def genus_from_filename(path: Path) -> str:
    stem = path.stem.replace("extracted_", "")
    return re.split(r"[^A-Za-z]+", stem)[0].strip().lower()


def build_genus_pattern(genus: str) -> re.Pattern:
    return re.compile(rf"\b{re.escape(genus.replace('-', ' ').strip())}\b", re.IGNORECASE)


def split_sentences(text: str) -> list[str]:
    text = normalize_text(text)
    if not text:
        return []
    # Lightweight splitter to avoid requiring spaCy in the repository pipeline.
    parts = re.split(r"(?<=[.!?])\s+|\n+|;\s+", text)
    return [p.strip() for p in parts if p.strip()]


def scientific_score(sentence: str) -> int:
    score = 0
    if CHEM_RE.search(sentence):
        score += 2
    if QUANTITY_RE.search(sentence):
        score += 2
    if METHOD_RE.search(sentence):
        score += 2
    if BIO_RE.search(sentence):
        score += 2
    if USELESS_RE.search(sentence):
        score -= 3
    return score


def keep_sentence(sentence: str) -> bool:
    return scientific_score(sentence) >= 2


class DOIIndexer:
    def __init__(self) -> None:
        self._map: dict[str, int] = {}
        self._counter = 1

    def get_index(self, doi: Any) -> str:
        doi_s = normalize_text(doi)
        if not doi_s or doi_s.lower() in {"nan", "none", "n/a", "no doi", "-"}:
            return ""
        if doi_s not in self._map:
            self._map[doi_s] = self._counter
            self._counter += 1
        return str(self._map[doi_s]).translate(SUPERSCRIPTS)

    def references(self) -> str:
        return "; ".join(f"{str(i).translate(SUPERSCRIPTS)} {doi}" for doi, i in sorted(self._map.items(), key=lambda x: x[1]))


def filter_genus_file(input_file: Path, output_file: Path) -> int:
    genus = genus_from_filename(input_file)
    pattern = build_genus_pattern(genus)
    df = pd.read_excel(input_file)
    existing = [c for c in TARGET_COLS if c in df.columns]
    if not existing:
        filtered = df.iloc[0:0]
    else:
        mask = pd.Series(False, index=df.index)
        for col in existing:
            mask |= df[col].astype(str).str.contains(pattern, na=False)
        if "Summary" in df.columns:
            mask &= ~df["Summary"].astype(str).str.contains(NOT_RELEVANT_RE, na=False)
        filtered = df[mask].copy()
    output_file.parent.mkdir(parents=True, exist_ok=True)
    filtered.to_excel(output_file, index=False)
    return len(filtered)


def extract_parts(text: str) -> list[str]:
    low = text.lower()
    found = []
    for term in PART_TERMS:
        if term in low:
            found.append(PART_NORMALIZE.get(term, term))
    return sorted(set(found))


def extract_genus_evidence(filtered_file: Path, output_file: Path) -> None:
    df = pd.read_excel(filtered_file)
    df.columns = [str(c).strip() for c in df.columns]
    for col in OUTPUT_COLUMNS:
        if col not in df.columns:
            df[col] = ""

    doi_ix = DOIIndexer()
    buckets: dict[str, list[str]] = {c: [] for c in OUTPUT_COLUMNS}

    for _, row in df.iterrows():
        idx = doi_ix.get_index(row.get("DOI", ""))
        for col in OUTPUT_COLUMNS:
            if col == "DOI":
                continue
            cell = normalize_text(row.get(col, ""))
            if not cell:
                continue
            valid = [s for s in split_sentences(cell) if keep_sentence(s)]
            if valid:
                buckets[col].extend([v + idx for v in valid])
            for part in extract_parts(cell):
                buckets["part of plant used"].append(part + idx)

    final = {}
    for col in OUTPUT_COLUMNS:
        if col == "DOI":
            final[col] = doi_ix.references()
        else:
            final[col] = "; ".join(dict.fromkeys(buckets[col]))
    output_file.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame([final], columns=OUTPUT_COLUMNS).to_excel(output_file, index=False)


class SourceLabel(Enum):
    GENUS_LEVEL = auto()
    OTHER_SPECIES_SAME_GENUS = auto()
    OTHER_GENUS = auto()
    AMBIGUOUS = auto()


@dataclass
class RawPaper:
    index: int
    label: SourceLabel


def extract_citations(text: Any) -> list[int]:
    return sorted({SUPERSCRIPT_MAP[ch] for ch in str(text) if ch in SUPERSCRIPT_MAP})


def classify_raw_row(row: pd.Series, genus: str) -> RawPaper:
    title = normalize_text(row.get("Title", "")).lower()
    botanical = normalize_text(row.get("botanical characteristics", row.get("botanical classification", ""))).lower()
    summary = normalize_text(row.get("Summary", "")).lower()
    text = f"{title} {botanical} {summary}"
    if re.search(rf"\b{re.escape(genus)}\b", text):
        m = re.search(rf"\b{re.escape(genus)}\s+([a-z]+)\b", text)
        label = SourceLabel.OTHER_SPECIES_SAME_GENUS if m else SourceLabel.GENUS_LEVEL
    else:
        label = SourceLabel.OTHER_GENUS
    return RawPaper(index=int(row.name) + 1, label=label)


def audit_genus_file(filtered_file: Path, extracted_file: Path, audit_file: Path) -> dict[str, Any]:
    genus = genus_from_filename(filtered_file)
    df_raw = pd.read_excel(filtered_file)
    df_proc = pd.read_excel(extracted_file) if extracted_file.exists() else pd.DataFrame()
    raw_index = {i + 1: classify_raw_row(row, genus) for i, row in df_raw.iterrows()}

    audit_rows = []
    score = 100
    if df_proc.empty:
        score = 0
        for col in OUTPUT_COLUMNS:
            if col in {"Title", "Authors", "DOI", "Year", "Summary"}:
                continue
            audit_rows.append({"Column": col, "Correct inclusion": "NO", "Over-extraction": "NONE", "Under-extraction": "HIGH", "Justification": "No extracted content"})
    else:
        proc_row = df_proc.iloc[0]
        for col in ["Phytochemical Composition", "Ethnobotanical Context", "botanical characteristics", "Geography and climate", "Allelochemistry", "Results", "part of plant used"]:
            cites = extract_citations(proc_row.get(col, ""))
            labels = {raw_index[i].label for i in cites if i in raw_index}
            if SourceLabel.OTHER_GENUS in labels:
                over = "HIGH"
                score -= 30
            elif SourceLabel.OTHER_SPECIES_SAME_GENUS in labels:
                over = "MEDIUM"
                score -= 15
            else:
                over = "NONE"
            correct = "YES" if over == "NONE" and cites else "PARTIAL" if over == "MEDIUM" else "NO" if over == "HIGH" else "NO"
            audit_rows.append({"Column": col, "Correct inclusion": correct, "Over-extraction": over, "Under-extraction": "NONE" if cites else "HIGH", "Justification": f"Used raw rows: {', '.join(map(str, cites))}"})
    score = max(0, min(100, score))
    confidence = "Publication-grade" if score >= 90 else "Strong with minor loss" if score >= 75 else "Usable with caution" if score >= 60 else "Not reliable"
    summary = pd.DataFrame([{"Genus": genus.capitalize(), "Score": score, "Confidence": confidence}])
    audit = pd.DataFrame(audit_rows)
    audit_file.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(audit_file, engine="openpyxl") as writer:
        summary.to_excel(writer, index=False, sheet_name="Global_Summary")
        audit.to_excel(writer, index=False, sheet_name="Column_Audit")
    return {"Genus": genus.capitalize(), "Score": score, "Confidence": confidence, "Audit_File": str(audit_file)}


def run_pipeline(input_dir: Path, output_dir: Path) -> None:
    filtered_dir = output_dir / "filtered_genus_excels"
    extracted_dir = output_dir / "extracted_genus_evidence"
    audit_dir = output_dir / "genus_audit_reports"
    output_dir.mkdir(parents=True, exist_ok=True)

    excel_files = sorted([p for p in input_dir.iterdir() if p.suffix.lower() in {".xlsx", ".xls"}])
    if not excel_files:
        raise SystemExit(f"No Excel files found in {input_dir}")

    summary_rows = []
    for idx, file in enumerate(excel_files, start=1):
        print(f"[{idx}/{len(excel_files)}] {file.name}")
        filtered_file = filtered_dir / file.name
        kept = filter_genus_file(file, filtered_file)
        extracted_file = extracted_dir / f"extracted_{file.name}"
        extract_genus_evidence(filtered_file, extracted_file)
        audit_file = audit_dir / f"audit_{file.stem}.xlsx"
        audit_summary = audit_genus_file(filtered_file, extracted_file, audit_file)
        audit_summary.update({"Input_File": file.name, "Filtered_Rows": kept, "Extracted_File": str(extracted_file)})
        summary_rows.append(audit_summary)

    summary_path = output_dir / "genus_pipeline_summary.xlsx"
    pd.DataFrame(summary_rows).to_excel(summary_path, index=False)

    zip_path = output_dir / "geo_genus_pipeline_outputs.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for folder in [filtered_dir, extracted_dir, audit_dir]:
            for path in folder.glob("*.xls*"):
                zf.write(path, arcname=str(path.relative_to(output_dir)))
        zf.write(summary_path, arcname=summary_path.name)
    print(f"Saved summary: {summary_path}")
    print(f"Saved ZIP: {zip_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Filter, extract, and audit genus-level Excel files.")
    parser.add_argument("--input", required=True, help="Folder of raw genus Excel files.")
    parser.add_argument("--output", required=True, help="Output folder.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    run_pipeline(Path(args.input), Path(args.output))


if __name__ == "__main__":
    main()
