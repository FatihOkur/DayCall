"""
DayCall — Pydantic Schemas
Request/response models for API validation and serialization.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# ============================================================================
# AUTH
# ============================================================================


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: Optional[str]
    notification_hour: int
    notification_minute: int
    timezone: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ============================================================================
# JOURNAL
# ============================================================================


class JournalEntryResponse(BaseModel):
    id: str
    transcript: Optional[str]
    summary: Optional[str]
    mood_score: Optional[float]
    mood_label: Optional[str]
    duration_seconds: Optional[int]
    audio_file_path: Optional[str]
    created_at: datetime


class JournalEntryList(BaseModel):
    entries: list[JournalEntryResponse]
    total: int
    page: int
    per_page: int


# ============================================================================
# SETTINGS
# ============================================================================


class NotificationScheduleUpdate(BaseModel):
    notification_hour: int  # 0–23
    notification_minute: int  # 0–59
    timezone: Optional[str] = None


# ============================================================================
# VOICE SESSION
# ============================================================================


class VoiceSessionResponse(BaseModel):
    id: str
    status: str
    duration_seconds: Optional[int]
    started_at: datetime
    ended_at: Optional[datetime]
