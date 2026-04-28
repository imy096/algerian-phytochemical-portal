from pathlib import Path
import logging
import pandas as pd

from etl.base_loader import BaseLoader

logger = logging.getLogger(__name__)


class CompoundLoader(BaseLoader):
    def load_master_molecules(self):
        logger.info("Loading master molecules")
        df = self.load_csv("stage5_database_ready/master_molecules.csv")

        if df.empty:
            logger.warning("No compound data found")
            return

        compounds = []
        for _, row in df.iterrows():
            pubchem_cid = self.first_non_empty(row, "pubchem_cid")
            common_name = self.first_non_empty(row, "common_name", "compound_name", "name")
            inchikey = self.first_non_empty(row, "inchikey")

            if not any([pubchem_cid, inchikey, common_name]):
                continue

            compound = self.clean_record(
                {
                    "pubchem_cid": pubchem_cid,
                    "chembl_id": self.first_non_empty(row, "chembl_id"),
                    "inchikey": inchikey,
                    "smiles": self.first_non_empty(row, "smiles"),
                    "molecular_formula": self.first_non_empty(row, "molecular_formula"),
                    "molecular_weight": self.parse_float(row.get("molecular_weight")),
                    "logp": self.parse_float(row.get("logp")),
                    "tpsa": self.parse_float(row.get("tpsa")),
                    "hbd": self.parse_int(row.get("hbd")),
                    "hba": self.parse_int(row.get("hba")),
                    "rotatable_bonds": self.parse_int(row.get("rotatable_bonds")),
                    "chemical_class": self.first_non_empty(row, "chemical_class"),
                    "iupac_name": self.first_non_empty(row, "iupac_name"),
                    "common_name": common_name,
                }
            )
            compounds.append(compound)

        self.upsert_batch("compound", compounds, on_conflict="pubchem_cid")
        logger.info(f"Loaded or updated {len(compounds)} compounds")

    def load_synonyms(self):
        logger.info("Skipping compound synonyms import by user choice")
        return

    def load_toxicity(self):
        logger.info("Loading toxicity data in chunks")
        file_path = Path(self.data_dir) / "stage5_database_ready" / "toxicity_linked.csv"

        if not file_path.exists():
            logger.warning("No toxicity data file found")
            return

        compounds = self.db.table("compound").select("compound_id, pubchem_cid, inchikey").execute()

        compound_map = {}
        for compound in compounds.data:
            if compound.get("pubchem_cid"):
                compound_map[str(compound["pubchem_cid"])] = compound["compound_id"]
            if compound.get("inchikey"):
                compound_map[str(compound["inchikey"])] = compound["compound_id"]

        total_loaded = 0
        total_skipped = 0

        for chunk in pd.read_csv(file_path, chunksize=2000, low_memory=False):
            toxicity_records = []

            for _, row in chunk.iterrows():
                identifier = self.first_non_empty(row, "pubchem_cid", "inchikey")
                endpoint = self.first_non_empty(row, "endpoint")

                if not identifier:
                    total_skipped += 1
                    continue

                if str(identifier) not in compound_map:
                    total_skipped += 1
                    continue

                if not endpoint:
                    total_skipped += 1
                    continue

                toxicity_records.append(
                    self.clean_record(
                        {
                            "compound_id": compound_map[str(identifier)],
                            "endpoint": endpoint,
                            "organ_system": self.first_non_empty(row, "organ_system"),
                            "risk_level": self.first_non_empty(row, "risk_level"),
                            "species": self.first_non_empty(row, "species"),
                            "test_method": self.first_non_empty(row, "test_method"),
                            "value": self.parse_float(row.get("value")),
                            "unit": self.first_non_empty(row, "unit"),
                            "source": self.first_non_empty(row, "source") or "CompTox",
                        }
                    )
                )

            if toxicity_records:
                self.batch_insert("compound_toxicity_endpoint", toxicity_records)
                total_loaded += len(toxicity_records)
                logger.info(f"Loaded chunk with {len(toxicity_records)} toxicity records")

        logger.info(f"Loaded {total_loaded} toxicity records total")
        logger.info(f"Skipped {total_skipped} toxicity rows with missing identifier or endpoint")

    def load_structure_metadata(self):
        logger.info("Loading structure metadata")
        df = self.load_csv("stage7_final_curation/structures_metadata.csv")

        if df.empty:
            logger.warning("No structure metadata found")
            return

        compounds = self.db.table("compound").select("compound_id, pubchem_cid").execute()
        cid_map = {
            str(compound["pubchem_cid"]): compound["compound_id"]
            for compound in compounds.data
            if compound.get("pubchem_cid")
        }

        structures = []
        for _, row in df.iterrows():
            cid = self.first_non_empty(row, "pubchem_cid")
            if cid and cid in cid_map:
                structures.append(
                    self.clean_record(
                        {
                            "compound_id": cid_map[cid],
                            "file_path": self.first_non_empty(row, "file_path"),
                            "file_type": self.first_non_empty(row, "file_type"),
                            "source": self.first_non_empty(row, "source") or "PubChem",
                            "method": self.first_non_empty(row, "method"),
                            "resolution": self.parse_float(row.get("resolution")),
                        }
                    )
                )

        self.batch_insert("structure_metadata", structures)
        logger.info(f"Loaded {len(structures)} structure metadata records")

    def load_unresolved_structure_files(self):
        logger.info("Loading unresolved structure file queue")
        df = self.load_csv("stage7_final_curation/unresolved_structure_files.csv")

        if df.empty:
            logger.warning("No unresolved structure files found")
            return

        records = []
        for _, row in df.iterrows():
            records.append(
                self.clean_record(
                    {
                        "source_file": self.first_non_empty(row, "source_file", "file_path", "file_name"),
                        "file_type": self.first_non_empty(row, "file_type"),
                        "source": self.first_non_empty(row, "source"),
                        "pubchem_cid": self.first_non_empty(row, "pubchem_cid"),
                        "raw_compound_name": self.first_non_empty(
                            row, "compound_name", "raw_compound_name", "name"
                        ),
                        "reason": self.first_non_empty(row, "reason", "status", "error_message"),
                        "status": self.first_non_empty(row, "review_status", "status") or "unresolved",
                        "metadata": {
                            k: (None if self.is_empty(v) else str(v))
                            for k, v in row.to_dict().items()
                        },
                    }
                )
            )

        self.batch_insert("unresolved_structure_file", records)
        logger.info(f"Loaded {len(records)} unresolved structure file records")


def run(supabase_client, data_dir):
    loader = CompoundLoader(supabase_client, data_dir)
    loader.load_master_molecules()
    # loader.load_synonyms()  # skipped on purpose
    loader.load_toxicity()
    loader.load_structure_metadata()
    loader.load_unresolved_structure_files()