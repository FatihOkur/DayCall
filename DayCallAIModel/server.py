"""
DAYCALL SERVER — FastAPI WebSocket Audio Proxy
================================================
Production backend that proxies audio between mobile clients
and Gemini Live API. Each client gets its own Gemini session.

USAGE:
    python server.py          # starts on http://0.0.0.0:8000
    # or with uvicorn directly:
    uvicorn server:app --host 0.0.0.0 --port 8000

ENDPOINTS:
    GET  /health     — health check for load balancers
    WS   /ws/audio   — bidirectional audio streaming

PROTOCOL:
    Client sends:    raw PCM bytes (16kHz, mono, 16-bit)
    Server responds: raw PCM bytes (24kHz, mono, 16-bit)
"""

import os
import sys
import asyncio
import logging
from dotenv import load_dotenv

try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn
except ImportError:
    print("❌ Missing dependencies: pip install fastapi uvicorn")
    sys.exit(1)

try:
    from google import genai
except ImportError:
    print("❌ Missing google-genai: pip install google-genai")
    sys.exit(1)

# ============================================================================
# CONFIGURATION
# ============================================================================

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    print("❌ Missing GOOGLE_API_KEY in .env")
    sys.exit(1)

# Gemini Live API config
GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
GEMINI_CONFIG = {
    "response_modalities": ["AUDIO"],
    "system_instruction": (
        "Sen samimi, dert ortağı bir arkadaşsın. Doğal, kısa ve konuşma "
        "dilinde Türkçe cevap ver. Kullanıcının önceki mesajlarını hatırla "
        "ve bağlama uygun cevaplar ver. Empati kur ve ilgili sorular sor."
    ),
}

# Audio constants (for documentation — actual encoding handled by client)
SEND_SAMPLE_RATE = 16000    # Client → Server: 16kHz PCM
RECEIVE_SAMPLE_RATE = 24000  # Server → Client: 24kHz PCM

# Initialize Gemini client
gemini_client = genai.Client(api_key=GOOGLE_API_KEY)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("daycall")

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="DayCall Voice AI",
    description="Real-time voice AI backend using Gemini Live API",
    version="1.0.0",
)

# CORS — allow all origins for development (restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track active connections
active_connections: int = 0


@app.get("/health")
async def health():
    """Health check endpoint for load balancers."""
    return {
        "status": "healthy",
        "active_connections": active_connections,
        "model": GEMINI_MODEL,
    }


@app.websocket("/ws/audio")
async def audio_websocket(websocket: WebSocket):
    """
    Bidirectional audio streaming endpoint.

    Flow:
    1. Client connects via WebSocket
    2. Server opens a Gemini Live session
    3. Two async tasks run concurrently:
       - client_to_gemini: forward client audio to Gemini
       - gemini_to_client: forward Gemini audio to client
    4. On disconnect: both tasks cancel, Gemini session closes
    """
    global active_connections

    await websocket.accept()
    active_connections += 1
    client_id = id(websocket)
    logger.info(f"[{client_id}] Client connected (active: {active_connections})")

    try:
        async with gemini_client.aio.live.connect(
            model=GEMINI_MODEL,
            config=GEMINI_CONFIG,
        ) as gemini_session:
            logger.info(f"[{client_id}] Gemini session opened")

            async with asyncio.TaskGroup() as tg:
                tg.create_task(client_to_gemini(websocket, gemini_session, client_id))
                tg.create_task(gemini_to_client(websocket, gemini_session, client_id))

    except* WebSocketDisconnect:
        logger.info(f"[{client_id}] Client disconnected")
    except* Exception as eg:
        for e in eg.exceptions:
            logger.error(f"[{client_id}] Error: {e}")
    finally:
        active_connections -= 1
        logger.info(f"[{client_id}] Session closed (active: {active_connections})")


async def client_to_gemini(
    websocket: WebSocket,
    gemini_session,
    client_id: int,
):
    """Receive audio from mobile client and forward to Gemini."""
    try:
        while True:
            # Receive raw PCM bytes from client
            audio_data = await websocket.receive_bytes()

            # Forward to Gemini
            await gemini_session.send_realtime_input(
                audio={"data": audio_data, "mime_type": "audio/pcm"}
            )
    except WebSocketDisconnect:
        raise
    except Exception as e:
        logger.error(f"[{client_id}] client_to_gemini error: {e}")
        raise


async def gemini_to_client(
    websocket: WebSocket,
    gemini_session,
    client_id: int,
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
        logger.error(f"[{client_id}] gemini_to_client error: {e}")
        raise

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🚀 DAYCALL SERVER — Starting...")
    print("=" * 60)
    print(f"📡 WebSocket: ws://0.0.0.0:8000/ws/audio")
    print(f"❤️  Health:    http://0.0.0.0:8000/health")
    print(f"🤖 Model:     {GEMINI_MODEL}\n")

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
