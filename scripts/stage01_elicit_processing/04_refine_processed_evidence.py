#!/usr/bin/env python3
"""Refine consolidated evidence text.

Input: consolidated one-row plant Excel files.
Output: refined one-row plant Excel files + refinement_summary.csv.

This script removes common filler phrases and deduplicates semicolon-separated statements
while preserving superscript reference indices.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd
from rapidfuzz import fuzz

MIN_LEN = 8
CHEMICAL_COLUMNS = {
    "chemical composition and constituents of plant",
    "metabolites and metabolomics",
}
_SUP_TO_NORMAL = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹", "0123456789")
_NORMAL_TO_SUP = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")
_RE_SUP = re.compile(r"[⁰¹²³⁴⁵⁶⁷⁸⁹]+(?:\s*[,;]\s*[⁰¹²³⁴⁵⁶⁷⁸⁹]+)*")
_RE_BRACKET = re.compile(r"\[(\d+(?:\s*[,;]\s*\d+)*)\]")
FILLERS = [
    r"\bit is (?:reported|noted|shown|known) that\b",
    r"\bthis study (?:shows|showed|reports|reported|discusses|examines)\b",
    r"\baccording to (?:the )?(?:literature|studies|reports)\b",
    r"\bnot mentioned\b[^.;]*[.;]?",
    r"\bnot specified\b[^.;]*[.;]?",
    r"\bno information\b[^.;]*[.;]?",
]
FILLER_PATTERNS = [re.compile(p, re.I) for p in FILLERS]


def parse_refs(text: str) -> tuple[str, set[int]]:
    refs: set[int] = set()
    for m in _RE_BRACKET.finditer(text):
        refs.update(int(n) for n in re.findall(r"\d+", m.group(1)))
    text = _RE_BRACKET.sub("", text)
    for m in _RE_SUP.finditer(text):
        refs.update(int(n) for n in re.findall(r"\d+", m.group(0).translate(_SUP_TO_NORMAL)))
    text = _RE_SUP.sub("", text)
    return text.strip(), refs


def format_refs(refs: set[int]) -> str:
    return ",".join(str(n).translate(_NORMAL_TO_SUP) for n in sorted(refs)) if refs else ""


def clean_statement(text: str) -> str:
    text = str(text).strip()
    for pat in FILLER_PATTERNS:
        text = pat.sub("", text)
    text = re.sub(r"\s+", " ", text).strip(" ;,.")
    return text


def split_statements(text: str) -> list[str]:
    return [x.strip() for x in re.split(r"\s*;\s*", str(text)) if len(x.strip()) >= MIN_LEN]


def normalize_key(text: str) -> str:
    text, _ = parse_refs(text)
    text = clean_statement(text).lower()
    text = re.sub(r"[^a-z0-9µμ%]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def refine_cell(value: object, chemical: bool = False) -> str:
    if not isinstance(value, str) or len(value.strip()) < MIN_LEN:
        return "" if pd.isna(value) else str(value)
    items = []
    for raw in split_statements(value):
        txt, refs = parse_refs(raw)
        txt = clean_statement(txt)
        if len(txt) < MIN_LEN:
            continue
        items.append([txt, refs])
    if not items:
        return ""

    groups: list[list[int]] = []
    used = set()
    keys = [normalize_key(t) for t, _ in items]
    threshold = 90 if chemical else 82
    for i, key_i in enumerate(keys):
        if i in used:
            continue
        group = [i]
        used.add(i)
        for j in range(i + 1, len(items)):
            if j in used:
                continue
            score = fuzz.token_sort_ratio(key_i, keys[j])
            if score >= threshold or key_i == keys[j]:
                group.append(j); used.add(j)
        groups.append(group)

    out = []
    for group in groups:
        texts = [items[i][0] for i in group]
        refs: set[int] = set()
        for i in group:
            refs |= items[i][1]
        canonical = max(texts, key=len)
        out.append(canonical + format_refs(refs))
    return "; ".join(out)


def process_file(fp: Path, out_fp: Path) -> dict:
    df = pd.read_excel(fp)
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].apply(lambda x: refine_cell(x, col in CHEMICAL_COLUMNS))
    df.to_excel(out_fp, index=False)
    return {"file": fp.name, "output_file": out_fp.name, "rows": len(df)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    inp, out = Path(args.input), Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for fp in sorted(inp.glob("*.xls*")):
        try:
            rows.append(process_file(fp, out / fp.with_suffix(".xlsx").name))
        except Exception as e:
            rows.append({"file": fp.name, "error": str(e)})
    pd.DataFrame(rows).to_csv(out / "refinement_summary.csv", index=False)
    print(f"Refined {len(rows)} files into {out}")


if __name__ == "__main__":
    main()
