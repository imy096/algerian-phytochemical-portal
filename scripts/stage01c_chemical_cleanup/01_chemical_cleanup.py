import pandas as pd
import re
from pathlib import Path

# ---------- CONFIG ----------
FAMILY_KEYWORDS = [
    "phenol","flavonoid","terpenoid","terpene","alkaloid",
    "glycoside","fatty acid","steroid","tannin","saponin"
]

# ---------- HELPERS ----------
def clean(x):
    if pd.isna(x): return ""
    return str(x).strip()

def is_family(name):
    n = name.lower()
    return any(k in n for k in FAMILY_KEYWORDS)

def split_chemicals(text):
    if not text: return []
    parts = re.split(r"[;,]", text)
    return [p.strip() for p in parts if p.strip()]

# ---------- MAIN ----------
def run(input_file, output_dir, missing_file=None):

    df = pd.read_excel(input_file)

    rows = []

    for _, row in df.iterrows():
        plant = clean(row.get("Source_Excel"))

        chem_text = " ".join([
            clean(row.get("chemical composition and constituents of plant")),
            clean(row.get("metabolites and metabolomics"))
        ])

        chemicals = split_chemicals(chem_text)

        for c in chemicals:
            rows.append({
                "Plant": plant,
                "Compound": c,
                "Type": "family" if is_family(c) else "molecule"
            })

    out = pd.DataFrame(rows).drop_duplicates()

    molecules = out[out["Type"]=="molecule"]
    families = out[out["Type"]=="family"]

    Path(output_dir).mkdir(parents=True, exist_ok=True)

    out.to_csv(f"{output_dir}/all_compounds.csv", index=False)
    molecules.to_csv(f"{output_dir}/molecules_only.csv", index=False)
    families.to_csv(f"{output_dir}/families_only.csv", index=False)

    print("DONE")

# ---------- RUN ----------
if __name__ == "__main__":
    run(
        "data/stage01c_chemical_cleanup/raw/merged_excels.xlsx",
        "data/stage01c_chemical_cleanup/outputs"
    )