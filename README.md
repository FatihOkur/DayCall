# AI Voice Journal (Antigravity-Journal)

A proactive AI journaling assistant that initiates phone calls to conduct voice-based reflection sessions, transcribes conversations, and generates structured journal entries.

## 🎯 Project Overview

This application combines voice AI technology with journaling to create a unique, proactive wellness tool. Instead of requiring users to remember to journal, the AI calls them at scheduled times for a natural conversation about their day.

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with async/await
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT-based auth
- **Voice Integration**: Twilio for telephony
- **AI**: OpenAI API for conversation and summarization
- **Task Queue**: Celery/ARQ for scheduled calls

### Frontend (Expo/React Native)
- **Framework**: Expo with TypeScript
- **Navigation**: Expo Router (file-based)
- **Styling**: NativeWind (TailwindCSS)
- **State**: Zustand
- **Design**: Claude Palette (warm, academic aesthetic)

## 📁 Project Structure

```
DayCall/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py          # Authentication endpoints
│   │   │   ├── settings.py      # User settings & scheduling
│   │   │   ├── journal.py       # Journal entry endpoints
│   │   │   └── webhooks.py      # Twilio voice webhooks
│   │   ├── config.py            # Environment configuration
│   │   ├── database.py          # Database setup
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   └── auth.py              # Auth utilities
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Environment template
│
└── frontend/
    ├── app/
    │   ├── (auth)/
    │   │   └── login.tsx        # Login screen
    │   ├── (tabs)/
    │   │   ├── index.tsx        # Journal timeline
    │   │   └── settings.tsx     # Settings screen
    │   ├── entry/
    │   │   └── [id].tsx         # Entry detail view
    │   └── _layout.tsx          # Root layout
    ├── components/
    │   ├── AudioPlayer.tsx      # Audio playback component
    │   └── MoodChart.tsx        # Mood visualization
    ├── tailwind.config.js       # Claude palette config
    ├── package.json             # Node dependencies
    └── app.json                 # Expo configuration
```

## 🚀 Getting Started

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the server**
   ```bash
   uvicorn main:app --reload
   ```

   API will be available at `http://localhost:8000`
   API docs at `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Expo development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## 🎨 Design System

The app uses the **Claude Palette** for a warm, academic aesthetic:

- **Background**: `#F5F2EB` (warm beige, paper-like)
- **Text**: `#2D2926` (warm charcoal)
- **Accent**: `#DA7756` (terracotta orange)
- **Typography**: Serif fonts for headings, sans-serif for body

All colors are configured in `frontend/tailwind.config.js` and applied throughout the app.

## 🔑 Key Features

1. **Scheduled Voice Calls**: AI calls users at their preferred time
2. **Natural Conversations**: OpenAI-powered empathetic dialogue
3. **Automatic Transcription**: Voice-to-text conversion
4. **AI Summaries**: Structured journal entries with mood analysis
5. **Audio Playback**: Review original conversations
6. **Mood Tracking**: Visualize emotional trends over time

## 📊 Database Schema

- **Users**: Authentication, phone number, call preferences
- **JournalEntries**: Transcripts, summaries, mood scores
- **CallLogs**: Call duration, status, Twilio metadata

## 🔐 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ai_journal
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=...
```

## 🛠️ Development Notes

- **Type Safety**: All Python code uses type hints; all TypeScript uses strict mode
- **Async First**: All database operations and API calls are async
- **Claude Palette**: Strictly enforced across all UI components
- **Voice-First**: Primary interaction is speaking, not typing

## 📝 API Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Current user info
- `PATCH /settings/schedule` - Update call schedule
- `POST /settings/test-call` - Trigger immediate test call
- `GET /journal/entries` - List journal entries (paginated)
- `GET /journal/entries/{id}` - Get entry details
- `POST /webhooks/voice/incoming` - Twilio incoming call handler
- `POST /webhooks/voice/status` - Twilio status updates

## 🎯 Next Steps

1. Set up PostgreSQL database
2. Configure Twilio account and phone number
3. Implement Celery task queue for scheduled calls
4. Connect OpenAI Realtime API for conversations
5. Add push notifications for completed entries
6. Implement audio storage (S3/Cloud Storage)

## 📄 License

Private project - All rights reserved

---

**Built with ❤️ using FastAPI, Expo, and the Claude Palette**