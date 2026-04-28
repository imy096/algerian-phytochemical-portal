import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from database import get_supabase_admin_client
from config import get_settings
import logging

from etl import load_plants, load_compounds, load_plant_compounds, load_geo_lincs, load_pathways

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def run_etl_pipeline():
    logger.info("Starting ETL pipeline")

    settings = get_settings()
    db = get_supabase_admin_client()
    data_dir = settings.data_dir

    logger.info(f"Data directory: {data_dir}")

    try:
        logger.info("Step 1: Loading plants")
        load_plants.run(db, data_dir)

        logger.info("Step 2: Loading compounds")
        load_compounds.run(db, data_dir)

        logger.info("Step 3: Loading plant-compound links")
        load_plant_compounds.run(db, data_dir)

        logger.info("Step 4: Loading GEO/LINCS data")
        load_geo_lincs.run(db, data_dir)

        logger.info("Step 5: Loading pathways")
        load_pathways.run(db, data_dir)

        logger.info("ETL pipeline completed successfully")

    except Exception as e:
        logger.error(f"ETL pipeline failed: {e}")
        raise

if __name__ == "__main__":
    run_etl_pipeline()
