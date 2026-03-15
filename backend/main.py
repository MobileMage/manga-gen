import logging
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import generate, projects

app = FastAPI(title="enpitsu API", version="0.1.0")

_origins = ["http://localhost:3000", "http://localhost:3001"]
_frontend_url = os.environ.get("FRONTEND_URL")
if _frontend_url:
    _origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router, prefix="/api")
app.include_router(projects.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "manga-gen-api"}
