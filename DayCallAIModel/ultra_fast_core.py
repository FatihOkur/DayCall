"""
ULTRA-FAST CORE v2.0 — Natural Conversation Voice AI
=====================================================
Event-driven, continuously-listening voice assistant with real-time
interruption support and sentence-level streaming TTS.

ARCHITECTURE:
- Continuous mic monitoring (always-on PyAudio stream)
- State machine: IDLE → LISTENING → PROCESSING → SPEAKING
- Background VAD during playback for instant interruption
- Groq Whisper STT (~0.3s) instead of Google STT (~2s)
- Streaming LLM → sentence-level TTS pipeline
- Conversation history preserved across interruptions

LATENCY TARGETS:
- STT: <500ms (Groq Whisper)
- First audio: <3s after speech ends
- Interruption response: <200ms
"""

import os
import sys
import io
import time
import wave
import json
import asyncio
import threading
import audioop
import pyaudio
from enum import Enum
from collections import deque
from typing import Optional, AsyncGenerator
from dotenv import load_dotenv

# ============================================================================
# LIBRARY CHECKS
# ============================================================================

try:
    import webrtcvad
    WEBRTC_AVAILABLE = True
except ImportError:
    print("⚠️  webrtcvad not found — using RMS-only VAD.")
    print("   For better accuracy: pip install webrtcvad")
    WEBRTC_AVAILABLE = False

try:
    import aiohttp
except ImportError:
    print("❌ aiohttp required: pip install aiohttp")
    sys.exit(1)

try:
    import pygame
except ImportError:
    print("❌ pygame required: pip install pygame")
    sys.exit(1)

# ============================================================================
# ENVIRONMENT & API KEYS
# ============================================================================

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

missing = []
if not OPENROUTER_API_KEY: missing.append("OPENROUTER_API_KEY")
if not ELEVENLABS_API_KEY: missing.append("ELEVENLABS_API_KEY")
if not GROQ_API_KEY: missing.append("GROQ_API_KEY (free at https://console.groq.com)")

if missing:
    print("❌ Missing API keys in .env:")
    for m in missing:
        print(f"   - {m}")
    sys.exit(1)

# ============================================================================
# AUDIO CONSTANTS
# ============================================================================

SAMPLE_RATE = 16000             # 16kHz — optimal for STT and WebRTC VAD
CHANNELS = 1                    # Mono
FORMAT = pyaudio.paInt16        # 16-bit
SAMPLE_WIDTH = 2                # bytes per sample (16-bit)
CHUNK = 480                     # 480 samples = 960 bytes = 30ms at 16kHz
                                # Exactly matches WebRTC VAD frame size
SILENCE_LIMIT = 1.5             # Seconds of silence before speech ends
MAX_DURATION = 30               # Max recording duration (seconds)
INTERRUPT_DEBOUNCE = 6          # Consecutive speech frames to trigger interrupt
                                # 6 frames × 30ms = 180ms debounce (avoids echo)

# ============================================================================
# API CONFIGURATION
# ============================================================================

ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"
VOICE_ID = "21m00Tcm4TlvDq8ikWAM"   # Rachel
TTS_MODEL = "eleven_multilingual_v2"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions"

# ============================================================================
# STATE MACHINE
# ============================================================================

class ConversationState(Enum):
    IDLE = "idle"
    LISTENING = "listening"
    PROCESSING = "processing"
    SPEAKING = "speaking"


class GlobalState:
    """Thread-safe state management for the conversation loop."""

    def __init__(self):
        self.state = ConversationState.IDLE
        self.interrupt_requested = False
        self.should_stop_playback = False
        self.lock = threading.Lock()

    def set_state(self, new_state: ConversationState):
        with self.lock:
            self.state = new_state

    def get_state(self) -> ConversationState:
        with self.lock:
            return self.state

    def request_interrupt(self):
        """Called by interrupt monitor when user speaks during AI playback."""
        with self.lock:
            self.interrupt_requested = True
            self.should_stop_playback = True
            try:
                pygame.mixer.music.stop()
            except Exception:
                pass

    def reset_interrupt(self):
        with self.lock:
            self.interrupt_requested = False
            self.should_stop_playback = False


state = GlobalState()

# ============================================================================
# CONVERSATION HISTORY
# ============================================================================

class ConversationHistory:
    """Sliding-window conversation memory for the LLM."""

    def __init__(self, max_messages: int = 20):
        self.messages = []
        self.max_messages = max_messages
        self.system_message = {
            "role": "system",
            "content": (
                "Sen samimi, dert ortağı bir arkadaşsın. Doğal, kısa ve konuşma "
                "dilinde Türkçe cevap ver. Kullanıcının önceki mesajlarını hatırla "
                "ve bağlama uygun cevaplar ver."
            )
        }

    def add_user_message(self, content: str):
        self.messages.append({"role": "user", "content": content})
        self._trim()

    def add_assistant_message(self, content: str):
        self.messages.append({"role": "assistant", "content": content})
        self._trim()

    def _trim(self):
        while len(self.messages) > self.max_messages:
            self.messages = self.messages[2:]

    def get_messages_for_api(self) -> list:
        return [self.system_message] + self.messages

    def get_message_count(self) -> int:
        return len(self.messages)

# ============================================================================
# ENHANCED VAD — RMS + WebRTC Hybrid
# ============================================================================

class EnhancedVAD:
    """
    Hybrid Voice Activity Detection.
    1. RMS energy pre-filter (~0.1ms) — fast rejection of silence
    2. WebRTC VAD verification (~0.5ms) — ML-based speech vs noise
    Calibrates once at startup, not every turn.
    """

    def __init__(self, rate: int = SAMPLE_RATE):
        self.rate = rate
        self.threshold_rms = 500
        self.calibrated = False

        self.vad = None
        if WEBRTC_AVAILABLE:
            try:
                self.vad = webrtcvad.Vad(2)  # Aggressiveness 0-3
                print("✅ WebRTC VAD active (aggressiveness: 2)")
            except Exception:
                self.vad = None

    def calibrate(self, stream):
        """Measure ambient noise once to set dynamic threshold."""
        if self.calibrated:
            return

        print("🤫 Calibrating ambient noise (1 second)...")
        noise_values = []
        num_chunks = int(self.rate / CHUNK)

        for _ in range(num_chunks):
            data = stream.read(CHUNK, exception_on_overflow=False)
            rms = audioop.rms(data, SAMPLE_WIDTH)
            noise_values.append(rms)

        if noise_values:
            avg_noise = sum(noise_values) / len(noise_values)
            self.threshold_rms = max(300, avg_noise + 500)
        else:
            self.threshold_rms = 500

        self.calibrated = True
        print(f"✅ Calibration done! RMS threshold: {int(self.threshold_rms)}")

    def is_speech(self, audio_chunk: bytes) -> bool:
        rms = audioop.rms(audio_chunk, SAMPLE_WIDTH)
        if rms < self.threshold_rms:
            return False

        if self.vad is not None:
            try:
                return self.vad.is_speech(audio_chunk, self.rate)
            except Exception:
                return True

        return True

# ============================================================================
# MICROPHONE MONITOR — Persistent Stream + Interrupt Detection
# ============================================================================

class MicrophoneMonitor:
    """
    Manages a persistent microphone stream.
    - record_until_silence(): captures speech, returns raw PCM
    - start/stop_interrupt_monitor(): background thread watches for
      user speech during AI playback and triggers interrupt
    - Overflow buffer preserves audio captured during interrupt detection
    """

    def __init__(self, vad: EnhancedVAD):
        self.vad = vad
        self.p = pyaudio.PyAudio()
        self.stream = None
        self._interrupt_thread: Optional[threading.Thread] = None
        self._monitoring = False
        self._overflow_buffer: deque = deque(maxlen=100)  # ~3s at 30ms/chunk

    def open(self):
        self.stream = self.p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=SAMPLE_RATE,
            input=True,
            frames_per_buffer=CHUNK
        )
        self.vad.calibrate(self.stream)
        print("🎤 Microphone ready\n")

    def close(self):
        self._monitoring = False
        if self._interrupt_thread and self._interrupt_thread.is_alive():
            self._interrupt_thread.join(timeout=2.0)
        if self.stream:
            try:
                self.stream.stop_stream()
                self.stream.close()
            except Exception:
                pass
        self.p.terminate()

    def read_chunk(self) -> bytes:
        return self.stream.read(CHUNK, exception_on_overflow=False)

    def record_until_silence(self) -> Optional[bytes]:
        """
        Record from speech start until silence.
        Drains overflow buffer first (captures audio from interrupt transition).
        Returns raw PCM bytes, or None if no speech detected.
        """
        frames = []
        silent_chunks = 0
        speaking_started = False
        silence_threshold = int(SILENCE_LIMIT * SAMPLE_RATE / CHUNK)

        # Drain overflow buffer from interrupt monitor
        buffered = list(self._overflow_buffer)
        self._overflow_buffer.clear()

        for chunk in buffered:
            frames.append(chunk)
            if self.vad.is_speech(chunk):
                speaking_started = True
                silent_chunks = 0
            elif speaking_started:
                silent_chunks += 1

        start_time = time.time()

        while True:
            if state.interrupt_requested:
                break

            chunk = self.read_chunk()
            frames.append(chunk)

            if time.time() - start_time > MAX_DURATION:
                print("⏳ Max duration reached (30s)")
                break

            if self.vad.is_speech(chunk):
                speaking_started = True
                silent_chunks = 0
            elif speaking_started:
                silent_chunks += 1

            if speaking_started and silent_chunks > silence_threshold:
                print("✅ Speech ended (silence detected)")
                break

        if not speaking_started:
            return None

        return b''.join(frames)

    def save_wav(self, pcm_data: bytes, filename: str):
        wf = wave.open(filename, 'wb')
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(SAMPLE_WIDTH)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm_data)
        wf.close()

    def start_interrupt_monitor(self):
        """Start background thread that watches for user speech during playback."""
        self._monitoring = True
        self._overflow_buffer.clear()
        self._interrupt_thread = threading.Thread(
            target=self._interrupt_monitor_loop,
            daemon=True
        )
        self._interrupt_thread.start()

    def stop_interrupt_monitor(self):
        self._monitoring = False
        if self._interrupt_thread and self._interrupt_thread.is_alive():
            self._interrupt_thread.join(timeout=2.0)
        self._interrupt_thread = None

    def _interrupt_monitor_loop(self):
        """Background thread: reads mic, detects speech, triggers interrupt."""
        consecutive_speech = 0

        while self._monitoring and not state.interrupt_requested:
            try:
                chunk = self.read_chunk()
                self._overflow_buffer.append(chunk)

                if self.vad.is_speech(chunk):
                    consecutive_speech += 1
                    if consecutive_speech >= INTERRUPT_DEBOUNCE:
                        print("\n🛑 User speech detected — interrupting AI!")
                        state.request_interrupt()
                        break
                else:
                    consecutive_speech = 0
            except Exception:
                break

# ============================================================================
# GROQ WHISPER STT — Ultra-fast cloud transcription (~0.3s)
# ============================================================================

async def transcribe_groq(filename: str) -> Optional[str]:
    """Transcribe audio via Groq Whisper API."""
    print("👂 Transcribing (Groq Whisper)...")
    start = time.time()

    try:
        with open(filename, 'rb') as f:
            file_content = f.read()

        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()
            data.add_field(
                'file',
                io.BytesIO(file_content),
                filename=os.path.basename(filename),
                content_type='audio/wav'
            )
            data.add_field('model', 'whisper-large-v3-turbo')
            data.add_field('language', 'tr')
            data.add_field('response_format', 'json')

            headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}

            async with session.post(GROQ_STT_URL, data=data, headers=headers) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    text = result.get('text', '').strip()
                    elapsed = (time.time() - start) * 1000
                    print(f"   ⏱️  STT: {elapsed:.0f}ms")
                    return text if text else None
                else:
                    error = await resp.text()
                    print(f"❌ Groq STT error ({resp.status}): {error}")
                    return None
    except Exception as e:
        print(f"❌ Groq STT error: {e}")
        return None

# ============================================================================
# STREAMING LLM — OpenRouter with SSE, yields sentences
# ============================================================================

async def stream_llm_response(
    user_text: str,
    conversation_history: ConversationHistory
) -> AsyncGenerator[str, None]:
    """
    Stream LLM response via OpenRouter SSE.
    Yields complete sentences as they form, enabling sentence-level TTS.
    """
    print("🧠 AI thinking (OpenRouter streaming)...")
    start = time.time()

    conversation_history.add_user_message(user_text)

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/DayCall/voice-ai",
        "X-Title": "DayCall Voice AI"
    }

    payload = {
        "model": "openrouter/aurora-alpha",
        "messages": conversation_history.get_messages_for_api(),
        "temperature": 0.9,
        "max_tokens": 800,
        "stream": True
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(OPENROUTER_URL, json=payload, headers=headers) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    print(f"❌ OpenRouter error ({resp.status}): {error}")
                    # Rollback user message
                    if conversation_history.messages and conversation_history.messages[-1]["role"] == "user":
                        conversation_history.messages.pop()
                    return

                buffer = ""
                first_token_time = None

                async for line in resp.content:
                    if state.interrupt_requested:
                        break

                    line_str = line.decode('utf-8').strip()
                    if not line_str or not line_str.startswith('data: '):
                        continue

                    data_str = line_str[6:]
                    if data_str == '[DONE]':
                        break

                    try:
                        data = json.loads(data_str)
                        delta = data.get('choices', [{}])[0].get('delta', {})
                        token = delta.get('content', '')

                        if token:
                            if first_token_time is None:
                                first_token_time = time.time()
                                print(f"   ⏱️  First token: {(first_token_time - start) * 1000:.0f}ms")

                            buffer += token

                            # Yield on sentence boundaries
                            stripped = buffer.rstrip()
                            if stripped and stripped[-1] in '.!?\n' and len(stripped) >= 10:
                                yield stripped
                                buffer = ""
                    except json.JSONDecodeError:
                        continue

                # Yield remaining text
                if buffer.strip():
                    yield buffer.strip()

                elapsed = (time.time() - start) * 1000
                print(f"   ⏱️  LLM total: {elapsed:.0f}ms")

    except Exception as e:
        print(f"❌ OpenRouter error: {e}")
        if conversation_history.messages and conversation_history.messages[-1]["role"] == "user":
            conversation_history.messages.pop()

# ============================================================================
# TTS + PLAYBACK — ElevenLabs sentence-by-sentence
# ============================================================================

async def speak_sentence(text: str, temp_file: str = "tts_temp.mp3") -> bool:
    """
    Convert one sentence to speech via ElevenLabs streaming endpoint and play it.
    Returns False if interrupted during download or playback.
    """
    try:
        url = f"{ELEVENLABS_TTS_URL}/{VOICE_ID}/stream"

        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }

        payload = {
            "text": text,
            "model_id": TTS_MODEL,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    print(f"❌ ElevenLabs error ({resp.status}): {error}")
                    return False

                # Download audio chunks
                chunks = []
                async for chunk in resp.content.iter_chunked(8192):
                    if state.should_stop_playback:
                        return False
                    if chunk:
                        chunks.append(chunk)

                if not chunks or state.should_stop_playback:
                    return False

                # Write to temp file
                with open(temp_file, 'wb') as f:
                    for c in chunks:
                        f.write(c)

                # Play audio in thread pool (blocking)
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, _play_audio_blocking, temp_file)

    except Exception as e:
        print(f"❌ TTS error: {e}")
        return False


def _play_audio_blocking(file_path: str) -> bool:
    """Play MP3 via pygame mixer. Returns False if interrupted."""
    try:
        pygame.mixer.music.load(file_path)
        pygame.mixer.music.play()

        while pygame.mixer.music.get_busy():
            if state.should_stop_playback:
                pygame.mixer.music.stop()
                break
            pygame.time.Clock().tick(30)

        # Unload to release file lock on Windows
        pygame.mixer.music.unload()

        # Cleanup
        try:
            os.remove(file_path)
        except Exception:
            pass

        return not state.should_stop_playback

    except Exception as e:
        print(f"❌ Playback error: {e}")
        return False

# ============================================================================
# MAIN PIPELINE — Event-driven conversation loop
# ============================================================================

async def ultra_fast_pipeline():
    """
    Main conversation loop.

    Flow:
    1. Listen (continuous mic, VAD-based speech detection)
    2. Transcribe (Groq Whisper, ~0.3s)
    3. Generate + Speak (streaming LLM → sentence-by-sentence TTS)
    4. During speaking: background thread monitors mic for interruption
    5. On interrupt: stop playback, loop back to step 1
    """
    vad = EnhancedVAD()
    mic = MicrophoneMonitor(vad)
    conversation_history = ConversationHistory(max_messages=20)
    audio_file = "ultra_fast_input.wav"

    print("\n" + "=" * 60)
    print("🚀 ULTRA-FAST CORE v2.0 — Natural Conversation AI")
    print("=" * 60)
    print("💡 Speak naturally. You can interrupt me anytime.")
    print("💡 Say 'çık' or 'kapat' to exit.\n")

    # Initialize pygame mixer once (avoid per-sentence init/quit latency)
    pygame.mixer.init()

    try:
        mic.open()
    except Exception as e:
        print(f"❌ Microphone error: {e}")
        return

    try:
        while True:
            # Reset state for new turn
            state.reset_interrupt()
            state.set_state(ConversationState.IDLE)

            # ── PHASE 1: Listen ──────────────────────────────────────
            print("🎤 Listening...")
            state.set_state(ConversationState.LISTENING)

            pcm_data = await asyncio.get_event_loop().run_in_executor(
                None, mic.record_until_silence
            )

            if pcm_data is None:
                continue

            mic.save_wav(pcm_data, audio_file)

            # ── PHASE 2: Transcribe ──────────────────────────────────
            state.set_state(ConversationState.PROCESSING)

            user_text = await transcribe_groq(audio_file)

            if not user_text:
                print("⚠️  Could not understand audio, try again")
                continue

            print(f"🗣️  You: {user_text}")

            # Exit command
            if any(w in user_text.lower() for w in ["çık", "kapat", "exit", "quit"]):
                print("\n👋 Görüşmek üzere!")
                break

            # ── PHASE 3: Generate + Speak (streaming) ────────────────
            state.set_state(ConversationState.SPEAKING)

            # Start interrupt monitoring (background thread reads mic)
            mic.start_interrupt_monitor()

            full_response = ""
            sentence_count = 0
            interrupted = False

            async for sentence in stream_llm_response(user_text, conversation_history):
                if state.interrupt_requested:
                    interrupted = True
                    break

                sentence_count += 1
                full_response += sentence + " "

                # Print response
                if sentence_count == 1:
                    print(f"🤖 AI: {sentence}", end="", flush=True)
                else:
                    print(f" {sentence}", end="", flush=True)

                # Speak this sentence (blocks until playback finishes or interrupt)
                success = await speak_sentence(sentence)

                if not success or state.interrupt_requested:
                    interrupted = True
                    break

            print()  # Newline after response

            # Stop interrupt monitor
            mic.stop_interrupt_monitor()

            # Save whatever response we got to history
            if full_response.strip():
                conversation_history.add_assistant_message(full_response.strip())

            if interrupted:
                print("⚡ Interrupted! Listening to you...")

            msg_count = conversation_history.get_message_count()
            print(f"   💬 History: {msg_count} messages")
            print("-" * 60)

    except KeyboardInterrupt:
        print("\n\n⚠️  Stopped by user (Ctrl+C)")
    finally:
        mic.stop_interrupt_monitor()
        mic.close()
        try:
            pygame.mixer.quit()
        except Exception:
            pass

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    pygame.init()
    try:
        asyncio.run(ultra_fast_pipeline())
    except KeyboardInterrupt:
        print("\n👋 Program terminated.")
    finally:
        pygame.quit()
