"""
Webhooks router for Twilio voice interface callbacks.
Handles incoming calls and call status updates from Twilio.
"""
from fastapi import APIRouter, Request, Response, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from twilio.twiml.voice_response import VoiceResponse
from datetime import datetime

from app.database import get_db
from app.models import CallLog, CallStatus


router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/voice/incoming")
async def handle_incoming_call(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Response:
    """
    Handle incoming voice calls from Twilio.
    
    This webhook is called when a user calls back the AI journal number.
    It generates TwiML instructions to connect the call to the AI conversation flow.
    
    Args:
        request: FastAPI request containing Twilio webhook data
        db: Database session
        
    Returns:
        TwiML response for Twilio to execute
        
    Note:
        In production, this would:
        1. Verify the Twilio request signature for security
        2. Connect to OpenAI Realtime API or LangChain conversation flow
        3. Stream audio bidirectionally between Twilio and AI
    """
    # Parse Twilio webhook data
    form_data = await request.form()
    call_sid = form_data.get("CallSid")
    from_number = form_data.get("From")
    
    # Create TwiML response
    response = VoiceResponse()
    response.say(
        "Hello! Welcome to your AI Voice Journal. "
        "I'm here to listen to your day. Let's begin.",
        voice="Polly.Joanna"
    )
    
    # TODO: Connect to AI conversation flow
    # response.connect().stream(url="wss://your-ai-endpoint/stream")
    
    # For now, record the call
    response.record(
        max_length=600,  # 10 minutes max
        transcribe=True,
        transcribe_callback="/webhooks/voice/transcription"
    )
    
    return Response(content=str(response), media_type="application/xml")


@router.post("/voice/status")
async def handle_call_status(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Handle call status updates from Twilio.
    
    Twilio sends status updates throughout the call lifecycle:
    - queued, ringing, in-progress, completed, busy, failed, no-answer
    
    This endpoint updates the CallLog accordingly.
    
    Args:
        request: FastAPI request containing Twilio status webhook data
        db: Database session
        
    Returns:
        Acknowledgment response
    """
    # Parse Twilio webhook data
    form_data = await request.form()
    call_sid = form_data.get("CallSid")
    call_status = form_data.get("CallStatus")
    call_duration = form_data.get("CallDuration", "0")
    
    # Find call log by Twilio SID
    result = await db.execute(
        select(CallLog).where(CallLog.twilio_call_sid == call_sid)
    )
    call_log = result.scalar_one_or_none()
    
    if call_log:
        # Update call status
        if call_status == "completed":
            call_log.status = CallStatus.COMPLETED
            call_log.duration_seconds = int(call_duration)
            call_log.completed_at = datetime.utcnow()
        elif call_status in ["busy", "no-answer"]:
            call_log.status = CallStatus.MISSED
            call_log.completed_at = datetime.utcnow()
        elif call_status == "failed":
            call_log.status = CallStatus.FAILED
            call_log.completed_at = datetime.utcnow()
        
        await db.commit()
    
    return {"status": "received", "call_sid": call_sid}


@router.post("/voice/transcription")
async def handle_transcription(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Handle transcription callback from Twilio.
    
    Called when Twilio completes transcription of a recorded call.
    This triggers the AI summary generation process.
    
    Args:
        request: FastAPI request containing transcription data
        db: Database session
        
    Returns:
        Acknowledgment response
        
    Note:
        In production, this would:
        1. Retrieve the transcription text
        2. Queue a Celery task to generate AI summary
        3. Create/update the JournalEntry with transcript and summary
        4. Send push notification to user
    """
    form_data = await request.form()
    transcription_text = form_data.get("TranscriptionText")
    call_sid = form_data.get("CallSid")
    
    # TODO: Queue AI summary generation task
    # generate_journal_summary.delay(call_sid=call_sid, transcript=transcription_text)
    
    return {"status": "received", "call_sid": call_sid}
