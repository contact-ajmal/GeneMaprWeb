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

    # AI - OpenRouter
    llm_api_key: str = "stub"
    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_model: str = "openrouter/auto:free"

    # Logging
    log_level: str = "INFO"

    # JWT Authentication
    jwt_secret_key: str = "change-me-in-production-use-a-long-random-string"
    access_token_expire_minutes: int = 1440  # 24 hours

    # CORS - comma-separated list of allowed origins
    cors_origins: str = "*"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
