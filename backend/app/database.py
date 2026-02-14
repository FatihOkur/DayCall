"""
DayCall — MongoDB Database Setup
Async MongoDB connection using Motor + Beanie ODM.
"""

import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.config import settings

# MongoDB client (created once, reused across the app)
client: AsyncIOMotorClient | None = None


async def init_db():
    """
    Initialize MongoDB connection and Beanie ODM.
    Call this during app startup.
    """
    global client

    # Import models here to avoid circular imports
    from app.models import User, JournalEntry, VoiceSession

    client = AsyncIOMotorClient(settings.MONGODB_URL, tlsCAFile=certifi.where())
    db = client[settings.DB_NAME]

    await init_beanie(
        database=db,
        document_models=[User, JournalEntry, VoiceSession],
    )


async def close_db():
    """Close the MongoDB connection. Call this during app shutdown."""
    global client
    if client:
        client.close()
