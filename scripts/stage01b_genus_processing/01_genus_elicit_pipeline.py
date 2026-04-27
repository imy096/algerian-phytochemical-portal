#!/usr/bin/env python3
"""
Stage 1B — Genus-Level Elicit Processing Pipeline

This script merges the genus workflow into one reproducible local/Colab-ready pipeline:

1. Read raw genus Excel files from an input folder.
2. Strictly filter rows that mention the target genus.
3. Exclude rows marked "not relevant".
4. Consolidate scientific evidence into one genus-level record per Excel file.
5. Add DOI superscript indexing.
6. Audit extraction quality and produce summary reports.

Input:
    Folder containing genus Excel files, for example:
        data/stage01b_genus_processing/raw/genus_excels/

Expected file naming:
    Each Excel filename should be the genus name, e.g.
        Allium.xlsx
        Artemisia.xlsx
        Salvia.xlsx

Main outputs:
    filtered_genus_excels/
    genus_extraction_outputs/
    genus_audit_reports/
    genus_audit_summary.csv
    genus_pipeline_summary.xlsx
"""

from __future__ import annotations

import argparse
import math
import re
import shutil
import zipfile
from dataclasses import dataclass
from enum import Enum, auto
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import pandas as pd


# =============================================================================
# CONFIG
# =============================================================================

FILTER_TARGET_COLS = ["Title", "Summary", "Results"]

OUTPUT_COLUMNS = [
    "Title",
    "Authors",
    "DOI",
    "Year",
    "Summary",
    "Phytochemical Composition",
    "Ethnobotanical Context",
    "botanical characteristics",
    "Geography and climate",
    "Allelochemistry",
    "Results",
    "part of plant used",
]

COLUMNS_TO_AUDIT = [
    "Phytochemical Composition",
    "Ethnobotanical Context",
    "botanical characteristics",
    "Geography and climate",
    "Allelochemistry",
    "Results",
    "part of plant used",
]

PART_TERMS = [
    "leaf", "leaves", "root", "roots", "stem", "stems", "flower", "flowers",
    "seed", "seeds", "fruit", "fruits", "bark", "wood", "needle", "needles",
    "aerial part", "aerial parts", "whole plant",
]

PART_NORMALIZE = {
    "leaves": "leaf",
    "roots": "root",
    "stems": "stem",
    "flowers": "flower",
    "seeds": "seed",
    "fruits": "fruit",
    "needles": "needle",
    "aerial parts": "aerial part",
}

NOT_RELEVANT_PATTERN = re.compile(r"\bnot\s*relevant\b", re.IGNORECASE)

CHEM_PATTERN = re.compile(
    r"([A-Z][a-z]{2,}|acid|ene|ine|one|ol|oid|glycoside|alkaloid|terpene|flavonoid|phenolic)",
    re.IGNORECASE,
)
QUANTITY_PATTERN = re.compile(
    r"\d+(\.\d+)?\s*(%|mg|µg|ug|g|ml|mmol|µm|um|mm|ppm|IC50|MIC)",
    re.IGNORECASE,
)
METHOD_PATTERN = re.compile(
    r"(extracted|isolated|identified|quantified|analyzed|analysed|characterized|detected|obtained)",
    re.IGNORECASE,
)
BIO_PATTERN = re.compile(
    r"(antioxidant|antimicrobial|antifungal|antibacterial|cytotoxic|inhibitory|activity|anti-inflammatory)",
    re.IGNORECASE,
)
USELESS_PATTERN = re.compile(
    r"(traditionally used|is known for|review|this study discusses|background|generally used)",
    re.IGNORECASE,
)

SUPERSCRIPTS = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")
SUPERSCRIPT_MAP = {
    "⁰": 0, "¹": 1, "²": 2, "³": 3, "⁴": 4,
    "⁵": 5, "⁶": 6, "⁷": 7, "⁸": 8, "⁹": 9,
}


# =============================================================================
# GENERAL HELPERS
# =============================================================================

def safe_read_excel(path: Path) -> pd.DataFrame:
    try:
        df = pd.read_excel(path)
        df.columns = [str(c).strip() for c in df.columns]
        return df
    except Exception as exc:
        raise RuntimeError(f"Could not read Excel file {path}: {exc}") from exc


def norm_space(text: Any) -> str:
    if text is None:
        return ""
    if isinstance(text, float) and math.isnan(text):
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def split_sentences(text: Any) -> List[str]:
    txt = norm_space(text)
    if not txt:
        return []
    # Lightweight sentence splitter to avoid requiring spaCy in repo execution.
    parts = re.split(r"(?<=[.!?])\s+|;\s+", txt)
    return [p.strip() for p in parts if p.strip()]


def infer_genus_from_filename(path: Path) -> str:
    # Allium.xlsx -> allium
    # extracted_Allium.xlsx -> allium
    stem = path.stem.replace("extracted_", "")
    return re.split(r"[^A-Za-z]+", stem.lower())[0]


def build_genus_pattern(genus: str) -> re.Pattern:
    genus = genus.replace("-", " ").strip()
    return re.compile(rf"\b{re.escape(genus)}\b", re.IGNORECASE)


def scientific_score(sentence: str) -> int:
    score = 0
    if CHEM_PATTERN.search(sentence):
        score += 2
    if QUANTITY_PATTERN.search(sentence):
        score += 2
    if METHOD_PATTERN.search(sentence):
        score += 2
    if BIO_PATTERN.search(sentence):
        score += 2
    if USELESS_PATTERN.search(sentence):
        score -= 3
    return score


def keep_sentence(sentence: str) -> bool:
    return scientific_score(sentence) >= 2


def extract_parts(text: Any) -> List[str]:
    low = norm_space(text).lower()
    found = []
    for term in PART_TERMS:
        if term in low:
            found.append(PART_NORMALIZE.get(term, term))
    return sorted(set(found))


def zip_folder(folder: Path, zip_path: Path) -> None:
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in folder.rglob("*"):
            if p.is_file():
                zf.write(p, p.relative_to(folder))


# =============================================================================
# STEP 1 — FILTER RAW GENUS FILES
# =============================================================================

def filter_genus_file(input_path: Path, output_path: Path) -> int:
    genus = infer_genus_from_filename(input_path)
    genus_pattern = build_genus_pattern(genus)

    df = safe_read_excel(input_path)
    existing_cols = [c for c in FILTER_TARGET_COLS if c in df.columns]

    if not existing_cols:
        filtered = df.iloc[0:0].copy()
    else:
        genus_mask = pd.Series(False, index=df.index)
        for col in existing_cols:
            genus_mask |= df[col].astype(str).fillna("").str.contains(genus_pattern, na=False)

        if "Summary" in df.columns:
            not_relevant_mask = df["Summary"].astype(str).fillna("").str.contains(
                NOT_RELEVANT_PATTERN, na=False
            )
        else:
            not_relevant_mask = pd.Series(False, index=df.index)

        filtered = df[genus_mask & (~not_relevant_mask)].copy()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    filtered.to_excel(output_path, index=False)
    return len(filtered)


def filter_genus_folder(input_dir: Path, output_dir: Path) -> pd.DataFrame:
    output_dir.mkdir(parents=True, exist_ok=True)
    rows = []

    for xlsx in sorted(input_dir.glob("*.xls*")):
        out = output_dir / xlsx.name
        try:
            kept = filter_genus_file(xlsx, out)
            status = "OK"
            error = ""
        except Exception as exc:
            kept = 0
            status = "ERROR"
            error = str(exc)
        rows.append({
            "file": xlsx.name,
            "genus": infer_genus_from_filename(xlsx),
            "filtered_rows_kept": kept,
            "status": status,
            "error": error,
        })
        print(f"[filter] {xlsx.name}: {kept} rows kept ({status})")

    return pd.DataFrame(rows)


# =============================================================================
# STEP 2 — CONSOLIDATE GENUS EVIDENCE
# =============================================================================

class DOIIndexer:
    def __init__(self) -> None:
        self.map: Dict[str, int] = {}
        self.counter = 1

    def get_index(self, doi: Any) -> str:
        doi = norm_space(doi)
        if not doi:
            return ""
        if doi not in self.map:
            self.map[doi] = self.counter
            self.counter += 1
        return str(self.map[doi]).translate(SUPERSCRIPTS)

    def export_reference_list(self) -> str:
        return "; ".join(
            f"{str(i).translate(SUPERSCRIPTS)} {doi}"
            for doi, i in sorted(self.map.items(), key=lambda kv: kv[1])
        )


def process_genus_excel(input_path: Path, output_path: Path) -> Dict[str, Any]:
    doi_indexer = DOIIndexer()
    df = safe_read_excel(input_path)

    for col in OUTPUT_COLUMNS:
        if col not in df.columns:
            df[col] = ""

    buckets: Dict[str, List[str]] = {c: [] for c in OUTPUT_COLUMNS}

    for _, row in df.iterrows():
        ref = doi_indexer.get_index(row.get("DOI", ""))

        for col in OUTPUT_COLUMNS:
            if col == "DOI":
                continue

            cell = norm_space(row.get(col, ""))
            if not cell:
                continue

            if col in {"Title", "Authors", "Year"}:
                value = cell + ref
                if value not in buckets[col]:
                    buckets[col].append(value)
                continue

            sentences = [s for s in split_sentences(cell) if keep_sentence(s)]
            for sentence in sentences:
                value = sentence + ref
                if value not in buckets[col]:
                    buckets[col].append(value)

            for part in extract_parts(cell):
                value = part + ref
                if value not in buckets["part of plant used"]:
                    buckets["part of plant used"].append(value)

    final = {c: "; ".join(dict.fromkeys(buckets[c])) for c in OUTPUT_COLUMNS}
    final["DOI"] = doi_indexer.export_reference_list()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame([final], columns=OUTPUT_COLUMNS).to_excel(output_path, index=False)

    return {
        "file": input_path.name,
        "genus": infer_genus_from_filename(input_path),
        "output_file": output_path.name,
        "doi_count": len(doi_indexer.map),
    }


def process_genus_folder(input_dir: Path, output_dir: Path) -> pd.DataFrame:
    output_dir.mkdir(parents=True, exist_ok=True)
    rows = []

    for xlsx in sorted(input_dir.glob("*.xls*")):
        out = output_dir / f"extracted_{xlsx.name}"
        try:
            info = process_genus_excel(xlsx, out)
            info["status"] = "OK"
            info["error"] = ""
        except Exception as exc:
            info = {
                "file": xlsx.name,
                "genus": infer_genus_from_filename(xlsx),
                "output_file": out.name,
                "doi_count": 0,
                "status": "ERROR",
                "error": str(exc),
            }
        rows.append(info)
        print(f"[extract] {xlsx.name}: {info['status']}")

    return pd.DataFrame(rows)


# =============================================================================
# STEP 3 — AUDIT GENUS EXTRACTION
# =============================================================================

class SourceLabel(Enum):
    GENUS_LEVEL = auto()
    OTHER_SPECIES_SAME_GENUS = auto()
    OTHER_GENUS = auto()
    AMBIGUOUS = auto()


@dataclass
class RawPaper:
    index: int
    title: str
    botanical: str
    summary: str
    row: Dict[str, Any]
    label: SourceLabel
    other_species_name: Optional[str] = None


@dataclass
class ColumnAudit:
    column: str
    correct_inclusions: str
    over_extraction: str
    under_extraction: str
    justification: str
    used_labels: Set[SourceLabel]


def extract_citations(text: Any) -> List[int]:
    if text is None:
        return []
    return sorted({SUPERSCRIPT_MAP[c] for c in str(text) if c in SUPERSCRIPT_MAP})


def classify_raw_paper(row: pd.Series, genus: str) -> RawPaper:
    title = norm_space(row.get("Title", "")).lower()
    botanical = norm_space(row.get("botanical characteristics", "")).lower()
    summary = norm_space(row.get("Summary", "")).lower()
    text = f"{title} {botanical} {summary}"

    label = SourceLabel.AMBIGUOUS
    other_species = None

    if re.search(rf"\b{re.escape(genus)}\b", text):
        m = re.search(rf"\b{re.escape(genus)}\s+([a-z]+)\b", text)
        if m:
            label = SourceLabel.OTHER_SPECIES_SAME_GENUS
            other_species = f"{genus} {m.group(1)}"
        else:
            label = SourceLabel.GENUS_LEVEL
    else:
        label = SourceLabel.OTHER_GENUS

    return RawPaper(
        index=int(row.name) + 1,
        title=norm_space(row.get("Title", "")),
        botanical=norm_space(row.get("botanical characteristics", "")),
        summary=norm_space(row.get("Summary", "")),
        row=row.to_dict(),
        label=label,
        other_species_name=other_species,
    )


def build_raw_index(df_raw: pd.DataFrame, genus: str) -> Dict[int, RawPaper]:
    return {i + 1: classify_raw_paper(r, genus) for i, r in df_raw.iterrows()}


def audit_column(col: str, cites: List[int], raw_index: Dict[int, RawPaper], df_raw: pd.DataFrame) -> ColumnAudit:
    if not cites:
        has_raw = col in df_raw.columns and df_raw[col].astype(str).str.strip().replace("nan", "").any()
        return ColumnAudit(
            column=col,
            correct_inclusions="NO" if has_raw else "YES",
            over_extraction="NONE",
            under_extraction="HIGH" if has_raw else "NONE",
            justification="No citations used; raw file has content." if has_raw else "No raw content detected.",
            used_labels=set(),
        )

    used_labels = {raw_index[i].label for i in cites if i in raw_index}

    if SourceLabel.OTHER_GENUS in used_labels:
        over = "HIGH"
    elif SourceLabel.OTHER_SPECIES_SAME_GENUS in used_labels:
        over = "MEDIUM"
    else:
        over = "NONE"

    correct = "YES" if over == "NONE" else "PARTIAL" if over == "MEDIUM" else "NO"

    return ColumnAudit(
        column=col,
        correct_inclusions=correct,
        over_extraction=over,
        under_extraction="NONE",
        justification=f"Used labels: {[x.name for x in sorted(used_labels, key=lambda x: x.name)]}",
        used_labels=used_labels,
    )


def compute_confidence(audits: List[ColumnAudit], empty_proc: bool = False) -> int:
    if empty_proc:
        return 0
    score = 100
    if any(a.over_extraction == "HIGH" for a in audits):
        score -= 30
    if any(a.over_extraction == "MEDIUM" for a in audits):
        score -= 15
    if any(a.under_extraction == "HIGH" for a in audits):
        score -= 10
    return max(0, min(100, score))


def confidence_class(score: int) -> str:
    if score >= 90:
        return "Publication-grade"
    if score >= 75:
        return "Strong with minor loss"
    if score >= 60:
        return "Usable with caution"
    return "Not reliable"


def audit_one(raw_path: Path, proc_path: Path, output_path: Path) -> Dict[str, Any]:
    genus = infer_genus_from_filename(raw_path)
    df_raw = safe_read_excel(raw_path)

    try:
        df_proc = safe_read_excel(proc_path)
    except Exception:
        df_proc = pd.DataFrame()

    raw_index = build_raw_index(df_raw, genus)

    if df_proc.empty:
        audits = [
            ColumnAudit(c, "NO", "NONE", "HIGH", "Processed file empty.", set())
            for c in COLUMNS_TO_AUDIT
        ]
        citation_index = {c: [] for c in COLUMNS_TO_AUDIT}
        empty_proc = True
    else:
        proc_row = df_proc.iloc[0].to_dict()
        citation_index = {c: extract_citations(proc_row.get(c)) for c in COLUMNS_TO_AUDIT}
        audits = [audit_column(c, citation_index[c], raw_index, df_raw) for c in COLUMNS_TO_AUDIT]
        empty_proc = False

    score = compute_confidence(audits, empty_proc=empty_proc)
    summary = pd.DataFrame([{
        "Genus": genus.capitalize(),
        "Score": score,
        "Confidence": confidence_class(score),
        "Genus_safe": not any(a.over_extraction == "HIGH" for a in audits),
        "Cross_contamination_risk": "HIGH" if any(a.over_extraction == "HIGH" for a in audits) else "LOW",
        "Raw_file": raw_path.name,
        "Processed_file": proc_path.name if proc_path.exists() else "",
    }])

    audit_df = pd.DataFrame([
        {
            "Column": a.column,
            "Correct_inclusion": a.correct_inclusions,
            "Over_extraction": a.over_extraction,
            "Under_extraction": a.under_extraction,
            "Justification": a.justification,
        }
        for a in audits
    ])

    cite_df = pd.DataFrame([
        {"Column": c, "Raw_rows_used": ", ".join(map(str, rows))}
        for c, rows in citation_index.items()
    ])

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        summary.to_excel(writer, index=False, sheet_name="Global_Summary")
        audit_df.to_excel(writer, index=False, sheet_name="Column_Audit")
        cite_df.to_excel(writer, index=False, sheet_name="Citation_Index")

    return summary.iloc[0].to_dict()


def audit_folder(filtered_dir: Path, processed_dir: Path, output_dir: Path) -> pd.DataFrame:
    output_dir.mkdir(parents=True, exist_ok=True)
    rows = []

    for raw_file in sorted(filtered_dir.glob("*.xls*")):
        proc_file = processed_dir / f"extracted_{raw_file.name}"
        out_file = output_dir / f"audit_{infer_genus_from_filename(raw_file).capitalize()}.xlsx"
        try:
            row = audit_one(raw_file, proc_file, out_file)
            row["status"] = "OK"
            row["error"] = ""
        except Exception as exc:
            row = {
                "Genus": infer_genus_from_filename(raw_file).capitalize(),
                "Score": 0,
                "Confidence": "ERROR",
                "Raw_file": raw_file.name,
                "Processed_file": proc_file.name,
                "status": "ERROR",
                "error": str(exc),
            }
        rows.append(row)
        print(f"[audit] {raw_file.name}: {row.get('Confidence')}")

    summary_df = pd.DataFrame(rows)
    summary_df.to_csv(output_dir / "genus_audit_summary.csv", index=False)
    return summary_df


# =============================================================================
# PIPELINE ENTRYPOINT
# =============================================================================

def run_pipeline(input_dir: Path, output_dir: Path, overwrite: bool = False) -> None:
    if not input_dir.exists():
        raise SystemExit(f"Input folder not found: {input_dir}")

    if output_dir.exists() and overwrite:
        shutil.rmtree(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    filtered_dir = output_dir / "filtered_genus_excels"
    processed_dir = output_dir / "genus_extraction_outputs"
    audit_dir = output_dir / "genus_audit_reports"

    print("\n=== STEP 1: strict genus filtering ===")
    filter_summary = filter_genus_folder(input_dir, filtered_dir)
    filter_summary.to_csv(output_dir / "filter_summary.csv", index=False)
    zip_folder(filtered_dir, output_dir / "filtered_genus_only.zip")

    print("\n=== STEP 2: genus evidence extraction ===")
    extract_summary = process_genus_folder(filtered_dir, processed_dir)
    extract_summary.to_csv(output_dir / "extraction_summary.csv", index=False)
    zip_folder(processed_dir, output_dir / "genus_extraction_outputs.zip")

    print("\n=== STEP 3: genus extraction audit ===")
    audit_summary = audit_folder(filtered_dir, processed_dir, audit_dir)
    zip_folder(audit_dir, output_dir / "genus_audit_reports.zip")

    with pd.ExcelWriter(output_dir / "genus_pipeline_summary.xlsx", engine="openpyxl") as writer:
        filter_summary.to_excel(writer, index=False, sheet_name="Filtering")
        extract_summary.to_excel(writer, index=False, sheet_name="Extraction")
        audit_summary.to_excel(writer, index=False, sheet_name="Audit")

    print("\nDONE")
    print(f"Output folder: {output_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Merged genus-level Elicit processing pipeline.")
    parser.add_argument(
        "--input",
        required=True,
        help="Folder containing raw genus Excel files, e.g. data/stage01b_genus_processing/raw/genus_excels",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Output folder, e.g. data/stage01b_genus_processing/outputs",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Delete existing output folder before running.",
    )
    args = parser.parse_args()

    run_pipeline(Path(args.input), Path(args.output), overwrite=args.overwrite)


if __name__ == "__main__":
    main()
