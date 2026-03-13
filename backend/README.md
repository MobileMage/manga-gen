# enpitsu — Backend

FastAPI backend for the enpitsu AI manga generator. Handles story generation, character sheet image generation, and panel artwork — all powered by Google Gemini.

## Tech

- **Framework**: FastAPI + Uvicorn
- **AI**: Google Gemini API (`google-genai`) — text and image generation
- **Auth**: Firebase Admin SDK (verifies Firebase ID tokens)
- **Config**: python-dotenv

## Setup

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create `.env` in this directory:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
FIREBASE_SERVICE_ACCOUNT_PATH=../serviceAccountKey.json
```

> The Gemini API key must have **billing enabled** on the associated Google Cloud project. Image generation models (`gemini-2.5-flash-preview-image`, etc.) are not available on the free tier.

## Running

```bash
uvicorn main:app --reload
# API at http://localhost:8000
# Docs at http://localhost:8000/docs
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/generate/story` | Generate story (title, synopsis, characters, panel scripts) |
| POST | `/api/generate/character-sheets` | Stream character design images (SSE) |
| POST | `/api/panels-stream` | Stream panel artwork (SSE) |

All `/api/generate/*` routes require `Authorization: Bearer <firebase-id-token>`.

## Structure

```
backend/
├── main.py               # FastAPI app, CORS config, router wiring
├── auth.py               # Firebase token verification dependency
├── requirements.txt
├── models/
│   └── schemas.py        # Pydantic request/response models
├── routers/
│   ├── generate.py       # Story, character sheet, and panel endpoints
│   └── projects.py       # Placeholder — project CRUD (Phase 2)
└── services/
    ├── gemini.py         # Gemini API calls — text + image generation
    └── livekit_service.py # Placeholder — LiveKit video (Phase 2)
```

## Image Model Fallback Chain

`gemini.py` tries three image models in sequence for each character sheet and panel. If the first is quota-limited or unavailable, it falls back to the next:

1. `gemini-3.1-flash-image-preview`
2. `gemini-3-pro-image-preview`
3. `gemini-2.5-flash-preview-image`

If all three fail, the endpoint returns an error for that character/panel.
