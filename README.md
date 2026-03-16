# 漫 enpitsu — AI Manga Generator

**[Live Demo → https://manga-gen.onrender.com](https://manga-gen.onrender.com)**

> **Hackathon category:** Creative Storyteller — Gemini Live Agent Challenge

enpitsu (鉛筆, "pencil") is an AI-powered manga creation tool. Give it a genre and a prompt, and it generates a full manga: story, character design sheets, and panel-by-panel artwork — all streamed live in your browser.

## How It Works

The generation pipeline has four steps:

1. **Concept** — Enter a genre and story prompt. Gemini generates a title, synopsis, characters, and per-panel scripts.
2. **Characters** — Gemini image models generate settei (character design sheets) for each character, streamed one by one via SSE.
3. **Storyboard** — Each panel is rendered as manga artwork, with character sheets passed as multimodal context for visual consistency.
4. **Reader** — Read the completed manga and export it as a PDF.

## Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Firebase Auth
- **Backend**: FastAPI + Uvicorn, Google Gemini API (`google-genai` SDK), Firebase Admin SDK
- **Cloud**: Backend hosted on **Google Cloud Run** (`us-central1`); Gemini API (text + image generation)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
│  Next.js 16 frontend (Render)                                   │
│  Firebase Auth (Google OAuth)                                   │
└──────────────────┬──────────────────────────────────────────────┘
                   │  HTTPS + Firebase ID token
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google Cloud Run  (us-central1)                    │
│              FastAPI backend  (manga-gen-api)                   │
│                                                                 │
│  POST /api/generate/story     ──► Gemini 2.5 Flash (text)       │
│  POST /api/generate/character-sheets (SSE) ─► Gemini image      │
│  POST /api/panels-stream (SSE)         ──► Gemini image         │
│                                                                 │
│  Auth: firebase-admin verifies ID tokens                        │
└──────────────────┬──────────────────────────────────────────────┘
                   │  google-genai SDK
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Google AI — Gemini API                                         │
│  Text:  gemini-2.5-flash                                        │
│  Image fallback chain:                                          │
│    1. gemini-3.1-flash-image-preview                            │
│    2. gemini-3-pro-image-preview                                │
│    3. gemini-2.5-flash-image                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 18+ | For the frontend |
| Python 3.11+ | For the backend |
| Google Gemini API key | With **billing enabled** — image generation models require a paid plan |
| Firebase project | With Google Auth enabled and a service account key |

---

## Setup

### 1. Clone the repo

```bash
git clone <repo-url>
cd manga-gen
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
FIREBASE_SERVICE_ACCOUNT_PATH=../serviceAccountKey.json
```

Place your Firebase service account JSON at the path above (or update the path).

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## Running the App

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
.venv\Scripts\activate   # or: source .venv/bin/activate
uvicorn main:app --reload
# Runs at http://localhost:8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Runs at http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## Reproducible Testing

Follow these steps to test the full generation pipeline end-to-end:

### Step 1 — Sign in
- Go to http://localhost:3000
- Sign in with Google or create an email/password account

### Step 2 — Generate a story (Concept step)
- Select a genre (e.g. **Shōnen**)
- Enter a prompt (e.g. `"A young girl discovers she can communicate with stars and must stop a cosmic collapse"`)
- Set page count to **4** (faster for testing)
- Click **Generate Story**
- Expected: Title, synopsis, characters, and panel scripts appear within ~30–60 seconds

### Step 3 — Generate character sheets (Characters step)
- Click **Generate Settei Sheets**
- Expected: Character design images stream in one by one via SSE
- Each character card should show a manga-style reference sheet

> **Note:** This step requires a Gemini API key with billing enabled. Free-tier keys will return `429 RESOURCE_EXHAUSTED`.

### Step 4 — Generate panels (Storyboard step)
- Click **Generate Panels**
- Expected: Panel artwork streams in sequentially, each referencing the character designs for consistency

### Step 5 — Export (Reader step)
- Browse the completed manga
- Click **Export PDF**
- Expected: A PDF file downloads with all panels laid out

### Health check
The backend exposes a health endpoint you can hit directly:
```bash
curl http://localhost:8000/health
# {"status":"ok","service":"manga-gen-api"}
```

---

## Project Structure

```
manga-gen/
├── frontend/          # Next.js app
│   └── src/
│       ├── app/       # Pages and layouts
│       ├── components/ # UI components (TopBar, steps, etc.)
│       ├── contexts/  # MangaContext (global state), AuthContext
│       └── lib/       # API client, Firebase, PDF export
├── backend/           # FastAPI app
│   ├── routers/       # generate.py — all generation endpoints
│   ├── services/      # gemini.py — Gemini API integration
│   └── models/        # Pydantic schemas
└── README.md
```
