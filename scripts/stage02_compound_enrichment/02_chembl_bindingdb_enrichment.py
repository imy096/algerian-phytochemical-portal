#!/usr/bin/env python3
"""
Stage 2.02 - ChEMBL + BindingDB enrichment.

Input: PubChem output from 01_pubchem_lookup.py containing InChIKey and SMILES.
Output: combined ChEMBL molecule records, ChEMBL activities, BindingDB target records,
and per-molecule workbooks.
"""

from __future__ import annotations

import argparse
import os
import time
import urllib.parse
import zipfile
from pathlib import Path

import pandas as pd
import requests
from requests.adapters import HTTPAdapter, Retry
try:
    from chembl_webresource_client.new_client import new_client
except ImportError as exc:
    raise SystemExit("Install dependency first: pip install chembl-webresource-client") from exc

CHEMBL_MOL_URL = "https://www.ebi.ac.uk/chembl/api/data/molecule"
CHEMBL_ACTIVITY_KEEP_COLS = [
    "molecule_chembl_id", "target_chembl_id", "target_pref_name", "target_organism",
    "assay_chembl_id", "assay_type", "assay_description", "standard_type",
    "standard_relation", "standard_value", "standard_units", "pchembl_value",
    "document_chembl_id",
]
BDB_KEEP_COLS = [
    "query_inchikey", "input_queryname", "LigandSMILES", "Ligand_name", "BindingDB_MONO_ID",
    "TargetName", "TargetSpecies", "Ki_nM", "IC50_nM", "Kd_nM", "EC50_nM", "pH", "Temp_C", "PubMed_ID",
]

session = requests.Session()
retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504])
session.mount("http://", HTTPAdapter(max_retries=retries))
session.mount("https://", HTTPAdapter(max_retries=retries))

molecule_api = new_client.molecule
activity_api = new_client.activity


def safe_name(text: str) -> str:
    return "".join("_" if c in '<>:"/\\|?*' else c for c in str(text)).replace(" ", "_")[:100]


def chembl_lookup_inchikey_flat(inchikey: str) -> dict:
    params = {"molecule_structures__standard_inchi_key": inchikey, "format": "json", "limit": 1}
    try:
        r = session.get(CHEMBL_MOL_URL, params=params, timeout=60)
        if r.status_code != 200:
            return {}
        data = r.json()
        if data.get("page_meta", {}).get("total_count", 0) == 0:
            return {}
        mol = data.get("molecules", [])[0]
        flat = {}
        def flatten(prefix, value):
            if isinstance(value, dict):
                for k, v in value.items():
                    flatten(f"{prefix}.{k}" if prefix else k, v)
            elif isinstance(value, list):
                flat[prefix] = ", ".join(str(x) for x in value)
            else:
                flat[prefix] = value
        flatten("", mol)
        return flat
    except Exception:
        return {}


def resolve_inchikey_chembl(inchikey: str) -> dict | None:
    try:
        hits = list(molecule_api.filter(molecule_structures__standard_inchi_key=inchikey))
        return hits[0] if hits else None
    except Exception as e:
        print(f" [ChEMBL lookup error] {e}")
        return None


def fetch_chembl_activities(chembl_id: str) -> pd.DataFrame:
    try:
        records = list(activity_api.filter(molecule_chembl_id=chembl_id))
        if records:
            df = pd.DataFrame(records)
            keep = [c for c in CHEMBL_ACTIVITY_KEEP_COLS if c in df.columns]
            return df[keep].copy()
    except Exception as e:
        print(f" [ChEMBL activity error] {e}")
    return pd.DataFrame()


def query_bindingdb(smiles: str, cutoff: float = 0.85) -> list[dict]:
    encoded = urllib.parse.quote(smiles, safe="")
    url = f"https://bindingdb.org/rest/getTargetByCompound?smiles={encoded}&cutoff={cutoff}&response=application/json"
    try:
        r = session.get(url, timeout=90)
        r.raise_for_status()
        data = r.json()
        if isinstance(data, list):
            return data
        node = data.get("getTargetByCompound", data) if isinstance(data, dict) else {}
        affs = node.get("affinities", node.get("affinity", [])) if isinstance(node, dict) else []
        if isinstance(affs, dict):
            affs = affs.get("affinity", affs)
        return [affs] if isinstance(affs, dict) else affs if isinstance(affs, list) else []
    except Exception as e:
        print(f" [BindingDB error] {e}")
        return []


def run(input_file: Path, output_dir: Path, cutoff: float = 0.85, sleep_between: float = 1.0) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    per_dir = output_dir / "per_molecule"
    per_dir.mkdir(exist_ok=True)
    df = pd.read_excel(input_file)
    if "InChIKey" not in df.columns:
        raise ValueError("Input must contain InChIKey from PubChem output.")
    name_col = "queryname" if "queryname" in df.columns else "matched_name" if "matched_name" in df.columns else None
    smiles_col = "CanonicalSMILES" if "CanonicalSMILES" in df.columns else "IsomericSMILES" if "IsomericSMILES" in df.columns else None

    work = df.dropna(subset=["InChIKey"]).drop_duplicates(subset=["InChIKey"])
    all_mol, all_act, all_bdb, summaries = [], [], [], []

    for idx, row in work.iterrows():
        inchikey = str(row["InChIKey"]).strip()
        if not inchikey or inchikey.upper() == "N/A":
            continue
        input_name = str(row[name_col]).strip() if name_col else ""
        input_smiles = str(row[smiles_col]).strip() if smiles_col and not pd.isna(row[smiles_col]) else ""
        print(f"ChEMBL/BindingDB: {input_name or inchikey}")

        mol_record = resolve_inchikey_chembl(inchikey)
        chembl_id = mol_record.get("molecule_chembl_id") if mol_record else ""
        pref_name = mol_record.get("pref_name", "") if mol_record else ""
        smiles = ""
        if mol_record and isinstance(mol_record.get("molecule_structures"), dict):
            smiles = mol_record["molecule_structures"].get("canonical_smiles") or ""
        smiles = smiles or input_smiles

        flat = chembl_lookup_inchikey_flat(inchikey)
        if flat:
            flat.update({"query_inchikey": inchikey, "input_queryname": input_name})
            all_mol.append(flat)

        act = pd.DataFrame()
        if chembl_id:
            act = fetch_chembl_activities(chembl_id)
            if not act.empty:
                act.insert(0, "query_inchikey", inchikey)
                act.insert(1, "input_queryname", input_name)
                all_act.append(act)

        bdb = pd.DataFrame()
        if smiles:
            raw = query_bindingdb(smiles, cutoff=cutoff)
            if raw:
                bdb_raw = pd.DataFrame(raw)
                keep = [c for c in BDB_KEEP_COLS if c in bdb_raw.columns]
                bdb = bdb_raw[keep].copy() if keep else bdb_raw
                if "query_inchikey" not in bdb.columns:
                    bdb.insert(0, "query_inchikey", inchikey)
                if "input_queryname" not in bdb.columns:
                    bdb.insert(1, "input_queryname", input_name)
                all_bdb.append(bdb)

        per_file = per_dir / f"{safe_name(input_name or inchikey)}.xlsx"
        with pd.ExcelWriter(per_file, engine="openpyxl") as writer:
            pd.DataFrame([{"InChIKey": inchikey, "Input_Name": input_name, "ChEMBL_ID": chembl_id, "Pref_Name": pref_name, "SMILES": smiles}]).to_excel(writer, sheet_name="Info", index=False)
            if flat:
                pd.DataFrame([flat]).to_excel(writer, sheet_name="ChEMBL_Molecule", index=False)
            if not act.empty:
                act.to_excel(writer, sheet_name="ChEMBL_Activities", index=False)
            if not bdb.empty:
                bdb.to_excel(writer, sheet_name="BindingDB", index=False)

        summaries.append({
            "queryname": input_name, "InChIKey": inchikey, "ChEMBL_ID": chembl_id,
            "Pref_Name": pref_name, "ChEMBL_Activities_rows": len(act),
            "BindingDB_rows": len(bdb), "Per_molecule_file": str(per_file),
        })
        time.sleep(sleep_between)

    summary = pd.DataFrame(summaries)
    chembl_mol = pd.DataFrame(all_mol)
    chembl_act = pd.concat(all_act, ignore_index=True) if all_act else pd.DataFrame()
    bdb_all = pd.concat(all_bdb, ignore_index=True) if all_bdb else pd.DataFrame()

    combined = output_dir / "chembl_bindingdb_combined.xlsx"
    with pd.ExcelWriter(combined, engine="openpyxl") as writer:
        summary.to_excel(writer, sheet_name="Summary", index=False)
        if not chembl_mol.empty:
            chembl_mol.to_excel(writer, sheet_name="ChEMBL_Molecule_All", index=False)
        if not chembl_act.empty:
            chembl_act.to_excel(writer, sheet_name="ChEMBL_Activities_All", index=False)
        if not bdb_all.empty:
            bdb_all.to_excel(writer, sheet_name="BindingDB_All", index=False)
    summary.to_csv(output_dir / "summary.csv", index=False)
    if not chembl_act.empty:
        chembl_act.to_csv(output_dir / "chembl_activities.csv", index=False)
    if not bdb_all.empty:
        bdb_all.to_csv(output_dir / "bindingdb_targets.csv", index=False)

    with zipfile.ZipFile(output_dir / "chembl_bindingdb_results.zip", "w", zipfile.ZIP_DEFLATED) as zf:
        for path in output_dir.rglob("*"):
            if path.is_file() and path.name != "chembl_bindingdb_results.zip":
                zf.write(path, path.relative_to(output_dir))
    print(f"Done. Main output: {combined}")


def main() -> None:
    p = argparse.ArgumentParser(description="ChEMBL + BindingDB enrichment from PubChem output.")
    p.add_argument("--input", required=True, help="PubChem output Excel.")
    p.add_argument("--output", default="data/stage02_compound_enrichment/chembl_bindingdb")
    p.add_argument("--bindingdb-cutoff", type=float, default=0.85)
    p.add_argument("--sleep", type=float, default=1.0)
    args = p.parse_args()
    run(Path(args.input), Path(args.output), args.bindingdb_cutoff, args.sleep)


if __name__ == "__main__":
    main()
