"""
Configuration module for TCET Chatbot
Loads environment variables and provides config object
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from .env file"""
    
    # Database
    database_url: str = "postgresql://postgres:tcet_dev_123@localhost:5432/tcet_chatbot"
    sqlalchemy_echo: bool = True
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_cache_ttl: int = 300
    
    # Ollama LLM
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama2"
    
    # API Server
    api_port: int = 8000
    api_host: str = "0.0.0.0"
    api_workers: int = 4
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "logs/phase1_setup.log"
    
    # Security
    jwt_secret: str = "temp_dev_secret_change_this_before_production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # Scrapers
    scraper_timeout: int = 30
    scraper_retry_attempts: int = 3
    scraper_retry_delay: int = 5
    
    # Browser (Selenium)
    headless_browser: bool = True
    browser_timeout: int = 30
    
    # System
    environment: str = "development"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Create settings instance
settings = Settings()


# Verify critical settings
def verify_config():
    """Verify that critical configuration is set"""
    required_settings = [
        ("database_url", settings.database_url),
        ("redis_url", settings.redis_url),
        ("jwt_secret", settings.jwt_secret),
    ]
    
    missing = []
    for name, value in required_settings:
        if not value:
            missing.append(name)
    
    if missing:
        raise ValueError(f"Missing required settings: {', '.join(missing)}")
    
    return True


if __name__ == "__main__":
    print("Settings loaded successfully!")
    print(f"Database: {settings.database_url}")
    print(f"Redis: {settings.redis_url}")
    print(f"Environment: {settings.environment}")
    print(f"Debug: {settings.debug}")