import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks, Depends, Security, Request, Response
from fastapi.responses import StreamingResponse, FileResponse, RedirectResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import sys
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import aiofiles
import httpx
import io
import json
import tempfile
from contextlib import asynccontextmanager
from urllib.parse import urlencode
import secrets

from bs4 import BeautifulSoup
import requests
from PIL import Image, ImageDraw, ImageFont
from collections import Counter, defaultdict
import re
import ipaddress
import time
from google import genai
import subprocess
import asyncio
try:
    import stripe as stripe_lib
except ImportError:
    stripe_lib = None

ROOT_DIR = Path(__file__).parent

# ── Secrets loading ────────────────────────────────────────────────────────────
# Prefer external secrets file (never in git). Fall back to backend/.env for
# local dev convenience. Load in priority order: first match wins for each var.
_SECRETS_CANDIDATES = [
    Path("/home/ubuntu/secrets/swiftpack.env"),   # Linux production server
    Path("E:/secrets/swiftpack.env"),              # Windows local development
]
for _sc in _SECRETS_CANDIDATES:
    if _sc.exists():
        load_dotenv(_sc, override=True)
        break
# Also load backend/.env so local devs can override individual vars without
# touching the shared secrets file. Already gitignored.
load_dotenv(ROOT_DIR / '.env', override=False)

# ── FFmpeg path detection ──────────────────────────────────────────────────────
# Check common portable locations first, then fall back to PATH
_FFMPEG_CANDIDATES = [
    Path.home() / "ffmpeg" / "ffmpeg-master-latest-win64-gpl" / "bin" / "ffmpeg.exe",
    Path.home() / "ffmpeg" / "bin" / "ffmpeg.exe",
    Path("C:/ffmpeg/bin/ffmpeg.exe"),
    Path("C:/ProgramData/chocolatey/bin/ffmpeg.exe"),
]
FFMPEG_BIN: str = "ffmpeg"  # default: expect it on PATH
for _candidate in _FFMPEG_CANDIDATES:
    if _candidate.exists():
        FFMPEG_BIN = str(_candidate)
        # Also add the bin dir to PATH so ffprobe/etc are discoverable
        _bin_dir = str(_candidate.parent)
        if _bin_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] = _bin_dir + os.pathsep + os.environ.get("PATH", "")
        break

# ── Auth / Billing config ──────────────────────────────────────────────────────
JWT_SECRET = os.getenv('JWT_SECRET', 'dev-jwt-secret-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRE_HOURS = 24 * 7  # 7 days

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8001')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')
STRIPE_PRO_PRICE_ID = os.getenv('STRIPE_PRO_PRICE_ID', '')
if STRIPE_SECRET_KEY and stripe_lib:
    stripe_lib.api_key = STRIPE_SECRET_KEY

BREVO_API_KEY = os.getenv('BREVO_API_KEY', '')
BREVO_SENDER_EMAIL = os.getenv('BREVO_SENDER_EMAIL', 'noreply@swiftpackai.tech')
BREVO_SENDER_NAME = os.getenv('BREVO_SENDER_NAME', 'SwiftPack AI')

ADMIN_SECRET = os.getenv('ADMIN_SECRET', '')

# Tier limits — "lifetime": True means total-ever, False means per-calendar-month
TIER_CONFIG = {
    "free":    {"videos": 3,   "scripts": 5,   "posters": 5,   "lifetime": True,  "formats": ["9:16"]},
    "starter": {"videos": 15,  "scripts": 50,  "posters": 50,  "lifetime": False, "formats": ["9:16", "16:9", "1:1"]},
    "pro":     {"videos": 50,  "scripts": 200, "posters": 200, "lifetime": False, "formats": ["9:16", "16:9", "1:1"]},
    "agency":  {"videos": 200, "scripts": 999, "posters": 999, "lifetime": False, "formats": ["9:16", "16:9", "1:1"]},
}
# Keep for backward compat (used in /me endpoint)
FREE_TIER_LIMITS = {"scripts": 5, "videos": 3, "posters": 5}

STRIPE_STARTER_PRICE_ID = os.getenv('STRIPE_STARTER_PRICE_ID', '')
STRIPE_AGENCY_PRICE_ID = os.getenv('STRIPE_AGENCY_PRICE_ID', '')

# Modal.com GPU integration (Pro/Agency tier)
MODAL_TOKEN_ID = os.getenv('MODAL_TOKEN_ID', '')
MODAL_TOKEN_SECRET = os.getenv('MODAL_TOKEN_SECRET', '')
MODAL_APP_NAME = os.getenv('MODAL_APP_NAME', 'swiftpack-ltx-video')
MODAL_ENABLED = bool(MODAL_TOKEN_ID and MODAL_TOKEN_SECRET)

# ── MongoDB ────────────────────────────────────────────────────────────────────
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

UPLOADS_DIR = ROOT_DIR / 'uploads'
OUTPUTS_DIR = ROOT_DIR / 'outputs'
UPLOADS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)

# ── Gemini ─────────────────────────────────────────────────────────────────────
gemini_key = os.getenv('GEMINI_API_KEY')
_gemini_ready = bool(gemini_key and gemini_key != 'your-gemini-api-key-here')
if _gemini_ready:
    _gemini_client = genai.Client(api_key=gemini_key)
else:
    _gemini_client = None  # will trigger fallbacks / clear errors

# ── OpenRouter (Gemini fallback) ───────────────────────────────────────────────
_openrouter_key = os.getenv('OPENROUTER_API_KEY', '')
_openrouter_ready = bool(_openrouter_key)

# ── Auth helpers ───────────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_scheme = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_jwt(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode({"sub": user_id, "exp": exp}, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security_scheme)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Security(security_scheme)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    return await db.users.find_one({"id": user_id}, {"_id": 0})

async def check_usage_limit(user: dict, content_type: str):
    """Enforce per-tier generation limits. Free = 3 lifetime videos. Paid = monthly."""
    if not user:
        return  # unauthenticated requests pass through (rate limiter handles abuse)
    tier = user.get("tier", "free")
    cfg = TIER_CONFIG.get(tier, TIER_CONFIG["free"])
    limit = cfg.get(content_type, 999)

    if cfg["lifetime"]:
        # Sum ALL usage records for this user across all months
        pipeline = [
            {"$match": {"user_id": user["id"]}},
            {"$group": {"_id": None, "total": {"$sum": f"${content_type}"}}}
        ]
        result = await db.usage.aggregate(pipeline).to_list(1)
        current = result[0]["total"] if result else 0
        scope = "lifetime"
    else:
        year_month = datetime.now(timezone.utc).strftime("%Y-%m")
        usage = await db.usage.find_one({"user_id": user["id"], "year_month": year_month}) or {}
        current = usage.get(content_type, 0)
        scope = "this month"

    if current >= limit:
        upgrade_msg = {
            "free":    "Upgrade to Starter ($19/mo) for 15/month with no watermark.",
            "starter": "Upgrade to Pro ($49/mo) for 50/month.",
            "pro":     "Upgrade to Agency ($149/mo) for 200/month.",
            "agency":  "Contact us about enterprise plans.",
        }.get(tier, "Upgrade your plan for more.")
        raise HTTPException(
            status_code=429,
            detail=f"Limit reached: {current}/{limit} {content_type} used {scope}. {upgrade_msg}"
        )


async def check_format_allowed(user: dict, fmt: str):
    """Free tier is restricted to 9:16 (TikTok/Reels). Paid tiers get all formats."""
    if not user:
        return  # unauthenticated — no restriction (watermark enforces quality gate)
    tier = user.get("tier", "free")
    cfg = TIER_CONFIG.get(tier, TIER_CONFIG["free"])
    allowed = cfg.get("formats", ["9:16", "16:9", "1:1"])
    if fmt not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Format '{fmt}' is not available on the {tier} plan. Upgrade to Starter or higher for all formats."
        )

async def increment_usage(user_id: str, content_type: str):
    year_month = datetime.now(timezone.utc).strftime("%Y-%m")
    await db.usage.update_one(
        {"user_id": user_id, "year_month": year_month},
        {"$inc": {content_type: 1}, "$setOnInsert": {"user_id": user_id, "year_month": year_month}},
        upsert=True
    )


def _is_safe_url(url: str) -> bool:
    """Block SSRF: reject non-http(s) schemes and private/loopback IPs."""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        host = parsed.hostname or ""
        if not host:
            return False
        blocked_hosts = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}
        if host.lower() in blocked_hosts:
            return False
        try:
            addr = ipaddress.ip_address(host)
            if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved:
                return False
        except ValueError:
            pass  # hostname, not a bare IP — allow
        return True
    except Exception:
        return False


async def _safe_http_get(url: str, headers: dict | None = None, max_redirects: int = 5) -> httpx.Response:
    """GET with manual redirect following — re-validates every hop with _is_safe_url.

    Raises HTTPException(400) if any redirect target is a private/loopback address.
    """
    from urllib.parse import urljoin
    current_url = url
    for _ in range(max_redirects):
        async with httpx.AsyncClient(timeout=10, follow_redirects=False, headers=headers or {}, verify=False) as client:
            response = await client.get(current_url)
        if response.is_redirect:
            location = response.headers.get("location", "")
            if not location.startswith("http"):
                location = urljoin(current_url, location)
            if not _is_safe_url(location):
                raise HTTPException(status_code=400, detail="URL redirects to a disallowed destination")
            current_url = location
        else:
            return response
    raise HTTPException(status_code=400, detail="Too many redirects")


# NOTE: in-process rate limiter — state resets on restart and is not shared
# across multiple workers. Sufficient for single-process deployments (Docker
# Compose, Supervisor). Upgrade to a Redis-backed limiter (e.g. slowapi +
# redis) when running multiple uvicorn workers.
_rate_store: dict = defaultdict(list)
_RATE_LIMITS = {
    "/api/magic-button": 5,
    "/api/magic-launch-pack": 5,
    "/api/create-complete-video": 10,
    "/api/generate-script": 20,
    "/api/generate-voiceover": 20,
    "/api/scrape": 30,
    "/api/auth/register": 10,
    "/api/auth/login": 20,
}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    limit = _RATE_LIMITS.get(path)
    if limit:
        ip = request.client.host if request.client else "unknown"
        now = time.time()
        _rate_store[ip] = [t for t in _rate_store[ip] if now - t < 60]
        if len(_rate_store[ip]) >= limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please wait a moment and try again."}
            )
        _rate_store[ip].append(now)
    return await call_next(request)


@app.on_event("startup")
async def startup_db_client():
    try:
        await db.command("ping")
        logger.info("MongoDB connection: OK")
    except Exception as e:
        logger.error(f"MongoDB connection failed on startup: {e}")


api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logger.info(f"FFmpeg binary: {FFMPEG_BIN}")
logger.info(f"Gemini ready: {_gemini_ready}")


# ── Pydantic models ────────────────────────────────────────────────────────────

class BrandData(BaseModel):
    url: str
    colors: List[str]
    headline: str
    features: List[str]
    description: str

_ALLOWED_FRAMEWORKS = {"PAS", "Step-by-Step", "Before/After"}

class ScriptRequest(BaseModel):
    framework: str
    product_name: str = Field(max_length=200)
    target_audience: str = Field(max_length=200)
    key_features: List[str]
    brand_context: Optional[str] = None

    @field_validator("framework")
    @classmethod
    def validate_framework(cls, v: str) -> str:
        if v not in _ALLOWED_FRAMEWORKS:
            raise ValueError(f"framework must be one of: {', '.join(sorted(_ALLOWED_FRAMEWORKS))}")
        return v

class VoiceoverRequest(BaseModel):
    text: str = Field(max_length=5000)
    voice_name: str = "en-US-Neural2-A"
    speaking_rate: float = 1.0

class VideoRequest(BaseModel):
    project_id: str
    video_type: str
    format: str = "16:9"

class CompleteVideoRequest(BaseModel):
    script: str = Field(max_length=5000)
    images: List[str] = []
    brand_colors: List[str] = ["#6366f1", "#8b5cf6"]
    format: str = "16:9"
    add_voiceover: bool = True
    add_captions: bool = True
    add_progress_bar: bool = True
    product_name: Optional[str] = None
    features: List[str] = []
    description: Optional[str] = None

class PosterRequest(BaseModel):
    headline: str
    subtext: str
    brand_colors: List[str]
    format: str = "1:1"

class MagicButtonRequest(BaseModel):
    url: str
    product_name: str
    target_audience: str

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    brand_data: Optional[dict] = None
    assets: List[dict] = []
    scripts: List[dict] = []
    outputs: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class BetaAccessRequest(BaseModel):
    """Public beta waitlist sign-up — does NOT create a user account."""
    email: str
    name: str = ""

class ApproveBetaUserRequest(BaseModel):
    email: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str


# ── Helpers ────────────────────────────────────────────────────────────────────

async def send_email(to_email: str, to_name: str, subject: str, html: str) -> bool:
    """Send a transactional email via Brevo. Returns True on success."""
    if not BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not set — email not sent to %s", to_email)
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json"},
                json={
                    "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
                    "to": [{"email": to_email, "name": to_name}],
                    "subject": subject,
                    "htmlContent": html,
                },
            )
        if resp.status_code not in (200, 201):
            logger.error("Brevo error %s: %s", resp.status_code, resp.text)
            return False
        return True
    except Exception as e:
        logger.error("send_email failed: %s", e)
        return False


def truncate_to_sentences(text: str, max_chars: int = 800) -> str:
    if len(text) <= max_chars:
        return text
    sentences = re.split(r'(?<=[.!?])\s+', text)
    result = ""
    for s in sentences:
        if len(result) + len(s) + 1 <= max_chars:
            result += s + " "
        else:
            break
    return result.strip() or text[:max_chars]


async def extract_colors_from_image(image_url: str, num_colors: int = 5) -> List[str]:
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            response = await client.get(image_url)
        img = Image.open(io.BytesIO(response.content))
        img = img.convert('RGB')
        img = img.resize((150, 150))
        pixels = list(img.getdata())
        color_counts = Counter(pixels)
        dominant_colors = color_counts.most_common(num_colors)
        hex_colors = [f"#{r:02x}{g:02x}{b:02x}" for (r, g, b), _ in dominant_colors]
        return hex_colors
    except Exception:
        return ["#6366f1", "#8b5cf6", "#10b981"]


async def _scrape_images(url: str, soup: BeautifulSoup, max_images: int = 6) -> List[str]:
    """Collect usable image URLs from the scraped page."""
    from urllib.parse import urljoin, urlparse
    images = []
    seen = set()

    def _add(raw_url: str):
        if not raw_url or raw_url in seen:
            return
        if raw_url.startswith('data:'):
            return
        if not raw_url.startswith('http'):
            raw_url = urljoin(url, raw_url)
        if not _is_safe_url(raw_url):
            return
        ext = Path(urlparse(raw_url).path).suffix.lower()
        if ext and ext not in ('.jpg', '.jpeg', '.png', '.webp', '.gif', ''):
            return
        seen.add(raw_url)
        images.append(raw_url)

    # Priority 1: og:image
    for meta in soup.find_all('meta', property='og:image'):
        _add(meta.get('content', ''))

    # Priority 2: twitter:image
    for meta in soup.find_all('meta', attrs={'name': 'twitter:image'}):
        _add(meta.get('content', ''))

    # Priority 3: large <img> tags (likely hero / product images)
    for img in soup.find_all('img', src=True):
        src = img.get('src', '')
        # Skip icons and tiny images
        if any(x in src.lower() for x in ('icon', 'logo', 'avatar', 'favicon', 'badge', 'sprite')):
            continue
        w = img.get('width', '')
        h = img.get('height', '')
        try:
            if w and int(w) < 200:
                continue
            if h and int(h) < 200:
                continue
        except (ValueError, TypeError):
            pass
        _add(src)
        if len(images) >= max_images:
            break

    return images[:max_images]


async def _download_image_to_file(image_url: str, dest_path: str) -> bool:
    """Download an image and save to dest_path, resizing to fit within 1920x1080."""
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True, verify=False) as client:
            resp = await client.get(image_url, headers={'User-Agent': 'Mozilla/5.0'})
        if resp.status_code != 200 or not resp.content:
            return False
        img = Image.open(io.BytesIO(resp.content)).convert('RGB')
        # Reject tiny images
        if img.width < 200 or img.height < 200:
            return False
        img.thumbnail((1920, 1080), Image.LANCZOS)
        img.save(dest_path, 'JPEG', quality=85)
        return True
    except Exception as e:
        logger.debug(f"Image download failed for {image_url}: {e}")
        return False


def _hex_to_rgb(h: str) -> tuple:
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def _lighten(rgb: tuple, factor: float = 0.3) -> tuple:
    return tuple(min(255, int(c + (255 - c) * factor)) for c in rgb)


def _darken(rgb: tuple, factor: float = 0.3) -> tuple:
    return tuple(max(0, int(c * (1 - factor))) for c in rgb)


def _draw_gradient_bg(draw: ImageDraw.Draw, width: int, height: int, c1: tuple, c2: tuple):
    """Draw vertical gradient background."""
    for y in range(height):
        t = y / height
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))


def _get_font(size: int):
    """Try to load a bold system font, fall back to default."""
    candidates = [
        # Windows
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/Arial Bold.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        # Linux
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                from PIL import ImageFont as _IF
                return _IF.truetype(path, size)
            except Exception:
                continue
    from PIL import ImageFont as _IF
    return _IF.load_default()


def _get_regular_font(size: int):
    """Try to load a regular system font."""
    candidates = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                from PIL import ImageFont as _IF
                return _IF.truetype(path, size)
            except Exception:
                continue
    from PIL import ImageFont as _IF
    return _IF.load_default()


def _wrap_text(text: str, font, max_width: int, draw: ImageDraw.Draw) -> list:
    """Wrap text to fit within max_width pixels."""
    words = text.split()
    lines = []
    current = []
    for word in words:
        test = ' '.join(current + [word])
        try:
            bbox = draw.textbbox((0, 0), test, font=font)
            w = bbox[2] - bbox[0]
        except Exception:
            w = len(test) * (font.size if hasattr(font, 'size') else 10)
        if w <= max_width:
            current.append(word)
        else:
            if current:
                lines.append(' '.join(current))
            current = [word]
    if current:
        lines.append(' '.join(current))
    return lines or [text]


def _draw_text_centered(draw, text, font, y, width, color, shadow=True):
    """Draw horizontally centered text with optional drop shadow."""
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
    except Exception:
        tw = len(text) * 10
    x = (width - tw) // 2
    if shadow:
        draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 120))
    draw.text((x, y), text, font=font, fill=color)


def _draw_decorative_bar(draw, x, y, w, h, color):
    draw.rectangle([x, y, x + w, y + h], fill=color)


def _draw_checkmark(draw, cx, cy, r, color, width=4):
    """Draw a checkmark shape inside a circle of radius r centered at (cx, cy)."""
    # Tick mark: from bottom-left to mid-bottom, then up to top-right
    x1 = cx - int(r * 0.45)
    y1 = cy + int(r * 0.05)
    x2 = cx - int(r * 0.05)
    y2 = cy + int(r * 0.40)
    x3 = cx + int(r * 0.45)
    y3 = cy - int(r * 0.35)
    draw.line([(x1, y1), (x2, y2), (x3, y3)], fill=color, width=width)


def _make_slide_hero(width, height, color1, color2, product_name, headline, dest_path):
    """Slide 1 — Hero: product name + main headline, strong brand presence."""
    c1 = _hex_to_rgb(color1)
    c2 = _hex_to_rgb(color2)
    accent = _lighten(c1, 0.5)

    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    _draw_gradient_bg(draw, width, height, _darken(c1, 0.2), _darken(c2, 0.1))

    # Decorative top bar
    _draw_decorative_bar(draw, 0, 0, width, height // 20, (*accent, 255))

    # Large decorative circle (brand element)
    cx, cy = int(width * 0.82), int(height * 0.22)
    r = int(width * 0.28)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*_lighten(c1, 0.15), 255))

    # Product name tag
    tag_font = _get_regular_font(max(18, width // 42))
    tag = product_name.upper()[:24] if product_name else "SWIFTPACK AI"
    tag_y = int(height * 0.12)
    _draw_text_centered(draw, tag, tag_font, tag_y, width, (*_lighten(c1, 0.7),), shadow=False)

    # Accent line under tag
    line_w = int(width * 0.15)
    draw.rectangle([(width // 2 - line_w // 2), tag_y + int(height * 0.045),
                     width // 2 + line_w // 2, tag_y + int(height * 0.048)], fill=(*accent,))

    # Main headline — big, bold, centered
    h1_font = _get_font(max(42, width // 14))
    headline_text = headline[:60] if headline else "Launch in 30 Seconds"
    lines = _wrap_text(headline_text, h1_font, int(width * 0.85), draw)
    line_h = max(52, width // 12)
    text_block_h = len(lines) * line_h
    start_y = (height - text_block_h) // 2
    for i, line in enumerate(lines):
        _draw_text_centered(draw, line, h1_font, start_y + i * line_h, width, (255, 255, 255))

    # Bottom tagline
    sub_font = _get_regular_font(max(22, width // 34))
    sub_y = int(height * 0.78)
    _draw_text_centered(draw, "Powered by AI", sub_font, sub_y, width, (*_lighten(c1, 0.6),), shadow=False)

    # Bottom decorative bar
    _draw_decorative_bar(draw, 0, height - height // 20, width, height // 20, (*_darken(c2, 0.15),))

    img.save(dest_path, 'JPEG', quality=92)


def _make_slide_problem(width, height, color1, color2, sentence, dest_path):
    """Slide 2 — Problem: pain point, emotional contrast, dark/urgent tone."""
    c1 = _hex_to_rgb(color1)
    dark_bg = _darken(c1, 0.55)
    mid_bg = _darken(c1, 0.35)
    accent = _lighten(c1, 0.5)

    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    _draw_gradient_bg(draw, width, height, dark_bg, mid_bg)

    # Top label
    label_font = _get_regular_font(max(18, width // 44))
    label_y = int(height * 0.08)
    _draw_text_centered(draw, "THE PROBLEM", label_font, label_y, width, (*accent,), shadow=False)
    _draw_decorative_bar(draw, width // 2 - int(width * 0.06), label_y + int(height * 0.042),
                         int(width * 0.12), 3, (*accent,))

    # Big ? icon
    icon_font = _get_font(max(80, width // 8))
    icon_y = int(height * 0.18)
    _draw_text_centered(draw, "?", icon_font, icon_y, width, (*_lighten(c1, 0.25),))

    # Pain point text
    pain_font = _get_font(max(34, width // 20))
    text = sentence[:120] if sentence else "Still doing it the hard way?"
    lines = _wrap_text(text, pain_font, int(width * 0.8), draw)
    line_h = max(44, width // 18)
    start_y = int(height * 0.44)
    for i, line in enumerate(lines):
        _draw_text_centered(draw, line, pain_font, start_y + i * line_h, width, (255, 255, 255))

    # Sub-text
    sub_font = _get_regular_font(max(20, width // 36))
    _draw_text_centered(draw, "There's a better way.", sub_font, int(height * 0.78),
                         width, (*_lighten(c1, 0.6),), shadow=False)

    img.save(dest_path, 'JPEG', quality=92)


def _make_slide_solution(width, height, color1, color2, product_name, sentence, dest_path):
    """Slide 3 — Solution: product name + value prop, bright and optimistic."""
    c1 = _hex_to_rgb(color1)
    c2 = _hex_to_rgb(color2)
    accent = _lighten(c1, 0.55)

    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    _draw_gradient_bg(draw, width, height, c1, c2)

    # Large checkmark background circle
    cx, cy = width // 2, int(height * 0.28)
    r = int(width * 0.18)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*_lighten(c1, 0.2),))
    _draw_checkmark(draw, cx, cy, r, (255, 255, 255), width=max(6, width // 90))

    # "Introducing" label
    intro_font = _get_regular_font(max(18, width // 42))
    intro_y = int(height * 0.46)
    _draw_text_centered(draw, "INTRODUCING", intro_font, intro_y, width, (*accent,), shadow=False)

    # Product name — large
    name_font = _get_font(max(46, width // 14))
    name = product_name[:28] if product_name else "SwiftPack AI"
    name_y = int(height * 0.52)
    _draw_text_centered(draw, name, name_font, name_y, width, (255, 255, 255))

    # Value prop sentence
    val_font = _get_regular_font(max(24, width // 30))
    text = sentence[:100] if sentence else "The fastest way to create marketing content"
    lines = _wrap_text(text, val_font, int(width * 0.82), draw)
    line_h = max(32, width // 22)
    start_y = int(height * 0.66)
    for i, line in enumerate(lines):
        _draw_text_centered(draw, line, val_font, start_y + i * line_h, width, (*_lighten(c1, 0.75),))

    img.save(dest_path, 'JPEG', quality=92)


def _make_slide_features(width, height, color1, color2, features, dest_path):
    """Slide 4 — Features: 3 checkmarks with feature bullets."""
    c1 = _hex_to_rgb(color1)
    c2 = _hex_to_rgb(color2)
    accent = _lighten(c1, 0.55)

    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    _draw_gradient_bg(draw, width, height, _darken(c1, 0.1), c2)

    # Header
    hdr_font = _get_font(max(28, width // 24))
    _draw_text_centered(draw, "WHY IT WORKS", hdr_font, int(height * 0.07), width, (255, 255, 255))
    _draw_decorative_bar(draw, width // 2 - int(width * 0.08), int(height * 0.13),
                         int(width * 0.16), 4, (*accent,))

    # Feature list
    item_font = _get_font(max(28, width // 24))
    sub_font = _get_regular_font(max(20, width // 38))
    feat_list = features[:3] if features else ["Fast Results", "Easy to Use", "Professional Quality"]

    spacing = height // (len(feat_list) + 2)
    left_margin = int(width * 0.1)

    for i, feat in enumerate(feat_list):
        y_base = int(height * 0.22) + i * spacing

        # Circle with checkmark
        cr = int(width * 0.055)
        cx = left_margin + cr
        cy = y_base + cr
        draw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=(*accent,))
        _draw_checkmark(draw, cx, cy, cr, (255, 255, 255), width=max(3, width // 180))

        # Feature text
        feat_text = feat[:50]
        text_x = left_margin + cr * 2 + int(width * 0.04)
        draw.text((text_x + 1, y_base + 1), feat_text, font=item_font, fill=(0, 0, 0, 80))
        draw.text((text_x, y_base), feat_text, font=item_font, fill=(255, 255, 255))

    img.save(dest_path, 'JPEG', quality=92)


def _make_slide_how_it_works(width, height, color1, color2, steps, dest_path):
    """Slide 5 — How it works: numbered steps."""
    c1 = _hex_to_rgb(color1)
    c2 = _hex_to_rgb(color2)
    accent = _lighten(c1, 0.55)

    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    _draw_gradient_bg(draw, width, height, c2, _darken(c1, 0.1))

    # Header
    hdr_font = _get_font(max(28, width // 24))
    _draw_text_centered(draw, "HOW IT WORKS", hdr_font, int(height * 0.07), width, (255, 255, 255))
    _draw_decorative_bar(draw, width // 2 - int(width * 0.08), int(height * 0.13),
                         int(width * 0.16), 4, (*accent,))

    step_list = steps[:3] if steps else ["Paste your URL", "AI generates content", "Download & launch"]
    step_font = _get_regular_font(max(24, width // 32))
    num_font = _get_font(max(32, width // 22))

    spacing = height // (len(step_list) + 2)
    left_margin = int(width * 0.1)

    for i, step in enumerate(step_list):
        y_base = int(height * 0.22) + i * spacing

        # Number badge
        nr = int(width * 0.055)
        nx = left_margin + nr
        ny = y_base + nr
        draw.ellipse([nx - nr, ny - nr, nx + nr, ny + nr], fill=(*_darken(c1, 0.25),))
        num_str = str(i + 1)
        nb = draw.textbbox((0, 0), num_str, font=num_font)
        nw = nb[2] - nb[0]
        draw.text((nx - nw // 2, ny - nr // 2), num_str, font=num_font, fill=(255, 255, 255))

        # Connector line (between steps)
        if i < len(step_list) - 1:
            lx = nx
            draw.rectangle([lx - 2, ny + nr, lx + 2, ny + spacing - nr], fill=(*_lighten(c1, 0.3),))

        # Step text
        step_text = step[:55]
        text_x = left_margin + nr * 2 + int(width * 0.04)
        draw.text((text_x + 1, y_base + 1), step_text, font=step_font, fill=(0, 0, 0, 80))
        draw.text((text_x, y_base), step_text, font=step_font, fill=(255, 255, 255))

    img.save(dest_path, 'JPEG', quality=92)


def _make_slide_cta(width, height, color1, color2, product_name, url, dest_path):
    """Slide 6 — CTA: URL, product name, urgency."""
    c1 = _hex_to_rgb(color1)
    c2 = _hex_to_rgb(color2)
    accent = _lighten(c1, 0.55)

    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    _draw_gradient_bg(draw, width, height, _darken(c2, 0.1), _darken(c1, 0.2))

    # Top label
    label_font = _get_regular_font(max(18, width // 44))
    _draw_text_centered(draw, "GET STARTED TODAY", label_font, int(height * 0.08), width, (*accent,), shadow=False)

    # Large CTA headline
    cta_font = _get_font(max(44, width // 14))
    _draw_text_centered(draw, "Try It Free", cta_font, int(height * 0.22), width, (255, 255, 255))

    # Product name
    name_font = _get_font(max(32, width // 20))
    name = product_name[:30] if product_name else "SwiftPack AI"
    _draw_text_centered(draw, name, name_font, int(height * 0.4), width, (*_lighten(c1, 0.7),))

    # URL button visual
    btn_w = int(width * 0.72)
    btn_h = int(height * 0.09)
    btn_x = (width - btn_w) // 2
    btn_y = int(height * 0.54)
    # Button background
    draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h],
                            radius=btn_h // 3, fill=(*_lighten(c1, 0.2),))
    url_font = _get_regular_font(max(20, width // 36))
    url_text = (url[:40] if url else "swiftpackai.tech")
    url_bbox = draw.textbbox((0, 0), url_text, font=url_font)
    url_w = url_bbox[2] - url_bbox[0]
    url_x = (width - url_w) // 2
    draw.text((url_x, btn_y + (btn_h - (url_bbox[3] - url_bbox[1])) // 2), url_text, font=url_font, fill=(255, 255, 255))

    # Free badge
    badge_font = _get_font(max(24, width // 30))
    _draw_text_centered(draw, "No credit card required", badge_font, int(height * 0.72),
                         width, (*_lighten(c1, 0.6),))

    # Urgency strip at bottom
    strip_h = int(height * 0.07)
    draw.rectangle([0, height - strip_h, width, height], fill=(*accent,))
    urg_font = _get_regular_font(max(16, width // 46))
    _draw_text_centered(draw, "Start your free trial now", urg_font,
                         height - strip_h + strip_h // 3, width, (255, 255, 255), shadow=False)

    img.save(dest_path, 'JPEG', quality=92)


def _apply_watermark(image_path: str, text: str = "SwiftPack AI"):
    """
    Burn a diagonal watermark into the CENTER of the slide image.
    The text is large, semi-transparent, and rotated 30° so it covers the
    content area — cropping corners does not remove it.
    """
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size

    # Create transparent overlay same size as image
    overlay = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)

    # Choose font size relative to slide width
    font_size = max(48, w // 9)
    font = _get_font(font_size)

    # Measure text
    tmp_draw = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    try:
        bbox = tmp_draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
    except Exception:
        tw = len(text) * font_size // 2
        th = font_size

    # Draw text on a separate surface (so we can rotate cleanly)
    txt_surface = Image.new("RGBA", (tw + 40, th + 20), (255, 255, 255, 0))
    txt_draw = ImageDraw.Draw(txt_surface)
    # White text at ~30% opacity
    txt_draw.text((20, 10), text, font=font, fill=(255, 255, 255, 76))

    # Rotate 30° (diagonal but readable)
    rotated = txt_surface.rotate(30, expand=True)

    # Stamp it centered — repeat twice (offset) to cover more of the image
    rw, rh = rotated.size
    cx = (w - rw) // 2
    cy = (h - rh) // 2

    # Three copies: center, upper-center, lower-center
    for dy in [-h // 4, 0, h // 4]:
        paste_y = cy + dy
        paste_x = cx + (dy // 6)  # slight horizontal shift for visual variety
        overlay.paste(rotated, (paste_x, paste_y), rotated)

    # Composite overlay onto original image
    watermarked = Image.alpha_composite(img, overlay).convert("RGB")
    watermarked.save(image_path, "JPEG", quality=92)


def _make_design_slides(
    width: int, height: int,
    color1: str, color2: str,
    product_name: str,
    features: List[str],
    sentences: List[str],
    url: str,
    dest_dir: Path,
    watermark: bool = False
) -> List[str]:
    """
    Generate 6 structured marketing slide templates using Pillow.
    Returns list of file paths in slide order.
    Templates: Hero, Problem, Solution, Features, How It Works, CTA
    If watermark=True, burns 'SwiftPack AI' diagonally into each slide's content area.
    """
    slides = []

    # Slide 1: Hero
    p = str(dest_dir / "slide_hero.jpg")
    headline = sentences[0] if sentences else "Launch in 30 Seconds"
    _make_slide_hero(width, height, color1, color2, product_name, headline, p)
    slides.append(p)

    # Slide 2: Problem
    p = str(dest_dir / "slide_problem.jpg")
    problem = sentences[1] if len(sentences) > 1 else "Tired of slow, expensive marketing?"
    _make_slide_problem(width, height, color1, color2, problem, p)
    slides.append(p)

    # Slide 3: Solution
    p = str(dest_dir / "slide_solution.jpg")
    solution = sentences[2] if len(sentences) > 2 else "One click, professional launch pack"
    _make_slide_solution(width, height, color1, color2, product_name, solution, p)
    slides.append(p)

    # Slide 4: Features
    p = str(dest_dir / "slide_features.jpg")
    _make_slide_features(width, height, color1, color2, features, p)
    slides.append(p)

    # Slide 5: How it works
    p = str(dest_dir / "slide_how.jpg")
    steps = [s for s in sentences[3:6]] if len(sentences) > 3 else []
    _make_slide_how_it_works(width, height, color1, color2, steps, p)
    slides.append(p)

    # Slide 6: CTA
    p = str(dest_dir / "slide_cta.jpg")
    _make_slide_cta(width, height, color1, color2, product_name, url, p)
    slides.append(p)

    # Apply watermark to all design slides if requested (free tier only)
    if watermark:
        for slide_path in slides:
            try:
                _apply_watermark(slide_path)
            except Exception as e:
                logger.warning(f"Watermark failed for {slide_path}: {e}")

    return slides


async def _generate_modal_clip(
    prompt: str,
    aspect_ratio: str,
    num_frames: int = 97,
) -> Optional[bytes]:
    """
    Call Modal LTX-Video serverless GPU to generate a short AI video clip.
    Returns raw MP4 bytes, or None if Modal is not configured / call fails.
    This is a best-effort enhancement — callers must always handle None.
    """
    if not MODAL_ENABLED:
        return None
    try:
        import modal as _modal
        loop = asyncio.get_event_loop()
        generator = _modal.Function.lookup(MODAL_APP_NAME, "LTXVideoGenerator.generate")
        video_bytes: bytes = await loop.run_in_executor(
            None,
            lambda: generator.remote(
                prompt=prompt,
                aspect_ratio=aspect_ratio,
                num_frames=num_frames,
            )
        )
        if video_bytes and len(video_bytes) > 10_000:
            logger.info(f"Modal LTX-Video generated {len(video_bytes)//1024} KB clip")
            return video_bytes
        return None
    except Exception as e:
        logger.warning(f"Modal LTX-Video skipped: {e}")
        return None


def _ffmpeg_loop_clip_with_audio(
    clip_path: str,
    sentences: List[str],
    color1: str,
    width: int,
    height: int,
    total_duration: float,
    audio_path: Optional[str],
    output_path: str,
) -> str:
    """
    Take a short AI video clip, loop it to cover total_duration,
    then overlay captions and the branded progress bar.
    Used for Pro tier Modal-generated clips.
    """
    c1 = _to_ffmpeg_color(color1)
    fs = max(28, width // 28)
    dur_per_cap = total_duration / max(len(sentences), 1)

    def _clean(s: str) -> str:
        return (s.replace("'", "").replace("`", "").replace("$", "")
                 .replace(":", " ").replace("\\", "").replace('"', "")
                 .replace("\n", " ").replace("[", "").replace("]", "")
                 .replace("*", "").replace("#", ""))[:70]

    # Loop the clip with -stream_loop -1, scale to target resolution
    inputs = f"-stream_loop -1 -i \"{clip_path}\""

    # Scale + crop to exact canvas, then add captions and progress bar
    scale_filter = (
        f"[0:v]scale={width}:{height}:force_original_aspect_ratio=increase,"
        f"crop={width}:{height},fps=25,format=yuv420p[vbase]"
    )

    drawtext_parts = []
    for i, s in enumerate(sentences):
        t_start = i * dur_per_cap
        t_end = (i + 1) * dur_per_cap
        txt = _clean(s)
        drawtext_parts.append(
            f"drawtext=text='{txt}':"
            f"fontsize={fs}:fontcolor=white:borderw=2:bordercolor=black:"
            f"box=1:boxcolor=black@0.55:boxborderw=12:"
            f"x=(w-text_w)/2:y=h*0.82:"
            f"enable='between(t,{t_start:.3f},{t_end:.3f})'"
        )
    drawtext_parts.append(
        f"drawbox=x=0:y=h-8:w='iw*t/{total_duration:.3f}':h=8:color={c1}@1.0:t=fill"
    )

    caption_filter = ",".join(drawtext_parts)
    filter_complex = f"{scale_filter};[vbase]{caption_filter}[vout]"

    audio_part = (
        f" -i \"{audio_path}\" -map \"[vout]\" -map 1:a -c:a aac -shortest"
        if audio_path else " -map \"[vout]\""
    )

    return (
        f"\"{FFMPEG_BIN}\"{inputs}"
        f" -filter_complex \"{filter_complex}\""
        f"{audio_part}"
        f" -t {total_duration:.3f} -threads 2 -c:v libx264 -preset ultrafast"
        f" -crf 22 -pix_fmt yuv420p -y \"{output_path}\""
    )


def _build_slideshow_ffmpeg(
    image_paths: List[str], sentences: List[str],
    color1: str, width: int, height: int,
    total_duration: float, audio_path: Optional[str], output_path: str
) -> str:
    """
    Build FFmpeg command: Ken-Burns slideshow with xfade crossfade transitions,
    caption overlay, and branded progress bar.
    """
    n = len(image_paths)
    XFADE_DUR = 0.5          # seconds of crossfade overlap between slides
    XFADE_FPS = 24
    # Each input clip needs to be slightly longer than the visible window so the
    # xfade filter has frames to blend with. We keep the *visible* duration per
    # slide constant and increase the input clip length by the crossfade duration.
    dur_per_slide = total_duration / n          # visible duration each slide contributes
    clip_dur = dur_per_slide + XFADE_DUR        # input clip length (with tail for blending)
    # True output duration after chaining xfades:
    #   n slides × dur_per_slide − (n−1) × XFADE_DUR  (overlaps cancel out)
    actual_duration = n * dur_per_slide - (n - 1) * XFADE_DUR

    # Rotate through a small set of transitions for visual variety
    _TRANSITIONS = ["fade", "slideleft", "slideright", "wipeleft", "wiperight", "fadeblack"]
    c1 = _to_ffmpeg_color(color1)
    fs = max(28, width // 28)

    def _clean(s: str) -> str:
        return (s.replace("'", "").replace("`", "").replace("$", "")
                 .replace(":", " ").replace("\\", "").replace('"', "")
                 .replace("\n", " ").replace("[", "").replace("]", "")
                 .replace("*", "").replace("#", ""))[:70]

    # ── Inputs ────────────────────────────────────────────────────────────────
    # Each image loops for clip_dur (slightly longer than its visible window)
    inputs = ""
    for p in image_paths:
        inputs += f" -loop 1 -t {clip_dur:.3f} -i \"{p}\""

    # ── filter_complex ────────────────────────────────────────────────────────
    filter_parts = []

    # 1. Per-clip: scale → crop → zoompan → format (yuv420p required by xfade)
    for i in range(n):
        filter_parts.append(
            f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height},"
            f"zoompan=z='min(zoom+0.0008,1.2)':d={int(clip_dur * XFADE_FPS)}:"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={width}x{height}:fps={XFADE_FPS},"
            f"format=yuv420p[v{i}]"
        )

    # 2. Chain xfade filters between consecutive clips
    #    offset[i] = (i+1) × (dur_per_slide − XFADE_DUR)
    #    i.e. the point in the *output* stream where slide i+1 begins to appear
    if n == 1:
        # Single clip — no transition needed
        filter_parts.append(f"[v0]null[vbase]")
    else:
        prev_label = "v0"
        for i in range(n - 1):
            transition = _TRANSITIONS[i % len(_TRANSITIONS)]
            offset = (i + 1) * (dur_per_slide - XFADE_DUR)
            next_label = f"v{i+1}"
            out_label = "vbase" if i == n - 2 else f"xf{i}"
            filter_parts.append(
                f"[{prev_label}][{next_label}]"
                f"xfade=transition={transition}:duration={XFADE_DUR:.3f}:offset={offset:.3f}"
                f"[{out_label}]"
            )
            prev_label = out_label

    # 3. Captions: timed to actual_duration timeline (one caption per sentence)
    dur_per_cap = actual_duration / max(len(sentences), 1)
    drawtext_parts = []
    for i, s in enumerate(sentences):
        t_start = i * dur_per_cap
        t_end = (i + 1) * dur_per_cap
        txt = _clean(s)
        drawtext_parts.append(
            f"drawtext=text='{txt}':"
            f"fontsize={fs}:fontcolor=white:borderw=2:bordercolor=black:"
            f"box=1:boxcolor=black@0.55:boxborderw=12:"
            f"x=(w-text_w)/2:y=h*0.82:"
            f"enable='between(t,{t_start:.3f},{t_end:.3f})'"
        )

    # 4. Branded progress bar (uses actual_duration)
    drawtext_parts.append(
        f"drawbox=x=0:y=h-8:w='iw*t/{actual_duration:.3f}':h=8:color={c1}@1.0:t=fill"
    )

    caption_filter = ",".join(drawtext_parts)
    filter_complex = ";".join(filter_parts) + f";[vbase]{caption_filter}[vout]"

    audio_part = (
        f" -i \"{audio_path}\" -map \"[vout]\" -map {n}:a -c:a aac -shortest"
        if audio_path else " -map \"[vout]\""
    )
    return (
        f"\"{FFMPEG_BIN}\"{inputs}"
        f" -filter_complex \"{filter_complex}\""
        f"{audio_part}"
        f" -t {actual_duration:.3f} -threads 2 -c:v libx264 -preset ultrafast"
        f" -crf 23 -pix_fmt yuv420p -y \"{output_path}\""
    )


async def generate_tts_audio(text: str, output_path: str) -> bool:
    # Primary: Edge TTS — Microsoft Neural voices, free, no API key, human-quality
    try:
        import edge_tts
        # Andrew = warm male narrator; alternatives: JennyNeural, GuyNeural, AriaNeural
        communicate = edge_tts.Communicate(text, voice="en-US-AndrewNeural", rate="+5%")
        await communicate.save(output_path)
        if Path(output_path).exists() and Path(output_path).stat().st_size > 1000:
            logger.info("Edge TTS succeeded")
            return True
    except Exception as e:
        logger.warning(f"Edge TTS failed: {e}, falling back to gTTS")

    # Fallback: gTTS
    try:
        from gtts import gTTS
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: gTTS(text=text, lang='en', slow=False).save(output_path))
        if Path(output_path).exists() and Path(output_path).stat().st_size > 1000:
            logger.info("gTTS fallback succeeded")
            return True
    except Exception as e:
        logger.warning(f"gTTS failed: {e}. No audio.")

    return False


def _to_ffmpeg_color(h: str) -> str:
    """Convert #RRGGBB hex to 0xRRGGBB for FFmpeg."""
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return f"0x{h.upper()}"


def _fallback_ffmpeg(sentences, color1, width, height, duration_per_caption, audio_path, output_path) -> str:
    total = len(sentences) * duration_per_caption
    c1 = _to_ffmpeg_color(color1)
    fs = max(28, width // 28)

    def _clean(s):
        # Remove chars that break FFmpeg filter syntax
        return s.replace("'", "").replace("`", "").replace("$", "").replace(":", " ").replace("\\", "").replace('"', "").replace("\n", " ").replace("[", "").replace("]", "").replace("*", "").replace("#", "")[:70]

    drawtext_parts = []
    for i, s in enumerate(sentences):
        t_start = i * duration_per_caption
        t_end = (i + 1) * duration_per_caption
        txt = _clean(s)
        drawtext_parts.append(
            f"drawtext=text='{txt}':"
            f"fontsize={fs}:fontcolor=white:borderw=3:bordercolor=black:"
            f"x=(w-text_w)/2:y=h*0.75:"
            f"enable='between(t,{t_start:.2f},{t_end:.2f})'"
        )

    progress = f"drawbox=x=0:y=h-10:w='iw*t/{total:.2f}':h=10:color={c1}@1.0:t=fill"
    filters = ",".join(drawtext_parts) + "," + progress

    audio_part = f" -i \"{audio_path}\" -c:a aac -shortest" if audio_path else ""
    return (
        f"\"{FFMPEG_BIN}\" -f lavfi -i color=c={c1}:size={width}x{height}:rate=24"
        f"{audio_part} -vf \"{filters}\""
        f" -t {total:.2f} -threads 2 -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -y \"{output_path}\""
    )


async def generate_ffmpeg_command(
    sentences: list, color1: str, color2: str,
    width: int, height: int, total_duration: float,
    audio_path: Optional[str], output_path: str
) -> str:
    duration_per_caption = total_duration / max(len(sentences), 1)

    if not _gemini_ready or _gemini_client is None:
        logger.info("Gemini not configured, using fallback FFmpeg template")
        return _fallback_ffmpeg(sentences, color1, width, height, duration_per_caption, audio_path, output_path)

    caption_list = "\n".join(
        f"{i}. start={i*duration_per_caption:.1f}s end={(i+1)*duration_per_caption:.1f}s text=\"{s[:60]}\""
        for i, s in enumerate(sentences)
    )
    prompt = f"""You are an FFmpeg expert. Generate a single complete FFmpeg shell command.
Video: {width}x{height}, {total_duration:.1f}s duration
Background: solid color {color1}
Captions — white bold text, black outline, centered at 75% height, use drawtext with enable=between(t,...):
{caption_list}
Progress bar: thin bar at bottom using drawbox, grows left to right over full duration, color {color1}
Audio: {"add -i AUDIO_PATH and -c:a aac -shortest" if audio_path else "no audio"}
Output: OUTPUT_PATH
Codec: libx264, preset ultrafast, crf 23, pix_fmt yuv420p, fps 24, threads 2
Use -f lavfi -i color=c=COLOR:size={width}x{height}:rate=24 as video source.
Return ONLY the ffmpeg command as a single line. No markdown, no explanation. Use AUDIO_PATH and OUTPUT_PATH as placeholders."""

    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: _gemini_client.models.generate_content(model='gemini-2.5-flash', contents=prompt))
        cmd = re.sub(r'^```[a-z]*\n?|\n?```$', '', response.text.strip()).strip()
        if not cmd.startswith('ffmpeg'):
            raise ValueError("Not an ffmpeg command")
        # Replace ffmpeg binary name with full path
        cmd = re.sub(r'^ffmpeg\b', f'"{FFMPEG_BIN}"', cmd)
        # Dry run validation with 0.5s clip
        dry_out = str(Path(tempfile.gettempdir()) / "dryrun_test.mp4")
        test_cmd = (
            cmd.replace('AUDIO_PATH', audio_path or '')
               .replace('OUTPUT_PATH', dry_out)
            + ' -t 0.5 -y'
        )
        result = await loop.run_in_executor(
            None,
            lambda: subprocess.run(test_cmd, shell=True, capture_output=True, text=True, timeout=15)
        )
        if result.returncode != 0:
            raise ValueError(f"Dry run failed: {result.stderr[-200:]}")
        logger.info("Gemini FFmpeg command passed validation")
        return (
            cmd.replace('AUDIO_PATH', audio_path or '')
               .replace('OUTPUT_PATH', f'"{output_path}"')
        )
    except Exception as e:
        logger.warning(f"Gemini FFmpeg failed ({e}), using fallback template")
        return _fallback_ffmpeg(sentences, color1, width, height, duration_per_caption, audio_path, output_path)


# ── Routes ─────────────────────────────────────────────────────────────────────

@api_router.post("/scrape")
async def scrape_url(url: str = Form(...)):
    if not _is_safe_url(url):
        raise HTTPException(status_code=400, detail="Invalid or disallowed URL")
    try:
        ua_headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = await _safe_http_get(url, headers=ua_headers)
        soup = BeautifulSoup(response.text, 'html.parser')

        title = soup.find('title')
        headline = title.string if title else "Your Product"

        meta_desc = soup.find('meta', attrs={'name': 'description'})
        description = meta_desc['content'] if meta_desc else "Amazing product description"

        features = []
        for tag in soup.find_all(['h2', 'h3', 'li']):
            text = tag.get_text().strip()
            if text and len(text) > 10 and len(text) < 100:
                features.append(text)
                if len(features) >= 5:
                    break

        colors = ["#6366f1", "#8b5cf6", "#10b981"]
        try:
            og_image = soup.find('meta', property='og:image')
            if og_image and og_image.get('content'):
                img_url = og_image['content']
                if not img_url.startswith('http'):
                    from urllib.parse import urljoin
                    img_url = urljoin(url, img_url)
                # SSRF check on the image URL before fetching
                if _is_safe_url(img_url):
                    extracted = await extract_colors_from_image(img_url)
                    if extracted:
                        colors = extracted
        except Exception:
            pass

        images = await _scrape_images(url, soup)

        brand_data = {
            "url": url,
            "colors": colors[:3],
            "headline": headline,
            "features": features[:5],
            "description": description[:200],
            "images": images
        }

        return brand_data
    except Exception as e:
        logger.error(f"Scraping error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to scrape URL: {str(e)}")


_MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), file_type: str = Form(...)):
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix
    file_path = UPLOADS_DIR / f"{file_id}{file_ext}"
    total = 0
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            chunk_size = 256 * 1024  # 256 KB chunks
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total += len(chunk)
                if total > _MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="File too large. Maximum size is 50 MB.")
                await f.write(chunk)
        return {
            "id": file_id,
            "filename": file.filename,
            "path": str(file_path),
            "type": file_type,
            "size": total
        }
    except HTTPException:
        file_path.unlink(missing_ok=True)
        raise
    except Exception as e:
        file_path.unlink(missing_ok=True)
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")


@api_router.delete("/upload/{file_id}")
async def delete_upload(file_id: str):
    # Prevent path traversal: file_id must be a plain UUID
    if not re.match(r'^[0-9a-f\-]{36}$', file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    matches = list(UPLOADS_DIR.glob(f"{file_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="File not found")
    for f in matches:
        f.unlink(missing_ok=True)
    return {"deleted": file_id}


def _build_script_prompt(request: "ScriptRequest") -> str:
    features = ', '.join(request.key_features) if request.key_features else "easy, fast, reliable"
    frameworks = {
        "PAS": f"""Write a 60-second video ad script for {request.product_name} using Problem-Agitate-Solution.
Target audience: {request.target_audience}
Key features: {features}
Structure: Problem (15s) → Agitate (20s) → Solution (25s) with CTA.
Be conversational and authentic. Return only the script text.""",

        "Step-by-Step": f"""Write a 60-second tutorial script for {request.product_name}.
Target audience: {request.target_audience}
Key features: {features}
Structure: Intro (10s) → 3 clear steps (40s) → Encouragement + CTA (10s).
Be simple and encouraging. Return only the script text.""",

        "Before/After": f"""Write a 60-second Before/After transformation script for {request.product_name}.
Target audience: {request.target_audience}
Key features: {features}
Structure: Before struggle (20s) → Discovery (10s) → After transformation (30s).
Be emotional and aspirational. Return only the script text.""",
    }
    return frameworks.get(request.framework, frameworks["PAS"])


def _template_script(request: "ScriptRequest") -> str:
    """Emergency fallback — no AI required. Returns a fill-in-the-blank script."""
    name = request.product_name
    audience = request.target_audience
    features = request.key_features or ["fast", "easy", "reliable"]
    f1, f2, f3 = (features + features + features)[:3]

    if request.framework == "PAS":
        return (
            f"Are you tired of struggling with the same old problems? "
            f"As {audience}, you deserve better. "
            f"Every day without the right tool costs you time and energy. "
            f"That's exactly why {name} was built for you. "
            f"With {f1}, {f2}, and {f3}, it changes everything. "
            f"Try {name} today — your future self will thank you."
        )
    elif request.framework == "Before/After":
        return (
            f"Before {name}: endless frustration, wasted hours, no results. "
            f"Then everything changed. "
            f"After {name}: {f1} in minutes, {f2} without the headache, and {f3} every single time. "
            f"{audience} everywhere are making the switch. "
            f"Your transformation starts now — try {name} free today."
        )
    else:  # Step-by-Step
        return (
            f"Getting started with {name} is simple. "
            f"Step one: sign up in under 60 seconds. "
            f"Step two: {f1} — done automatically for you. "
            f"Step three: enjoy {f2} and {f3} from day one. "
            f"That's it. Join thousands of {audience} already using {name}. Start free today."
        )


async def _gemini_generate(prompt: str) -> str:
    """Try Gemini 2.5 Flash. Raises on failure."""
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(None, lambda: _gemini_client.models.generate_content(model='gemini-2.5-flash', contents=prompt))
    text = response.text.strip()
    if not text:
        raise ValueError("Gemini returned empty response")
    return text


async def _openrouter_generate(prompt: str) -> str:
    """Try OpenRouter (mistral-7b-instruct as free fallback). Raises on failure."""
    headers = {
        "Authorization": f"Bearer {_openrouter_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://swiftpackai.tech",
        "X-Title": "SwiftPack AI",
    }
    payload = {
        "model": "mistralai/mistral-7b-instruct:free",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 400,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers)
        resp.raise_for_status()
        text = resp.json()["choices"][0]["message"]["content"].strip()
    if not text:
        raise ValueError("OpenRouter returned empty response")
    return text


@api_router.post("/generate-script")
async def generate_script(request: ScriptRequest, user = Depends(get_optional_user)):
    if user:
        await check_usage_limit(user, "scripts")

    prompt = _build_script_prompt(request)
    script_text = None
    source = "unknown"

    # Tier 1 — Gemini
    if _gemini_ready and _gemini_client is not None:
        for attempt in range(2):
            try:
                script_text = await _gemini_generate(prompt)
                source = "gemini"
                break
            except Exception as e:
                logger.warning(f"Gemini attempt {attempt + 1} failed: {e}")

    # Tier 2 — OpenRouter
    if not script_text and _openrouter_ready:
        try:
            script_text = await _openrouter_generate(prompt)
            source = "openrouter"
            logger.info("Script generated via OpenRouter fallback")
        except Exception as e:
            logger.warning(f"OpenRouter fallback failed: {e}")

    # Tier 3 — Template (always works)
    if not script_text:
        script_text = _template_script(request)
        source = "template"
        logger.info("Script generated via template emergency fallback")

    script_doc = {
        "id": str(uuid.uuid4()),
        "framework": request.framework,
        "content": script_text,
        "product_name": request.product_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "type": "script",
        "source": source,
    }
    if user:
        script_doc["user_id"] = user["id"]
        await increment_usage(user["id"], "scripts")
    try:
        await db.scripts.insert_one({**script_doc, "_id": script_doc["id"]})
    except Exception as db_err:
        logger.warning(f"DB write skipped (MongoDB unavailable): {db_err}")
    return script_doc


@api_router.post("/generate-voiceover")
async def generate_voiceover(request: VoiceoverRequest):
    try:
        audio_id = str(uuid.uuid4())
        audio_path = str(OUTPUTS_DIR / f"{audio_id}.mp3")

        success = await generate_tts_audio(request.text, audio_path)
        if not success:
            raise HTTPException(status_code=503, detail="TTS generation failed: no TTS engine available")

        char_count = len(request.text)
        return {
            "id": audio_id,
            "path": audio_path,
            "url": f"/api/download/{audio_id}.mp3",
            "characters_used": char_count,
            "estimated_cost": "$0.00 (gTTS free)"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voiceover generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Voiceover generation failed: {str(e)}")


@api_router.post("/create-complete-video")
async def create_complete_video(request: CompleteVideoRequest, user = Depends(get_optional_user)):
    """Create a complete professional video with voiceover, captions, and progress bar"""
    await check_usage_limit(user, "videos")
    await check_format_allowed(user, request.format)
    video_id = str(uuid.uuid4())
    format_map = {"16:9": (1920, 1080), "9:16": (1080, 1920), "1:1": (1080, 1080)}
    width, height = format_map.get(request.format, (1080, 1080))

    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', request.script) if s.strip()][:12]
    if not sentences:
        sentences = [request.script.strip()[:80]]
    total_duration = len(sentences) * 3.0

    # Generate voiceover
    audio_path = None
    if request.add_voiceover:
        audio_file = str(OUTPUTS_DIR / f"{video_id}_audio.mp3")
        success = await generate_tts_audio(request.script, audio_file)
        if success and Path(audio_file).exists():
            audio_path = audio_file
        else:
            logger.warning("Audio generation failed or file missing, rendering without audio")

    output_path = str(OUTPUTS_DIR / f"{video_id}.mp4")
    color1 = request.brand_colors[0] if request.brand_colors else "#6366f1"
    color2 = request.brand_colors[1] if len(request.brand_colors) > 1 else "#8b5cf6"

    # Try to download scraped images for use as video backgrounds
    tmp_dir = Path(tempfile.mkdtemp(prefix="swiftpack_imgs_"))
    local_images: List[str] = []
    loop = asyncio.get_event_loop()

    if request.images:
        download_tasks = []
        for idx, img_url in enumerate(request.images[:6]):
            dest = str(tmp_dir / f"img_{idx}.jpg")
            download_tasks.append(_download_image_to_file(img_url, dest))
        results_dl = await asyncio.gather(*download_tasks, return_exceptions=True)
        for idx, ok in enumerate(results_dl):
            dest = str(tmp_dir / f"img_{idx}.jpg")
            if ok is True and Path(dest).exists():
                local_images.append(dest)

    # Watermark: free (unauthenticated) users or free-tier users get it burned in.
    # Paid tiers (starter, pro, agency) get clean slides.
    user_tier = user.get("tier", "free") if user else "free"
    apply_watermark = user_tier not in ("starter", "pro", "agency")

    # If we have fewer real images than needed, generate branded design slides to fill gaps.
    # Strategy: always generate the full 6-slide design set as fallback candidates,
    # then interleave real images where we have them.
    design_slides = await loop.run_in_executor(
        None,
        lambda: _make_design_slides(
            width=width, height=height,
            color1=color1, color2=color2,
            product_name=request.product_name or "",
            features=request.features or [],
            sentences=sentences,
            url="",
            dest_dir=tmp_dir,
            watermark=apply_watermark
        )
    )

    # Build final slide list: real images first, then design slides to reach 6 total
    combined: List[str] = []
    design_idx = 0

    # We want exactly 6 slides for a well-paced video
    TARGET_SLIDES = 6
    real_img_count = len(local_images)

    if real_img_count >= TARGET_SLIDES:
        # Enough real images — use them all (up to 6)
        combined = local_images[:TARGET_SLIDES]
    elif real_img_count == 0:
        # No real images — use all 6 design slides
        combined = design_slides[:TARGET_SLIDES]
    else:
        # Mix: interleave real images with design slides for visual variety
        # Pattern: hero slide, real image, design slide, real image, design slide, CTA
        combined.append(design_slides[0])  # Hero always first
        for i in range(real_img_count):
            combined.append(local_images[i])
            if len(combined) < TARGET_SLIDES - 1 and design_idx + 1 < len(design_slides) - 1:
                design_idx += 1
                combined.append(design_slides[design_idx])
        # Always end with CTA
        if len(combined) < TARGET_SLIDES:
            combined.append(design_slides[-1])  # CTA
        combined = combined[:TARGET_SLIDES]

    local_images = combined
    total_duration = len(local_images) * 3.0  # 3s per slide

    # ── Pro/Agency: try Modal LTX-Video GPU ──────────────────────────────────
    # Build a rich visual prompt from the product name + script
    modal_used = False
    if user_tier in ("pro", "agency") and MODAL_ENABLED:
        product_ctx = request.product_name or ""
        prompt_for_modal = (
            f"Professional marketing video for {product_ctx}. "
            f"{sentences[0] if sentences else ''} "
            "Sleek modern aesthetic, smooth cinematic motion, vibrant brand colors, "
            "high production quality, no text, no watermarks."
        )[:500]
        logger.info(f"Attempting Modal LTX-Video for {user_tier} user …")
        clip_bytes = await _generate_modal_clip(
            prompt=prompt_for_modal,
            aspect_ratio=request.format,
            num_frames=97,  # ~4s clip that will be looped to full duration
        )
        if clip_bytes:
            # Save clip to temp file, then loop+overlay with FFmpeg
            modal_clip_path = str(tmp_dir / "modal_clip.mp4")
            with open(modal_clip_path, "wb") as f:
                f.write(clip_bytes)

            cmd = _ffmpeg_loop_clip_with_audio(
                clip_path=modal_clip_path,
                sentences=sentences,
                color1=color1,
                width=width, height=height,
                total_duration=total_duration,
                audio_path=audio_path,
                output_path=output_path,
            )
            logger.info("Running FFmpeg loop+overlay on Modal clip …")
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=180)
            )
            if result.returncode == 0 and Path(output_path).exists():
                modal_used = True
                logger.info("Modal LTX-Video pipeline completed successfully.")
            else:
                logger.warning(f"FFmpeg loop failed (falling back to slideshow): {result.stderr[-300:]}")

    # ── Slideshow fallback (free/starter or Modal unavailable/failed) ─────────
    if not modal_used:
        cmd = _build_slideshow_ffmpeg(
            local_images, sentences, color1, width, height,
            total_duration, audio_path, output_path
        )
        logger.info(f"Running FFmpeg slideshow ({len(local_images)} slides) …")
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        )
        if result.returncode != 0:
            logger.error(f"FFmpeg stderr: {result.stderr[-800:]}")
            raise HTTPException(status_code=500, detail=f"Video rendering failed: {result.stderr[-300:]}")

    if not Path(output_path).exists():
        raise HTTPException(status_code=500, detail="FFmpeg exited 0 but output file missing")

    # Clean up temp dir
    import shutil
    try:
        shutil.rmtree(tmp_dir, ignore_errors=True)
    except Exception:
        pass

    video_doc = {
        "id": video_id,
        "url": f"/api/download/{video_id}.mp4",
        "format": request.format,
        "duration": total_duration,
        "has_audio": audio_path is not None,
        "engine": "ltx-video" if modal_used else "slideshow",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "type": "video"
    }
    if user:
        video_doc["user_id"] = user["id"]
        await increment_usage(user["id"], "videos")
    try:
        await db.videos.insert_one({**video_doc, "_id": video_id})
    except Exception as db_err:
        logger.warning(f"DB write skipped (MongoDB unavailable): {db_err}")
    return video_doc


@api_router.post("/create-video")
async def create_video(background_tasks: BackgroundTasks, video_type: str = Form(...), format_type: str = Form("16:9"), script_text: str = Form(...), image_paths: str = Form("[]")):
    try:
        video_id = str(uuid.uuid4())

        if format_type == "16:9":
            width, height = 1920, 1080
        elif format_type == "9:16":
            width, height = 1080, 1920
        else:
            width, height = 1080, 1080

        image_list = json.loads(image_paths) if image_paths != "[]" else []
        output_path = str(OUTPUTS_DIR / f"{video_id}.mp4")

        if not image_list:
            colors = ["0x6366f1", "0x8b5cf6", "0x10b981"]
            inputs = " ".join(
                f"-f lavfi -i color=c={c}:size={width}x{height}:rate=24:duration=2"
                for c in colors
            )
            cmd = (
                f"\"{FFMPEG_BIN}\" {inputs} "
                f"-filter_complex \"[0][1][2]concat=n=3:v=1:a=0[v]\" "
                f"-map \"[v]\" -threads 2 -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -y \"{output_path}\""
            )
        else:
            uploads_resolved = UPLOADS_DIR.resolve()
            valid_images = [
                p for p in image_list[:5]
                if Path(p).exists()
                and str(Path(p).resolve()).startswith(str(uploads_resolved))
            ]
            if valid_images:
                inputs = " ".join(f"-loop 1 -t 3 -i \"{p}\"" for p in valid_images)
                filter_parts = "".join(
                    f"[{i}:v]scale={width}:{height},setsar=1[v{i}];"
                    for i in range(len(valid_images))
                )
                concat_inputs = "".join(f"[v{i}]" for i in range(len(valid_images)))
                cmd = (
                    f"\"{FFMPEG_BIN}\" {inputs} "
                    f"-filter_complex \"{filter_parts}{concat_inputs}concat=n={len(valid_images)}:v=1:a=0[v]\" "
                    f"-map \"[v]\" -threads 2 -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -y \"{output_path}\""
                )
            else:
                cmd = (
                    f"\"{FFMPEG_BIN}\" -f lavfi -i color=c=0x6366f1:size={width}x{height}:rate=24:duration=5 "
                    f"-threads 2 -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -y \"{output_path}\""
                )

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        )

        if result.returncode != 0:
            logger.error(f"FFmpeg failed: {result.stderr[-500:]}")
            raise HTTPException(status_code=500, detail=f"Video rendering failed: {result.stderr[-200:]}")

        return {
            "id": video_id,
            "path": output_path,
            "url": f"/api/download/{video_id}.mp4",
            "format": format_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Video creation failed: {str(e)}")


@api_router.post("/create-poster")
async def create_poster(request: PosterRequest, user = Depends(get_optional_user)):
    if user:
        await check_usage_limit(user, "posters")

    # Assign path before try so the except block can clean it up
    poster_id = str(uuid.uuid4())
    poster_path = OUTPUTS_DIR / f"{poster_id}.png"

    try:
        if request.format == "1:1":
            width, height = 1080, 1080
        else:
            width, height = 1080, 1920

        bg_color = request.brand_colors[0] if request.brand_colors else "#6366f1"
        img = Image.new('RGB', (width, height), color=bg_color)
        draw = ImageDraw.Draw(img)

        # Try platform-specific font paths
        _font_candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/arial.ttf",
        ]
        _sub_candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "C:/Windows/Fonts/arial.ttf",
        ]
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        for fp in _font_candidates:
            try:
                title_font = ImageFont.truetype(fp, 80)
                break
            except Exception:
                pass
        for fp in _sub_candidates:
            try:
                subtitle_font = ImageFont.truetype(fp, 40)
                break
            except Exception:
                pass

        text_color = "#ffffff"

        bbox = draw.textbbox((0, 0), request.headline, font=title_font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = (width - text_width) // 2
        text_y = height // 3

        draw.text((text_x, text_y), request.headline, fill=text_color, font=title_font)

        if request.subtext:
            bbox2 = draw.textbbox((0, 0), request.subtext, font=subtitle_font)
            sub_width = bbox2[2] - bbox2[0]
            sub_x = (width - sub_width) // 2
            sub_y = text_y + text_height + 50
            draw.text((sub_x, sub_y), request.subtext, fill=text_color, font=subtitle_font)

        img.save(poster_path)

        poster_doc = {
            "id": poster_id,
            "url": f"/api/download/{poster_id}.png",
            "format": request.format,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "type": "poster"
        }
        if user:
            poster_doc["user_id"] = user["id"]
            await increment_usage(user["id"], "posters")
        try:
            await db.posters.insert_one({**poster_doc, "_id": poster_id})
        except Exception as db_err:
            logger.warning(f"DB write skipped (MongoDB unavailable): {db_err}")

        return {
            "id": poster_id,
            "path": str(poster_path),
            "url": f"/api/download/{poster_id}.png",
            "format": request.format
        }
    except HTTPException:
        poster_path.unlink(missing_ok=True)
        raise
    except Exception as e:
        poster_path.unlink(missing_ok=True)
        logger.error(f"Poster creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Poster creation failed: {str(e)}")


async def _magic_launch_pack_handler(request: MagicButtonRequest):
    """Shared logic for magic-button and magic-launch-pack."""
    # Step 1: Scrape
    brand_data = await scrape_url(url=request.url)

    # Step 2 & 3: Scripts
    script_req = ScriptRequest(
        framework="PAS",
        product_name=request.product_name,
        target_audience=request.target_audience,
        key_features=brand_data["features"][:3] or ["easy", "fast", "reliable"]
    )
    ad_script = await generate_script(script_req, user=None)

    script_req.framework = "Step-by-Step"
    tutorial_script = await generate_script(script_req, user=None)

    scraped_images = brand_data.get("images", [])

    features = brand_data.get("features", [])[:5]

    # Step 4: Ad video
    ad_video = None
    try:
        ad_video_req = CompleteVideoRequest(
            script=truncate_to_sentences(ad_script["content"]),
            images=scraped_images,
            brand_colors=brand_data["colors"],
            format="9:16",
            add_voiceover=True,
            add_captions=True,
            add_progress_bar=True,
            product_name=request.product_name,
            features=features,
            description=brand_data.get("description", "")[:150]
        )
        ad_video = await create_complete_video(ad_video_req, user=None)
    except Exception as e:
        logger.warning(f"Ad video creation failed: {e}, skipping")

    # Step 5: Tutorial video
    tutorial_video = None
    try:
        tutorial_video_req = CompleteVideoRequest(
            script=truncate_to_sentences(tutorial_script["content"]),
            images=scraped_images,
            brand_colors=brand_data["colors"],
            format="16:9",
            add_voiceover=True,
            add_captions=True,
            add_progress_bar=True,
            product_name=request.product_name,
            features=features,
            description=brand_data.get("description", "")[:150]
        )
        tutorial_video = await create_complete_video(tutorial_video_req, user=None)
    except Exception as e:
        logger.warning(f"Tutorial video creation failed: {e}, skipping")

    # Step 6: Posters
    poster1 = await create_poster(PosterRequest(
        headline=request.product_name,
        subtext=brand_data["description"][:50],
        brand_colors=brand_data["colors"],
        format="1:1"
    ), user=None)
    poster2 = await create_poster(PosterRequest(
        headline=request.product_name,
        subtext="Transform Your Workflow",
        brand_colors=brand_data["colors"],
        format="9:16"
    ), user=None)

    return {
        "brand_data": brand_data,
        "ad_script": ad_script,
        "tutorial_script": tutorial_script,
        "ad_video": ad_video,
        "tutorial_video": tutorial_video,
        "posters": [poster1, poster2]
    }


@api_router.post("/magic-launch-pack")
async def magic_launch_pack(request: MagicButtonRequest):
    try:
        return await _magic_launch_pack_handler(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Magic launch pack error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Magic launch pack failed: {str(e)}")


@api_router.post("/magic-button")
async def magic_button(request: MagicButtonRequest):
    try:
        return await _magic_launch_pack_handler(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Magic button error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Magic button failed: {str(e)}")


@api_router.get("/download/{filename}")
async def download_file(filename: str):
    file_path = (OUTPUTS_DIR / filename).resolve()
    if not str(file_path).startswith(str(OUTPUTS_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@api_router.get("/projects")
async def get_projects(user = Depends(get_optional_user)):
    if not user:
        return []
    projects = await db.projects.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return projects


@api_router.post("/projects")
async def create_project(name: str = Form(...), user = Depends(get_optional_user)):
    project = Project(name=name)
    doc = project.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if user:
        doc['user_id'] = user["id"]
    await db.projects.insert_one(doc)
    return project


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user = Depends(get_optional_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required to delete projects")
    result = await db.projects.delete_one({"id": project_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found or not yours")
    return {"deleted": project_id}


@api_router.get("/health")
async def health_check():
    try:
        await db.command("ping")
        db_status = "ok"
    except Exception:
        db_status = "error"
    return {"status": "ok", "db": db_status}


@api_router.get("/")
async def root():
    return {"message": "SwiftPack AI API"}


# ── Auth Router ────────────────────────────────────────────────────────────────
auth_router = APIRouter(prefix="/api/auth")

@auth_router.post("/request-beta-access")
async def request_beta_access(req: BetaAccessRequest):
    """
    Beta waitlist endpoint — replaces open registration.
    Stores the request in beta_users (pending). No account is created here.
    """
    email = req.email.lower().strip()
    existing = await db.beta_users.find_one({"email": email})
    if existing:
        # Don't reveal approval status — same message either way
        return {"message": "Your access request has been received. We will notify you at this email when your account is ready."}
    await db.beta_users.insert_one({
        "_id": email,
        "email": email,
        "name": req.name.strip(),
        "is_approved": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": None,
        "invite_code": None,
    })
    logger.info("Beta access requested: %s", email)
    return {"message": "Your access request has been received. We will notify you at this email when your account is ready."}


@auth_router.post("/register")
async def register(req: RegisterRequest):
    """
    Direct registration — kept for admin-created accounts and future use.
    Not exposed on the public UI during beta.
    """
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": req.email.lower(),
        "name": req.name,
        "hashed_password": hash_password(req.password),
        "tier": "free",
        "google_id": None,
        "stripe_customer_id": None,
        "email_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one({**user, "_id": user_id})
    token = create_jwt(user_id)
    safe = {k: v for k, v in user.items() if k != "hashed_password"}
    return {"token": token, "user": safe}

@auth_router.post("/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not user.get("hashed_password"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_jwt(user["id"])
    safe = {k: v for k, v in user.items() if k not in ("_id", "hashed_password")}
    return {"token": token, "user": safe}

@auth_router.get("/me")
async def me(user = Depends(get_current_user)):
    tier = user.get("tier", "free")
    cfg = TIER_CONFIG.get(tier, TIER_CONFIG["free"])
    agreement = await db.beta_agreements.find_one({"user_id": user["id"]})

    if cfg["lifetime"]:
        # Aggregate lifetime totals across all months
        pipeline = [
            {"$match": {"user_id": user["id"]}},
            {"$group": {"_id": None,
                        "videos": {"$sum": "$videos"},
                        "scripts": {"$sum": "$scripts"},
                        "posters": {"$sum": "$posters"}}}
        ]
        result = await db.usage.aggregate(pipeline).to_list(1)
        usage_totals = result[0] if result else {}
    else:
        year_month = datetime.now(timezone.utc).strftime("%Y-%m")
        usage_totals = await db.usage.find_one({"user_id": user["id"], "year_month": year_month}) or {}

    usage = {k: usage_totals.get(k, 0) for k in ("scripts", "videos", "posters")}
    limits = {k: cfg.get(k) for k in ("videos", "scripts", "posters")}
    remaining = {k: max(0, limits[k] - usage[k]) for k in limits}

    safe = {k: v for k, v in user.items() if k != "hashed_password"}
    safe["usage"] = usage
    safe["limits"] = limits
    safe["remaining"] = remaining
    safe["plan"] = {
        "tier": tier,
        "lifetime": cfg["lifetime"],
        "formats": cfg["formats"],
        "label": {"free": "Free", "starter": "Starter ($19/mo)", "pro": "Pro ($49/mo)", "agency": "Agency ($149/mo)"}.get(tier, tier.title()),
        "watermark": tier == "free",
    }
    safe["has_agreed"] = bool(agreement)
    return safe


@auth_router.post("/accept-agreement")
async def accept_agreement(request: Request, user = Depends(get_current_user)):
    """Record that the user accepted the beta testing agreement."""
    existing = await db.beta_agreements.find_one({"user_id": user["id"]})
    if not existing:
        ip = request.client.host if request.client else "unknown"
        ua = request.headers.get("user-agent", "")
        await db.beta_agreements.insert_one({
            "user_id": user["id"],
            "agreed_at": datetime.now(timezone.utc).isoformat(),
            "ip_address": ip,
            "user_agent": ua,
        })
    return {"accepted": True}

@auth_router.get("/verify-email")
async def verify_email(token: str):
    user = await db.users.find_one({"email_verification_token": token})
    if not user:
        return RedirectResponse(f"{FRONTEND_URL}/verify-email?status=invalid")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"email_verified": True}, "$unset": {"email_verification_token": ""}}
    )
    return RedirectResponse(f"{FRONTEND_URL}/verify-email?status=success")


@auth_router.post("/resend-verification")
async def resend_verification(user=Depends(get_current_user)):
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    verification_token = secrets.token_urlsafe(32)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"email_verification_token": verification_token}}
    )
    verify_link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    await send_email(
        to_email=user["email"],
        to_name=user.get("name", ""),
        subject="Verify your SwiftPack AI email",
        html=f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#6366f1">Verify your email</h2>
          <p>Click the button below to verify your SwiftPack AI account.</p>
          <a href="{verify_link}"
             style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Verify Email
          </a>
          <p style="color:#888;font-size:13px">Link expires in 24 hours.</p>
        </div>
        """
    )
    return {"message": "Verification email sent"}


@auth_router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    # Always return success to prevent email enumeration
    user = await db.users.find_one({"email": req.email.lower()})
    if user and user.get("hashed_password"):  # only email/password accounts
        reset_token = secrets.token_urlsafe(32)
        reset_expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"password_reset_token": reset_token, "password_reset_expires": reset_expires}}
        )
        reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        await send_email(
            to_email=user["email"],
            to_name=user.get("name", ""),
            subject="Reset your SwiftPack AI password",
            html=f"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#6366f1">Reset your password</h2>
              <p>We received a request to reset your password. Click the button below to set a new one.</p>
              <a href="{reset_link}"
                 style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
                Reset Password
              </a>
              <p style="color:#888;font-size:13px">This link expires in 1 hour. If you didn't request this, ignore it — your password won't change.</p>
            </div>
            """
        )
    return {"message": "If an account exists with that email, a reset link has been sent"}


@auth_router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = await db.users.find_one({"password_reset_token": req.token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    expires = user.get("password_reset_expires", "")
    if expires and datetime.fromisoformat(expires) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {"hashed_password": hash_password(req.password)},
            "$unset": {"password_reset_token": "", "password_reset_expires": ""}
        }
    )
    return {"message": "Password updated successfully"}


@auth_router.get("/google")
async def google_oauth_redirect(response: Response):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID in backend/.env")
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": f"{BACKEND_URL}/api/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state
    }
    redirect = RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")
    redirect.set_cookie("oauth_state", state, httponly=True, samesite="lax", max_age=600)
    return redirect

@auth_router.get("/google/callback")
async def google_oauth_callback(code: str, state: str = "", request: Request = None):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")
    # Validate CSRF state — reject if cookie is absent or mismatched
    expected_state = request.cookies.get("oauth_state") if request else None
    if not expected_state or state != expected_state:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=invalid_state")
    async with httpx.AsyncClient(timeout=10) as client:
        token_resp = await client.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": f"{BACKEND_URL}/api/auth/google/callback",
            "grant_type": "authorization_code"
        })
        tokens = token_resp.json()
        if "error" in tokens:
            return RedirectResponse(f"{FRONTEND_URL}/login?error=google_failed")
        user_info_resp = await client.get(
            "https://www.googleapis.com/userinfo/v2/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        user_info = user_info_resp.json()
    google_id = user_info.get("id")
    email = user_info.get("email", "").lower()
    name = user_info.get("name", email.split("@")[0])
    user = await db.users.find_one({"$or": [{"google_id": google_id}, {"email": email}]})
    if user:
        if not user.get("google_id"):
            await db.users.update_one({"id": user["id"]}, {"$set": {"google_id": google_id}})
    else:
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": email,
            "name": name,
            "hashed_password": None,
            "tier": "free",
            "google_id": google_id,
            "stripe_customer_id": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one({**user, "_id": user_id})
    token = create_jwt(user["id"])
    # Use fragment (#) so the token is never sent to the server in Referer headers
    redirect = RedirectResponse(f"{FRONTEND_URL}/#token={token}")
    redirect.delete_cookie("oauth_state")
    return redirect


# ── Admin Router ───────────────────────────────────────────────────────────────
admin_router = APIRouter(prefix="/admin")

def _require_admin(request: Request):
    secret = request.headers.get("X-Admin-Secret", "")
    if not ADMIN_SECRET or secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

@admin_router.post("/approve-beta-user")
async def approve_beta_user(req: ApproveBetaUserRequest, request: Request):
    """
    Admin endpoint: approve a beta waitlist user.
    Creates a real account, sends login credentials by email.
    Requires X-Admin-Secret header matching ADMIN_SECRET env var.
    """
    _require_admin(request)
    email = req.email.lower().strip()

    # Check they actually requested access
    beta_entry = await db.beta_users.find_one({"email": email})
    if not beta_entry:
        raise HTTPException(status_code=404, detail="Email not found in beta waitlist")
    if beta_entry.get("is_approved"):
        raise HTTPException(status_code=400, detail="User is already approved")

    # Check for duplicate real user
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User account already exists")

    # Generate a temporary password
    temp_password = secrets.token_urlsafe(12)
    user_id = str(uuid.uuid4())
    name = beta_entry.get("name") or email.split("@")[0]
    user = {
        "id": user_id,
        "email": email,
        "name": name,
        "hashed_password": hash_password(temp_password),
        "tier": "free",
        "google_id": None,
        "stripe_customer_id": None,
        "email_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one({**user, "_id": user_id})

    # Mark beta_users entry as approved
    await db.beta_users.update_one(
        {"email": email},
        {"$set": {"is_approved": True, "approved_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Send welcome email with credentials
    await send_email(
        to_email=email,
        to_name=name,
        subject="Welcome to SwiftPack AI Beta — Your account is ready",
        html=f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#6366f1">Welcome to SwiftPack AI Beta!</h2>
          <p>Hi {name}, your beta access has been approved.</p>
          <p>Sign in at <a href="{FRONTEND_URL}/login">{FRONTEND_URL}/login</a> with:</p>
          <ul>
            <li><strong>Email:</strong> {email}</li>
            <li><strong>Temporary password:</strong> <code>{temp_password}</code></li>
          </ul>
          <p>Please change your password after your first login.</p>
          <p style="color:#888;font-size:13px">
            This is a beta version for testing purposes only. Features may change without notice.
            NovaJay Tech (FM1032559).
          </p>
        </div>
        """
    )
    logger.info("Beta user approved and account created: %s", email)
    return {"message": f"Account created for {email}. Credentials sent by email."}


@admin_router.get("/beta-waitlist")
async def list_beta_waitlist(request: Request):
    """List all beta waitlist entries. Requires X-Admin-Secret header."""
    _require_admin(request)
    entries = await db.beta_users.find({}, {"_id": 0}).to_list(500)
    return {"count": len(entries), "entries": entries}


# ── Billing Router ─────────────────────────────────────────────────────────────
billing_router = APIRouter(prefix="/api/billing")


def _price_id_to_tier() -> dict:
    """Build price-ID → tier-name mapping from env vars."""
    m = {}
    if STRIPE_STARTER_PRICE_ID:
        m[STRIPE_STARTER_PRICE_ID] = "starter"
    if STRIPE_PRO_PRICE_ID:
        m[STRIPE_PRO_PRICE_ID] = "pro"
    if STRIPE_AGENCY_PRICE_ID:
        m[STRIPE_AGENCY_PRICE_ID] = "agency"
    return m


async def _create_stripe_checkout(user: dict, price_id: str, target_tier: str) -> dict:
    if not stripe_lib or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured. Contact support.")
    if not price_id:
        raise HTTPException(status_code=503, detail=f"{target_tier.title()} price ID not configured yet.")
    if user.get("tier") == target_tier:
        raise HTTPException(status_code=400, detail=f"Already on the {target_tier} plan.")
    session = stripe_lib.checkout.Session.create(
        customer_email=user["email"],
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{FRONTEND_URL}?upgraded=true",
        cancel_url=f"{FRONTEND_URL}/pricing",
        metadata={"user_id": user["id"], "target_tier": target_tier}
    )
    return {"checkout_url": session.url}


@billing_router.post("/checkout/starter")
async def checkout_starter(user = Depends(get_current_user)):
    return await _create_stripe_checkout(user, STRIPE_STARTER_PRICE_ID, "starter")


@billing_router.post("/checkout/pro")
async def checkout_pro(user = Depends(get_current_user)):
    return await _create_stripe_checkout(user, STRIPE_PRO_PRICE_ID, "pro")


@billing_router.post("/checkout/agency")
async def checkout_agency(user = Depends(get_current_user)):
    return await _create_stripe_checkout(user, STRIPE_AGENCY_PRICE_ID, "agency")


# Backward-compat: /checkout defaults to pro
@billing_router.post("/checkout")
async def create_checkout_session(user = Depends(get_current_user)):
    return await _create_stripe_checkout(user, STRIPE_PRO_PRICE_ID, "pro")


@billing_router.post("/webhook")
async def stripe_webhook_handler(request: Request):
    if not stripe_lib or not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhook not configured")
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe_lib.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    price_map = _price_id_to_tier()

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        target_tier = session.get("metadata", {}).get("target_tier", "pro")
        customer_id = session.get("customer")
        if user_id:
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"tier": target_tier, "stripe_customer_id": customer_id}}
            )
            logger.info(f"User {user_id} upgraded to {target_tier}")

    elif event["type"] == "customer.subscription.updated":
        sub = event["data"]["object"]
        customer_id = sub.get("customer")
        items = sub.get("items", {}).get("data", [])
        if customer_id and items:
            price_id = items[0].get("price", {}).get("id", "")
            new_tier = price_map.get(price_id)
            if new_tier:
                await db.users.update_one(
                    {"stripe_customer_id": customer_id},
                    {"$set": {"tier": new_tier}}
                )
                logger.info(f"Subscription updated: {customer_id} → {new_tier}")

    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.paused"):
        customer_id = event["data"]["object"].get("customer")
        if customer_id:
            await db.users.update_one(
                {"stripe_customer_id": customer_id},
                {"$set": {"tier": "free"}}
            )
            logger.info(f"Subscription ended: {customer_id} downgraded to free")

    return {"status": "ok"}

@billing_router.get("/portal")
async def billing_portal(user = Depends(get_current_user)):
    if not stripe_lib or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    if not user.get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="No billing account found. You must have an active subscription first.")
    session = stripe_lib.billing_portal.Session.create(
        customer=user["stripe_customer_id"],
        return_url=FRONTEND_URL
    )
    return {"portal_url": session.url}


app.include_router(api_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(billing_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
