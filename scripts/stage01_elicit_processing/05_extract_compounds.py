#!/usr/bin/env python3
"""Extract clean compound names from refined plant evidence Excel files.

Input: one-row plant Excel files after refinement.
Output:
  all_compounds.xlsx
  individual/<plant>_compounds.xlsx
  no_compounds_found.csv
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

TARGET_COLS = [
    "chemical composition and constituents of plant",
    "metabolites and metabolomics",
]
SUP_MAP = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹", "0123456789")

BLOCK_NOISE = [
    "not mentioned", "does not provide", "no information", "not explicitly", "not directly relevant",
    "abstract is too general", "not specified", "not reported", "no compounds were", "no data available",
]
BAD_CONTAINS = [
    "method", "spectroscop", "chromatograph", "spectrometry", "gc-ms", "hplc", "lc-ms", "nmr",
    "activity", "cytotoxic", "antimicrobial", "antioxidant", "antibacterial", "antifungal",
    "ic50", "mic ", "mg/g", "mg/ml", "µg", "μg", "total phenolic", "total flavonoid",
    "the study", "the paper", "reported that", "showed that", "revealed that", "identified by",
]
BAD_STARTS = [
    "the ", "this ", "these ", "a ", "an ", "and ", "or ", "with ", "from ", "for ",
    "major ", "minor ", "total ", "chemical ", "phytochemical ", "metabolomics",
]
LABEL_PREFIXES = re.compile(
    r"^(Metabolites|Metabolomics|Phytochemicals|Specific compounds|Secondary metabolites|"
    r"Chemical composition|Sulfur compounds|Major compounds include|Major compounds included|Major compounds|"
    r"Other compounds|Essential oils|Carbohydrates|New compounds|Fatty acids|Minerals|Sugars|"
    r"Phenolic compounds|Phenolic acids|Terpenoids|Organic acids|Amino acids|Saccharides|"
    r"Leaves|Cones|Needles|Twigs|Flowers|Seeds|Roots|Stems|Bark|Bulb|Aerial parts|Wood|"
    r"Sterols|Tocopherols|Polyphenols)\s*:\s*",
    re.I,
)


def sup2num(s: str) -> str:
    return str(s).translate(SUP_MAP)


def strip_sup(s: object) -> str:
    return re.sub(r"[⁰¹²³⁴⁵⁶⁷⁸⁹]+", "", str(s))


def build_doi_map(doi_cell: object) -> dict[str, str]:
    if pd.isna(doi_cell):
        return {}
    doi_map = {}
    for entry in re.split(r";\s*", str(doi_cell)):
        entry = entry.strip()
        if not entry:
            continue
        m = re.search(r"([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*$", entry)
        if m:
            doi_map[sup2num(m.group(1))] = entry[:m.start()].strip()
        else:
            m2 = re.search(r"^([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s+(.+)$", entry)
            if m2:
                doi_map[sup2num(m2.group(1))] = m2.group(2).strip()
    return doi_map


def get_trailing_index(text: str) -> str | None:
    m = re.search(r"([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*$", str(text).strip())
    return sup2num(m.group(1)) if m else None


def split_indexed_blocks(cell_text: object) -> list[tuple[str, str]]:
    if pd.isna(cell_text):
        return []
    text = str(cell_text).strip().replace("**", "")
    if not text:
        return []
    blocks, last_idx = [], "N/A"
    for part in re.split(r"(?<=[⁰¹²³⁴⁵⁶⁷⁸⁹]);\s*", text):
        part = part.strip()
        if not part:
            continue
        idx = get_trailing_index(part)
        if idx is None:
            indices = re.findall(r"[⁰¹²³⁴⁵⁶⁷⁸⁹]+", part)
            idx = sup2num(indices[-1]) if indices else last_idx
        last_idx = idx
        blocks.append((part, idx))
    return blocks


def block_is_noise(text: str) -> bool:
    low = text.lower().strip()
    return len(low) < 3 or any(p in low for p in BLOCK_NOISE)


def smart_comma_split(text: str) -> list[str]:
    protected = re.sub(r"(\d),\s*(\d)", r"\1♦\2", text)
    parts, current, depth = [], [], 0
    for ch in protected:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(depth - 1, 0)
        if ch == "," and depth == 0:
            parts.append("".join(current).strip().replace("♦", ",")); current = []
        else:
            current.append(ch)
    if current:
        parts.append("".join(current).strip().replace("♦", ","))
    if len(parts) <= 1:
        return [text]
    if any(p.rstrip().endswith("-") for p in parts) or sum(len(p) < 5 for p in parts) > len(parts) * 0.4:
        return [text]
    return [p for p in parts if len(p) >= 3]


def clean_compound(name: str) -> str:
    name = strip_sup(name)
    for _ in range(3):
        old = name
        name = LABEL_PREFIXES.sub("", name).strip()
        if name == old:
            break
    name = re.sub(r"\([^)]*?[\d.]+\s*[µμmngkL/%][^)]*\)", "", name)
    name = re.sub(r":\s*[\d.±]+\s*[%µμmngkL/·\-–\s]*[^,;)]*", "", name)
    name = re.sub(r"\s*=\s*[\d.±]+[^,;)]*", "", name)
    name = re.sub(r"\b[\d.±]+-?[\d.±]*\s*[%µμmngkL/·]+[A-Za-z/\s]*", "", name)
    name = re.sub(r"\b\d+\s*%", "", name)
    name = re.sub(r"\s+identified (by|using)\b.*$", "", name, flags=re.I)
    name = re.sub(r"\s+analyzed by\b.*$", "", name, flags=re.I)
    name = re.sub(r"\s+", " ", name).strip(" .,;:-–—*()")
    return name


def item_is_noise(text: str) -> bool:
    low = text.lower().strip()
    if len(low) < 4 or len(text) > 90:
        return True
    if any(low.startswith(p) for p in BAD_STARTS):
        return True
    if any(p in low for p in BAD_CONTAINS):
        return True
    if re.fullmatch(r"[\d.,± \-–%/]+", text):
        return True
    if re.match(r"^[\d.±]+", text):
        return True
    return False


def extract_from_block(block_text: str) -> list[str]:
    text = strip_sup(block_text).strip()
    if block_is_noise(text):
        return []
    items = []
    for item in re.split(r";\s*|\s+-\s+", text):
        items.extend(smart_comma_split(item.strip()))
    compounds = []
    for item in items:
        cleaned = clean_compound(item)
        if cleaned and not item_is_noise(cleaned):
            compounds.append(cleaned)
    return compounds


def process_file(fp: Path) -> pd.DataFrame:
    df = pd.read_excel(fp)
    rows = []
    for _, row in df.iterrows():
        doi_map = build_doi_map(row.get("DOI"))
        seen = set()
        for col in TARGET_COLS:
            if col not in row.index or pd.isna(row[col]):
                continue
            for block, ref_idx in split_indexed_blocks(row[col]):
                for compound in extract_from_block(block):
                    key = (compound.lower(), ref_idx)
                    if key in seen:
                        continue
                    seen.add(key)
                    rows.append({
                        "Plant Species": fp.stem,
                        "Compound": compound,
                        "Reference Index": ref_idx,
                        "DOI": doi_map.get(str(ref_idx), "N/A"),
                        "Source Column": col,
                        "Source File": fp.name,
                    })
    if not rows:
        return pd.DataFrame(columns=["Plant Species", "Compound", "Reference Index", "DOI", "Source Column", "Source File"])
    out = pd.DataFrame(rows)
    out["_norm"] = out["Compound"].str.lower().str.strip()
    out = out.drop_duplicates(subset=["Plant Species", "_norm", "Reference Index"]).drop(columns=["_norm"])
    return out.sort_values(["Plant Species", "Reference Index", "Compound"]).reset_index(drop=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    inp, out = Path(args.input), Path(args.output)
    individual = out / "individual"
    individual.mkdir(parents=True, exist_ok=True)
    all_dfs, empty = [], []
    for fp in sorted(inp.glob("*.xls*")):
        try:
            df = process_file(fp)
            if len(df):
                df.to_excel(individual / f"{fp.stem}_compounds.xlsx", index=False)
                all_dfs.append(df)
            else:
                empty.append(fp.name)
        except Exception as e:
            empty.append(f"{fp.name} :: ERROR: {e}")
    if all_dfs:
        pd.concat(all_dfs, ignore_index=True).to_excel(out / "all_compounds.xlsx", index=False)
    else:
        pd.DataFrame(columns=["Plant Species", "Compound", "Reference Index", "DOI", "Source Column", "Source File"]).to_excel(out / "all_compounds.xlsx", index=False)
    pd.DataFrame({"file": empty}).to_csv(out / "no_compounds_found.csv", index=False)
    print(f"Extracted compounds for {len(all_dfs)} files; {len(empty)} files had no compounds. Output: {out}")


if __name__ == "__main__":
    main()
