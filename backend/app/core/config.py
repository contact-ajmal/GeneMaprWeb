from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )

    # Database
    database_url: str
    postgres_user: str
    postgres_password: str
    postgres_db: str

    # Redis
    redis_url: str

    # Backend
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    # External APIs
    ensembl_base_url: str = "https://rest.ensembl.org"
    clinvar_base_url: str = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

    # AI
    llm_api_key: str = "stub"


settings = Settings()
