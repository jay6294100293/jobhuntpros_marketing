# SwiftPack AI — Video Generation Features
# Last updated: April 2026

---

## What's Included in Every Video

### 1. Edge TTS Neural Voiceover
- Microsoft AndrewNeural voice — sounds like a real human presenter
- Free, no API key required
- Replaces gTTS (which was robotic/2003-quality)
- Audio exported at 16kHz WAV, then overlaid via FFmpeg

### 2. Pillow Slide Design System (6 Templates)
Every video is built from 6 structured marketing slides rendered in Pillow:

| Slide | Purpose | Key Elements |
|-------|---------|--------------|
| Hero | Product name + headline | Bold type, strong contrast, decorative bar |
| Problem | Pain point | Emotional framing, lighter palette |
| Solution | Product as the fix | Product name + value prop |
| Features | 3 checkmarks from scraped data | Shape-drawn checkmarks (Unicode-safe) |
| How It Works | Numbered steps | Step circles, clean layout |
| CTA | URL + urgency | High contrast, action-focused |

Brand colors extracted from the scraped URL are applied to every slide.

### 3. Crossfade Transitions (FFmpeg xfade)
- 0.5s fade between every slide pair
- Duration math: `actual = n × slide_dur − (n−1) × 0.5s`
- 6 rotation of transition types per video
- Replaces hard-cut concat

### 4. Ken Burns Zoom/Pan Effect
- Per-slide zoompan: 100% → 110% scale over clip duration
- Applied via FFmpeg `zoompan` filter inside the xfade chain
- Creates dynamic, cinematic feel from still images

### 5. Animated Captions (Lower Third)
- Script split into sentences, each timed to voiceover duration
- White text, black box background (readable on any slide)
- Positioned at lower third (75% from top)
- FFmpeg `drawtext` with per-sentence `enable=` expressions

### 6. Progress Bar
- Branded color, full-width sweep over video duration
- FFmpeg `drawbox` with dynamic width expression
- Positioned 20px from bottom

### 7. Watermark (Free Tier)
- Diagonal "SwiftPack AI" text repeated across every slide
- 30% opacity RGBA compositing — semi-transparent, not obstructive
- Burned into slide content area, not corner (can't be cropped out)
- Automatically removed on Starter+ plans

### 8. Multi-Format Export
| Format | Resolution | Platform |
|--------|-----------|---------|
| 9:16 | 1080×1920 | TikTok, Instagram Reels, Stories |
| 16:9 | 1920×1080 | YouTube, website embeds |
| 1:1 | 1080×1080 | Instagram Feed, LinkedIn |

Free tier: 9:16 only. Starter+ unlocks all 3 formats.

---

## Pro/Agency Tier — Modal GPU Video

Pro and Agency users get AI-generated video backgrounds instead of the slide system:

- **Model**: LTX-Video (Lightricks, Apache 2.0) on Modal A100-40GB GPU
- **Cost**: ~$0.44/video (pay-per-second, $0 when idle)
- **Prompt**: auto-generated from product name + scraped features
- **Output**: short AI clip looped to full voiceover duration, then captions/progress bar overlaid
- **Fallback**: if Modal is unreachable or token not set, silently falls back to slideshow

File: `backend/modal_video.py` — deploy with `modal deploy backend/modal_video.py`

---

## Pro/Agency Tier — Talking Head (SadTalker)

Users upload a portrait photo and the voiceover audio → lip-synced talking head video.

### Protection Stack (all 5 gates enforced before generation)
1. **Pro/Agency tier** — feature locked at free/starter
2. **Stripe Identity** — government ID verification ($1.50/user one-time)
3. **DeepFace face check** — RetinaFace detector, rejects: no face, multiple faces, face < 3% of frame
4. **Explicit consent** — `photo_hash` + timestamp stored in DB (EU AI Act compliance)
5. **"AI GENERATED" label** — FFmpeg drawtext burned into every frame, cannot be removed

### Endpoints
```
POST /api/talking-head/verify-identity   → starts Stripe Identity session
POST /api/talking-head/consent           → records consent for photo_hash
POST /api/talking-head/generate          → runs all 5 gates, generates video
POST /api/billing/webhook/identity       → Stripe webhook sets identity_verified
```

File: `backend/modal_sadtalker.py` — deploy with `modal deploy backend/modal_sadtalker.py`

---

## Pipeline (Behind the Scenes)

### Free Tier
```
Script (Gemini)
  ↓
Edge TTS voiceover → WAV
  ↓
Pillow: 6 slide images (brand colors, templates)
  ↓
Watermark applied to each slide (RGBA compositing)
  ↓
FFmpeg per-slide:  scale + crop + zoompan + format=yuv420p
FFmpeg chain:      xfade transitions between slides
FFmpeg overlay:    drawtext captions + drawbox progress bar
FFmpeg mix:        voiceover audio
  ↓
MP4 output (H.264, yuv420p, ~25fps)
```

### Pro/Agency Tier
```
Script (Gemini)
  ↓
Edge TTS voiceover → WAV
  ↓
Modal LTX-Video: text prompt → short AI video clip (MP4)
  ↓
FFmpeg: loop clip to full duration + scale to target resolution
FFmpeg overlay: drawtext captions + drawbox progress bar
FFmpeg mix: voiceover audio
  ↓
MP4 output
(falls back to Free Tier pipeline if Modal unavailable)
```

---

## Technical Specifications

| Property | Value |
|----------|-------|
| Output format | MP4 (H.264, yuv420p) |
| Frame rate | 25 FPS |
| Audio | AAC, 44.1kHz (voiceover) |
| Slide duration | ~2.5s per slide (6 slides = ~15.5s at default) |
| Crossfade duration | 0.5s per transition |
| Zoom range | 100% → 110% per slide |
| Watermark opacity | 30% (free tier only) |
| Max portrait size | 10 MB (talking head) |
| Max audio size | 20 MB (talking head) |

---

## API Reference

### Generate Complete Video
```bash
curl -X POST https://swiftpackai.tech/api/create-complete-video \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Your marketing script here.",
    "brand_colors": ["#6366f1", "#8b5cf6"],
    "format": "9:16",
    "product_name": "My Product",
    "features": ["Feature 1", "Feature 2", "Feature 3"],
    "add_voiceover": true,
    "add_captions": true,
    "add_progress_bar": true
  }'
```

### Magic Button (All-in-one)
```bash
curl -X POST https://swiftpackai.tech/api/magic-launch-pack \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourproduct.com"}'
# Returns: 2 videos + 2 scripts + 2 posters
```

### Talking Head
```bash
# Step 1: verify identity (returns Stripe session URL)
curl -X POST https://swiftpackai.tech/api/talking-head/verify-identity \
  -H "Authorization: Bearer <token>"

# Step 2: record consent
curl -X POST https://swiftpackai.tech/api/talking-head/consent \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"photo_hash": "<sha256 of portrait>", "audio_hash": "<sha256 of audio>"}'

# Step 3: generate
curl -X POST https://swiftpackai.tech/api/talking-head/generate \
  -H "Authorization: Bearer <token>" \
  -F "portrait=@portrait.jpg" \
  -F "audio=@voiceover.mp3" \
  -F "photo_hash=<sha256>" \
  -F "still_mode=true" \
  -F "size=256"
```
