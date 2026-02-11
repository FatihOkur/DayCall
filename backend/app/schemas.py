"""
Pydantic schemas for request/response validation.
Ensures full type safety across API boundaries.
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from app.models import CallStatus


# ============================================================================
# User Schemas
# ============================================================================

class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    phone_number: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')
    timezone: str = "UTC"
    preferred_call_time: Optional[str] = Field(None, pattern=r'^([01]\d|2[0-3]):([0-5]\d)$')
    voice_persona: str = "Empathetic Friend"


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """Schema for updating user settings."""
    timezone: Optional[str] = None
    preferred_call_time: Optional[str] = Field(None, pattern=r'^([01]\d|2[0-3]):([0-5]\d)$')
    voice_persona: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response (excludes password)."""
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Authentication Schemas
# ============================================================================

class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data."""
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    """Login credentials."""
    email: EmailStr
    password: str


# ============================================================================
# Journal Entry Schemas
# ============================================================================

class JournalEntryBase(BaseModel):
    """Base journal entry schema."""
    audio_url: Optional[str] = None
    transcript_text: Optional[str] = None
    ai_summary_markdown: Optional[str] = None
    mood_score: Optional[float] = Field(None, ge=0.0, le=10.0)


class JournalEntryCreate(JournalEntryBase):
    """Schema for creating a journal entry."""
    pass


class JournalEntryResponse(JournalEntryBase):
    """Schema for journal entry response."""
    id: int
    user_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class JournalEntryList(BaseModel):
    """Paginated list of journal entries."""
    entries: List[JournalEntryResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# Call Log Schemas
# ============================================================================

class CallLogBase(BaseModel):
    """Base call log schema."""
    duration_seconds: int = 0
    status: CallStatus
    twilio_call_sid: Optional[str] = None


class CallLogResponse(CallLogBase):
    """Schema for call log response."""
    id: int
    entry_id: Optional[int] = None
    user_id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Settings Schemas
# ============================================================================

class ScheduleUpdate(BaseModel):
    """Schema for updating call schedule."""
    preferred_call_time: str = Field(..., pattern=r'^([01]\d|2[0-3]):([0-5]\d)$')
    timezone: Optional[str] = None


class TestCallRequest(BaseModel):
    """Schema for triggering a test call."""
    immediate: bool = True
