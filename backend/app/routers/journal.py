"""
Journal router for retrieving journal entries.
Provides paginated list and detail views of journal entries.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List

from app.database import get_db
from app.models import User, JournalEntry
from app.schemas import JournalEntryResponse, JournalEntryList
from app.auth import get_current_user


router = APIRouter(prefix="/journal", tags=["Journal"])


@router.get("/entries", response_model=JournalEntryList)
async def list_entries(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> JournalEntryList:
    """
    List all journal entries for the current user with pagination.
    
    Returns entries in reverse chronological order (newest first).
    
    Args:
        page: Page number (1-indexed)
        page_size: Number of entries per page
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Paginated list of journal entries
    """
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Get total count
    count_query = select(func.count(JournalEntry.id)).where(
        JournalEntry.user_id == current_user.id
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    # Get paginated entries
    entries_query = (
        select(JournalEntry)
        .where(JournalEntry.user_id == current_user.id)
        .order_by(desc(JournalEntry.created_at))
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(entries_query)
    entries = result.scalars().all()
    
    return JournalEntryList(
        entries=entries,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/entries/{entry_id}", response_model=JournalEntryResponse)
async def get_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> JournalEntry:
    """
    Get detailed view of a specific journal entry.
    
    Includes full transcript, AI summary, and audio URL.
    
    Args:
        entry_id: ID of the journal entry
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Journal entry details
        
    Raises:
        HTTPException: If entry not found or doesn't belong to user
    """
    # Fetch entry
    result = await db.execute(
        select(JournalEntry).where(
            JournalEntry.id == entry_id,
            JournalEntry.user_id == current_user.id
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found"
        )
    
    return entry
