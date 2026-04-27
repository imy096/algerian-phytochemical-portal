#!/usr/bin/env python3
"""
Optional Stage 2 QC - Verify PubChem identifiers in pubchem_results.xlsx.
This replaces the old two-part PubChem checker with one checker for the new PubChem output.
"""

from __future__ import annotations

import argparse
import time
from pathlib import Path

import pandas as pd
import requests

PROPS = "CanonicalSMILES,IsomericSMILES,InChIKey,IUPACName"
BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"

def fetch_cid_props(cid: str) -> dict:
    try:
        r = requests.get(f"{BASE}/compound/cid/{cid}/property/{PROPS}/JSON", timeout=30)
        if r.status_code != 200:
            return {}
        props = r.json().get("PropertyTable", {}).get("Properties", [])
        return props[0] if props else {}
    except Exception:
        return {}

def process(input_path: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    df = pd.read_excel(input_path)
    rows = []
    valid = df[df["CID"].notna() & (df["CID"].astype(str).str.strip() != "")]
    for i, (_, row) in enumerate(valid.iterrows(), 1):
        cid = str(int(row["CID"])) if isinstance(row["CID"], float) else str(row["CID"]).strip()
        props = fetch_cid_props(cid)
        rows.append({
            "query_name": row.get("query_name", ""), "CID": cid,
            "InChIKey_in_file": row.get("InChIKey", ""), "InChIKey_pubchem": props.get("InChIKey", ""),
            "InChIKey_ok": str(row.get("InChIKey", "")).strip() == str(props.get("InChIKey", "")).strip(),
            "CanonicalSMILES_in_file": row.get("CanonicalSMILES", ""), "CanonicalSMILES_pubchem": props.get("CanonicalSMILES", ""),
            "CanonicalSMILES_ok": str(row.get("CanonicalSMILES", "")).strip() == str(props.get("CanonicalSMILES", "")).strip(),
            "IsomericSMILES_in_file": row.get("IsomericSMILES", ""), "IsomericSMILES_pubchem": props.get("IsomericSMILES", ""),
            "IsomericSMILES_ok": str(row.get("IsomericSMILES", "")).strip() == str(props.get("IsomericSMILES", "")).strip(),
            "IUPACName_pubchem": props.get("IUPACName", ""),
        })
        print(f"[{i}/{len(valid)}] checked CID {cid}")
        time.sleep(0.25)
    out = pd.DataFrame(rows)
    out.to_excel(output_dir / "pubchem_quality_check.xlsx", index=False)
    out.to_csv(output_dir / "pubchem_quality_check.csv", index=False)
    print(f"QC output: {output_dir / 'pubchem_quality_check.xlsx'}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Quality-check PubChem output.")
    parser.add_argument("--input", default="data/stage02_compound_enrichment/outputs/pubchem/pubchem_results.xlsx")
    parser.add_argument("--output", default="data/stage02_compound_enrichment/outputs/pubchem_qc")
    args = parser.parse_args()
    process(Path(args.input), Path(args.output))
