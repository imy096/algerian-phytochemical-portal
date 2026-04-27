#!/usr/bin/env python3
"""Stage 2.5 — PubChem SDF structure download.

Input: PubChem output from 01_pubchem_lookup.py with CID and names.
Output: SDF files + molecules_sdf.zip.
"""

from __future__ import annotations

import argparse
import time
import zipfile
from pathlib import Path

import pandas as pd
import requests

PUBCHEM_SDF_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/SDF"


def choose_column(df: pd.DataFrame, candidates: list[str], required: bool = True) -> str | None:
    for c in candidates:
        if c in df.columns:
            return c
    if required:
        raise ValueError(f"None of columns {candidates} found. Available: {list(df.columns)}")
    return None


def make_filename(cid: str, name: str | None) -> str:
    label = name if name else cid
    safe = "".join(c if c.isalnum() or c in "-._" else "_" for c in str(label))[:100]
    return f"{safe}_{cid}.sdf" if safe != str(cid) else f"{cid}.sdf"


def download_sdf(session: requests.Session, cid: str, name: str | None, output_dir: Path, use_3d: bool) -> Path | None:
    if not cid or str(cid).lower() in {"nan", "none", "not_found"}:
        return None
    params = {"record_type": "3d"} if use_3d else {}
    url = PUBCHEM_SDF_URL.format(cid=cid)
    try:
        r = session.get(url, params=params, timeout=60)
    except Exception as e:
        print(f"[CID {cid}] request error: {e}")
        return None
    if r.status_code != 200 or not r.text.strip():
        print(f"[CID {cid}] no SDF, HTTP {r.status_code}")
        return None
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / make_filename(cid, name)
    path.write_text(r.text, encoding="utf-8")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description="Download PubChem SDF files using CIDs from PubChem output.")
    parser.add_argument("--input", required=True, help="PubChem output Excel from 01_pubchem_lookup.py")
    parser.add_argument("--output-dir", default="data/stage02_compound_enrichment/outputs/sdf")
    parser.add_argument("--use-2d", action="store_true", help="Download 2D instead of 3D SDF records.")
    parser.add_argument("--sleep", type=float, default=0.2)
    args = parser.parse_args()

    df = pd.read_excel(args.input)
    cid_col = choose_column(df, ["CID"])
    name_col = choose_column(df, ["query_name", "matched_name", "Name", "compound_name"], required=False)
    output_dir = Path(args.output_dir)
    sdf_dir = output_dir / "sdf_files"
    output_dir.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    manifest = []
    df = df[df[cid_col].notna()].drop_duplicates(subset=[cid_col])
    for _, row in df.iterrows():
        cid = str(row[cid_col]).strip()
        name = str(row[name_col]).strip() if name_col and not pd.isna(row.get(name_col)) else ""
        print(f"SDF: {name or cid}")
        path = download_sdf(session, cid, name, sdf_dir, use_3d=not args.use_2d)
        manifest.append({"CID": cid, "query_name": name, "sdf_file": str(path) if path else "", "download_status": "OK" if path else "FAILED"})
        time.sleep(args.sleep)

    manifest_df = pd.DataFrame(manifest)
    manifest_df.to_excel(output_dir / "sdf_manifest.xlsx", index=False)
    zip_path = output_dir / "molecules_sdf.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in sdf_dir.glob("*.sdf"):
            zf.write(p, arcname=p.name)
    print(f"Done. ZIP: {zip_path}")


if __name__ == "__main__":
    main()
