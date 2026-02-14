"""
TEST CLIENT — Local WebSocket Audio Client
============================================
Connects to the DayCall server via WebSocket and streams
mic audio through the server to Gemini, then plays the response.

This simulates what a mobile app would do.

USAGE:
    1. Start the server: python server.py
    2. Run this client:  python test_client.py
"""

import asyncio
import sys
import pyaudio

try:
    import websockets
except ImportError:
    print("❌ websockets required: pip install websockets")
    sys.exit(1)

# ============================================================================
# CONFIGURATION
# ============================================================================

SERVER_URL = "ws://localhost:8000/ws/audio"

# Audio settings (must match server expectations)
FORMAT = pyaudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000     # What we send (mic)
RECEIVE_SAMPLE_RATE = 24000   # What we receive (speaker)
CHUNK_SIZE = 1024

pya = pyaudio.PyAudio()

# ============================================================================
# ASYNC TASKS
# ============================================================================

async def send_audio(ws):
    """Read mic audio and send to server via WebSocket."""
    mic_info = pya.get_default_input_device_info()
    stream = await asyncio.to_thread(
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

    try:
        while True:
            data = await asyncio.to_thread(stream.read, CHUNK_SIZE, **kwargs)
            await ws.send(data)
    finally:
        stream.close()


async def receive_audio(ws):
    """Receive audio from server and play through speakers."""
    stream = await asyncio.to_thread(
        pya.open,
        format=FORMAT,
        channels=CHANNELS,
        rate=RECEIVE_SAMPLE_RATE,
        output=True,
    )

    print("🔊 Speaker active")

    try:
        async for message in ws:
            if isinstance(message, bytes):
                await asyncio.to_thread(stream.write, message)
    finally:
        stream.close()

# ============================================================================
# MAIN
# ============================================================================

async def run():
    print("\n" + "=" * 60)
    print("🧪 TEST CLIENT — Connecting to DayCall Server")
    print("=" * 60)
    print(f"📡 Server: {SERVER_URL}")
    print("💡 Speak naturally. Press Ctrl+C to exit.\n")

    try:
        async with websockets.connect(SERVER_URL) as ws:
            print("✅ Connected to server\n")

            async with asyncio.TaskGroup() as tg:
                tg.create_task(send_audio(ws))
                tg.create_task(receive_audio(ws))

    except ConnectionRefusedError:
        print("❌ Cannot connect to server. Is it running?")
        print(f"   Start it with: python server.py")
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        pya.terminate()
        print("\n👋 Disconnected.")


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        print("\n👋 Görüşmek üzere!")
