"""
DayCall — Voice WebSocket Router
Bidirectional audio streaming between mobile clients and Gemini Live API.
Ported from DayCallAIModel/server.py into the main backend.

PROTOCOL:
    Client sends:    raw PCM bytes (16kHz, mono, 16-bit)
    Server responds: raw PCM bytes (24kHz, mono, 16-bit)
"""

import asyncio
import logging

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.config import settings
from app.models import User
from app.services.voice import get_gemini_client, get_gemini_config

logger = logging.getLogger("daycall.voice")

router = APIRouter(tags=["voice"])

# Track active voice connections
active_voice_connections: int = 0


def get_active_voice_connections() -> int:
    return active_voice_connections


async def authenticate_ws(token: str | None) -> User | None:
    """Validate JWT token from WebSocket query param. Returns User or None."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            return None
        return await User.get(user_id)
    except (jwt.InvalidTokenError, Exception):
        return None


@router.websocket("/ws/audio")
async def audio_websocket(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    """
    Bidirectional audio streaming endpoint.

    Flow:
    1. Client connects via WebSocket with ?token=JWT
    2. Server validates JWT and opens a Gemini Live session
    3. Two async tasks run concurrently:
       - client_to_gemini: forward client audio to Gemini
       - gemini_to_client: forward Gemini audio to client
    4. On disconnect: both tasks cancel, Gemini session closes
    """
    global active_voice_connections

    # Authenticate
    user = await authenticate_ws(token)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()
    active_voice_connections += 1
    user_email = user.email
    logger.info(f"[{user_email}] Voice session started (active: {active_voice_connections})")

    gemini_client = get_gemini_client()
    gemini_config = get_gemini_config()

    try:
        async with gemini_client.aio.live.connect(
            model=settings.GEMINI_MODEL,
            config=gemini_config,
        ) as gemini_session:
            logger.info(f"[{user_email}] Gemini session opened")

            async with asyncio.TaskGroup() as tg:
                tg.create_task(
                    _client_to_gemini(websocket, gemini_session, user_email)
                )
                tg.create_task(
                    _gemini_to_client(websocket, gemini_session, user_email)
                )

    except* WebSocketDisconnect:
        logger.info(f"[{user_email}] Client disconnected")
    except* Exception as eg:
        for e in eg.exceptions:
            logger.error(f"[{user_email}] Voice error: {e}")
    finally:
        active_voice_connections -= 1
        logger.info(f"[{user_email}] Voice session ended (active: {active_voice_connections})")


async def _client_to_gemini(
    websocket: WebSocket,
    gemini_session,
    user_email: str,
):
    """Receive audio from mobile client and forward to Gemini."""
    try:
        while True:
            audio_data = await websocket.receive_bytes()
            await gemini_session.send_realtime_input(
                audio={"data": audio_data, "mime_type": "audio/pcm"}
            )
    except WebSocketDisconnect:
        raise
    except Exception as e:
        logger.error(f"[{user_email}] client_to_gemini error: {e}")
        raise


async def _gemini_to_client(
    websocket: WebSocket,
    gemini_session,
    user_email: str,
):
    """Receive audio from Gemini and forward to mobile client."""
    try:
        while True:
            turn = gemini_session.receive()
            async for response in turn:
                if (
                    response.server_content
                    and response.server_content.model_turn
                ):
                    for part in response.server_content.model_turn.parts:
                        if part.inline_data and isinstance(part.inline_data.data, bytes):
                            try:
                                await websocket.send_bytes(part.inline_data.data)
                            except Exception:
                                return
    except WebSocketDisconnect:
        raise
    except Exception as e:
        logger.error(f"[{user_email}] gemini_to_client error: {e}")
        raise
