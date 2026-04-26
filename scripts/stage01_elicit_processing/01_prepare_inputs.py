#!/usr/bin/env python3
"""Prepare raw Elicit plant Excel files for the pipeline.

Input: folder containing many plant Excel files exported from Elicit.
Optional input: Excel file listing plants not found; first column should contain plant names.
Outputs:
  output/all_excels/               copied Excel files with safe names
  output/found.zip                 optional, if --not-found-list provided
  output/not_found.zip             optional, if --not-found-list provided
  output/input_inventory.csv       file inventory
"""
from __future__ import annotations

import argparse
import re
import shutil
import zipfile
from pathlib import Path

import pandas as pd

EXCEL_EXTS = {".xlsx", ".xls"}


def safe_filename(name: str) -> str:
    stem = Path(name).stem.strip()
    suffix = Path(name).suffix.lower()
    stem = re.sub(r"\s+", " ", stem)
    stem = stem.replace("_", " ").replace("-", " ")
    stem = re.sub(r"[^A-Za-z0-9 .()]+", "", stem).strip()
    stem = re.sub(r"\s+", " ", stem)
    return f"{stem}{suffix}"


def normalize_plant_name(text: str) -> str:
    text = Path(str(text)).stem.lower()
    text = text.replace("_", " ").replace("-", " ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load_not_found_names(path: Path) -> set[str]:
    df = pd.read_excel(path)
    return {normalize_plant_name(x) for x in df.iloc[:, 0].dropna().astype(str)}


def zip_files(files: list[Path], zip_path: Path, base_dir: Path) -> None:
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for fp in files:
            zf.write(fp, arcname=fp.relative_to(base_dir))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="Folder containing raw Elicit Excel files")
    ap.add_argument("--output", required=True, help="Output folder")
    ap.add_argument("--not-found-list", default=None, help="Optional Excel file with not-found plant names in first column")
    args = ap.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    all_dir = output_dir / "all_excels"
    all_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    copied = []
    for fp in sorted(input_dir.iterdir()):
        if fp.suffix.lower() not in EXCEL_EXTS:
            continue
        out_name = safe_filename(fp.name)
        out_path = all_dir / out_name
        shutil.copy2(fp, out_path)
        copied.append(out_path)
        rows.append({
            "original_file": fp.name,
            "prepared_file": out_name,
            "plant_name_from_file": Path(out_name).stem,
            "size_bytes": fp.stat().st_size,
        })

    pd.DataFrame(rows).to_csv(output_dir / "input_inventory.csv", index=False)

    if args.not_found_list:
        nf_names = load_not_found_names(Path(args.not_found_list))
        found_files, not_found_files = [], []
        for fp in copied:
            if normalize_plant_name(fp.name) in nf_names:
                not_found_files.append(fp)
            else:
                found_files.append(fp)
        zip_files(found_files, output_dir / "found.zip", all_dir)
        zip_files(not_found_files, output_dir / "not_found.zip", all_dir)

    print(f"Prepared {len(copied)} Excel files in {all_dir}")


if __name__ == "__main__":
    main()
