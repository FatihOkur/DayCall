"""
DayCall — Voice AI Service
Gemini Live API client for real-time audio conversations.
"""

import logging

from google import genai

from app.config import settings

logger = logging.getLogger("daycall.voice")

# Gemini client singleton
_gemini_client: genai.Client | None = None


def get_gemini_client() -> genai.Client:
    """Get or create the Gemini API client."""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        logger.info(f"Gemini client initialized (model: {settings.GEMINI_MODEL})")
    return _gemini_client


def get_gemini_config() -> dict:
    """Return the Gemini Live API session config."""
    return {
        "response_modalities": ["AUDIO"],
        "system_instruction": settings.SYSTEM_PROMPT,
        # Enable transcription so we receive text alongside audio
        "input_audio_transcription": {},
        "output_audio_transcription": {},
    }
