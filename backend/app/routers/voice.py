"""
DayCall — Voice WebSocket Router
Bidirectional audio streaming between mobile clients and Gemini Live API.
Ported from DayCallAIModel/server.py into the main backend.

PROTOCOL:
    Client sends:    raw PCM bytes (16kHz, mono, 16-bit)
    Server responds: raw PCM bytes (24kHz, mono, 16-bit) OR JSON control messages
    Control:         {"type": "turn_start"}  — new AI turn; reset playback buffers
                     {"type": "turn_end"}    — Gemini turn complete; play buffered audio
                     {"type": "interrupted"} — user interrupted; discard buffered audio
"""

import asyncio
import json
import logging
import time

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


def _parse_audio(data: bytes) -> tuple[bytes, str]:
    """
    Inspect incoming audio bytes and return (payload, mime_type) for Gemini.

    Supported inputs:
      - RIFF/WAVE (WAV with Linear PCM) → strip header → audio/pcm;rate=<N>
      - raw PCM (no header)             → audio/pcm;rate=16000 (assumed)
      - anything else (m4a, aac…)       → rejected by Gemini; log a warning

    Returns the raw payload bytes and the Gemini-compatible MIME type.
    """
    import struct

    # ── WAV / RIFF container ────────────────────────────────────────────────
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        sample_rate = 16000  # default
        try:
            # Walk chunks to find 'fmt ' (sample rate) and 'data' (PCM payload)
            offset = 12
            fmt_found = False
            while offset + 8 <= len(data):
                chunk_id = data[offset:offset + 4]
                chunk_size = struct.unpack_from("<I", data, offset + 4)[0]
                if chunk_id == b"fmt " and chunk_size >= 16:
                    sample_rate = struct.unpack_from("<I", data, offset + 8 + 4)[0]
                    fmt_found = True
                elif chunk_id == b"data":
                    pcm = data[offset + 8: offset + 8 + chunk_size]
                    return pcm, f"audio/pcm;rate={sample_rate}"
                offset += 8 + chunk_size
        except Exception:
            pass
        # Fallback: skip standard 44-byte RIFF header
        return data[44:], f"audio/pcm;rate={sample_rate}"

    # ── AAC ADTS ────────────────────────────────────────────────────────────
    if len(data) >= 2 and data[0] == 0xFF and data[1] in (0xF1, 0xF9):
        logger.warning("Received AAC/ADTS — Gemini requires PCM. Check recording format.")
        return data, "audio/pcm"  # will likely be rejected; best-effort

    # ── M4A / MP4 container ─────────────────────────────────────────────────
    if len(data) >= 8 and data[4:8] == b"ftyp":
        logger.warning("Received M4A — Gemini requires PCM. Check recording format.")
        return data, "audio/pcm"  # will likely be rejected; best-effort

    # ── Assume raw PCM (no header) ──────────────────────────────────────────
    return data, "audio/pcm;rate=16000"


async def _client_to_gemini(
    websocket: WebSocket,
    gemini_session,
    user_email: str,
):
    """Receive audio from mobile client and forward to Gemini.
    Supports WAV (Linear PCM) from expo-av and raw PCM.
    WAV headers are stripped; raw PCM + sample rate sent to Gemini.
    """
    detected_log = False
    try:
        while True:
            audio_data = await websocket.receive_bytes()
            if not audio_data:
                continue

            pcm_data, mime_type = _parse_audio(audio_data)
            if not detected_log:
                detected_log = True
                logger.info(f"[{user_email}] Audio format: {mime_type} ({len(pcm_data)} bytes/chunk)")

            if not pcm_data:
                continue

            await gemini_session.send_realtime_input(
                audio={"data": pcm_data, "mime_type": mime_type}
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
    """
    Receive audio from Gemini and forward to mobile client.

    Uses the per-turn receive() pattern from DayCallAIModel/server.py:
    each call to gemini_session.receive() creates an isolated generator for
    one AI turn. When the inner async-for exhausts (turn_complete or
    interrupted), the outer while-True restarts a fresh generator for the
    next turn. This avoids cross-turn state leakage that can occur when a
    single persistent generator spans multiple turns.

    Audio is extracted from server_content.model_turn.parts directly —
    the response.data shortcut behaves inconsistently across SDK versions.
    """
    try:
        while True:  # one iteration per AI turn
            audio_chunks_sent = 0
            audio_bytes_sent = 0
            was_interrupted = False
            turn_start_time = time.monotonic()

            async for response in gemini_session.receive():
                # ── Audio data ───────────────────────────────────────────────
                if (
                    response.server_content
                    and response.server_content.model_turn
                ):
                    for part in response.server_content.model_turn.parts:
                        if part.inline_data and part.inline_data.data:
                            raw = part.inline_data.data
                            payload = bytes(raw) if not isinstance(raw, bytes) else raw
                            if payload:
                                audio_chunks_sent += 1
                                audio_bytes_sent += len(payload)
                                if audio_chunks_sent == 1:
                                    logger.info(
                                        f"[{user_email}] Gemini audio streaming "
                                        f"started ({len(payload)}B first chunk)"
                                    )
                                    # Signal client to reset playback state
                                    try:
                                        await websocket.send_text(
                                            json.dumps({"type": "turn_start"})
                                        )
                                    except Exception:
                                        return
                                try:
                                    await websocket.send_bytes(payload)
                                except Exception:
                                    return

                # ── Transcription ────────────────────────────────────────────
                # Forward user/model transcripts so the client can show them.
                if response.server_content:
                    sc = response.server_content

                    # User speech transcript
                    it = getattr(sc, "input_transcription", None)
                    if it and getattr(it, "text", None):
                        try:
                            await websocket.send_text(json.dumps({
                                "type": "transcript",
                                "role": "user",
                                "text": it.text,
                            }))
                        except Exception:
                            return

                    # Model speech transcript
                    ot = getattr(sc, "output_transcription", None)
                    if ot and getattr(ot, "text", None):
                        try:
                            await websocket.send_text(json.dumps({
                                "type": "transcript",
                                "role": "model",
                                "text": ot.text,
                            }))
                        except Exception:
                            return

                # ── User interrupted ─────────────────────────────────────────
                # Gemini's server-side VAD detected user speech mid-response.
                # Signal the client to abort playback; mic is already running.
                if (
                    response.server_content
                    and response.server_content.interrupted
                ):
                    was_interrupted = True
                    elapsed = time.monotonic() - turn_start_time
                    logger.info(
                        f"[{user_email}] Turn interrupted after {elapsed:.1f}s "
                        f"({audio_chunks_sent} chunks, {audio_bytes_sent}B)"
                    )
                    try:
                        await websocket.send_text(json.dumps({"type": "interrupted"}))
                    except Exception:
                        return
                    break  # exit inner loop; outer while-True starts fresh turn

                # ── Turn complete ────────────────────────────────────────────
                if (
                    response.server_content
                    and response.server_content.turn_complete
                ):
                    break  # exit inner loop; send turn_end below

            # After inner loop: send turn_end only for natural completions
            if not was_interrupted:
                elapsed = time.monotonic() - turn_start_time
                logger.info(
                    f"[{user_email}] Turn complete in {elapsed:.1f}s "
                    f"({audio_chunks_sent} chunks, {audio_bytes_sent}B)"
                )
                try:
                    await websocket.send_text(json.dumps({"type": "turn_end"}))
                except Exception:
                    return

    except WebSocketDisconnect:
        raise
    except Exception as e:
        logger.error(f"[{user_email}] gemini_to_client error: {e}")
        raise
