# EstateVoice AI – Phase 2

> **Tagline:** *Turning conversations into property visits.*  
> **Brand:** DreamSpace Realty, Bangalore

EstateVoice AI is a real estate AI sales assistant application designed to automate property inquiry handling, extract buyer intent and budget preferences, recommend Bangalore properties, and drive site visit bookings.

---

## What's New in Phase 2

- **Google Gemini Integration:** Connected using the official `google-genai` SDK with API key stored in `.env`.
- **Active AI Sales Assistant:** Real conversational responses from Google Gemini grounded strictly in the 30 verified DreamSpace Bangalore properties.
- **Structured Profile Extraction:** Automatically tracks customer name, preferred location, budget, BHK, timeline, visit interest, visit slot, sentiment, and AI lead score in real time.
- **Multilingual Support:** Fully converses in **English**, **Kannada (ಕನ್ನಡ)**, and **Hindi (हिन्दी)**.
- **Speech-to-Text (STT):** Implemented using the browser Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) with language-specific acoustic models (`en-IN`, `kn-IN`, `hi-IN`).
- **Text-to-Speech (TTS):** Implemented using browser Speech Synthesis (`SpeechSynthesisUtterance`).
- **Microphone Feedback Suppression:** Automatically halts microphone capture during AI voice playback and safely resumes after speech finishes.
- **Graceful Fallback:** Seamless text input fallback if microphone access is blocked or speech recognition is unsupported.
- **Conversation Session Persistence:** SQLite storage via SQLAlchemy for call sessions (`call_sessions`) and transcripts (`chat_messages`).
- **Call Session Endpoints:** Full FastAPI suite for starting calls, sending messages, ending sessions with AI summaries, and fetching call logs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI LLM** | Google Gemini (`google-genai` SDK, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.8-flash`) |
| **Voice AI** | Web Speech API (STT) + Browser Speech Synthesis (TTS) |
| **Frontend** | React 18, Vite 6, Tailwind CSS 3, Lucide React, Recharts |
| **Backend** | FastAPI, Python 3.13, Pydantic V2 |
| **Database** | SQLite, SQLAlchemy 2.0 (`properties`, `call_sessions`, `chat_messages`, `leads`, `appointments`) |
| **Dataset** | 30 Bangalore properties in JSON (`data/properties.json`) & SQLite (`data/estatevoice.db`) |
| **Testing** | Pytest, HTTPX TestClient |

---

## UI & Theme Design

- **Forest Green:** `#14532D`
- **Emerald Green:** `#10B981`
- **Background:** `#F8F9F5`
- **Cards:** White `#FFFFFF` with soft border `#E2E8F0`
- **Typography:** Inter
- **Navigation:** Collapsible responsive sidebar

---

## Application Pages (7 Pages)

1. **Dashboard:** Live KPI cards derived from the SQLite property database, Recharts visual analytics (Location distribution & BHK breakdown), and recent properties.
2. **AI Voice Agent:** Real-time voice calls powered by Google Gemini, Web Speech STT/TTS, multilingual selector (English, Kannada, Hindi), live transcript stream, real-time extracted buyer profile, and dynamically matching property recommendations.
3. **Properties:** Property portfolio connected to FastAPI with search and multi-parameter filters (location, BHK, budget, property type, availability).
4. **Leads:** Customer table showing budget, AI lead score (0-100), sentiment badges, and a modal to record leads.
5. **Appointments:** Scheduled property visits table and site tour booking modal.
6. **Call History:** Historical Gemini voice sessions, audio durations, language badges, AI summaries, and full transcript modal.
7. **Settings:** Language preferences, agent persona configuration, and live backend connection indicators.

---

## 30 Bangalore Properties Dataset

Synthesized realistic properties situated in Bangalore's premier micro-markets:
- **Whitefield:** Prestige Willow Park, Assetz Marq, Total Environment Windmills, Embassy Grove, Brigade Cosmopolis, Provident Capella, Prestige White Meadows.
- **Electronic City:** Godrej Royale Woods, Concorde Silicon Elite, Shriram Summit, Sobha Silicon Oasis, Ajmera Infinity, GM Infinite.
- **Sarjapur:** Sobha Lake Haven Villas, Mana Capitol Duplex, Bren Starlight, Rohan Iksha, SJR Palazza, Confident Leo.
- **Hebbal:** Brigade Horizon Sky Penthouse, SNN Clermont Luxury Suites, L&T Raintree Boulevard, Godrej Platinum, Brigade Caladium.
- **Yelahanka:** Puravankara Palm Vista, Arvind Bel Air, Vaishnavi Serene, Purva Venezia, Godrej Avenues, RMZ Galleria.

---

## FastAPI Backend Endpoints

### Properties & Stats
- `GET /api/health` — Service status, database connectivity test, version info.
- `GET /api/properties` — Paginated list with search and filters (`location`, `bhk`, `min_price`, `max_price`, etc.).
- `GET /api/properties/{id}` — Single property details by integer ID or alphanumeric `property_id`.
- `GET /api/properties/stats` — Aggregated inventory metrics.

### AI Voice Agent Sessions
- `POST /api/calls/start` — Initializes a call session, generates opening greeting from Gemini in selected language, creates session in SQLite.
- `POST /api/calls/{session_id}/message` — Sends customer transcript or text input to Gemini, receives natural spoken response + updated profile + recommended properties.
- `POST /api/calls/{session_id}/end` — Completes call, generates AI summary and outcome, logs duration, and creates visit appointments if requested.
- `GET /api/calls` — Lists all previous call sessions.
- `GET /api/calls/{session_id}` — Retrieves full session transcript and metadata.

---

## Quick Start & Startup Commands

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+)

### 1. Backend Setup & Run

```bash
# Navigate to backend
cd backend

# Create virtual environment (if needed)
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

# Install dependencies (includes google-genai)
pip install -r requirements.txt

# Start FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be accessible at:
- API Root: `http://localhost:8000/`
- Interactive Swagger UI: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`

### 2. Frontend Setup & Run

```bash
# In a new terminal, navigate to frontend
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```

Frontend will be accessible at:
- Web Application: `http://localhost:5173/`

### 3. Running Backend Tests

```bash
cd backend
.\venv\Scripts\pytest tests -v
```

All 15 automated test cases verify health, property filtering, call start, Gemini message dialogue, profile extraction, call summaries, and session retrieval.
