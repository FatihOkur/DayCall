"""
DayCall — Beanie Document Models (MongoDB)
Defines the schema for users, journal entries, and voice sessions.
"""

from datetime import datetime
from typing import Optional

from beanie import Document, Link
from pydantic import EmailStr, Field


class User(Document):
    """Registered user with auth credentials and preferences."""

    email: EmailStr
    hashed_password: str
    display_name: Optional[str] = None

    # Notification preferences
    notification_hour: int = 20  # 8 PM
    notification_minute: int = 0
    timezone: str = "Europe/Istanbul"

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = ["email"]


class JournalEntry(Document):
    """A processed journal entry generated from a voice session."""

    user_id: str  # Reference to User._id as string

    # Content
    transcript: Optional[str] = None
    summary: Optional[str] = None
    mood_score: Optional[float] = None  # 0.0–1.0
    mood_label: Optional[str] = None  # e.g. "happy", "sad"

    # Metadata
    duration_seconds: Optional[int] = None
    audio_file_path: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "journal_entries"
        indexes = ["user_id", "-created_at"]


class VoiceSession(Document):
    """Raw voice session metadata — tracks each conversation with Gemini."""

    user_id: str  # Reference to User._id as string
    journal_entry_id: Optional[str] = None  # null until post-processing completes

    # Session info
    status: str = "active"  # active | completed | failed
    duration_seconds: Optional[int] = None
    audio_file_path: Optional[str] = None

    # Timestamps
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None

    class Settings:
        name = "voice_sessions"
        indexes = ["user_id", "-started_at"]
