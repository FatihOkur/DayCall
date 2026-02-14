"""
DayCall — Application Configuration
Loads all settings from environment variables via .env file.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Central configuration loaded from environment."""

    # MongoDB
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL",
        "mongodb://localhost:27017/daycall",
    )
    DB_NAME: str = os.getenv("DB_NAME", "daycall")

    # Google Gemini
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    GEMINI_MODEL: str = os.getenv(
        "GEMINI_MODEL",
        "gemini-2.5-flash-native-audio-preview-12-2025",
    )

    # JWT Auth
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

    # Audio storage
    AUDIO_STORAGE_PATH: str = os.getenv("AUDIO_STORAGE_PATH", "./audio_files")

    # Voice AI system prompt
    SYSTEM_PROMPT: str = os.getenv(
        "SYSTEM_PROMPT",
        "Sen samimi, dert ortağı bir arkadaşsın. Doğal, kısa ve konuşma "
        "dilinde Türkçe cevap ver. Kullanıcının önceki mesajlarını hatırla "
        "ve bağlama uygun cevaplar ver. Empati kur ve ilgili sorular sor.",
    )


settings = Settings()
