"""
DIRECT VOICE AGENT — Gemini Live API
=====================================
Zero-pipeline voice assistant using a single WebSocket connection.
Audio goes in, audio comes out. No STT, no separate TTS.

ARCHITECTURE:
- Single persistent WebSocket to Gemini Live API
- 4 concurrent async tasks: listen, send, receive, play
- Server-side VAD and interruption handling (built-in)
- Conversation context maintained by the server

LATENCY: ~500ms (vs ~3-4s with STT→LLM→TTS pipeline)
"""

import os
import sys
import asyncio
import pyaudio
from dotenv import load_dotenv

try:
    from google import genai
except ImportError:
    print("❌ google-genai required: pip install google-genai")
    sys.exit(1)

# ============================================================================
# CONFIGURATION
# ============================================================================

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    print("❌ Missing GOOGLE_API_KEY in .env")
    sys.exit(1)

# Audio settings
FORMAT = pyaudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000    # Input: 16kHz mono PCM (what the mic captures)
RECEIVE_SAMPLE_RATE = 24000  # Output: 24kHz mono PCM (what Gemini returns)
CHUNK_SIZE = 1024            # ~64ms at 16kHz

# Gemini Live API config
MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
CONFIG = {
    "response_modalities": ["AUDIO"],
    "system_instruction": (
        "Sen samimi, dert ortağı bir arkadaşsın. Doğal, kısa ve konuşma "
        "dilinde Türkçe cevap ver. Kullanıcının önceki mesajlarını hatırla "
        "ve bağlama uygun cevaplar ver. Empati kur ve ilgili sorular sor."
    ),
}

# Initialize
client = genai.Client(api_key=GOOGLE_API_KEY)
pya = pyaudio.PyAudio()

# Async queues for audio data flow
audio_queue_output = asyncio.Queue()       # Gemini → Speaker
audio_queue_mic = asyncio.Queue(maxsize=5) # Mic → Gemini

# Global reference for cleanup
audio_input_stream = None

# ============================================================================
# ASYNC TASKS — 4 concurrent coroutines
# ============================================================================

async def listen_audio():
    """
    Task 1: Continuously read audio from the microphone.
    Pushes raw PCM chunks into the mic queue for sending to Gemini.
    """
    global audio_input_stream

    mic_info = pya.get_default_input_device_info()
    audio_input_stream = await asyncio.to_thread(
        pya.open,
        format=FORMAT,
        channels=CHANNELS,
        rate=SEND_SAMPLE_RATE,
        input=True,
        input_device_index=mic_info["index"],
        frames_per_buffer=CHUNK_SIZE,
    )

    print("🎤 Microphone active")

    kwargs = {"exception_on_overflow": False}
    while True:
        data = await asyncio.to_thread(audio_input_stream.read, CHUNK_SIZE, **kwargs)
        await audio_queue_mic.put({"data": data, "mime_type": "audio/pcm"})


async def send_realtime(session):
    """
    Task 2: Forward mic audio to Gemini via the WebSocket.
    Continuously drains the mic queue and sends to the live session.
    """
    while True:
        msg = await audio_queue_mic.get()
        await session.send_realtime_input(audio=msg)


async def receive_audio(session):
    """
    Task 3: Receive audio responses from Gemini.
    Pushes audio chunks to the output queue for playback.
    On interruption (user speaks while AI is talking), clears the
    output queue to stop stale audio from playing.
    """
    while True:
        turn = session.receive()
        async for response in turn:
            if (
                response.server_content
                and response.server_content.model_turn
            ):
                for part in response.server_content.model_turn.parts:
                    if part.inline_data and isinstance(part.inline_data.data, bytes):
                        audio_queue_output.put_nowait(part.inline_data.data)

        # Turn ended — either completed or interrupted by user.
        # Clear any remaining queued audio to prevent stale playback.
        while not audio_queue_output.empty():
            audio_queue_output.get_nowait()


async def play_audio():
    """
    Task 4: Play received audio through the speakers.
    Reads from the output queue and writes raw PCM to PyAudio output.
    """
    output_stream = await asyncio.to_thread(
        pya.open,
        format=FORMAT,
        channels=CHANNELS,
        rate=RECEIVE_SAMPLE_RATE,
        output=True,
    )

    print("🔊 Speaker active")

    while True:
        audio_bytes = await audio_queue_output.get()
        await asyncio.to_thread(output_stream.write, audio_bytes)

# ============================================================================
# MAIN
# ============================================================================

async def run():
    """Connect to Gemini Live API and run the 4-task audio loop."""
    print("\n" + "=" * 60)
    print("🚀 DIRECT VOICE AGENT — Gemini Live API")
    print("=" * 60)
    print("💡 Just speak naturally. I'll respond instantly.")
    print("💡 Interrupt me anytime — I'll stop and listen.")
    print("💡 Press Ctrl+C to exit.\n")

    try:
        async with client.aio.live.connect(
            model=MODEL,
            config=CONFIG,
        ) as session:
            print("✅ Connected to Gemini Live API\n")

            async with asyncio.TaskGroup() as tg:
                tg.create_task(listen_audio())
                tg.create_task(send_realtime(session))
                tg.create_task(receive_audio(session))
                tg.create_task(play_audio())

    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"\n❌ Connection error: {e}")
    finally:
        if audio_input_stream:
            audio_input_stream.close()
        pya.terminate()
        print("\n👋 Connection closed.")


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        print("\n👋 Görüşmek üzere!")
