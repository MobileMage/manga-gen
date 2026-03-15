import json
import logging
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

logger = logging.getLogger("manga-gen.auth")

# Initialize Firebase Admin SDK
_sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
_cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
if _sa_json:
    logger.info("[auth] Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT_JSON env var")
    cred = credentials.Certificate(json.loads(_sa_json))
    firebase_admin.initialize_app(cred)
elif _cred_path:
    if not os.path.isabs(_cred_path):
        _cred_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), _cred_path)
    if os.path.exists(_cred_path):
        logger.info(f"[auth] Loading Firebase credentials from {_cred_path}")
        cred = credentials.Certificate(_cred_path)
        firebase_admin.initialize_app(cred)
if not firebase_admin._apps:
    logger.warning("[auth] No service account found, using default credentials")
    firebase_admin.initialize_app()

bearer_scheme = HTTPBearer()
bearer_scheme_optional = HTTPBearer(auto_error=False)


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Verify Firebase ID token from Authorization header."""
    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
        logger.info(f"[auth] Token verified for uid={decoded.get('uid')}")
        return decoded
    except Exception as e:
        logger.error(f"[auth] Token verification failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def verify_token_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme_optional),
) -> dict:
    """Verify Firebase ID token if provided, otherwise return a demo user dict."""
    if credentials is None or not credentials.credentials:
        logger.info("[auth] Demo mode — no token provided")
        return {"uid": "demo", "demo": True}
    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
        logger.info(f"[auth] Token verified for uid={decoded.get('uid')}")
        return decoded
    except Exception as e:
        logger.error(f"[auth] Token verification failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
