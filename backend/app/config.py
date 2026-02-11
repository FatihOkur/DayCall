"""
Configuration management using Pydantic Settings.
Loads environment variables from .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    # Database
    database_url: str
    
    # OpenAI
    openai_api_key: str
    
    # Twilio
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_phone_number: str
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    
    # Application
    app_name: str = "AI Voice Journal"
    debug: bool = False
    allowed_origins: str = "http://localhost:3000,http://localhost:8081"
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


# Global settings instance
settings = Settings()
