#!/usr/bin/env python3
"""Stage 2.03 - CompTox / DSSTox enrichment from PubChem InChIKeys."""
from __future__ import annotations
import argparse, sys, time
from pathlib import Path
import pandas as pd
import requests

RESOLVE_URL = "https://actorws.epa.gov/actorws/chemIdentifier/v01/resolve"
DASHBOARD_SUBSTANCE_URL = "https://comptox.epa.gov/dashboard/api/chemical/substance"
TIMEOUT, SLEEP, RETRIES = 30, 0.3, 3
session = requests.Session()

def http_get(url: str, params=None):
    last_err = None
    for attempt in range(1, RETRIES + 1):
        try:
            r = session.get(url, params=params, timeout=TIMEOUT)
            if r.status_code == 200:
                time.sleep(SLEEP); return r
            if r.status_code == 404:
                time.sleep(SLEEP); return None
            last_err = RuntimeError(f"HTTP {r.status_code}")
        except Exception as e:
            last_err = e
        time.sleep(SLEEP * attempt)
    print(f"[WARN] request failed for {url}: {last_err}", file=sys.stderr)
    return None

def resolve_inchikey(inchikey: str):
    if not inchikey: return None
    r = http_get(RESOLVE_URL, params={"identifier": inchikey})
    if r is None: return None
    try: data = r.json()
    except Exception: return None
    if isinstance(data, list): return data[0] if data else None
    return data if isinstance(data, dict) else None

def dashboard_substance(dtxsid: str):
    if not dtxsid: return None
    r = http_get(f"{DASHBOARD_SUBSTANCE_URL}/{dtxsid}")
    if r is None: return None
    try: data = r.json()
    except Exception: return None
    if isinstance(data, list): return data[0] if data else None
    return data if isinstance(data, dict) else None

def run(input_file: Path, output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    df = pd.read_excel(input_file)
    if "InChIKey" not in df.columns:
        raise ValueError("Input must contain InChIKey from PubChem output.")
    name_col = "queryname" if "queryname" in df.columns else "matched_name" if "matched_name" in df.columns else None
    rows = []
    work = df.dropna(subset=["InChIKey"]).drop_duplicates(subset=["InChIKey"])
    for i, row in enumerate(work.itertuples(index=False), 1):
        rowd = row._asdict()
        inchikey = str(rowd.get("InChIKey", "")).strip()
        name = str(rowd.get(name_col, "")).strip() if name_col else ""
        print(f"[{i}/{len(work)}] CompTox: {name or inchikey}")
        base = {"queryname": name, "InChIKey": inchikey}
        res = resolve_inchikey(inchikey)
        if not res:
            base.update({"DTXSID": None, "DTXCID": None, "CASRN": None, "preferredName": None})
            rows.append(base); continue
        dtxsid = res.get("dtxsid") or res.get("DTXSID")
        base.update({
            "DTXSID": dtxsid,
            "DTXCID": res.get("dtxcid") or res.get("DTXCID"),
            "CASRN": res.get("casrn") or res.get("CASRN"),
            "preferredName": res.get("preferredName") or res.get("preferred_name"),
        })
        for k, v in res.items(): base[f"resolve_{k}"] = v
        dash = dashboard_substance(dtxsid) if dtxsid else None
        if dash:
            for k, v in dash.items(): base[f"dash_{k}"] = str(v) if isinstance(v, (dict, list)) else v
        rows.append(base)
    out = pd.DataFrame(rows)
    out_file = output_dir / "comptox_results.xlsx"
    out.to_excel(out_file, index=False)
    print(f"Done. Output: {out_file}")

def main():
    p = argparse.ArgumentParser(description="CompTox enrichment from PubChem output.")
    p.add_argument("--input", required=True)
    p.add_argument("--output", default="data/stage02_compound_enrichment/comptox")
    args = p.parse_args(); run(Path(args.input), Path(args.output))
if __name__ == "__main__": main()
