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

FREE_TIER_LIMITS = {"scripts": 10, "videos": 5, "posters": 10}

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
    if not user or user.get("tier") == "pro":
        return
    year_month = datetime.now(timezone.utc).strftime("%Y-%m")
    usage = await db.usage.find_one({"user_id": user["id"], "year_month": year_month}) or {}
    current = usage.get(content_type, 0)
    limit = FREE_TIER_LIMITS.get(content_type, 999)
    if current >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Free tier limit: {limit} {content_type}/month. Upgrade to Pro for unlimited."
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


async def generate_tts_audio(text: str, output_path: str) -> bool:
    try:
        from gtts import gTTS
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: gTTS(text=text, lang='en', slow=False).save(output_path))
        return True
    except Exception as e:
        logger.warning(f"gTTS failed: {e}, trying pyttsx3")
    try:
        import pyttsx3
        def _run():
            engine = pyttsx3.init()
            engine.setProperty('rate', 170)
            engine.save_to_file(text, output_path)
            engine.runAndWait()
            engine.stop()
        await asyncio.get_event_loop().run_in_executor(None, _run)
        return True
    except Exception as e:
        logger.warning(f"pyttsx3 failed: {e}. No audio.")
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
        return s.replace("'", "").replace(":", " ").replace("\\", "").replace('"', "").replace("\n", " ")[:70]

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

        brand_data = {
            "url": url,
            "colors": colors[:3],
            "headline": headline,
            "features": features[:5],
            "description": description[:200]
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
    if user:
        await check_usage_limit(user, "videos")
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

    cmd = await generate_ffmpeg_command(
        sentences, color1, color2, width, height,
        total_duration, audio_path, output_path
    )

    logger.info(f"Running FFmpeg command: {cmd[:200]}...")
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

    video_doc = {
        "id": video_id,
        "url": f"/api/download/{video_id}.mp4",
        "format": request.format,
        "duration": total_duration,
        "has_audio": audio_path is not None,
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

    # Step 4: Ad video
    ad_video = None
    try:
        ad_video_req = CompleteVideoRequest(
            script=truncate_to_sentences(ad_script["content"]),
            brand_colors=brand_data["colors"],
            format="9:16",
            add_voiceover=True,
            add_captions=True,
            add_progress_bar=True
        )
        ad_video = await create_complete_video(ad_video_req, user=None)
    except Exception as e:
        logger.warning(f"Ad video creation failed: {e}, skipping")

    # Step 5: Tutorial video
    tutorial_video = None
    try:
        tutorial_video_req = CompleteVideoRequest(
            script=truncate_to_sentences(tutorial_script["content"]),
            brand_colors=brand_data["colors"],
            format="16:9",
            add_voiceover=True,
            add_captions=True,
            add_progress_bar=True
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
    year_month = datetime.now(timezone.utc).strftime("%Y-%m")
    usage = await db.usage.find_one({"user_id": user["id"], "year_month": year_month}) or {}
    agreement = await db.beta_agreements.find_one({"user_id": user["id"]})
    safe = {k: v for k, v in user.items() if k != "hashed_password"}
    safe["usage"] = {k: usage.get(k, 0) for k in ("scripts", "videos", "posters")}
    safe["limits"] = FREE_TIER_LIMITS if safe.get("tier") == "free" else None
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

@billing_router.post("/checkout")
async def create_checkout_session(user = Depends(get_current_user)):
    if not stripe_lib or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured. Set STRIPE_SECRET_KEY in backend/.env")
    if user.get("tier") == "pro":
        raise HTTPException(status_code=400, detail="Already on Pro tier")
    if not STRIPE_PRO_PRICE_ID:
        raise HTTPException(status_code=503, detail="STRIPE_PRO_PRICE_ID not set in backend/.env")
    session = stripe_lib.checkout.Session.create(
        customer_email=user["email"],
        payment_method_types=["card"],
        line_items=[{"price": STRIPE_PRO_PRICE_ID, "quantity": 1}],
        mode="subscription",
        success_url=f"{FRONTEND_URL}?upgraded=true",
        cancel_url=f"{FRONTEND_URL}/pricing",
        metadata={"user_id": user["id"]}
    )
    return {"checkout_url": session.url}

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
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        customer_id = session.get("customer")
        if user_id:
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"tier": "pro", "stripe_customer_id": customer_id}}
            )
            logger.info(f"User {user_id} upgraded to Pro")
    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.paused"):
        customer_id = event["data"]["object"].get("customer")
        if customer_id:
            await db.users.update_one({"stripe_customer_id": customer_id}, {"$set": {"tier": "free"}})
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
