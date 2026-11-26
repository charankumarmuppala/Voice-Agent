# EstateVoice AI – Autonomous Real Estate Sales Agent

> **Turning customer voice conversations into confirmed property site visits with AI-driven intelligence.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)
[![LangGraph](https://img.shields.io/badge/LangGraph-StateGraph-1C3C3C?style=flat&logo=langchain&logoColor=white)](https://www.langchain.com/langgraph)
[![FAISS](https://img.shields.io/badge/FAISS-Vector_Search-0468FF?style=flat)](https://github.com/facebookresearch/faiss)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0+-D71F00?style=flat&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](LICENSE)

---

## 1. Project Overview

**EstateVoice AI** is a production-tested, autonomous conversational real estate sales agent built for **DreamSpace Realty**, a premier property consultancy based in Bengaluru, India. 

The system conducts continuous, human-like voice conversations with potential home buyers. It understands spoken requirements in natural language (English, Kannada, and Hindi), autonomously converts currency formats (e.g., *"1.5 Crore"* to `₹15,000,000`), performs sub-second semantic property searches using Retrieval-Augmented Generation (RAG), schedules in-person site visits, verifies contact details digit-by-digit and letter-by-letter, and automatically dispatches personalized PDF brochures with site visit passes directly to the buyer's inbox.

---

## 2. Business Problem and Proposed Solution

### The Business Challenge
In major metropolitan real estate markets, digital lead response time directly determines sales conversion:
- **Lead Drop-off:** Inbound leads contacted after 30 minutes experience a **72% decline in qualification rate**.
- **High Telecaller Costs:** Real estate brokerages spend over ₹35,000 per month per human sales representative, with inconsistent lead qualification and limited working hours.
- **Data Capture Errors:** Spoken phone numbers and email addresses are frequently misspelled by sales reps, resulting in failed follow-ups and lost revenue.
- **Delayed Follow-ups:** Sending property brochures and site visit confirmations manually often takes hours or days.

### The EstateVoice AI Solution
EstateVoice AI completely automates the top-of-funnel real estate sales cycle:
1. **Instant Voice Engagement:** Zero waiting time; greets inbound customers in under 1.5 seconds with local Bengaluru warmth (*"Namaskara! Welcome to DreamSpace Realty..."*).
2. **Autonomous Retrieval:** Immediately matches verified inventory across top Bengaluru tech hubs (Whitefield, Electronic City, Sarjapur, Hebbal) without requiring awkward confirmation turns.
3. **High-Accuracy Contact Verification:** Validates phone numbers digit-by-digit and parses spoken emails letter-by-letter to guarantee zero delivery failures.
4. **Instant Multi-Channel Fulfillment:** Compiles a branded, vector-graphic PDF brochure and delivers it via SMTP email in the background while the call concludes naturally.

---

## 3. Key Implemented Features

### 1. Autonomous Property Search & Semantic RAG
- Automatically extracts customer location, BHK, and budget preferences in the same conversational turn.
- Executes real-time hybrid search (SQL filtering + FAISS cosine similarity) using multilingual sentence embeddings.
- Immediately speaks matching property details without waiting for filler confirmations like *"Okay"* or *"Continue"*.
- Concurrently sends matching property cards to the frontend UI carousel.

### 2. Spoken Phone Number Verification
- Never assumes, generates, or autofills fake contact numbers.
- Transcribes individually spoken digits and standardizes them into E.164 / 10-digit Indian mobile format (+91).
- Reads back the number digit-by-digit for explicit buyer confirmation before saving to the database.

### 3. Spoken Email Extraction & Token Parsing
- Understands spoken emails, converting spoken phrases (e.g., *"charan dot kumar at gmail dot com"*) into valid email formats (`charan.kumar@gmail.com`).
- Reads back the complete email spelling to the customer for verbal confirmation or correction.

### 4. Automated Booking Confirmation & Dynamic PDF Brochure
- Collects desired site visit slots (e.g., Saturday 11:00 AM) and reserves the appointment.
- Dynamically renders an enterprise-grade PDF brochure using **ReportLab**, containing property specs, pricing, amenities, and a personalized site visit pass.
- Dispatches the email in the background over TLS SMTP without causing audio stutter or call lag.

### 5. Smart Contextual Memory & Fallback Engine
- Maintains full conversational history and buyer profile in session state.
- Employs non-destructive profile merging: newly extracted details are merged without overwriting previous answers.
- Asks only for missing information, preventing repeated questions.
- Built-in multi-model fallback (`gemini-2.5-flash` → `gemini-1.5-flash` → deterministic regex) ensures uninterrupted call flow even during upstream API quota limits.

### 6. Interactive Voice Studio & Executive Dashboard
- **Voice Studio:** Features a live animated wave visualizer, dual-pane live transcript, session timer, and real-time extracted profile cards.
- **CRM & Analytics Dashboard:** Visualizes total calls, conversion rates, pipeline value, lead sentiment breakdown, and scheduled site visits with dispatch tracking.

---

## 4. Technology Stack

### Frontend Architecture
- **Framework:** React 18.3 (Single Page Application)
- **Tooling & Build:** Vite 6.0
- **Styling:** Tailwind CSS 3.4
- **Icons & Visualization:** Lucide React, Recharts 2.13
- **Audio Processing:** Browser-native Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)

### Backend Architecture
- **API Framework:** FastAPI 0.115+ (ASGI, fully asynchronous)
- **Web Server:** Uvicorn 0.30+
- **Data Validation:** Pydantic V2 & Pydantic-Settings
- **Database ORM:** SQLAlchemy 2.0+
- **Document Generation:** ReportLab 5.1 (dynamic PDF engine)
- **Email Delivery:** Python `smtplib` with MIME multipart attachments over TLS

### AI & Machine Learning Pipeline
- **Reasoning LLM:** Google Gemini 2.5 Flash / Flash Lite (via `google-genai` SDK 3.6+)
- **Agent Orchestration:** LangGraph 1.2+ (StateGraph state machine)
- **Vector Embeddings:** Sentence Transformers (`paraphrase-multilingual-MiniLM-L12-v2`)
- **Vector Search:** FAISS CPU 1.16+ (`IndexFlatIP` normalized cosine similarity)
- **Currency Normalizer:** Custom NLP parser for Indian numbering systems (Crores, Lakhs)

---

## 5. System Architecture

![EstateVoice AI System Architecture](docs/system-architecture.png)

EstateVoice AI is organized into five decoupled layers ensuring low latency, high audio responsiveness, and clean separation of concerns.

### Architectural Flow Summary
1. **Client Audio Layer:** Captures the customer's voice stream through the browser microphone, converts audio to text in real-time via Web Speech STT, and manages the audio visualizer.
2. **API Gateway Layer:** FastAPI receives requests, routes messages to active session contexts, and delegates CPU-bound or network-bound tasks to async background workers.
3. **AI Orchestration Layer:** LangGraph manages the multi-turn conversational state machine, invoking Google Gemini for natural dialogue and structured entity extraction.
4. **Retrieval-Augmented Generation Layer:** Embeds customer queries using multilingual Sentence Transformers and executes vector similarity searches across the FAISS index.
5. **Storage & Dispatch Layer:** Persists transactional appointments and lead records in SQLite, renders high-resolution PDF brochures using ReportLab, and dispatches confirmation emails via SMTP.

---

## 6. End-to-End Workflow

```
[1] Customer initiates call
    │
    ▼
[2] Agent greets: "Namaskara! Welcome to DreamSpace Realty. May I know your name?"
    │
    ▼
[3] Customer provides Name, Budget & Location (e.g., "Charan, looking for 3BHK in Whitefield under 1.5 Cr")
    │
    ▼
[4] Backend merges profile without overwriting; converts "1.5 Cr" to ₹15,000,000
    │
    ▼
[5] Autonomous RAG search executes immediately in FAISS vector database
    │
    ▼
[6] Agent describes top-matching property & displays cards in the frontend carousel
    │
    ▼
[7] Customer selects a site visit time (e.g., "Saturday 11 AM")
    │
    ▼
[8] Agent requests phone number ──► Customer speaks digits ──► Agent reads back digits for confirmation
    │
    ▼
[9] Agent requests email ──► Customer speaks email ──► Agent reads back spelling for confirmation
    │
    ▼
[10] Appointment confirmed in CRM ──► Background task triggers PDF generation & SMTP email dispatch
    │
    ▼
[11] Agent asks if customer has questions ──► Concludes politely ──► Call ends automatically
```

---

## 7. Project Folder Structure

```text
voice agent/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── routes/
│   │   │   ├── appointments.py      # Lead & Appointment endpoints
│   │   │   ├── calls.py             # Call lifecycle & message routing
│   │   │   ├── properties.py        # Property catalog & stats endpoints
│   │   │   └── voice.py             # Voice status & conversational endpoints
│   │   ├── services/
│   │   │   ├── brochure_service.py  # ReportLab dynamic PDF generation
│   │   │   ├── conversation_graph.py# LangGraph StateGraph orchestration
│   │   │   ├── email_service.py     # SMTP email delivery with attachments
│   │   │   └── gemini_service.py    # Gemini LLM reasoning & entity extraction
│   │   ├── config.py                # Environment configuration & Pydantic settings
│   │   ├── database.py              # SQLAlchemy engine & session factory
│   │   ├── embeddings.py            # Sentence Transformers & FAISS index
│   │   ├── main.py                  # FastAPI application entrypoint & lifespan
│   │   ├── models.py                # Database models (Property, Lead, Appointment, CallSession)
│   │   ├── schemas.py               # Pydantic request/response schemas
│   │   └── seed.py                  # Seed database with 30+ Bengaluru properties
│   ├── data/
│   │   └── estatevoice.db           # SQLite database file
│   ├── tests/
│   │   ├── test_appointments.py     # Appointment booking test suite
│   │   └── test_calls.py            # Call session test suite
│   ├── requirements.txt             # Python backend dependencies
│   └── test_live_call.py            # CLI test script for end-to-end call verification
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Top navigation bar
│   │   │   ├── PropertyCard.jsx     # Property card component with badges
│   │   │   ├── Sidebar.jsx          # Dashboard navigation sidebar
│   │   │   └── StatsCard.jsx        # KPI metric card component
│   │   ├── pages/
│   │   │   ├── Appointments.jsx     # Site visits & email dispatch status
│   │   │   ├── CallHistory.jsx      # Historical call transcripts & duration
│   │   │   ├── Dashboard.jsx        # Real-time analytics & pipeline charts
│   │   │   ├── Leads.jsx            # Lead qualification CRM table
│   │   │   ├── Properties.jsx       # Property search & filtering catalog
│   │   │   ├── Settings.jsx         # System preferences & agent configuration
│   │   │   └── VoiceAgent.jsx       # Interactive voice studio with audio visualizer
│   │   ├── api.js                   # Axios/Fetch client connecting to FastAPI
│   │   ├── App.jsx                  # Main application routing & layout
│   │   └── main.jsx                 # React root mount
│   ├── package.json                 # Node.js dependencies
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   └── vite.config.js               # Vite bundler configuration
├── docs/
│   ├── PROJECT_REPORT.md            # One-page executive business & technical report
│   └── system-architecture.png      # High-resolution system architecture diagram
├── run_servers.ps1                  # PowerShell script to launch backend & frontend concurrently
└── README.md                        # Project documentation
```

---

## 8. Installation and Setup Instructions

### Prerequisites
- **Python:** Version 3.11 or higher
- **Node.js:** Version 18.0 or higher (with `npm`)
- **Git:** Installed and configured

### Step 1: Clone the Repository
```bash
git clone https://github.com/charankumarmuppala/Voice-Agent.git
cd Voice-Agent
```

### Step 2: Backend Setup
1. Navigate to the backend directory and create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   ```
2. Activate the virtual environment:
   - **Windows:**
     ```powershell
     .\venv\Scripts\activate
     ```
   - **Linux / macOS:**
     ```bash
     source venv/bin/activate
     ```
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables (see [Environment Variables](#9-environment-variables)):
   ```bash
   cp .env.example .env
   # Edit .env with your Google Gemini API key and SMTP credentials
   ```
5. Run the FastAPI backend server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The backend will automatically create tables and seed 30+ Bengaluru properties on initial startup.*

### Step 3: Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Launch the Vite development server:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```

### Step 4: Access the Application
- **Frontend Voice Studio & Dashboard:** [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **Interactive OpenAPI Backend Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Backend Health Check:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## 9. Environment Variables

Create a `.env` file in the `backend/` directory based on the table below:

| Variable Name | Required | Default Value | Description |
| :--- | :---: | :--- | :--- |
| `APP_NAME` | No | `EstateVoice AI` | Application display name |
| `DEBUG` | No | `True` | Debug mode toggle |
| `PORT` | No | `8000` | Port for the backend API |
| `HOST` | No | `0.0.0.0` | Host binding for Uvicorn |
| `CORS_ORIGINS` | No | `http://localhost:5173,http://127.0.0.1:5173` | Allowed frontend origins |
| `DATABASE_URL` | No | `sqlite:///./data/estatevoice.db` | SQLAlchemy database connection URI |
| `GEMINI_API_KEY` | **Yes** | `""` | Google AI Studio Gemini API key |
| `SMTP_HOST` | No | `smtp.gmail.com` | SMTP server host for sending emails |
| `SMTP_PORT` | No | `587` | SMTP server TLS port |
| `SMTP_USER` | No | `""` | SMTP sender email address (e.g. Gmail) |
| `SMTP_PASSWORD` | No | `""` | SMTP App Password (16-character Google App Password) |
| `SMTP_FROM_NAME` | No | `DreamSpace Realty Bangalore` | Display sender name on outgoing emails |
| `COMPANY_NAME` | No | `DreamSpace Realty Bangalore` | Agency name printed on brochures |
| `COMPANY_PHONE` | No | `+91 80 4567 8900` | Contact phone printed on brochures |
| `COMPANY_EMAIL` | No | `sales@dreamspacerealty.com` | Agency email printed on brochures |

> **Security Note:** Never commit your `.env` file or hardcode API keys into version control. Ensure `.env` is listed inside `.gitignore`.

---

## 10. API Endpoints

### Call Lifecycle Endpoints (`/api/calls`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/calls/start` | Initializes a new call session, returns session ID and opening greeting. |
| `POST` | `/api/calls/{session_id}/message` | Ingests customer utterance, runs extraction & RAG, returns agent reply. |
| `POST` | `/api/calls/{session_id}/end` | Concludes call, generates summary, lead score, and outcome status. |
| `GET` | `/api/calls` | Lists all historical call sessions with duration, lead score, and status. |
| `GET` | `/api/calls/{session_id}` | Retrieves full transcript and extracted profile for a specific session. |

### Properties Endpoints (`/api/properties`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/properties` | Lists properties with optional filters (`location`, `bhk`, `min_price`, `max_price`). |
| `GET` | `/api/properties/stats` | Aggregates inventory metrics (total properties, price ranges, locations). |
| `GET` | `/api/properties/{id}` | Retrieves detailed specifications and amenities for a specific property. |

### Appointments & Leads Endpoints (`/api/appointments`, `/api/leads`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/appointments` | Lists scheduled property site visits and confirmation email statuses. |
| `POST` | `/api/appointments` | Creates a new appointment booking. |
| `GET` | `/api/appointments/{id}` | Fetches details and dispatch logs for a specific appointment. |
| `GET` | `/api/leads` | Lists qualified leads with contact information, sentiment, and scores. |

### System & Health Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns backend health status, database connection, and catalog count. |
| `GET` | `/api/voice/status` | Reports Web Speech engine readiness and configuration parameters. |

---

## 11. Database Structure

EstateVoice AI utilizes relational schema design managed via **SQLAlchemy 2.0**:

```
┌──────────────────┐         ┌───────────────────┐         ┌──────────────────┐
│   call_sessions  │ 1     * │   chat_messages   │         │    properties    │
├──────────────────┤◄───────┼───────────────────┤         ├──────────────────┤
│ id (PK)          │         │ id (PK)           │         │ id (PK)          │
│ session_id (UQ)  │         │ session_id (FK)   │         │ property_id (UQ) │
│ customer_name    │         │ role              │         │ name             │
│ customer_phone   │         │ content           │         │ location         │
│ extracted_profile│         │ created_at        │         │ bhk, price, area │
│ outcome, summary │         └───────────────────┘         │ amenities (JSON) │
└──────────────────┘                                       └──────────────────┘
         │ 1
         │
         ▼ *
┌──────────────────┐ 1     * ┌───────────────────┐
│      leads       │◄────────┤   appointments    │
├──────────────────┤         ├───────────────────┤
│ id (PK)          │         │ id (PK)           │
│ lead_id (UQ)     │         │ appointment_id(UQ)│
│ name, phone      │         │ lead_id (FK)      │
│ email, location  │         │ customer_name     │
│ lead_score (0-100│         │ customer_phone    │
│ sentiment        │         │ customer_email    │
│ status           │         │ email_status      │
└──────────────────┘         │ property_name     │
                             │ date_time         │
                             └───────────────────┘
```

### Table Definitions
- **`properties`:** Catalog of real estate projects with location, BHK, price in INR, square footage, amenities (stored as JSON), and availability status.
- **`call_sessions`:** Records each conversational session, customer name, phone, language, extracted profile JSON, duration, and qualitative outcome.
- **`chat_messages`:** Complete conversation transcript capturing speaker roles (`user`, `model`, `system`) and timestamps.
- **`leads`:** Qualified buyers with preference parameters, algorithmic lead scores (0–100), and sentiment tags (`Positive`, `Neutral`, `Hesitant`).
- **`appointments`:** Reserved site visits linked to leads and properties, tracking phone confirmation, email confirmation, and PDF delivery state.
- **`call_records`:** Call summary records for rapid CRM sync and dashboard reporting.

---

## 12. Deployment Strategy

### Production Architecture
For production readiness, the application is deployed using containerized microservices:

1. **Backend Container (Docker):**
   - Base Image: `python:3.11-slim`
   - Production ASGI Server: **Gunicorn** with **UvicornWorker** (`gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000`)
   - Healthcheck integration via `/api/health`
2. **Frontend Static Distribution:**
   - Compiled to production assets via `npm run build`
   - Served globally via **Cloudflare Pages**, **AWS S3 + CloudFront**, or **Nginx** reverse proxy
3. **SSL / Reverse Proxy:**
   - **Nginx** or **Caddy** configured with automatic Let's Encrypt SSL termination, proxying `/api` traffic to Gunicorn.

---

## 13. Scalability Strategy for 100,000 Users

To scale EstateVoice AI to handle 100,000+ daily sessions:

```
[ Inbound Calls / Web Clients ]
              │
              ▼
    [ Global CDN / Cloudflare ]
              │
              ▼
   [ Application Load Balancer ]
              │
     ┌────────┴────────┐
     ▼                 ▼
[ FastAPI Pod 1 ] [ FastAPI Pod 2 ] ... [ FastAPI Pod N ] (Kubernetes HPA)
     │                 │                       │
     ├─────────────────┴───────────────────────┤
     ▼                                         ▼
[ Redis Cluster ]                         [ PgBouncer Connection Pool ]
  • Session State & History                 • Read/Write Split
  • Celery Task Queue                       • Amazon Aurora PostgreSQL
     │                                         │
     ▼                                         ▼
[ Distributed Workers ]                   [ Managed Vector DB ]
  • ReportLab PDF rendering                 • Qdrant / Pinecone / Milvus
  • SMTP / SES Email Dispatch               • Sharded Multilingual Embeddings
```

1. **Stateless Backend Scaling:** Deploy FastAPI across a Kubernetes cluster (EKS/GKE) with Horizontal Pod Autoscaling (HPA) governed by CPU and request rate metrics.
2. **Distributed Session Caching:** Replace local in-memory session dictionaries with a **Redis Cluster**, achieving sub-millisecond state hydration across pods.
3. **Database Migration:** Transition from SQLite to **Amazon Aurora PostgreSQL** with **PgBouncer** connection pooling and multi-AZ read replicas.
4. **Decoupled Task Queue:** Shift background PDF generation and email dispatches to a distributed **Celery / ARQ** worker fleet using Redis or RabbitMQ as the message broker.
5. **Distributed Vector Database:** Migrate local FAISS files to **Qdrant** or **Pinecone** to support sharded, high-throughput vector similarity lookups with real-time inventory updates.

---

## 14. Security and Privacy

- **Zero Credential Exposure:** All API keys, SMTP credentials, and database URIs are loaded strictly via environment variables (`.env`) through Pydantic-Settings; no secrets exist in source code.
- **Customer PII Safeguards:** Customer phone numbers and email addresses are only captured after explicit digit-by-digit or letter-by-letter confirmation.
- **Strict Input Sanitization:** All incoming text is sanitized to neutralize prompt injection attacks and malicious SQL tokens.
- **Encrypted Email Transmission:** All SMTP communications enforce TLS encryption (Port 587) to prevent man-in-the-middle eavesdropping.
- **CORS Protection:** Cross-Origin Resource Sharing is locked down to verified domain origins in production environments.

---

## 15. Operational Costs and Commercial Feasibility

EstateVoice AI offers significant unit economic advantages compared to traditional telecalling operations.

### Unit Economics per 1,000 Completed Calls (~3 mins each)
| Expense Category | Service Provider | Estimated Cost (INR) | Estimated Cost (USD) |
| :--- | :--- | :--- | :--- |
| **LLM Reasoning & Extraction** | Google Gemini 2.5 Flash (~3K tokens/call) | ₹125.00 | $1.50 |
| **Vector Search (RAG)** | Sentence Transformers + FAISS (CPU) | ₹0.00 | $0.00 |
| **Backend Compute** | AWS Fargate / Google Cloud Run | ₹40.00 | $0.48 |
| **PDF Generation & Email** | ReportLab + SendGrid / Amazon SES | ₹8.00 | $0.10 |
| **Total Cost per 1,000 Calls** | — | **₹173.00** | **$2.08** |
| **Effective Cost per Call** | — | **₹0.17** | **$0.002** |

### Commercial Comparison
- **Human Sales Representative:** An average real estate telecaller in Bengaluru earns ₹30,000/month, handling ~1,800 calls. Effective cost: **₹16.60 per call** with 12% qualification consistency.
- **EstateVoice AI Agent:** Operates at **₹0.17 per call** (a **98.9% cost reduction**), available 24/7 with zero waiting time and 100% adherence to qualification procedures.

---

## 16. Current Limitations

1. **Browser Web Speech API Dependency:** The current frontend implementation relies on the browser's native `webkitSpeechRecognition` and `speechSynthesis`. Audio quality and browser compatibility depend on Google Chrome / Chromium-based browsers.
2. **Local SQLite Concurrency:** The development setup uses SQLite in WAL mode. While suitable for single-instance setups, high concurrent write loads require PostgreSQL.
3. **Single-Worker Task Queue:** Background PDF rendering runs via FastAPI's native `BackgroundTasks`, which executes within the same application process rather than a standalone worker cluster.

---

## 17. Future Enhancements

The following roadmap items represent planned enterprise capabilities:

- [ ] **Direct Telephony Integration (SIP / PSTN):** Integrate **Twilio Voice** or **Exotel** media streams with WebSockets, enabling customers to dial a regular mobile number to talk to EstateVoice AI.
- [ ] **Ultra-Realistic Voice Cloning:** Integrate **ElevenLabs** streaming conversational voice API for ultra-low latency, emotionally expressive voice synthesis.
- [ ] **Instant WhatsApp Pass Dispatch:** Integrate the WhatsApp Business API to dispatch the booking confirmation and PDF brochure directly to the customer's WhatsApp upon call completion.
- [ ] **Multi-Agent Human Hand-off:** Real-time sentiment monitor that automatically connects the customer to a senior human broker if the buyer exhibits complex negotiation requirements.
- [ ] **Multi-Tenant Agency Portal:** SaaS capability allowing multiple real estate builders and agencies to manage isolated inventory, custom agent personas, and private analytics.

---

## 18. Verification and Testing

To verify the complete end-to-end conversation flow without browser interaction, run the included verification script:

```bash
python backend/test_live_call.py
```

**Expected Verification Output:**
```text
Start status: 200
Session ID: CALL-XXXXXX
Greeting: Namaskara! Welcome to DreamSpace Realty. May I know your name?
Message status: 200
Agent Reply: Thank you Charan Kumar! Which location in Bangalore are you looking to buy a home in?...
Customer Name Extracted: Charan Kumar
End status: 200
Call ended outcome: Visit Scheduled
SUCCESS: End-to-end call session completed with NO errors!
```

---

## 19. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for full details.

---

**Developed for DreamSpace Realty, Bengaluru**  
*Autonomous Real Estate Conversational Engineering.*
