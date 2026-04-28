from etl.base_loader import BaseLoader
import logging

logger = logging.getLogger(__name__)


class PlantLoader(BaseLoader):
    def load_plants(self):
        logger.info("Loading plants from CSV")
        df = self.load_csv("stage5_database_ready/plants.csv")

        if df.empty:
            logger.warning("No plant data found")
            return

        plants = []
        for _, row in df.iterrows():
            scientific_name = self.first_non_empty(row, "scientific_name", "plant_scientific_name")
            if not scientific_name:
                continue

            plant = self.clean_record({
                "ncbi_tax_id": self.first_non_empty(row, "ncbi_tax_id"),
                "scientific_name": scientific_name,
                "genus": self.first_non_empty(row, "genus"),
                "family": self.first_non_empty(row, "family"),
                "order": self.first_non_empty(row, "order"),
                "class": self.first_non_empty(row, "class"),
                "phylum": self.first_non_empty(row, "phylum"),
                "kingdom": self.first_non_empty(row, "kingdom"),
                "endemic_flag": self.parse_bool(row.get("endemic_flag")) or False,
                "conservation_status": self.first_non_empty(row, "conservation_status"),
                "description": self.first_non_empty(row, "description"),
                "vernacular_names": self.parse_json_array(row.get("vernacular_names")),
            })
            plants.append(plant)

        self.upsert_batch("plant_taxon", plants, on_conflict="scientific_name")
        logger.info(f"Loaded or updated {len(plants)} plants")

    def load_taxonomy(self):
        logger.info("Loading taxonomy data")
        df = self.load_csv("stage5_database_ready/taxonomy.csv")

        if df.empty:
            logger.warning("No taxonomy data found")
            return

        records = []
        for _, row in df.iterrows():
            scientific_name = self.first_non_empty(row, "scientific_name", "plant_scientific_name")
            if not scientific_name:
                continue

            records.append(self.clean_record({
                "ncbi_tax_id": self.first_non_empty(row, "ncbi_tax_id"),
                "scientific_name": scientific_name,
                "genus": self.first_non_empty(row, "genus"),
                "family": self.first_non_empty(row, "family"),
                "order": self.first_non_empty(row, "order"),
                "class": self.first_non_empty(row, "class"),
                "phylum": self.first_non_empty(row, "phylum"),
                "kingdom": self.first_non_empty(row, "kingdom"),
            }))

        self.upsert_batch("plant_taxon", records, on_conflict="scientific_name")
        logger.info(f"Loaded or updated {len(records)} taxonomy records")

    def load_plant_regions(self):
        logger.info("Plant-region import skipped: no dedicated region CSV is currently defined")


def run(supabase_client, data_dir):
    loader = PlantLoader(supabase_client, data_dir)
    loader.load_plants()
    loader.load_taxonomy()
    loader.load_plant_regions()
