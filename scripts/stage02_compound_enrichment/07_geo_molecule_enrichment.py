#!/usr/bin/env python3
"""
Stage 2 GEO molecule enrichment.

Purpose
-------
Use molecule names produced by Stage 1 or standardized by PubChem in Stage 2 to:
1. Search NCBI GEO/GDS for datasets mentioning each molecule.
2. Save combined GEO metadata for all molecules.
3. Optionally inspect GSE series/sample metadata with GEOparse and keep samples where
   the molecule appears to be used as a treatment/exposure/intervention.

Typical input
-------------
Preferred: PubChem output from 01_pubchem_lookup.py:
  data/stage02_compound_enrichment/pubchem/pubchem_compound_identifiers.xlsx

Also accepted: Stage 1 compound output:
  data/stage01_elicit_processing/outputs/stage05_compounds/all_compounds.xlsx

The script auto-detects a molecule-name column, or use --name-column.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import time
import zipfile
from pathlib import Path
from typing import Iterable

import pandas as pd
import requests

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
ESUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"

NAME_COLUMN_CANDIDATES = [
    "query_name",
    "queryname",
    "original_name",
    "molecule_name",
    "Molecule",
    "Molecules",
    "Compound",
    "Compound Name",
    "Name",
    "input_query_name",
]

TREATMENT_PATTERNS = [
    "treated with", "treatment with", "co-treated with", "cotreated with",
    "pre-treated with", "pretreated with", "post-treated with", "posttreated with",
    "exposed to", "exposure to", "incubated with", "incubation with",
    "stimulated with", "challenged with", "supplemented with",
    "supplementation with", "supplementation of", "fed with",
    "fed a diet containing", "fed a diet enriched with", "given",
    "given a dose of", "administered", "administered as", "received",
    "receiving", "subject received", "subjects received", "subjected to",
    "patients received", "patients were given", "dose of", "dosed with",
    "dosing with", "mg/kg", "mg per kg", "mg/kg/day", "mg per day", "mg/day",
    "g/day", "ug/ml", "µg/ml", "μg/ml", "ng/ml", "µm", "μm", "µmolar", "μmolar",
    "μmol", "µmol", "mmol/l", "mmol/litre", "molar concentration",
    "intervention with", "dietary intervention with", "therapy with",
    "therapeutic", "drug", "drug treatment", "pharmacological treatment",
    "treatment group", "added to the medium", "added to culture medium",
    "added to the cultures", "added to the cells", "cultured with",
    "culture in the presence of", "in the presence of",
    "incubation in the presence of", "vs placebo", "versus placebo",
    "vs control", "versus control", "compared to placebo",
    "compared with placebo", "compared to control", "compared with control", "control group",
]


def safe_name(value: str, max_len: int = 90) -> str:
    value = str(value).strip() or "unknown"
    value = re.sub(r"[^A-Za-z0-9_.-]+", "_", value)
    return value[:max_len].strip("_") or "unknown"


def detect_column(df: pd.DataFrame, candidates: Iterable[str], explicit: str | None = None) -> str:
    if explicit:
        if explicit not in df.columns:
            raise ValueError(f"Column {explicit!r} not found. Available columns: {list(df.columns)}")
        return explicit
    for col in candidates:
        if col in df.columns:
            return col
    raise ValueError(f"Could not detect molecule-name column. Available columns: {list(df.columns)}")


def load_molecule_names(input_file: Path, name_column: str | None = None) -> list[str]:
    df = pd.read_excel(input_file)
    col = detect_column(df, NAME_COLUMN_CANDIDATES, name_column)
    names = []
    seen = set()
    for val in df[col].dropna().astype(str):
        val = val.strip()
        if not val or val.upper() in {"N/A", "NA", "NOT_FOUND", "NONE", "NAN"}:
            continue
        key = val.lower()
        if key not in seen:
            seen.add(key)
            names.append(val)
    if not names:
        raise ValueError(f"No molecule names found in column {col!r} of {input_file}")
    return names


def search_geo(query: str, retmax: int = 500, timeout: int = 30) -> list[str]:
    params = {"db": "gds", "term": query, "retmax": retmax, "retmode": "json"}
    try:
        r = requests.get(ESEARCH_URL, params=params, timeout=timeout)
        r.raise_for_status()
        data = r.json()
        return data.get("esearchresult", {}).get("idlist", []) or []
    except Exception as exc:
        print(f"[WARN] GEO search failed for {query!r}: {exc}")
        return []


def fetch_metadata(uid: str, timeout: int = 30) -> dict | None:
    params = {"db": "gds", "id": uid, "retmode": "json"}
    try:
        r = requests.get(ESUMMARY_URL, params=params, timeout=timeout)
        r.raise_for_status()
        data = r.json()
    except Exception as exc:
        print(f"[WARN] GEO metadata failed for UID {uid}: {exc}")
        return None
    if "result" not in data or uid not in data["result"]:
        return None
    d = data["result"][uid]
    pubmed_ids = d.get("pubmed_ids") or []
    return {
        "UID": uid,
        "Title": d.get("title", ""),
        "GSE": d.get("accession", ""),
        "Platform": d.get("gpl", ""),
        "Samples": d.get("n_samples", ""),
        "Organism": d.get("taxon", ""),
        "Type": d.get("gdsType", d.get("type", "")),
        "Summary": d.get("summary", ""),
        "PubMed_ID": pubmed_ids[0] if pubmed_ids else "",
    }


def run_geo_metadata_search(input_file: Path, output_dir: Path, name_column: str | None, retmax: int, delay: float) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    per_dir = output_dir / "per_molecule_geo_metadata"
    per_dir.mkdir(exist_ok=True)

    molecules = load_molecule_names(input_file, name_column)
    print(f"Loaded {len(molecules)} molecule names from {input_file}")

    all_frames = []
    non_empty_files = []
    summary_rows = []

    for i, mol in enumerate(molecules, start=1):
        print(f"[{i}/{len(molecules)}] GEO search: {mol}")
        uids = search_geo(mol, retmax=retmax)
        rows = []
        for uid in uids:
            meta = fetch_metadata(uid)
            if meta:
                meta["Molecule"] = mol
                rows.append(meta)
            time.sleep(delay)

        df_mol = pd.DataFrame(rows)
        summary_rows.append({"Molecule": mol, "GEO_UIDs_found": len(uids), "Metadata_rows": len(df_mol)})
        if not df_mol.empty:
            out_file = per_dir / f"geo_{safe_name(mol)}.xlsx"
            df_mol.to_excel(out_file, index=False)
            non_empty_files.append(out_file)
            all_frames.append(df_mol)

    combined = pd.concat(all_frames, ignore_index=True) if all_frames else pd.DataFrame(
        columns=["Molecule", "UID", "Title", "GSE", "Platform", "Samples", "Organism", "Type", "Summary", "PubMed_ID"]
    )
    combined_path = output_dir / "geo_molecule_metadata_all.xlsx"
    combined.to_excel(combined_path, index=False)

    pd.DataFrame(summary_rows).to_excel(output_dir / "geo_molecule_search_summary.xlsx", index=False)

    zip_path = output_dir / "geo_molecule_metadata_nonempty.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in non_empty_files:
            zf.write(f, arcname=f"per_molecule_geo_metadata/{f.name}")
        zf.write(combined_path, arcname=combined_path.name)

    print(f"Saved combined GEO metadata: {combined_path}")
    print(f"Saved non-empty GEO ZIP: {zip_path}")
    return combined_path


def is_real_treatment_use(text: str, molecule: str) -> bool:
    if not isinstance(text, str):
        return False
    txt = text.lower()
    mol = molecule.lower().strip()
    if not mol or mol not in txt:
        return False
    if any(pattern in txt for pattern in TREATMENT_PATTERNS):
        return True
    escaped = re.escape(mol)
    regexes = [
        rf"(treated|treatment|exposed|supplemented|administered|given|dosed)\s+with\s+{escaped}",
        rf"{escaped}\s+(treatment|therapy|supplementation|intervention)",
        rf"{escaped}\s+at\s+\d+(\.\d+)?\s*(mg|g|µm|μm|µmol|μmol|mmol|mg/kg|mg\/kg|µg/ml|μg/ml|ng/ml|mg/day|g/day)",
        rf"\d+(\.\d+)?\s*(mg|g|µm|μm|µmol|μmol|mmol|mg/kg|mg\/kg|µg/ml|μg/ml|ng/ml|mg/day|g/day)\s+{escaped}",
    ]
    return any(re.search(rx, txt) for rx in regexes)


def run_human_treatment_filter(metadata_file: Path, output_dir: Path, delay: float = 1.0, retries: int = 3) -> Path:
    try:
        import GEOparse  # type: ignore
    except Exception as exc:
        raise RuntimeError("GEOparse is required for --human-treatment-filter. Install it with: pip install GEOparse") from exc

    meta = pd.read_excel(metadata_file)
    if meta.empty or "GSE" not in meta.columns or "Molecule" not in meta.columns:
        out = output_dir / "geo_human_treatment_samples.xlsx"
        pd.DataFrame(columns=[
            "GSE", "GSM", "Molecule", "Series_Title", "Sample_Title", "Sample_Source",
            "Sample_Characteristics", "UID", "Platform", "Samples", "Organism"
        ]).to_excel(out, index=False)
        return out

    # This keeps the original intent of your script: it assumes relevant human series are those
    # already returned in the GEO metadata search and then validates treatment language.
    gse_values = sorted({str(x).strip() for x in meta["GSE"].dropna() if str(x).upper().startswith("GSE")})
    cache_dir = output_dir / "geo_cache"
    cache_dir.mkdir(exist_ok=True)
    rows = []

    for idx, gse_id in enumerate(gse_values, start=1):
        print(f"[{idx}/{len(gse_values)}] Inspecting GSE: {gse_id}")
        gse = None
        for attempt in range(1, retries + 1):
            try:
                gse = GEOparse.get_GEO(geo=gse_id, destdir=str(cache_dir), silent=True)
                break
            except Exception as exc:
                print(f"  attempt {attempt} failed: {exc}")
                shutil.rmtree(cache_dir / gse_id, ignore_errors=True)
                time.sleep(delay * attempt)
        if gse is None:
            continue

        series_text = " ".join([
            " ".join(gse.metadata.get("title", [])),
            " ".join(gse.metadata.get("summary", [])),
            " ".join(gse.metadata.get("overall_design", [])),
        ])
        mols_here = meta.loc[meta["GSE"].astype(str) == gse_id, "Molecule"].dropna().unique()
        series_use = {mol: is_real_treatment_use(series_text, mol) for mol in mols_here}

        for gsm_name, gsm in gse.gsms.items():
            sample_text = " ".join([
                " ".join(gsm.metadata.get("title", [])),
                " ".join(gsm.metadata.get("source_name_ch1", [])),
                " ".join(gsm.metadata.get("characteristics_ch1", [])),
                " ".join(gsm.metadata.get("description", [])),
            ])
            for mol in mols_here:
                if series_use[mol] or is_real_treatment_use(sample_text, mol):
                    source_row = meta[(meta["GSE"].astype(str) == gse_id) & (meta["Molecule"] == mol)].iloc[0]
                    rows.append({
                        "GSE": gse_id,
                        "GSM": gsm_name,
                        "Molecule": mol,
                        "Series_Title": " ".join(gse.metadata.get("title", [])),
                        "Sample_Title": " ".join(gsm.metadata.get("title", [])),
                        "Sample_Source": " ".join(gsm.metadata.get("source_name_ch1", [])),
                        "Sample_Characteristics": " | ".join(gsm.metadata.get("characteristics_ch1", [])),
                        "UID": source_row.get("UID", ""),
                        "Platform": source_row.get("Platform", ""),
                        "Samples": source_row.get("Samples", ""),
                        "Organism": source_row.get("Organism", ""),
                    })
        time.sleep(delay)

    out = output_dir / "geo_human_treatment_samples.xlsx"
    pd.DataFrame(rows).to_excel(out, index=False)
    zip_path = output_dir / "geo_human_treatment_samples.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(out, arcname=out.name)
        zf.write(metadata_file, arcname=metadata_file.name)
    print(f"Saved human treatment samples: {out}")
    print(f"Saved ZIP: {zip_path}")
    return out


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Search GEO for molecule names and optionally filter treatment samples.")
    parser.add_argument("--input", required=True, help="Input Excel file with molecule names, usually PubChem output.")
    parser.add_argument("--output", required=True, help="Output directory for GEO results.")
    parser.add_argument("--name-column", default=None, help="Optional molecule-name column. Auto-detected if omitted.")
    parser.add_argument("--retmax", type=int, default=500, help="Maximum GEO UIDs per molecule.")
    parser.add_argument("--delay", type=float, default=0.3, help="Delay between NCBI requests.")
    parser.add_argument("--human-treatment-filter", action="store_true", help="After metadata search, inspect GSE/GSM records for treatment/exposure evidence.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    out_dir = Path(args.output)
    combined_metadata = run_geo_metadata_search(Path(args.input), out_dir, args.name_column, args.retmax, args.delay)
    if args.human_treatment_filter:
        run_human_treatment_filter(combined_metadata, out_dir, delay=max(args.delay, 1.0))


if __name__ == "__main__":
    main()
