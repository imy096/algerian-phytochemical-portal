from pathlib import Path
from typing import Dict, List, Optional
import math

import pandas as pd
from tqdm import tqdm
from supabase import create_client, Client

from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATA_DIR, BATCH_SIZE


FILE_TABLE_MAP: Dict[str, str] = {
    "plant_taxon.csv": "plant_taxon",
    "plants.csv": "plant_taxon",

    "compound.csv": "compound",
    "compounds.csv": "compound",

    "plant_compound.csv": "plant_compound",
    "plant_compounds.csv": "plant_compound",

    "plant_attribute_evidence.csv": "plant_attribute_evidence",
    "genus_attribute_evidence.csv": "genus_attribute_evidence",

    "compound_np_classification.csv": "compound_np_classification",
    "compound_np_classification_rows.csv": "compound_np_classification",

    "metabolite_family_reference_knowledge.csv": "metabolite_family_reference_knowledge",
    "compound_metabolite_family_link.csv": "compound_metabolite_family_link",

    "compound_chembl_activity.csv": "compound_chembl_activity",
    "compound_target_interactions.csv": "compound_target_interactions",
    "compound_kegg_link.csv": "compound_kegg_link",
    "compound_toxicity.csv": "compound_toxicity",
    "compound_structure_files.csv": "compound_structure_files",
    "compound_nmr.csv": "compound_nmr",

    "lincs_compound_map.csv": "lincs_compound_map",
    "lincs_signature_long.csv": "lincs_signature_long",

    "geo_genus_mentions.csv": "geo_genus_mentions",
    "geo_molecule_mentions.csv": "geo_molecule_mentions",

    "reference.csv": "reference",
    "publication.csv": "publication",
    "publications.csv": "publication",

    "collaboration_submissions.csv": "collaboration_submissions",
    "submission_files.csv": "submission_files",
    "submission_parsed_rows.csv": "submission_parsed_rows",
    "submission_validation_reports.csv": "submission_validation_reports",
    "submission_structured_rows.csv": "submission_structured_rows",
}


IMPORT_ORDER: List[str] = [
    "plant_taxon.csv",
    "plants.csv",

    "compound.csv",
    "compounds.csv",

    "plant_compound.csv",
    "plant_compounds.csv",

    "compound_np_classification.csv",
    "compound_np_classification_rows.csv",
    "compound_chembl_activity.csv",
    "compound_kegg_link.csv",
    "compound_target_interactions.csv",
    "compound_toxicity.csv",
    "compound_structure_files.csv",
    "compound_nmr.csv",

    "lincs_compound_map.csv",
    "lincs_signature_long.csv",
    "geo_genus_mentions.csv",
    "geo_molecule_mentions.csv",

    "plant_attribute_evidence.csv",
    "genus_attribute_evidence.csv",
    "metabolite_family_reference_knowledge.csv",
    "compound_metabolite_family_link.csv",

    "reference.csv",
    "publication.csv",
    "publications.csv",

    "collaboration_submissions.csv",
    "submission_files.csv",
    "submission_parsed_rows.csv",
    "submission_validation_reports.csv",
    "submission_structured_rows.csv",
]


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def clean_value(value):
    if value is None:
        return None

    if isinstance(value, float):
        if math.isnan(value):
            return None
        return value

    if pd.isna(value):
        return None

    text = str(value).strip()

    if text.lower() in {"", "nan", "none", "null", "na", "n/a"}:
        return None

    return value


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df.columns = [
        str(col).strip().replace(" ", "_").replace("-", "_").lower()
        for col in df.columns
    ]

    for col in df.columns:
        df[col] = df[col].map(clean_value)

    return df


def read_csv(path: Path) -> pd.DataFrame:
    try:
        return pd.read_csv(path, encoding="utf-8")
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="latin1")


def insert_batches(
    supabase: Client,
    table_name: str,
    records: List[dict],
    batch_size: int = BATCH_SIZE,
):
    if not records:
        print(f"[SKIP] {table_name}: no records")
        return

    for start in tqdm(range(0, len(records), batch_size), desc=f"Import {table_name}"):
        batch = records[start : start + batch_size]
        supabase.table(table_name).insert(batch).execute()


def import_file(supabase: Client, csv_path: Path, table_name: str):
    print(f"\n[READ] {csv_path.name} -> {table_name}")

    df = read_csv(csv_path)
    df = clean_dataframe(df)

    records = df.to_dict(orient="records")

    print(f"[INFO] rows: {len(records)}")
    insert_batches(supabase, table_name, records)


def find_file(filename: str) -> Optional[Path]:
    direct = DATA_DIR / filename
    if direct.exists():
        return direct

    matches = list(DATA_DIR.rglob(filename))
    if matches:
        return matches[0]

    return None


def main():
    print("Stage 05 Database Import")
    print(f"Data directory: {DATA_DIR}")

    supabase = get_supabase()

    imported_files = set()

    for filename in IMPORT_ORDER:
        if filename in imported_files:
            continue

        table_name = FILE_TABLE_MAP.get(filename)
        csv_path = find_file(filename)

        if not table_name or not csv_path:
            continue

        import_file(supabase, csv_path, table_name)
        imported_files.add(filename)

    print("\n[DONE] Stage 05 import completed.")
    print("After import, rerun schema.sql view section if needed.")


if __name__ == "__main__":
    main()