from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str = ""
    supabase_service_key: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""

    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    data_dir: str = "./data"
    structures_dir: str = "./data/structures"
    plant_images_dir: str = "./assets/plant_images"

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        case_sensitive=False,
        extra="ignore"
    )


@lru_cache()
def get_settings():
    return Settings()