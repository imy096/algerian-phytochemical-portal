#!/usr/bin/env python3
"""
Stage 1D - PDF phytochemical extraction.

This is a separate upstream workflow, not Stage 2 database enrichment.

Inputs:
  --plant-doi: Excel with columns Plant, DOI
  --pdf-mapping: Excel with DOI and PDF number column
  --pdf-folder: folder containing numbered PDFs, e.g. 1.pdf, 2.pdf
  --reference-db: optional CSV, preferably with column Phytochemical

Outputs:
  pdf_phytochemical_RAW_ALL.xlsx
  pdf_phytochemical_CLEAN_UNIQUE.xlsx
  pdf_phytochemical_CLEAN_UNIQUE.csv
  pdf_phytochemical_SUMMARY.xlsx
  pdf_phytochemical_extraction_results.zip
"""

from __future__ import annotations
import argparse, re, zipfile
from pathlib import Path
import pandas as pd

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import fitz
except ImportError:
    fitz = None

BLOCKLIST = [
    "ethanol", "etoh", "meoh", "hexane", "chloroform", "solvent", "water",
    "extract", "page", "fig", "figure", "table", "doi", "abstract",
    "introduction", "method", "result", "discussion", "journal", "article",
    "received", "accepted", "available", "online", "volume", "issue",
]
KEEP_ALWAYS = [
    "flavonoid", "phenolic", "anthraquinone", "terpenoid", "alkaloid",
    "quercetin", "luteolin", "kaempferol", "rutin", "apigenin",
    "myricetin", "rosmarinic acid", "caffeic acid", "ferulic acid",
    "chlorogenic acid", "gallic acid", "linalool", "caryophyllene",
]
CHEM_SUFFIXES = [
    "acid", "ol", "one", "ene", "ane", "in", "yl", "oside", "sterol",
    "quinone", "flavonoid", "phenol", "terpen", "alkaloid", "glycoside",
    "lignan",
]

def clean_name(x: str) -> str:
    return re.sub(r"[^\w\s\-\u03b1-\u03c9\u00b5]", "", str(x).strip()).lower()

def load_reference_db(path: Path | None) -> set[str]:
    refs = set(clean_name(x) for x in KEEP_ALWAYS)
    if path and path.exists():
        df = pd.read_csv(path, low_memory=False)
        col = "Phytochemical" if "Phytochemical" in df.columns else df.columns[0]
        for value in df[col].dropna().astype(str):
            c = clean_name(value)
            if 4 <= len(c) <= 70:
                refs.add(c); refs.add(c.replace(" ", "")); refs.add(re.sub(r"[-\s_]", "", c))
    return refs

def is_real_molecule(name: str, refs: set[str]) -> bool:
    c = clean_name(name)
    if len(c) < 4 or len(c) > 70 or c.isdigit():
        return False
    if any(b in c for b in BLOCKLIST):
        return False
    variants = [c, c.replace(" ", ""), re.sub(r"[-\s_]", "", c)]
    if any(v in refs for v in variants):
        return True
    return any(suffix in c for suffix in CHEM_SUFFIXES)

def extract_pdf_text(pdf_path: Path, max_pages: int) -> str:
    pages = []
    if pdfplumber is not None:
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages[:max_pages]:
                    text = page.extract_text(x_tolerance=3, y_tolerance=3)
                    if text and len(text.strip()) > 40:
                        pages.append(text)
        except Exception:
            pass
    if not pages and fitz is not None:
        try:
            doc = fitz.open(pdf_path)
            for i in range(min(len(doc), max_pages)):
                text = doc[i].get_text()
                if text and len(text.strip()) > 40:
                    pages.append(text)
            doc.close()
        except Exception:
            pass
    return "\n".join(pages)

def candidate_molecules(text: str) -> list[str]:
    suffix_group = "|".join(re.escape(s) for s in CHEM_SUFFIXES)
    patterns = [
        rf"\b[A-Z][A-Za-zα-ωΑ-Ωβγδµμ\-\s]{{2,}}(?:{suffix_group})s?\b",
        r"\b(?:α|β|γ|δ|alpha|beta|gamma|delta)[-\s]?[A-Za-z0-9\-]+(?:acid|ol|one|ene|in|yl)?\b",
        r"\b[A-Za-z]+(?:-[0-9]+)?-O-[A-Za-z]+(?:oside|glycoside)\b",
    ]
    out = []
    for rx in patterns:
        out.extend(re.findall(rx, text, flags=re.IGNORECASE))
    return sorted(set(x.strip(" .;,()[]") for x in out if x.strip()))

def associate(plant: str, doi: str, pdf_number: str, text: str, refs: set[str], min_confidence: float) -> list[dict]:
    plant_words = clean_name(plant).split()
    sentences = re.split(r"(?<=[.!?;])\s+", text)
    candidates = [m for m in candidate_molecules(text) if is_real_molecule(m, refs)]
    evidence_words = ["contain", "composition", "isolated", "identified", "detected", "constituent", "metabolite", "rich", "present", "yield"]
    rows = []
    for i, sentence in enumerate(sentences):
        sentence_l = sentence.lower()
        if not all(w in sentence_l for w in plant_words):
            continue
        context = " ".join(sentences[max(0, i - 5): min(len(sentences), i + 6)])
        context_l = context.lower()
        for mol in candidates:
            if mol.lower() in context_l:
                evidence = any(w in context_l for w in evidence_words)
                confidence = 0.85 if evidence else 0.65
                if confidence >= min_confidence:
                    rows.append({
                        "Plant": plant, "DOI": doi, "PDF_Number": pdf_number, "Molecule": mol,
                        "Context": context[:500], "Confidence": confidence,
                        "Evidence_Strength": evidence, "Sentence_Index": i,
                    })
    return rows

def run_pipeline(plant_doi: Path, pdf_mapping: Path, pdf_folder: Path, output: Path, reference_db: Path | None, max_pages: int, min_confidence: float) -> None:
    output.mkdir(parents=True, exist_ok=True)
    plant_df = pd.read_excel(plant_doi)
    map_df = pd.read_excel(pdf_mapping)
    map_df.columns = [str(c).strip() for c in map_df.columns]
    if "Plant" not in plant_df.columns or "DOI" not in plant_df.columns:
        raise ValueError("plant_doi file must contain columns: Plant, DOI")
    doi_col = next((c for c in map_df.columns if c.lower() == "doi"), None)
    number_col = next((c for c in map_df.columns if "number" in c.lower() or "pdf" in c.lower()), None)
    if doi_col is None or number_col is None:
        raise ValueError("PDF mapping file must contain DOI and PDF number columns")
    mapping = dict(zip(map_df[doi_col].astype(str), map_df[number_col].astype(str)))
    refs = load_reference_db(reference_db)
    all_rows = []
    for _, row in plant_df.iterrows():
        plant = str(row["Plant"]).strip()
        doi = str(row["DOI"]).strip()
        if doi not in mapping:
            continue
        pdf_number = str(mapping[doi]).replace(".0", "")
        pdf_path = pdf_folder / f"{pdf_number}.pdf"
        if not pdf_path.exists():
            continue
        print(f"Processing {plant}: {pdf_path.name}")
        text = extract_pdf_text(pdf_path, max_pages=max_pages)
        if text:
            all_rows.extend(associate(plant, doi, pdf_number, text, refs, min_confidence))
    raw = pd.DataFrame(all_rows)
    if raw.empty:
        raw.to_excel(output / "pdf_phytochemical_RAW_ALL.xlsx", index=False)
        print("No associations found.")
        return
    clean = raw.drop_duplicates(subset=["Plant", "Molecule", "DOI"]).sort_values(["Plant", "Confidence"], ascending=[True, False])
    summary = clean.groupby("Plant").agg(Unique_Chems=("Molecule", "nunique"), Avg_Confidence=("Confidence", "mean"), Total_Raw=("Molecule", "count")).round(3).reset_index()
    raw.to_excel(output / "pdf_phytochemical_RAW_ALL.xlsx", index=False)
    clean.to_excel(output / "pdf_phytochemical_CLEAN_UNIQUE.xlsx", index=False)
    clean.to_csv(output / "pdf_phytochemical_CLEAN_UNIQUE.csv", index=False)
    summary.to_excel(output / "pdf_phytochemical_SUMMARY.xlsx", index=False)
    zip_path = output / "pdf_phytochemical_extraction_results.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for path in output.glob("pdf_phytochemical_*"):
            if path.is_file() and path != zip_path:
                z.write(path, arcname=path.name)
    print(f"DONE. Output folder: {output}")

def main() -> None:
    parser = argparse.ArgumentParser(description="Extract plant-phytochemical associations from PDFs.")
    parser.add_argument("--plant-doi", required=True, type=Path)
    parser.add_argument("--pdf-mapping", required=True, type=Path)
    parser.add_argument("--pdf-folder", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--reference-db", default=None, type=Path)
    parser.add_argument("--max-pages", default=100, type=int)
    parser.add_argument("--min-confidence", default=0.65, type=float)
    args = parser.parse_args()
    run_pipeline(args.plant_doi, args.pdf_mapping, args.pdf_folder, args.output, args.reference_db, args.max_pages, args.min_confidence)

if __name__ == "__main__":
    main()
