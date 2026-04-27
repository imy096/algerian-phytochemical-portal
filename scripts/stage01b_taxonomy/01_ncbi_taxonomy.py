#!/usr/bin/env python3
"""
Stage 1B — NCBI Plant Taxonomy Enrichment

This script reads an Excel or CSV file containing plant names and retrieves
taxonomic lineage from NCBI Taxonomy using Biopython Entrez.

Input:
    data/stage01b_taxonomy/raw/full_plants_names.xlsx

Output:
    data/stage01b_taxonomy/outputs/plant_taxonomy.csv
    data/stage01b_taxonomy/outputs/plant_taxonomy.xlsx

Required input column:
    Auto-detected. The script prefers columns containing:
    plant, name, full, species, scientific

Important:
    NCBI requires an email address for Entrez requests.
    Pass it with --email, or edit DEFAULT_EMAIL below.
"""

from __future__ import annotations

import argparse
import csv
import time
from pathlib import Path
from typing import Optional

import pandas as pd
from Bio import Entrez


DEFAULT_INPUT = Path("data/stage01b_taxonomy/raw/full_plants_names.xlsx")
DEFAULT_OUTPUT_DIR = Path("data/stage01b_taxonomy/outputs")
DEFAULT_EMAIL = "your_email@example.com"

RANKS = [
    "superkingdom",
    "kingdom",
    "phylum",
    "class",
    "order",
    "family",
    "genus",
    "species",
]


def read_table(path: Path, sheet_name=0) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {path}")

    if path.suffix.lower() in [".xlsx", ".xls"]:
        return pd.read_excel(path, sheet_name=sheet_name)

    if path.suffix.lower() == ".csv":
        return pd.read_csv(path)

    raise ValueError(f"Unsupported input file type: {path.suffix}")


def detect_name_column(df: pd.DataFrame, requested: Optional[str] = None) -> str:
    if requested:
        if requested not in df.columns:
            raise ValueError(
                f"Requested column '{requested}' not found. "
                f"Available columns: {list(df.columns)}"
            )
        return requested

    cols = list(df.columns)

    if len(cols) == 1:
        return cols[0]

    preferred_terms = ["plant", "name", "full", "species", "scientific"]

    for term in preferred_terms:
        for col in cols:
            if term in str(col).lower():
                return col

    return cols[0]


def clean_plant_names(df: pd.DataFrame, name_column: str) -> list[str]:
    names = []
    seen = set()

    for value in df[name_column].dropna().astype(str).tolist():
        name = value.strip()
        if not name or name.lower() in {"nan", "none", "not_found", "n/a"}:
            continue

        key = name.lower()
        if key not in seen:
            seen.add(key)
            names.append(name)

    return names


def get_tax_id(species_name: str) -> Optional[str]:
    """Search NCBI Taxonomy for a plant/scientific name and return tax_id."""
    try:
        handle = Entrez.esearch(
            db="taxonomy",
            term=f'"{species_name}"',
            retmode="xml",
        )
        record = Entrez.read(handle)
        handle.close()

        if record.get("IdList"):
            return str(record["IdList"][0])

    except Exception as exc:
        print(f"  [ERROR searching] {species_name}: {exc}")

    return None


def get_taxonomy(tax_id: str) -> Optional[dict[str, str]]:
    """Fetch full taxonomy lineage for a tax_id."""
    try:
        handle = Entrez.efetch(
            db="taxonomy",
            id=tax_id,
            retmode="xml",
        )
        records = Entrez.read(handle)
        handle.close()

        if not records:
            return None

        record = records[0]
        lineage: dict[str, str] = {}

        for entry in record.get("LineageEx", []):
            rank = entry.get("Rank", "")
            if rank in RANKS:
                lineage[rank] = entry.get("ScientificName", "")

        lineage["species"] = record.get("ScientificName", "")
        return lineage

    except Exception as exc:
        print(f"  [ERROR fetching] tax_id {tax_id}: {exc}")

    return None


def enrich_taxonomy(
    input_file: Path,
    output_dir: Path,
    name_column: Optional[str],
    email: str,
    api_key: Optional[str],
    sheet_name=0,
    sleep_seconds: float = 0.4,
) -> pd.DataFrame:
    Entrez.email = email

    if api_key:
        Entrez.api_key = api_key

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Reading input file: {input_file}")
    df = read_table(input_file, sheet_name=sheet_name)

    detected_col = detect_name_column(df, requested=name_column)
    print(f"Using plant-name column: {detected_col}")

    names = clean_plant_names(df, detected_col)
    print(f"Loaded {len(names)} unique plant names.")

    rows = []

    for idx, name in enumerate(names, 1):
        print(f"[{idx}/{len(names)}] {name}")

        tax_id = get_tax_id(name)

        row = {
            "input_name": name,
            "tax_id": tax_id if tax_id else "NOT_FOUND",
        }

        if tax_id:
            taxonomy = get_taxonomy(tax_id)
            if taxonomy:
                for rank in RANKS:
                    row[rank] = taxonomy.get(rank, "")
                print(f"  -> Found tax_id={tax_id}")
            else:
                for rank in RANKS:
                    row[rank] = ""
                print("  -> tax_id found, but lineage not retrieved")
        else:
            for rank in RANKS:
                row[rank] = ""
            print("  -> NOT FOUND")

        rows.append(row)
        time.sleep(sleep_seconds)

    result = pd.DataFrame(rows, columns=["input_name", "tax_id"] + RANKS)

    csv_path = output_dir / "plant_taxonomy.csv"
    xlsx_path = output_dir / "plant_taxonomy.xlsx"

    result.to_csv(csv_path, index=False)
    result.to_excel(xlsx_path, index=False)

    print(f"Saved CSV: {csv_path}")
    print(f"Saved Excel: {xlsx_path}")

    return result


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Retrieve NCBI taxonomy lineage for plant names."
    )

    parser.add_argument(
        "--input",
        default=str(DEFAULT_INPUT),
        help=f"Input Excel/CSV file. Default: {DEFAULT_INPUT}",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT_DIR),
        help=f"Output folder. Default: {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--name-column",
        default=None,
        help="Plant-name column. If omitted, auto-detected.",
    )
    parser.add_argument(
        "--email",
        default=DEFAULT_EMAIL,
        help="NCBI Entrez email. Recommended: pass your real email.",
    )
    parser.add_argument(
        "--api-key",
        default=None,
        help="Optional NCBI API key.",
    )
    parser.add_argument(
        "--sheet-name",
        default=0,
        help="Excel sheet name or index. Default: first sheet.",
    )
    parser.add_argument(
        "--sleep",
        default=0.4,
        type=float,
        help="Delay between NCBI calls in seconds. Default: 0.4",
    )

    return parser


def main() -> None:
    args = build_arg_parser().parse_args()

    if args.email == DEFAULT_EMAIL:
        print(
            "WARNING: You are using the placeholder email. "
            "NCBI recommends using your real email with --email."
        )

    sheet_name = args.sheet_name
    if isinstance(sheet_name, str) and sheet_name.isdigit():
        sheet_name = int(sheet_name)

    enrich_taxonomy(
        input_file=Path(args.input),
        output_dir=Path(args.output),
        name_column=args.name_column,
        email=args.email,
        api_key=args.api_key,
        sheet_name=sheet_name,
        sleep_seconds=args.sleep,
    )


if __name__ == "__main__":
    main()
