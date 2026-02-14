# DayCall — AI Voice Journal

A proactive AI journaling assistant that conducts voice-based reflection sessions, transcribes conversations, and generates structured journal entries. Think "Her" meets daily journaling.

## 🎯 Project Overview

DayCall combines real-time voice AI with journaling to create a proactive wellness tool. Instead of typing entries, users have a natural conversation with an emotionally intelligent AI companion about their day. The app reminds them via push notifications and converts each session into a structured journal entry with mood analysis.

## 🏗️ Architecture

### Voice AI (Gemini Live API)
- **Model**: Gemini 2.5 Flash — native audio mode
- **Protocol**: Single persistent WebSocket — audio in, audio out
- **Latency**: ~500ms (zero-pipeline: no separate STT or TTS)
- **Features**: Server-side VAD, built-in interruption handling, conversation context

### Backend (FastAPI)
- **Framework**: FastAPI with async/await
- **Database**: MongoDB Atlas (free tier) with Beanie ODM
- **Authentication**: JWT-based auth
- **Real-time**: WebSocket proxy to Gemini Live API (per-client sessions)
- **Post-call**: Transcription → Summarization → Mood analysis pipeline
- **Scheduling**: APScheduler for push notification timing
- **Storage**: S3/Cloud Storage for audio recordings

### Frontend (Expo/React Native)
- **Framework**: Expo with TypeScript
- **Navigation**: Expo Router (file-based)
- **Styling**: NativeWind (TailwindCSS)
- **State**: Zustand
- **Audio**: expo-av for raw PCM capture/playback over WebSocket
- **Design**: Claude Palette (warm, academic aesthetic)

## 📁 Project Structure

```
DayCall/
├── DayCallAIModel/                 # Voice AI prototype & server
│   ├── server.py                   # FastAPI WebSocket proxy to Gemini
│   ├── direct_voice_agent.py       # Desktop voice agent (local testing)
│   ├── test_client.py              # WebSocket test client (simulates app)
│   ├── ultra_fast_core.py          # Legacy: ultra-fast voice pipeline
│   ├── pipeline.py                 # Legacy: STT→LLM→TTS pipeline
│   ├── native_input.py             # Legacy: native audio input
│   ├── requirements.txt            # Python dependencies
│   └── .env                        # API keys (not committed)
│
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py             # Authentication endpoints
│   │   │   ├── settings.py         # User settings & scheduling
│   │   │   ├── journal.py          # Journal entry endpoints
│   │   │   └── voice.py            # WebSocket audio proxy (from server.py)
│   │   ├── services/
│   │   │   ├── gemini.py           # Gemini Live API integration
│   │   │   ├── transcription.py    # Post-call transcription service
│   │   │   └── summarization.py    # Journal entry generation & mood analysis
│   │   ├── config.py               # Environment configuration
│   │   ├── database.py             # Database setup
│   │   ├── models.py               # SQLAlchemy models
│   │   ├── schemas.py              # Pydantic schemas
│   │   └── auth.py                 # Auth utilities
│   ├── main.py                     # FastAPI app entry point
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Environment template
│
└── frontend/
    ├── app/
    │   ├── (auth)/
    │   │   └── login.tsx           # Login screen
    │   ├── (tabs)/
    │   │   ├── index.tsx           # Journal timeline
    │   │   └── settings.tsx        # Settings screen
    │   ├── entry/
    │   │   └── [id].tsx            # Entry detail view
    │   └── _layout.tsx             # Root layout
    ├── components/
    │   ├── AudioPlayer.tsx         # Audio playback component
    │   └── MoodChart.tsx           # Mood visualization
    ├── tailwind.config.js          # Claude palette config
    ├── package.json                # Node dependencies
    └── app.json                    # Expo configuration
```

## 🔊 How the Voice AI Works

```
┌─────────────────────────────────────────────────────────┐
│ Mobile App (Expo)                                       │
│   Mic → PCM 16kHz → [WebSocket] → PCM 24kHz → Speaker  │
└───────────────────────┬─────────────────────────────────┘
                        │ ws://server/ws/audio
┌───────────────────────▼─────────────────────────────────┐
│ Backend (FastAPI)                                       │
│   Client audio → [Gemini Live API] → AI audio           │
│                  ↓ (post-call)                          │
│   Saved audio → Transcription → Summary → PostgreSQL    │
└─────────────────────────────────────────────────────────┘
```

Each client connection gets its own isolated Gemini session. Audio is streamed bidirectionally in real-time with ~500ms latency. After the call ends, the server runs a post-processing pipeline to generate the journal entry.

## 🚀 Getting Started

### Voice AI Server (Quick Test)

1. **Install dependencies**
   ```bash
   cd DayCallAIModel
   pip install google-genai fastapi uvicorn python-dotenv
   ```

2. **Configure API key**
   ```bash
   # Create .env file with:
   GOOGLE_API_KEY=your_key_here
   ```

3. **Start the server**
   ```bash
   python server.py
   ```
   Server runs at `http://0.0.0.0:8000`

4. **Test with the local client**
   ```bash
   # In another terminal:
   pip install websockets pyaudio
   python test_client.py
   ```

### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run the server**
   ```bash
   uvicorn main:app --reload
   ```
   API at `http://localhost:8000` — docs at `http://localhost:8000/docs`

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start Expo dev server**
   ```bash
   npm start
   ```

3. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go for physical device

## 🎨 Design System

The app uses the **Claude Palette** for a warm, academic aesthetic:

| Token | Color | Usage |
|---|---|---|
| Background | `#F5F2EB` | Warm beige, paper-like |
| Text | `#2D2926` | Warm charcoal |
| Accent | `#DA7756` | Terracotta orange |
| Typography | Serif headings, sans-serif body | Academic feel |

## 🔑 Key Features

1. **Real-time Voice Conversations** — Gemini Live API, ~500ms latency
2. **Natural Interruptions** — Speak anytime, AI stops and listens
3. **Automatic Transcription** — Post-call voice-to-text
4. **AI Journal Entries** — Structured summaries with mood analysis
5. **Audio Playback** — Review original conversations
6. **Mood Tracking** — Visualize emotional trends over time
7. **Push Notifications** — Proactive reminders to journal

## 📊 Database Schema

- **Users**: Authentication, preferences, notification settings
- **JournalEntries**: Transcripts, AI summaries, mood scores, timestamps
- **VoiceSessions**: Duration, audio file path, Gemini session metadata

## 🔐 Environment Variables

### Backend (.env)
```
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/daycall?retryWrites=true&w=majority
GOOGLE_API_KEY=AIzaSy...
JWT_SECRET_KEY=...
```

## 📝 API Endpoints

### REST
- `POST /auth/register` — User registration
- `POST /auth/login` — User login
- `GET /auth/me` — Current user info
- `PATCH /settings/schedule` — Update notification schedule
- `GET /journal/entries` — List journal entries (paginated)
- `GET /journal/entries/{id}` — Entry detail with transcript & summary

### WebSocket
- `WS /ws/audio` — Bidirectional audio streaming (PCM)

## 🛠️ Development Notes

- **Type Safety**: Python type hints + TypeScript strict mode
- **Async First**: All DB operations (Motor/Beanie) and API calls are async
- **Zero Pipeline**: Voice AI uses native audio — no STT/TTS chain
- **Claude Palette**: Strictly enforced across all UI components

## 📄 License

Private project — All rights reserved

---

**Built with ❤️ using Gemini Live API, FastAPI, Expo, and the Claude Palette**