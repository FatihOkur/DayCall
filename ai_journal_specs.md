# Project Specification: AI Voice Journal (VibeCode Context)

## 1. Project Overview
**Application Name:** AI Voice Journal (Code Name: `Antigravity-Journal`)
**Core Concept:** A proactive AI journaling assistant that initiates phone calls (or VoIP calls) to the user at scheduled times to conduct a voice-based reflection session. The AI acts as an empathetic listener, transcribes the conversation, and summarizes the day into a text-based journal entry.

## 2. Technology Stack

### Backend (API & Logic)
* **Framework:** FastAPI (Python 3.10+)
* **Database:** PostgreSQL
* **ORM:** SQLAlchemy (Async) or Prisma Client Python
* **Task Queue (Crucial for scheduling calls):** Celery or ARQ (Redis backed)
* **AI/LLM:** OpenAI Realtime API or LangChain integration for conversational flow.
* **Voice/Telephony:** Twilio (for PSTN calls) or Expo WebRTC (for VoIP). *Assume Twilio/SIP interface for the MVP.*

### Frontend (Mobile App)
* **Framework:** Expo (React Native)
* **Language:** TypeScript
* **Navigation:** Expo Router (File-based routing)
* **Styling:** NativeWind (TailwindCSS) or Restyle
* **State Management:** Zustand or TanStack Query

## 3. Core Features & "Vibe" Requirements

### The "Vibe"
* **Minimalist & Calm:** The UI should feel serene. Dark mode default.
* **Voice-First:** The primary interaction is speaking, not typing.
* **Proactive:** The app works for you; you don't have to remember to open it.

### Key Functionality
1.  **User Onboarding:**
    * Sign up/Login.
    * **Preference Setup:** User sets a "Call Window" (e.g., "Call me at 9:00 PM").
    * **Voice Persona:** User selects the AI's voice/personality (e.g., "Empathetic Friend," "Stoic Coach").
2.  **The Call (The Core Loop):**
    * **Scheduler:** Backend triggers a call at the specified time.
    * **Conversation:** AI asks open-ended questions: *"How was your day?", "What was the highlight?"*
    * **Transcription:** Audio is recorded and transcribed (Whisper).
3.  **Journal Generation:**
    * After the call, the AI summarizes the transcript into a structured journal entry (Summary, Mood, Key Events).
    * User receives a push notification when the entry is ready.
4.  **Review Mode:**
    * User opens the app to read the summary or listen to the audio playback.

## 4. Database Schema (Draft)

The generated code must support the following relational structure:

* **Users Table:** `id`, `email`, `phone_number`, `timezone`, `preferred_call_time`
* **JournalEntries Table:** `id`, `user_id`, `created_at`, `audio_url`, `transcript_text`, `ai_summary_markdown`, `mood_score`
* **CallLogs Table:** `id`, `entry_id`, `duration_seconds`, `status` (completed, missed, failed)

## 5. API Endpoint Requirements (FastAPI)

The backend should be structured with `APIRouter` modules:

### `/auth`
* Standard JWT authentication.

### `/settings`
* `PATCH /schedule`: Update the preferred calling time.
* `POST /test-call`: Trigger an immediate test call to the user.

### `/journal`
* `GET /entries`: List historical entries with pagination.
* `GET /entries/{id}`: detailed view including transcript.

### `/webhooks` (Voice Interface)
* `POST /voice/incoming`: Handle incoming call logic (if user calls back).
* `POST /voice/status`: Webhook for call status updates (ringing, answered, completed).

## 6. Frontend Scaffolding Instructions (Expo)

* **Directory Structure:** Use Expo Router conventions (`app/` directory).
* **Screens Needed:**
    * `app/(auth)/login.tsx`: Clean login screen.
    * `app/(tabs)/index.tsx`: Timeline of past journal entries (Card layout).
    * `app/(tabs)/settings.tsx`: Time picker for scheduling calls.
    * `app/entry/[id].tsx`: Detail view with Audio Player and Markdown renderer.
* **Components:**
    * `AudioPlayer`: Custom playback component with waveform visualization.
    * `MoodChart`: Simple visualization of weekly mood based on AI analysis.

## 7. Design System & UI Mandates (CRITICAL)

**You must strictly adhere to the "Claude Palette" for all UI elements.**

1.  **Configuration:** You must initialize `tailwind.config.js` with the specific color codes provided in the accompanying file `claude_palette.md`.
2.  **Implementation:**
    * **Do not** use default Tailwind colors (e.g., avoid generic `bg-white`, `bg-gray-100`).
    * **Backgrounds:** Use `bg-claude-bg` (#F5F2EB) for all main screens to ensure a warm, paper-like feel.
    * **Typography:** Use `text-claude-text` (#2D2926) for body text. Use a **Serif font** (like Merriweather or system serif) for Headings to capture the "Academic/Journal" aesthetic.
    * **Dark Mode:** Implement the `darkClaude` colors defined in the palette file.

## 8. Development Guidelines for AI Generator

1.  **Type Safety:** All Python code must be fully typed (Pydantic models for all Request/Response bodies). All TypeScript code must use strict interfaces.
2.  **Async First:** Use `async def` for all FastAPI route handlers and database calls.
3.  **Environment Variables:** Create a `.env.example` template including `DATABASE_URL`, `OPENAI_API_KEY`, and `TWILIO_AUTH_TOKEN`.
4.  **Code Comments:** Explain the "Antigravity" logic—specifically how the background scheduler connects to the voice API.