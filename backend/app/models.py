"""
SQLAlchemy ORM models for the AI Voice Journal application.
Implements the database schema defined in the specification.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.database import Base


class CallStatus(str, enum.Enum):
    """Enum for call status tracking."""
    COMPLETED = "completed"
    MISSED = "missed"
    FAILED = "failed"
    IN_PROGRESS = "in_progress"


class User(Base):
    """
    User model representing app users.
    Stores authentication info and call preferences.
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone_number = Column(String(20), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    timezone = Column(String(50), default="UTC")
    preferred_call_time = Column(String(10), nullable=True)  # Format: "HH:MM"
    voice_persona = Column(String(50), default="Empathetic Friend")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    journal_entries = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")


class JournalEntry(Base):
    """
    Journal entry model storing transcripts and AI summaries.
    Each entry represents one completed journaling session.
    """
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    audio_url = Column(String(500), nullable=True)  # S3/Cloud storage URL
    transcript_text = Column(Text, nullable=True)
    ai_summary_markdown = Column(Text, nullable=True)
    mood_score = Column(Float, nullable=True)  # 0.0 to 10.0 scale
    
    # Relationships
    user = relationship("User", back_populates="journal_entries")
    call_log = relationship("CallLog", back_populates="entry", uselist=False, cascade="all, delete-orphan")


class CallLog(Base):
    """
    Call log model tracking telephony session details.
    Links to journal entries for completed calls.
    """
    __tablename__ = "call_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    duration_seconds = Column(Integer, default=0)
    status = Column(Enum(CallStatus), default=CallStatus.IN_PROGRESS)
    twilio_call_sid = Column(String(100), unique=True, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    entry = relationship("JournalEntry", back_populates="call_log")
