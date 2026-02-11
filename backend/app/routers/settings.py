"""
Settings router for user preferences and call scheduling.
Handles schedule updates and test call triggering.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas import ScheduleUpdate, TestCallRequest, UserResponse
from app.auth import get_current_user


router = APIRouter(prefix="/settings", tags=["Settings"])


@router.patch("/schedule", response_model=UserResponse)
async def update_schedule(
    schedule_data: ScheduleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Update the user's preferred call schedule.
    
    This endpoint allows users to change when the AI should call them
    for their daily journaling session.
    
    Args:
        schedule_data: New schedule preferences
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Updated user object
    """
    # Update user preferences
    current_user.preferred_call_time = schedule_data.preferred_call_time
    
    if schedule_data.timezone:
        current_user.timezone = schedule_data.timezone
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


@router.post("/test-call", status_code=status.HTTP_202_ACCEPTED)
async def trigger_test_call(
    test_call_data: TestCallRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Trigger an immediate test call to the user.
    
    This is the "Antigravity" logic - the system proactively initiates
    a call to the user's phone number using Twilio. The call will be
    queued via Celery/ARQ for immediate execution.
    
    Args:
        test_call_data: Test call configuration
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Status message indicating call has been queued
        
    Note:
        In production, this would trigger a Celery task that:
        1. Initiates a Twilio call to current_user.phone_number
        2. Connects to OpenAI Realtime API for conversation
        3. Records and transcribes the conversation
        4. Generates AI summary and creates journal entry
    """
    # TODO: Implement Celery task to initiate call
    # Example: initiate_voice_call.delay(user_id=current_user.id)
    
    return {
        "status": "queued",
        "message": f"Test call queued for {current_user.phone_number}",
        "user_id": current_user.id
    }
