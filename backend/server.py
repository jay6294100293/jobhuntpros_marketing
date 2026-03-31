import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="google.generativeai")
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")

from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks, Depends, Security, Request
from fastapi.responses import StreamingResponse, FileResponse, RedirectResponse
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
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import aiofiles
import io
import json
import tempfile
from contextlib import asynccontextmanager
from urllib.parse import urlencode

from bs4 import BeautifulSoup
import requests
from PIL import Image, ImageDraw, ImageFont
from collections import Counter
import re
import google.generativeai as genai
import subprocess
import asyncio
try:
    import stripe as stripe_lib
except ImportError:
    stripe_lib = None

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
    genai.configure(api_key=gemini_key)
    gemini_model = genai.GenerativeModel('gemini-2.5-flash')
else:
    gemini_model = None  # will trigger fallbacks / clear errors

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


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

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

class ScriptRequest(BaseModel):
    framework: str
    product_name: str
    target_audience: str
    key_features: List[str]
    brand_context: Optional[str] = None

class VoiceoverRequest(BaseModel):
    text: str
    voice_name: str = "en-US-Neural2-A"
    speaking_rate: float = 1.0

class VideoRequest(BaseModel):
    project_id: str
    video_type: str
    format: str = "16:9"

class CompleteVideoRequest(BaseModel):
    script: str
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

class LoginRequest(BaseModel):
    email: str
    password: str


# ── Helpers ────────────────────────────────────────────────────────────────────

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


def extract_colors_from_image(image_url: str, num_colors: int = 5) -> List[str]:
    try:
        response = requests.get(image_url, timeout=10, verify=False)
        img = Image.open(io.BytesIO(response.content))
        img = img.convert('RGB')
        img = img.resize((150, 150))
        pixels = list(img.getdata())
        color_counts = Counter(pixels)
        dominant_colors = color_counts.most_common(num_colors)
        hex_colors = [f"#{r:02x}{g:02x}{b:02x}" for (r, g, b), _ in dominant_colors]
        return hex_colors
    except:
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

    if not _gemini_ready or gemini_model is None:
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
        response = await loop.run_in_executor(None, lambda: gemini_model.generate_content(prompt))
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
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, headers=headers, timeout=10, verify=False)
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
                extracted = extract_colors_from_image(img_url)
                if extracted:
                    colors = extracted
        except:
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


@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), file_type: str = Form(...)):
    try:
        file_id = str(uuid.uuid4())
        file_ext = Path(file.filename).suffix
        file_path = UPLOADS_DIR / f"{file_id}{file_ext}"

        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)

        return {
            "id": file_id,
            "filename": file.filename,
            "path": str(file_path),
            "type": file_type,
            "size": len(content)
        }
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")


@api_router.post("/generate-script")
async def generate_script(request: ScriptRequest, user = Depends(get_optional_user)):
    if user:
        await check_usage_limit(user, "scripts")
    if not _gemini_ready or gemini_model is None:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY not configured. Add your key from https://aistudio.google.com/apikey to backend/.env"
        )

    frameworks = {
        "PAS": f"""Write a 60-second video ad script for {request.product_name} using Problem-Agitate-Solution.
Target audience: {request.target_audience}
Key features: {', '.join(request.key_features)}
Structure: Problem (15s) → Agitate (20s) → Solution (25s) with CTA.
Be conversational and authentic. Return only the script text.""",

        "Step-by-Step": f"""Write a 60-second tutorial script for {request.product_name}.
Target audience: {request.target_audience}
Key features: {', '.join(request.key_features)}
Structure: Intro (10s) → 3 clear steps (40s) → Encouragement + CTA (10s).
Be simple and encouraging. Return only the script text.""",

        "Before/After": f"""Write a 60-second Before/After transformation script for {request.product_name}.
Target audience: {request.target_audience}
Key features: {', '.join(request.key_features)}
Structure: Before struggle (20s) → Discovery (10s) → After transformation (30s).
Be emotional and aspirational. Return only the script text."""
    }

    prompt = frameworks.get(request.framework, frameworks["PAS"])

    script_text = None
    last_err = None
    for attempt in range(2):
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: gemini_model.generate_content(prompt))
            script_text = response.text.strip()
            if script_text:
                break
        except Exception as e:
            last_err = e
            logger.warning(f"Gemini attempt {attempt+1} failed: {e}")

    if not script_text:
        raise HTTPException(status_code=500, detail=f"Gemini script generation failed: {last_err}")

    script_doc = {
        "id": str(uuid.uuid4()),
        "framework": request.framework,
        "content": script_text,
        "product_name": request.product_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "type": "script"
    }
    if user:
        script_doc["user_id"] = user["id"]
        await increment_usage(user["id"], "scripts")
    await db.scripts.insert_one({**script_doc, "_id": script_doc["id"]})
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
    await db.videos.insert_one({**video_doc, "_id": video_id})
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
            valid_images = [p for p in image_list[:5] if Path(p).exists()]
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
            except:
                pass
        for fp in _sub_candidates:
            try:
                subtitle_font = ImageFont.truetype(fp, 40)
                break
            except:
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

        poster_id = str(uuid.uuid4())
        poster_path = OUTPUTS_DIR / f"{poster_id}.png"
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
        await db.posters.insert_one({**poster_doc, "_id": poster_id})

        return {
            "id": poster_id,
            "path": str(poster_path),
            "url": f"/api/download/{poster_id}.png",
            "format": request.format
        }
    except Exception as e:
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
    file_path = OUTPUTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@api_router.get("/projects")
async def get_projects():
    projects = await db.projects.find({}, {"_id": 0}).to_list(100)
    return projects


@api_router.post("/projects")
async def create_project(name: str = Form(...)):
    project = Project(name=name)
    doc = project.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.projects.insert_one(doc)
    return project


@api_router.get("/")
async def root():
    return {"message": "JobHuntPro Content Studio API"}


# ── Auth Router ────────────────────────────────────────────────────────────────
auth_router = APIRouter(prefix="/api/auth")

@auth_router.post("/register")
async def register(req: RegisterRequest):
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
    safe = {k: v for k, v in user.items() if k != "hashed_password"}
    safe["usage"] = {k: usage.get(k, 0) for k in ("scripts", "videos", "posters")}
    safe["limits"] = FREE_TIER_LIMITS if safe.get("tier") == "free" else None
    return safe

@auth_router.get("/google")
async def google_oauth_redirect():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID in backend/.env")
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": f"{BACKEND_URL}/api/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account"
    }
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")

@auth_router.get("/google/callback")
async def google_oauth_callback(code: str):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")
    token_resp = requests.post("https://oauth2.googleapis.com/token", data={
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": f"{BACKEND_URL}/api/auth/google/callback",
        "grant_type": "authorization_code"
    })
    tokens = token_resp.json()
    if "error" in tokens:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=google_failed")
    user_info = requests.get("https://www.googleapis.com/userinfo/v2/me", headers={
        "Authorization": f"Bearer {tokens['access_token']}"
    }).json()
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
    return RedirectResponse(f"{FRONTEND_URL}?token={token}")


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
app.include_router(billing_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
