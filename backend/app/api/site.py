"""Admin login and editable home-page content."""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

from backend.app.db.database import get_connection

router = APIRouter(tags=["Site"])

# --- Admin credentials -------------------------------------------------------
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    # No password configured: generate one for this run instead of shipping a default.
    ADMIN_PASSWORD = secrets.token_urlsafe(12)
    print(
        "\n[admin] ADMIN_PASSWORD is not set. Temporary login for this run:\n"
        f"[admin]   username: {ADMIN_USERNAME}\n"
        f"[admin]   password: {ADMIN_PASSWORD}\n",
        flush=True,
    )

# Without SECRET_KEY, tokens are invalidated whenever the server restarts.
SECRET_KEY = (os.environ.get("SECRET_KEY") or secrets.token_hex(32)).encode()
TOKEN_TTL_SECONDS = 12 * 60 * 60

MAX_FAILED_LOGINS = 5
LOCKOUT_WINDOW_SECONDS = 5 * 60
_failed_logins: Dict[str, List[float]] = {}


def _sign(payload: str) -> str:
    return hmac.new(SECRET_KEY, payload.encode(), hashlib.sha256).hexdigest()


def _create_token(username: str) -> tuple:
    expires_at = int(time.time()) + TOKEN_TTL_SECONDS
    payload = f"{username}:{expires_at}"
    encoded = base64.urlsafe_b64encode(payload.encode()).decode()
    return f"{encoded}.{_sign(payload)}", expires_at


def _verify_token(token: str) -> Optional[str]:
    try:
        encoded, signature = token.split(".", 1)
        payload = base64.urlsafe_b64decode(encoded.encode()).decode()
        username, expires_at = payload.rsplit(":", 1)
        if not hmac.compare_digest(signature, _sign(payload)):
            return None
        if int(expires_at) < time.time():
            return None
        return username
    except Exception:
        return None


def require_admin(authorization: Optional[str] = Header(None)) -> str:
    if authorization and authorization.lower().startswith("bearer "):
        username = _verify_token(authorization[7:].strip())
        if username:
            return username
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


class LoginRequest(BaseModel):
    username: str = Field(max_length=100)
    password: str = Field(max_length=200)


@router.post("/auth/login")
async def login(payload: LoginRequest, request: Request):
    client = request.client.host if request.client else "unknown"
    now = time.time()
    recent = [t for t in _failed_logins.get(client, []) if now - t < LOCKOUT_WINDOW_SECONDS]
    if len(recent) >= MAX_FAILED_LOGINS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again in a few minutes.",
        )

    user_ok = hmac.compare_digest(payload.username.encode(), ADMIN_USERNAME.encode())
    pass_ok = hmac.compare_digest(payload.password.encode(), ADMIN_PASSWORD.encode())
    if not (user_ok and pass_ok):
        recent.append(now)
        _failed_logins[client] = recent
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    _failed_logins.pop(client, None)
    token, expires_at = _create_token(ADMIN_USERNAME)
    return {"token": token, "expires_at": expires_at, "username": ADMIN_USERNAME}


@router.get("/auth/me")
async def me(username: str = Depends(require_admin)):
    return {"username": username}


# --- Editable home-page content ----------------------------------------------
class Feature(BaseModel):
    title: str = Field(max_length=80)
    description: str = Field(max_length=400)


class SiteContent(BaseModel):
    announcement: str = Field(default="", max_length=200)
    hero_badge: str = Field(max_length=80)
    hero_title: str = Field(max_length=120)
    hero_highlight: str = Field(max_length=120)
    hero_subtitle: str = Field(max_length=600)
    cta_label: str = Field(max_length=40)
    features_heading: str = Field(max_length=80)
    features: List[Feature] = Field(max_length=12)
    footer_text: str = Field(max_length=200)


DEFAULT_CONTENT = SiteContent(
    announcement="",
    hero_badge="Neuro-Symbolic Verification Engine",
    hero_title="AI Writes Code.",
    hero_highlight="We Mathematically Verify It.",
    hero_subtitle=(
        "An automated verification platform combining Large Language Models with the "
        "Z3 SMT Solver, Pytest, and Semgrep. Deterministic tool evidence, never AI "
        "confidence, determines pass or fail."
    ),
    cta_label="Launch Verification Console",
    features_heading="How It Works",
    features=[
        Feature(
            title="Safe Archive Ingestion",
            description="Upload a Python repository as a ZIP. Size ceilings, decompression ratios and "
            "path-traversal defenses are enforced before anything runs.",
        ),
        Feature(
            title="Deterministic Proving",
            description="Isolated runners execute your test suite, scan for security sinks and model "
            "business invariants in the Z3 theorem prover.",
        ),
        Feature(
            title="Evidence-Backed Reports",
            description="Every finding carries the raw tool evidence and a counterexample, with patch "
            "proposals that wait for your approval.",
        ),
    ],
    footer_text="Neuro-Symbolic Software Foundry",
)


def _init_table():
    conn = get_connection()
    conn.execute(
        "CREATE TABLE IF NOT EXISTS site_content ("
        "id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT NOT NULL)"
    )
    conn.commit()
    conn.close()


_init_table()


def _load_content() -> dict:
    conn = get_connection()
    row = conn.execute("SELECT data, updated_at FROM site_content WHERE id = 1").fetchone()
    conn.close()
    if not row:
        return {**DEFAULT_CONTENT.model_dump(), "updated_at": None}
    try:
        content = SiteContent(**json.loads(row["data"])).model_dump()
    except Exception:
        content = DEFAULT_CONTENT.model_dump()
    return {**content, "updated_at": row["updated_at"]}


@router.get("/site/content")
async def get_site_content():
    return _load_content()


@router.put("/site/content")
async def update_site_content(payload: SiteContent, _: str = Depends(require_admin)):
    updated_at = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    conn.execute(
        "INSERT INTO site_content (id, data, updated_at) VALUES (1, ?, ?) "
        "ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
        (json.dumps(payload.model_dump()), updated_at),
    )
    conn.commit()
    conn.close()
    return {**payload.model_dump(), "updated_at": updated_at}
