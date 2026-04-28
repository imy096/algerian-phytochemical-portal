from etl.base_loader import BaseLoader
import pandas as pd
import logging

logger = logging.getLogger(__name__)

class PathwayLoader(BaseLoader):
    def load_chembl_activity(self):
        logger.info("Loading ChEMBL activity data")

        df = self.load_csv("stage5_database_ready/chembl_activity.csv")

        if df.empty:
            logger.warning("No ChEMBL activity data found")
            return

        logger.info(f"Processing {len(df)} ChEMBL activity records")

def run(supabase_client, data_dir):
    loader = PathwayLoader(supabase_client, data_dir)
    loader.load_chembl_activity()
