#!/usr/bin/env python3
"""
Stage 2.01 - PubChem lookup from Stage 1 compound names.

Input:
  - Excel/CSV produced by Stage 1 compound extraction.
  - Default expected input: data/stage01_elicit_processing/outputs/stage05_compounds/all_compounds.xlsx
  - Expected compound-name column: Compound. The script also accepts molecule_name,
    Molecule, Molecules, compound_name, query_name, Name.

Output:
  - pubchem_compound_identifiers.xlsx
  - pubchem_found.xlsx
  - pubchem_not_found.xlsx

This script merges the original PubChem lookup, smart name-variation fallback,
and PubChem identifier checking logic into one repository-ready script.
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.parse
from pathlib import Path
from typing import Any

import pandas as pd
import requests

PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
AUTOCOMPLETE = "https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound"

ALL_PROPERTIES = [
    "MolecularFormula", "MolecularWeight", "CanonicalSMILES", "IsomericSMILES",
    "InChI", "InChIKey", "IUPACName", "XLogP", "ExactMass", "MonoisotopicMass",
    "TPSA", "Complexity", "Charge", "HBondDonorCount", "HBondAcceptorCount",
    "RotatableBondCount", "HeavyAtomCount", "IsotopeAtomCount", "AtomStereoCount",
    "DefinedAtomStereoCount", "UndefinedAtomStereoCount", "BondStereoCount",
    "DefinedBondStereoCount", "UndefinedBondStereoCount", "CovalentUnitCount",
    "Volume3D", "XStericQuadrupole3D", "YStericQuadrupole3D", "ZStericQuadrupole3D",
    "FeatureCount3D", "FeatureAcceptorCount3D", "FeatureDonorCount3D",
    "FeatureAnionCount3D", "FeatureCationCount3D", "FeatureRingCount3D",
    "FeatureHydrophobeCount3D", "ConformerModelRMSD3D", "EffectiveRotorCount3D",
    "ConformerCount3D",
]

NAME_COLUMNS = ["Compound", "compound", "molecule_name", "Molecule", "Molecules", "compound_name", "query_name", "Name", "name"]


class RateLimitedSession:
    def __init__(self, rate_limit: float = 0.4, timeout: int = 30):
        self.session = requests.Session()
        self.rate_limit = rate_limit
        self.timeout = timeout
        self.last_call = 0.0

    def get(self, url: str, **kwargs) -> requests.Response:
        wait = self.rate_limit - (time.time() - self.last_call)
        if wait > 0:
            time.sleep(wait)
        self.last_call = time.time()
        kwargs.setdefault("timeout", self.timeout)
        return self.session.get(url, **kwargs)


HTTP = RateLimitedSession()


def load_table(path: Path) -> pd.DataFrame:
    if path.suffix.lower() in [".xlsx", ".xls"]:
        return pd.read_excel(path)
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path)
    raise ValueError(f"Unsupported input file type: {path}")


def detect_name_column(df: pd.DataFrame, requested: str | None = None) -> str:
    if requested:
        if requested not in df.columns:
            raise ValueError(f"Requested name column '{requested}' not found. Available: {list(df.columns)}")
        return requested
    for col in NAME_COLUMNS:
        if col in df.columns:
            return col
    raise ValueError(f"No compound-name column found. Tried {NAME_COLUMNS}. Available: {list(df.columns)}")


def normalize_name(name: Any) -> str:
    if pd.isna(name):
        return ""
    name = str(name).strip()
    name = re.sub(r"\s+", " ", name)
    return name


def extract_core_name(name: str) -> str:
    core = re.sub(
        r"[-\s]?\d*-?O?-?(rhamnoside|glucoside|galactoside|arabinoside|xyloside).*",
        "",
        name,
        flags=re.IGNORECASE,
    )
    core = re.sub(r"^\d+[',]*-?", "", core)
    return core.strip("-").strip()


def generate_name_variations(name: str) -> list[str]:
    vars_ = [
        name,
        re.sub(r"-(\d+)-O-", r" \1''-O-", name),
        re.sub(r"-(\d+)-O-", r"-\1''-O-", name),
        name.replace("-rhamnoside", "rhamnoside"),
        name.replace("--", "-"),
        name.lower(),
        name.replace("-2-O-", " 2''-O-"),
        name.replace("-", " "),
        name.replace("-O-", "-o-"),
        re.sub(r"-\d+-O-", "-O-", name),
        name.replace("-rhamnoside", "-alpha-L-rhamnoside"),
        name.replace("-O-rhamnoside", "-O-alpha-L-rhamnoside"),
        extract_core_name(name),
    ]
    seen, unique = set(), []
    for v in vars_:
        v = normalize_name(v)
        if v and v not in seen:
            seen.add(v)
            unique.append(v)
    return unique


def pubchem_cids_by_name(name: str) -> list[int]:
    url = f"{PUBCHEM}/compound/name/{requests.utils.quote(name)}/cids/JSON"
    try:
        r = HTTP.get(url)
        if r.status_code != 200:
            return []
        return r.json().get("IdentifierList", {}).get("CID", []) or []
    except Exception:
        return []


def autocomplete_suggestions(partial: str, limit: int = 10) -> list[str]:
    if not partial:
        return []
    url = f"{AUTOCOMPLETE}/{urllib.parse.quote(partial, safe='')}/json?limit={limit}"
    try:
        r = HTTP.get(url)
        if r.status_code == 200:
            return r.json().get("dictionary_terms", {}).get("compound", []) or []
    except Exception:
        pass
    return []


def resolve_name_to_cid(name: str) -> tuple[int | None, str | None, str, list[str]]:
    for candidate in generate_name_variations(name):
        cids = pubchem_cids_by_name(candidate)
        if cids:
            return int(cids[0]), candidate, "name_or_variation", []
    suggestions = autocomplete_suggestions(extract_core_name(name))
    for suggestion in suggestions[:5]:
        cids = pubchem_cids_by_name(suggestion)
        if cids:
            return int(cids[0]), suggestion, "autocomplete_suggestion", suggestions
    return None, None, "not_found", suggestions


def pubchem_properties_by_cid(cid: int | str) -> dict[str, Any]:
    fields = ",".join(ALL_PROPERTIES)
    url = f"{PUBCHEM}/compound/cid/{cid}/property/{fields}/JSON"
    try:
        r = HTTP.get(url)
        if r.status_code != 200:
            return {}
        props = r.json().get("PropertyTable", {}).get("Properties", [])
        return props[0] if props else {}
    except Exception:
        return {}


def pubchem_synonyms_by_cid(cid: int | str) -> list[str]:
    url = f"{PUBCHEM}/compound/cid/{cid}/synonyms/JSON"
    try:
        r = HTTP.get(url)
        if r.status_code != 200:
            return []
        return r.json().get("InformationList", {}).get("Information", [{}])[0].get("Synonym", []) or []
    except Exception:
        return []


def run(input_file: Path, output_dir: Path, name_column: str | None = None) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    df = load_table(input_file)
    col = detect_name_column(df, name_column)

    names = [normalize_name(x) for x in df[col].dropna().tolist()]
    names = [n for n in names if n]
    names = list(dict.fromkeys(names))
    print(f"Loaded {len(names)} unique compound names from {input_file} column '{col}'.")

    rows = []
    for i, name in enumerate(names, 1):
        print(f"[{i}/{len(names)}] PubChem lookup: {name}")
        cid, matched_name, method, suggestions = resolve_name_to_cid(name)
        base = {
            "queryname": name,
            "matched_name": matched_name or "NOT_FOUND",
            "match_method": method,
            "CID": cid,
            "autocomplete_suggestions": json.dumps(suggestions, ensure_ascii=False) if suggestions else "",
        }
        if cid:
            props = pubchem_properties_by_cid(cid)
            syns = pubchem_synonyms_by_cid(cid)
            base.update(props)
            base["synonyms"] = json.dumps(syns, ensure_ascii=False)
            base["match_status"] = "FOUND"
        else:
            base["match_status"] = "NOT_FOUND"
        rows.append(base)

    out = pd.DataFrame(rows)
    main_file = output_dir / "pubchem_compound_identifiers.xlsx"
    out.to_excel(main_file, index=False)
    out[out["match_status"] == "FOUND"].to_excel(output_dir / "pubchem_found.xlsx", index=False)
    out[out["match_status"] != "FOUND"].to_excel(output_dir / "pubchem_not_found.xlsx", index=False)
    print(f"Done. Main output: {main_file}")


def main() -> None:
    parser = argparse.ArgumentParser(description="PubChem lookup from Stage 1 compound names.")
    parser.add_argument("--input", required=True, help="Stage 1 all_compounds.xlsx or CSV.")
    parser.add_argument("--output", default="data/stage02_compound_enrichment/pubchem", help="Output directory.")
    parser.add_argument("--name-column", default=None, help="Compound name column. Auto-detected if omitted.")
    args = parser.parse_args()
    run(Path(args.input), Path(args.output), args.name_column)


if __name__ == "__main__":
    main()
