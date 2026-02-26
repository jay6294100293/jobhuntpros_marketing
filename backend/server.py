from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import aiofiles
import io
import json
from contextlib import asynccontextmanager

from bs4 import BeautifulSoup
import requests
from PIL import Image, ImageDraw, ImageFont
from google.cloud import texttospeech
from emergentintegrations.llm.chat import LlmChat, UserMessage
from moviepy import ImageClip, concatenate_videoclips, CompositeVideoClip, TextClip, AudioFileClip
import numpy as np
from collections import Counter
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

UPLOADS_DIR = ROOT_DIR / 'uploads'
OUTPUTS_DIR = ROOT_DIR / 'outputs'
UPLOADS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)

tts_client = None

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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

def extract_colors_from_image(image_url: str, num_colors: int = 5) -> List[str]:
    try:
        response = requests.get(image_url, timeout=10)
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

@api_router.post("/scrape")
async def scrape_url(url: str = Form(...)):
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
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
                colors = extract_colors_from_image(img_url)
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
async def generate_script(request: ScriptRequest):
    try:
        gemini_key = os.getenv('GEMINI_API_KEY')
        if not gemini_key or gemini_key == 'your-gemini-api-key-here':
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured. Please add your free API key from https://aistudio.google.com/apikey to backend/.env")
        
        frameworks = {
            "PAS": f"""Write a compelling 60-second video script for {request.product_name} using the Problem-Agitate-Solution framework:
            
            Target Audience: {request.target_audience}
            Key Features: {', '.join(request.key_features)}
            
            Structure:
            1. Problem (15s): Identify the main pain point
            2. Agitate (20s): Emphasize the frustration and consequences
            3. Solution (25s): Present {request.product_name} as the perfect solution with specific features
            
            Keep it conversational, authentic, and action-oriented. End with a clear CTA.""",
            
            "Step-by-Step": f"""Write a clear tutorial script for {request.product_name} with step-by-step instructions:
            
            Target Audience: {request.target_audience}
            Key Features: {', '.join(request.key_features)}
            
            Structure:
            1. Introduction (10s): What they'll learn
            2. Step 1-3 (40s): Clear, actionable steps with specific feature mentions
            3. Conclusion (10s): Benefits and encouragement
            
            Use simple language, be encouraging, and focus on value.""",
            
            "Before/After": f"""Write a transformative Before/After video script for {request.product_name}:
            
            Target Audience: {request.target_audience}
            Key Features: {', '.join(request.key_features)}
            
            Structure:
            1. Before (20s): Paint the struggle without the product
            2. Discovery (10s): Finding {request.product_name}
            3. After (30s): Show the transformation with specific feature benefits
            
            Make it emotional, relatable, and aspirational. Include social proof if possible."""
        }
        
        prompt = frameworks.get(request.framework, frameworks["PAS"])
        
        chat = LlmChat(
            api_key=gemini_key,
            session_id=str(uuid.uuid4()),
            system_message="You are an expert marketing copywriter specializing in video scripts."
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        script_data = {
            "id": str(uuid.uuid4()),
            "framework": request.framework,
            "content": response,
            "product_name": request.product_name,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        return script_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Script generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Script generation failed: {str(e)}")

@api_router.post("/generate-voiceover")
async def generate_voiceover(request: VoiceoverRequest):
    try:
        global tts_client
        if not tts_client:
            try:
                credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
                if not credentials_path or not Path(credentials_path).exists():
                    raise HTTPException(
                        status_code=503, 
                        detail="Google Cloud TTS not configured. Add credentials to enable voiceovers. See /app/TTS_SETUP.md for instructions."
                    )
                tts_client = texttospeech.TextToSpeechClient()
                logging.info("TTS client initialized successfully")
            except HTTPException:
                raise
            except Exception as e:
                logging.warning(f"TTS initialization failed: {e}")
                raise HTTPException(
                    status_code=503, 
                    detail=f"TTS service initialization failed. Check credentials. Error: {str(e)}"
                )
        
        synthesis_input = texttospeech.SynthesisInput(text=request.text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name=request.voice_name,
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=request.speaking_rate
        )
        
        response = tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )
        
        audio_id = str(uuid.uuid4())
        audio_path = OUTPUTS_DIR / f"{audio_id}.mp3"
        
        async with aiofiles.open(audio_path, 'wb') as f:
            await f.write(response.audio_content)
        
        # Track usage for free tier monitoring
        char_count = len(request.text)
        logging.info(f"TTS generated: {char_count} characters. Monthly limit: 4M Standard, 1M Neural2")
        
        return {
            "id": audio_id,
            "path": str(audio_path),
            "url": f"/api/download/{audio_id}.mp3",
            "characters_used": char_count,
            "estimated_cost": "$0.00 (within free tier)" if char_count < 4000000 else f"${char_count * 0.000004:.4f}"
        }
    except Exception as e:
        logger.error(f"Voiceover generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Voiceover generation failed: {str(e)}")

@api_router.post("/create-complete-video")
async def create_complete_video(request: CompleteVideoRequest):
    """Create a complete professional video with voiceover, captions, zoom/pan, and progress bars"""
    try:
        video_id = str(uuid.uuid4())
        
        # Determine dimensions
        if request.format == "16:9":
            width, height = 1920, 1080
        elif request.format == "9:16":
            width, height = 1080, 1920
        else:
            width, height = 1080, 1080
        
        # Split script into sentences for caption timing
        sentences = re.split(r'[.!?]+', request.script)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        # Calculate timing: ~3 seconds per sentence
        duration_per_clip = 3
        total_duration = len(sentences) * duration_per_clip
        
        # Generate voiceover if requested
        audio_path = None
        if request.add_voiceover:
            try:
                voiceover_req = VoiceoverRequest(
                    text=request.script,
                    voice_name="en-US-Neural2-A",
                    speaking_rate=1.0
                )
                voiceover_result = await generate_voiceover(voiceover_req)
                audio_path = voiceover_result["path"]
            except Exception as e:
                logging.warning(f"Voiceover generation failed, continuing without audio: {e}")
        
        # Create video clips
        clips = []
        
        for i, sentence in enumerate(sentences):
            # Use provided images or create gradient backgrounds
            if request.images and i < len(request.images) and Path(request.images[i]).exists():
                img = Image.open(request.images[i])
                img = img.resize((width, height))
            else:
                # Create gradient background
                img = Image.new('RGB', (width, height), request.brand_colors[0] if request.brand_colors else "#6366f1")
                draw = ImageDraw.Draw(img)
                # Add subtle gradient effect
                for y in range(height):
                    alpha = y / height
                    color = request.brand_colors[1] if len(request.brand_colors) > 1 else "#8b5cf6"
                    draw.line([(0, y), (width, y)], fill=color, width=1)
            
            img_array = np.array(img)
            
            # Create base clip with zoom effect (starts at 100%, zooms to 110%)
            clip = ImageClip(img_array).set_duration(duration_per_clip)
            
            # Add zoom/pan effect
            def zoom_effect(t):
                zoom = 1.0 + (0.1 * t / duration_per_clip)  # Zoom from 1.0 to 1.1
                return zoom
            
            clip = clip.resize(lambda t: zoom_effect(t))
            clip = clip.set_position(('center', 'center'))
            
            # Add captions if requested
            if request.add_captions and sentence:
                # Clean sentence
                caption_text = sentence[:80]  # Limit length
                
                # Create text clip with UGC-style appearance
                try:
                    # Position caption at bottom third
                    txt_clip = TextClip(
                        caption_text,
                        fontsize=min(60, width // 15),
                        color='white',
                        font='Arial-Bold',
                        stroke_color='black',
                        stroke_width=2,
                        method='caption',
                        size=(int(width * 0.9), None)
                    ).set_duration(duration_per_clip).set_position(('center', int(height * 0.75)))
                    
                    # Add fade in/out
                    txt_clip = txt_clip.crossfadein(0.3).crossfadeout(0.3)
                    
                    # Composite text over video
                    clip = CompositeVideoClip([clip, txt_clip])
                except Exception as e:
                    logging.warning(f"Text overlay failed: {e}, continuing without captions")
            
            # Add progress bar if requested
            if request.add_progress_bar:
                progress = (i + 1) / len(sentences)
                # Create progress bar as image
                pb_img = Image.new('RGBA', (width, 10), (0, 0, 0, 0))
                pb_draw = ImageDraw.Draw(pb_img)
                pb_draw.rectangle([0, 0, int(width * progress), 10], fill=request.brand_colors[0] if request.brand_colors else "#6366f1")
                pb_array = np.array(pb_img)
                
                pb_clip = ImageClip(pb_array).set_duration(duration_per_clip).set_position(('center', height - 20))
                clip = CompositeVideoClip([clip, pb_clip])
            
            clips.append(clip)
        
        # Concatenate all clips
        if clips:
            final_video = concatenate_videoclips(clips, method="compose")
        else:
            # Fallback to simple video
            img_array = np.full((height, width, 3), (99, 102, 241), dtype=np.uint8)
            final_video = ImageClip(img_array).set_duration(5)
        
        # Add audio if available
        if audio_path and Path(audio_path).exists():
            try:
                audio_clip = AudioFileClip(audio_path)
                # Trim or extend video to match audio
                if audio_clip.duration > final_video.duration:
                    final_video = final_video.loop(duration=audio_clip.duration)
                final_video = final_video.set_audio(audio_clip)
            except Exception as e:
                logging.warning(f"Audio attachment failed: {e}, continuing without audio")
        
        # Export video
        output_path = OUTPUTS_DIR / f"{video_id}.mp4"
        final_video.write_videofile(
            str(output_path),
            fps=24,
            codec='libx264',
            audio_codec='aac' if audio_path else None,
            logger=None,
            preset='ultrafast'
        )
        
        return {
            "id": video_id,
            "path": str(output_path),
            "url": f"/api/download/{video_id}.mp4",
            "format": request.format,
            "duration": final_video.duration,
            "has_audio": audio_path is not None,
            "has_captions": request.add_captions,
            "clips_created": len(clips)
        }
    except Exception as e:
        logger.error(f"Complete video creation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Video creation failed: {str(e)}")

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
        
        if not image_list:
            clips = []
            colors = [(99, 102, 241), (139, 92, 246), (16, 185, 129)]
            for i, color in enumerate(colors):
                img_array = np.full((height, width, 3), color, dtype=np.uint8)
                clip = ImageClip(img_array).set_duration(2)
                clips.append(clip)
            
            video = concatenate_videoclips(clips, method="compose")
        else:
            clips = []
            for img_path in image_list[:5]:
                if Path(img_path).exists():
                    img = Image.open(img_path)
                    img = img.resize((width, height))
                    img_array = np.array(img)
                    clip = ImageClip(img_array).set_duration(3)
                    clips.append(clip)
            
            if clips:
                video = concatenate_videoclips(clips, method="compose")
            else:
                img_array = np.full((height, width, 3), (99, 102, 241), dtype=np.uint8)
                video = ImageClip(img_array).set_duration(5)
        
        output_path = OUTPUTS_DIR / f"{video_id}.mp4"
        video.write_videofile(str(output_path), fps=24, codec='libx264', audio=False, logger=None)
        
        return {
            "id": video_id,
            "path": str(output_path),
            "url": f"/api/download/{video_id}.mp4",
            "format": format_type
        }
    except Exception as e:
        logger.error(f"Video creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Video creation failed: {str(e)}")

@api_router.post("/create-poster")
async def create_poster(request: PosterRequest):
    try:
        if request.format == "1:1":
            width, height = 1080, 1080
        else:
            width, height = 1080, 1920
        
        img = Image.new('RGB', (width, height), color=request.brand_colors[0] if request.brand_colors else "#6366f1")
        draw = ImageDraw.Draw(img)
        
        try:
            title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
            subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
        except:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
        
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
        
        return {
            "id": poster_id,
            "path": str(poster_path),
            "url": f"/api/download/{poster_id}.png",
            "format": request.format
        }
    except Exception as e:
        logger.error(f"Poster creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Poster creation failed: {str(e)}")

@api_router.post("/magic-button")
async def magic_button(request: MagicButtonRequest):
    try:
        brand_data = await scrape_url(url=request.url)
        
        script_req = ScriptRequest(
            framework="PAS",
            product_name=request.product_name,
            target_audience=request.target_audience,
            key_features=brand_data["features"][:3]
        )
        ad_script = await generate_script(script_req)
        
        script_req.framework = "Step-by-Step"
        tutorial_script = await generate_script(script_req)
        
        poster1_req = PosterRequest(
            headline=request.product_name,
            subtext=brand_data["description"][:50],
            brand_colors=brand_data["colors"],
            format="1:1"
        )
        poster1 = await create_poster(poster1_req)
        
        poster2_req = PosterRequest(
            headline=request.product_name,
            subtext="Transform Your Workflow",
            brand_colors=brand_data["colors"],
            format="9:16"
        )
        poster2 = await create_poster(poster2_req)
        
        return {
            "brand_data": brand_data,
            "ad_script": ad_script,
            "tutorial_script": tutorial_script,
            "posters": [poster1, poster2]
        }
    except Exception as e:
        logger.error(f"Magic button error: {e}")
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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
