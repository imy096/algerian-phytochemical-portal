#!/usr/bin/env python3
"""
Stage 2 - LINCS gene-signature enrichment.

Input:
  PubChem output table from 01_pubchem_lookup.py, or any Excel/CSV table with
  compound names. By default this script reads molecule names from one of:
  query_name, matched_name, Compound, compound, molecule, Molecule, Name.

What it does:
  1. Searches L1000FWD synonyms for each molecule to map compound names to
     LINCS perturbagen IDs (pert_id).
  2. Uses the first available pert_id to fetch L1000FWD signatures and top
     up/down genes.
  3. Searches SigCom-LINCS by the best LINCS/molecule name to retrieve metadata
     signatures, cell lines, doses, times, and optionally downloads one gene
     ranking table using persistent_id.

Outputs:
  output/lincs_molecule_summary.xlsx
  output/lincs_molecule_summary.csv
  output/raw_json/<molecule>/l1000fwd_synonyms.json
  output/raw_json/<molecule>/l1000fwd_signatures.json
  output/raw_json/<molecule>/l1000fwd_top_genes.json
  output/gene_tables/<molecule>_sigcom_genes.xlsx, when available
  output/lincs_results.zip

External helper files:
  None. This script uses public online APIs only:
    - L1000FWD: https://maayanlab.cloud/L1000FWD
    - SigCom-LINCS metadata API: https://maayanlab.cloud/sigcom-lincs/metadata-api/
"""

from __future__ import annotations

import argparse
import json
import os
import time
import zipfile
from io import StringIO
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from requests.adapters import HTTPAdapter, Retry

L1000FWD_BASE = "https://maayanlab.cloud/L1000FWD"
SIGCOM_METADATA_API = "https://maayanlab.cloud/sigcom-lincs/metadata-api/"

DEFAULT_NAME_COLUMNS = [
    "query_name",
    "matched_name",
    "Compound",
    "compound",
    "molecule",
    "Molecule",
    "Molecules",
    "Name",
    "name",
    "IUPACName",
]


class RateLimitedSession:
    def __init__(self, rate_limit: float = 0.7, timeout: int = 60, methods: tuple[str, ...] = ("GET", "POST")):
        self.session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=0.6,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=frozenset(methods),
        )
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.rate_limit = rate_limit
        self.timeout = timeout
        self.last_call = 0.0

    def _wait(self) -> None:
        wait = self.rate_limit - (time.time() - self.last_call)
        if wait > 0:
            time.sleep(wait)
        self.last_call = time.time()

    def get(self, url: str, **kwargs) -> requests.Response:
        self._wait()
        kwargs.setdefault("timeout", self.timeout)
        return self.session.get(url, **kwargs)

    def post(self, url: str, **kwargs) -> requests.Response:
        self._wait()
        kwargs.setdefault("timeout", self.timeout)
        return self.session.post(url, **kwargs)


HTTP = RateLimitedSession()


def sanitize_filename(value: Any, max_len: int = 90) -> str:
    text = str(value).strip() or "unknown"
    safe = "".join("_" if c in '<>:"/\\|?*' else c for c in text)
    safe = safe.replace(" ", "_")
    return safe[:max_len]


def read_table(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {path}")
    if path.suffix.lower() in [".xlsx", ".xls"]:
        return pd.read_excel(path)
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path)
    raise ValueError(f"Unsupported input file type: {path.suffix}")


def pick_name_column(df: pd.DataFrame, requested: str | None = None) -> str:
    if requested:
        if requested not in df.columns:
            raise ValueError(f"Requested name column '{requested}' not found. Available columns: {list(df.columns)}")
        return requested
    for col in DEFAULT_NAME_COLUMNS:
        if col in df.columns:
            return col
    raise ValueError(
        "Could not find a molecule-name column. Use --name-column. "
        f"Available columns: {list(df.columns)}"
    )


def unique_names(df: pd.DataFrame, col: str) -> list[str]:
    names = []
    seen = set()
    for x in df[col].dropna().tolist():
        s = str(x).strip()
        if not s or s.upper() in {"N/A", "NOT_FOUND", "NONE", "NAN"}:
            continue
        key = s.lower()
        if key not in seen:
            seen.add(key)
            names.append(s)
    return names


def dump_json(obj: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)


def normalize_json(value: Any) -> str:
    if value is None or value == "":
        return "NOT_FOUND"
    if isinstance(value, (list, dict)):
        if not value:
            return "NOT_FOUND"
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def l1000fwd_synonyms(name: str) -> list[dict[str, Any]]:
    url = f"{L1000FWD_BASE}/synonyms/{requests.utils.quote(name.lower())}"
    try:
        r = HTTP.get(url)
        if r.status_code == 200:
            data = r.json()
            return data if isinstance(data, list) else []
    except Exception as exc:
        print(f"  [WARN] L1000FWD synonym search failed for {name}: {exc}")
    return []


def l1000fwd_signatures(pert_id: str) -> Any:
    url = f"{L1000FWD_BASE}/sig/{requests.utils.quote(str(pert_id))}"
    try:
        r = HTTP.get(url)
        if r.status_code == 200:
            return r.json()
    except Exception as exc:
        print(f"  [WARN] L1000FWD signatures failed for {pert_id}: {exc}")
    return []


def l1000fwd_topgenes(pert_id: str) -> dict[str, Any]:
    url = f"{L1000FWD_BASE}/sig/{requests.utils.quote(str(pert_id))}/topgenes"
    try:
        r = HTTP.get(url)
        if r.status_code == 200:
            data = r.json()
            return data if isinstance(data, dict) else {}
    except Exception as exc:
        print(f"  [WARN] L1000FWD topgenes failed for {pert_id}: {exc}")
    return {}


def sigcom_find_signatures(name: str, limit: int = 50) -> list[dict[str, Any]]:
    payload = {
        "filter": {
            "where": {"meta.pert_name": {"ilike": f"%{name.lower()}%"}},
            "limit": limit,
        }
    }
    url = f"{SIGCOM_METADATA_API}signatures/find"
    try:
        r = HTTP.post(url, json=payload)
        if r.status_code == 200:
            data = r.json()
            return data if isinstance(data, list) else []
    except Exception as exc:
        print(f"  [WARN] SigCom search failed for {name}: {exc}")
    return []


def sigcom_download_gene_table(persistent_id: str) -> pd.DataFrame | None:
    try:
        r = HTTP.get(persistent_id)
        if r.status_code == 200 and r.text.strip():
            return pd.read_csv(StringIO(r.text), sep="\t")
    except Exception as exc:
        print(f"  [WARN] SigCom gene-table download failed: {exc}")
    return None


def top_genes_from_table(df: pd.DataFrame | None, n: int = 20) -> tuple[list[str], list[str]]:
    if df is None or df.empty:
        return [], []
    gene_col = None
    for col in df.columns:
        if col.lower() in {"symbol", "gene", "gene_symbol", "genes", "name"}:
            gene_col = col
            break
    if gene_col is None:
        gene_col = df.columns[0]
    score_col = df.columns[-1]
    try:
        tmp = df.copy()
        tmp[score_col] = pd.to_numeric(tmp[score_col], errors="coerce")
        tmp = tmp.dropna(subset=[score_col])
        if tmp.empty:
            return [], []
        up = [str(x) for x in tmp.nlargest(n, score_col)[gene_col].dropna().tolist()]
        down = [str(x) for x in tmp.nsmallest(n, score_col)[gene_col].dropna().tolist()]
        return up, down
    except Exception:
        return [], []


def summarize_l1000_signatures(sig_data: Any) -> tuple[int, list[str]]:
    if isinstance(sig_data, list):
        cells = sorted({str(s.get("cell_id", "")) for s in sig_data if isinstance(s, dict) and s.get("cell_id")})
        return len(sig_data), cells
    if isinstance(sig_data, dict) and sig_data:
        cell = sig_data.get("cell_id")
        return 1, [cell] if cell else []
    return 0, []


def process_molecule(name: str, output_dir: Path) -> dict[str, Any]:
    safe = sanitize_filename(name)
    mol_raw_dir = output_dir / "raw_json" / safe
    gene_dir = output_dir / "gene_tables"
    gene_dir.mkdir(parents=True, exist_ok=True)

    row: dict[str, Any] = {
        "Molecule": name,
        "L1000FWD_hits": 0,
        "L1000FWD_pert_ids": "NOT_FOUND",
        "L1000FWD_names": "NOT_FOUND",
        "pert_id_used": "NOT_FOUND",
        "L1000FWD_num_signatures": 0,
        "L1000FWD_cell_lines": "NOT_FOUND",
        "L1000FWD_top_up_genes": "NOT_FOUND",
        "L1000FWD_top_down_genes": "NOT_FOUND",
        "SigCom_search_term": name,
        "SigCom_num_signatures": 0,
        "SigCom_cell_lines": "NOT_FOUND",
        "SigCom_doses": "NOT_FOUND",
        "SigCom_times": "NOT_FOUND",
        "SigCom_top_20_UP_genes": "NOT_FOUND",
        "SigCom_top_20_DOWN_genes": "NOT_FOUND",
        "SigCom_data_url": "NOT_FOUND",
        "SigCom_gene_table_file": "NOT_FOUND",
    }

    print(f"Processing LINCS: {name}")

    synonyms = l1000fwd_synonyms(name)
    if synonyms:
        dump_json(synonyms, mol_raw_dir / "l1000fwd_synonyms.json")

    pert_ids = sorted({str(x.get("pert_id")) for x in synonyms if isinstance(x, dict) and x.get("pert_id")})
    lincs_names = sorted({str(x.get("Name")) for x in synonyms if isinstance(x, dict) and x.get("Name")})

    row["L1000FWD_hits"] = len(synonyms)
    row["L1000FWD_pert_ids"] = normalize_json(pert_ids)
    row["L1000FWD_names"] = normalize_json(lincs_names)

    if pert_ids:
        pert_id = pert_ids[0]
        row["pert_id_used"] = pert_id
        sig_data = l1000fwd_signatures(pert_id)
        top_data = l1000fwd_topgenes(pert_id)
        dump_json(sig_data, mol_raw_dir / "l1000fwd_signatures.json")
        dump_json(top_data, mol_raw_dir / "l1000fwd_top_genes.json")
        n_sigs, cells = summarize_l1000_signatures(sig_data)
        row["L1000FWD_num_signatures"] = n_sigs
        row["L1000FWD_cell_lines"] = normalize_json(cells)
        row["L1000FWD_top_up_genes"] = normalize_json(top_data.get("up", [])[:20] if isinstance(top_data, dict) else [])
        row["L1000FWD_top_down_genes"] = normalize_json(top_data.get("down", [])[:20] if isinstance(top_data, dict) else [])

    sigcom_term = lincs_names[0] if lincs_names else name
    row["SigCom_search_term"] = sigcom_term
    sigcom_sigs = sigcom_find_signatures(sigcom_term)
    if sigcom_sigs:
        dump_json(sigcom_sigs, mol_raw_dir / "sigcom_signatures.json")

    row["SigCom_num_signatures"] = len(sigcom_sigs)
    if sigcom_sigs:
        cell_lines, doses, times = set(), set(), set()
        data_url = None
        for sig in sigcom_sigs:
            meta = sig.get("meta", {}) if isinstance(sig, dict) else {}
            if meta.get("cell_line"):
                cell_lines.add(str(meta["cell_line"]))
            if meta.get("pert_dose"):
                doses.add(str(meta["pert_dose"]))
            if meta.get("pert_time"):
                times.add(str(meta["pert_time"]))
            if not data_url and meta.get("persistent_id"):
                data_url = str(meta["persistent_id"])
        row["SigCom_cell_lines"] = ", ".join(sorted(cell_lines)) if cell_lines else "NOT_FOUND"
        row["SigCom_doses"] = ", ".join(sorted(doses)) if doses else "NOT_FOUND"
        row["SigCom_times"] = ", ".join(sorted(times)) if times else "NOT_FOUND"
        row["SigCom_data_url"] = data_url or "NOT_FOUND"

        if data_url:
            gene_df = sigcom_download_gene_table(data_url)
            if gene_df is not None and not gene_df.empty:
                gene_file = gene_dir / f"{safe}_sigcom_genes.xlsx"
                gene_df.to_excel(gene_file, index=False)
                up, down = top_genes_from_table(gene_df, n=20)
                row["SigCom_top_20_UP_genes"] = ", ".join(up) if up else "NOT_FOUND"
                row["SigCom_top_20_DOWN_genes"] = ", ".join(down) if down else "NOT_FOUND"
                row["SigCom_gene_table_file"] = str(gene_file)

    return row


def make_zip(output_dir: Path, zip_name: str = "lincs_results.zip") -> Path:
    zip_path = output_dir / zip_name
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in output_dir.rglob("*"):
            if path.is_file() and path != zip_path:
                zf.write(path, arcname=path.relative_to(output_dir))
    return zip_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich PubChem compounds with LINCS/L1000FWD/SigCom-LINCS signatures.")
    parser.add_argument("--input", required=True, help="Input Excel/CSV, usually PubChem output from 01_pubchem_lookup.py")
    parser.add_argument("--output", required=True, help="Output directory")
    parser.add_argument("--name-column", default=None, help="Molecule-name column. Auto-detected if omitted.")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    df = read_table(input_path)
    name_col = pick_name_column(df, args.name_column)
    names = unique_names(df, name_col)
    print(f"Loaded {len(names)} unique molecule names from column '{name_col}'.")

    rows = []
    for i, name in enumerate(names, 1):
        print(f"[{i}/{len(names)}]")
        rows.append(process_molecule(name, output_dir))

    out = pd.DataFrame(rows)
    xlsx = output_dir / "lincs_molecule_summary.xlsx"
    csv = output_dir / "lincs_molecule_summary.csv"
    out.to_excel(xlsx, index=False)
    out.to_csv(csv, index=False)

    zip_path = make_zip(output_dir)
    print("Done.")
    print(f"Summary Excel: {xlsx}")
    print(f"Summary CSV: {csv}")
    print(f"ZIP: {zip_path}")


if __name__ == "__main__":
    main()
