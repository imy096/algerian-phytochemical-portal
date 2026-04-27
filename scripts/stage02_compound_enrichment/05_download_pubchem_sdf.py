#!/usr/bin/env python3
"""Stage 2.05 - Download PubChem SDF structure files from PubChem CIDs."""
from __future__ import annotations
import argparse, time, zipfile
from pathlib import Path
import pandas as pd
import requests

PUBCHEM_SDF_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/SDF"

def make_filename(cid: str, name: str | None) -> str:
    label = str(name).strip() if name and str(name).strip() else str(cid)
    safe = "".join(c if c.isalnum() or c in "-._" else "_" for c in label)[:120]
    return f"{safe}_{cid}.sdf" if cid not in safe else safe + ".sdf"

def download(cid: str, out_dir: Path, name: str | None, use_3d: bool):
    if not cid or cid.lower() == "nan": return None
    params = {"record_type": "3d"} if use_3d else {}
    try:
        r = requests.get(PUBCHEM_SDF_URL.format(cid=cid), params=params, timeout=60)
    except Exception as e:
        print(f"[CID {cid}] request error: {e}"); return None
    if r.status_code != 200 or not r.text.strip():
        print(f"[CID {cid}] no SDF ({r.status_code})"); return None
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / make_filename(cid, name)
    path.write_text(r.text, encoding="utf-8")
    return path

def run(input_file: Path, output_dir: Path, use_3d: bool=True, delay: float=0.2):
    output_dir.mkdir(parents=True, exist_ok=True); sdf_dir = output_dir / ("sdf_3d" if use_3d else "sdf_2d")
    df = pd.read_excel(input_file) if input_file.suffix.lower() in [".xlsx", ".xls"] else pd.read_csv(input_file)
    if "CID" not in df.columns: raise ValueError("Input must contain CID from PubChem output.")
    name_col = "queryname" if "queryname" in df.columns else "matched_name" if "matched_name" in df.columns else None
    work = df.dropna(subset=["CID"]).drop_duplicates(subset=["CID"])
    records=[]
    for i,row in work.iterrows():
        cid = str(int(row["CID"])) if isinstance(row["CID"], float) else str(row["CID"]).strip()
        name = str(row[name_col]).strip() if name_col else ""
        print(f"Downloading SDF {i+1}/{len(work)}: {name or cid}")
        path = download(cid, sdf_dir, name, use_3d)
        records.append({"CID": cid, "queryname": name, "sdf_file": str(path) if path else "NOT_FOUND"})
        time.sleep(delay)
    pd.DataFrame(records).to_csv(output_dir / "sdf_download_manifest.csv", index=False)
    zip_path = output_dir / ("pubchem_sdf_3d.zip" if use_3d else "pubchem_sdf_2d.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in sdf_dir.glob("*.sdf"): zf.write(p, p.name)
    print(f"Done. ZIP: {zip_path}")

def main():
    p=argparse.ArgumentParser(description="Download PubChem SDF files from PubChem output."); p.add_argument("--input",required=True); p.add_argument("--output",default="data/stage02_compound_enrichment/pubchem_sdf"); p.add_argument("--record-type",choices=["2d","3d"],default="3d"); args=p.parse_args(); run(Path(args.input),Path(args.output),use_3d=args.record_type=="3d")
if __name__=="__main__": main()
