import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "EstateVoice AI"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    DATABASE_URL: str = "sqlite:///./data/estatevoice.db"
    
    # Future AI API placeholders
    GEMINI_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""

    # Gmail SMTP Configuration for Automated Booking Emails
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    GMAIL_USER: str = ""
    GMAIL_APP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "DreamSpace Properties Bangalore"

    # Company Details
    COMPANY_NAME: str = "DreamSpace Properties Bangalore"
    COMPANY_PHONE: str = "+91 80 4567 8900"
    COMPANY_EMAIL: str = "sales@dreamspacerealty.com"
    COMPANY_ADDRESS: str = "Level 4, UB City, Vittal Mallya Road, Bangalore - 560001"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
