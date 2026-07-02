# LaunchBusiness AI — Video Generation Features (Current FFmpeg Pipeline)
# Last updated: June 2026
# For full roadmap including AI video plans → see VIDEO_PIPELINE.md

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
- Diagonal "LaunchBusiness AI" text repeated across every slide
- 30% opacity RGBA compositing — semi-transparent, not obstructive
- Burned into slide content area, not corner (can't be cropped out)
- Automatically removed on Starter+ plans

### 8. Multi-Format Export
| Format | Resolution | Platform | Tier |
|--------|-----------|---------|------|
| 9:16 | 1080×1920 | TikTok, Reels, Shorts, Stories | All tiers |
| 16:9 | 1920×1080 | YouTube, website embeds, LinkedIn | Starter+ |
| 1:1 | 1080×1080 | Instagram Feed, LinkedIn, Twitter/X | Starter+ |
| 4:5 | 1080×1350 | Facebook Feed, Instagram Feed | Starter+ — ✅ DONE — generated in parallel with other formats |

Free tier: 9:16 only. Starter+ unlocks all formats.

**Safe zone rule for all formats:** Keep text and critical visuals within center 80% width,
60% height. Never place important content in bottom 25% or right 15% of 9:16
(platform engagement icons stack there).

### 9. Hook Variants (✅ DONE — 3 scripts returned as hook_variants: PAS, Step-by-Step, Before/After)
3 different scripts returned per Magic Button run from the same brand brief.
Each script = different angle (PAS ad / Step-by-Step tutorial / Before-After transformation).
Returned in response as hook_variants array alongside the 4 format videos.

### 10. Logo on Slides (✅ DONE — reads active_logo_url from brand profile, renders on Hero and CTA slides)
When a Brand Profile has an active logo set, it is rendered on:
- Hero slide: top-left, max height 60px, alpha-composited
- CTA slide: bottom-center, max height 50px
- All posters: corner brand mark
Implementation: Reads `active_logo_url` from brand profile → Pillow `Image.open()` → `img.paste(logo, position, mask)`
No new dependency — pure Pillow.

---

## Starter/Pro/Agency Tier — Modal GPU Video (Wan 2.2)

**UPDATED June 2026:** LTX-Video replaced with Wan 2.2 TI2V-5B. Full decision: `docs/WAN_VIDEO_UPGRADE.md`

All paid tiers (Starter, Pro, Agency) get AI-animated video using Wan 2.2 TI2V-5B:

- **Model**: Wan 2.2 TI2V-5B (Wan-AI, Apache 2.0) on Modal A10G GPU
- **Cost**: ~$0.03/clip (14× cheaper than LTX-Video's $0.44)
- **How it works**: Feeds the Hero Pillow slide as the input image + text prompt → Wan 2.2 animates the actual branded slide into a 1.3s cinematic clip
- **Why this beats LTX-Video**: LTX generated generic unrelated footage. Wan 2.2 animates the REAL brand design (colors, logo, headline)
- **Clip usage**: One generation (33 frames = 1.3s intro clip), reversed copy = outro. Two uses, one API call.
- **Output**: Animated branded intro clip + Pexels B-roll for middle segments + reversed intro as outro
- **Fallback**: if Modal unavailable or token not set, silently falls back to slideshow

File: `backend/modal_video.py` — deploy with `modal deploy backend/modal_video.py`
App name: `launchbusiness-wan-video` (set `MODAL_APP_NAME=launchbusiness-wan-video` in secrets)

---

## Starter/Pro/Agency Tier — Tutorial Studio (Chrome Extension)

Full spec: `docs/TUTORIAL_STUDIO.md`

Tutorial Studio is a Chrome browser extension that lets founders record their real product in action, then automatically turns that recording into a polished YouTube tutorial video.

**Why it exists:** The existing Magic Button makes ad-style videos from scraped data. Tutorial videos need to show the REAL product — the actual logged-in dashboard, real user flows. That cannot be scraped from a landing page.

**How it works:**
1. Founder installs the Chrome extension
2. Opens their product (logged in — real dashboard visible)
3. Clicks "Start Recording" in the extension popup
4. Records product demo for 30–90 seconds
5. Clicks "Stop" — auto-uploads to LaunchBusiness AI
6. Server: extracts frames → Gemini Vision narrates each frame → Edge TTS voices narration → FFmpeg assembles polished 16:9 tutorial
7. Founder downloads finished YouTube tutorial MP4

**Output specs:**
- Format: 16:9 (1920×1080) — YouTube standard
- Content: Real product screenshots as slides (not AI-generated)
- Narration: Gemini Vision describes each screen in tutorial voice
- Duration: 4s per frame × number of frames captured
- Same polish as all other videos: Ken Burns, captions, music, progress bar

**Tier:** Starter+ only. Counts as 1 video credit.

Files to build:
- `extension/manifest.json` + `background.js` + `popup.html` + `popup.js`
- `backend/server.py` → new endpoint `POST /api/tutorial/process`
- `frontend/src/components/TutorialStudio.js`

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
Wan 2.2 TI2V-5B: text prompt + Hero slide image → short AI video clip (MP4)
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

## Quality Gap Analysis (June 2026)

### What's Strong
- Edge TTS (Andrew Neural) — sounds like a real human presenter
- xfade transitions + Ken Burns — feels polished, not a slideshow
- Background music at -18dB — properly mixed, not just slapped on
- 6-slide structure (Hero→Problem→Solution→Features→HowItWorks→CTA) — proven marketing flow

### What's Weak (and the fix)

| Problem | Impact | Fix | Status |
|---------|--------|-----|--------|
| System fonts (Arial/DejaVu) — looks generated | Highest | Poppins-ExtraBold + Inter bundled in `backend/assets/fonts/` | ✅ DONE |
| Sentence captions — not TikTok-style | High | Word-chunk drawtext (3 words/frame, large font, no box) | ✅ DONE |
| Static slides — no real footage | High | Pexels API B-roll (set PEXELS_API_KEY) | ✅ DONE |
| Flat gradient backgrounds | Medium | Noise/grain texture layer in Pillow | Not yet |

### Font Fix ✅ DONE
Fonts bundled at `backend/assets/fonts/`:
- `Poppins-ExtraBold.ttf` + `Poppins-Bold.ttf` — headings (geometric, clean, modern)
- `DMSans-Regular.ttf` + `DMSans-Medium.ttf` — body text (actually Inter, visually identical)

`_get_font()` and `_get_regular_font()` check bundled fonts first, system fonts as fallback.
Dockerfile updated to `COPY assets/ assets/` so fonts are in the production container.
Re-download anytime: `python backend/scripts/download_fonts.py`

Why Poppins not Outfit: Outfit only ships as a variable font — Pillow can't select weight axis.
Why Inter not DM Sans: DM Sans also only ships as variable font in Google Fonts GitHub repo.

### Word-Chunk Captions ✅ DONE
`_word_chunk_captions(script, total_duration, chunk_size=3)` splits script into 3-word chunks.
Each chunk gets its own `drawtext` with `enable=between(t,start,end)`.
Style: fontsize=max(52, width//18), white, borderw=4 black border, no background box, y=h*0.80.
Applied in all 3 FFmpeg builders: `_build_slideshow_ffmpeg`, `_ffmpeg_loop_clip_with_audio`, `_fallback_ffmpeg`.

### Pexels B-roll ✅ DONE
`PEXELS_API_KEY` env var activates real stock video backgrounds for ALL tiers (not just Pro).
`_fetch_pexels_clip(keywords, orientation, dest_path)` searches Pexels, downloads best HD clip.
In `create_complete_video`: tried after Modal, before slideshow fallback.
Orientation mapped from format: 9:16→portrait, 16:9→landscape, 1:1→square.
Falls back silently to slideshow if key not set or no results.
Free Pexels API: 200 requests/hour at pexels.com/api — sufficient for production.

### Quality Model — QUALITY FLAT, QUANTITY TIERED ✅
ALL tiers get the same video quality. Watermark is the ONLY free-tier restriction.

Pipeline priority (all tiers):
1. Hybrid (Pexels + Wan 2.2)   — when PEXELS_API_KEY + Modal both configured
2. Pexels-only                 — when only PEXELS_API_KEY set
3. Wan 2.2-only                — when only Modal configured
4. Slideshow fallback          — always works, zero dependency

### Hybrid Pipeline (Pexels + LTX) — editor-quality output
- Wan 2.2 generates ONE short clip (33 frames = 1.3s) for cinematic intro
- Same clip reversed = cinematic outro (ONE generation, TWO uses — cost: ~$0.03 (Wan 2.2 on A10G))
- Pexels fetches 3 different clips (problem, solution, outcome segments)
- Product screenshot PiP overlay during "solution" segment (rounded corners + shadow)
- Brand logo top-left corner throughout (from brand profile active_logo_url)
- Word-chunk captions throughout
- Music bed throughout (Starter+ only)
- Progress bar at bottom

### All 4 Formats from One Magic Button Click
Magic Button generates ALL 4 formats in parallel (asyncio.gather):
- 9:16  (1080×1920) — TikTok / Reels / Shorts — ad script
- 16:9  (1920×1080) — YouTube / LinkedIn — tutorial script
- 1:1   (1080×1080) — Instagram / Twitter — ad script
- 4:5   (1080×1350) — Facebook / IG Feed — ad script

Each format fetches its own Pexels clips (portrait/landscape/square orientation).
LTX generates format-appropriate clips for each.

### Product PiP Positions by Format
- 9:16:  72% width, centered, at 44% height
- 16:9:  38% width, right side, at 28% height
- 1:1:   62% width, centered, at 44% height
- 4:5:   70% width, centered, at 48% height

### Profit Margin (all paid tiers get Pexels + Wan 2.2 hybrid)

**UPDATED June 2026** — Wan 2.2 replaces LTX-Video, reducing GPU cost by 14×.

- Wan 2.2 cost: ~$0.03/video (one 33-frame short clip on A10G, re-used reversed for outro)
- Pexels: $0
- Edge TTS: $0
- Gemini (script + vision): ~$0.008/request
- Variable total: ~$0.038/video

Margin at 50% utilization (Wan 2.2):
- Starter $19/mo (8 videos avg): $0.30 GPU cost → **~98% margin**
- Pro $49/mo (25 videos avg): $0.95 GPU cost → **~98% margin**
- Agency $149/mo (100 videos avg): $3.80 GPU cost → **~97% margin**
- Break-even: 1 paying Starter user covers all fixed costs

**Previous margins with LTX-Video (A100 40GB) for comparison:**
- Starter: $1.25 GPU cost → ~88% margin
- Pro: $3.90 GPU cost → ~90% margin
- Agency: $15.60 GPU cost → ~89% margin

---

## API Reference

### Generate Complete Video
```bash
curl -X POST https://launchbusinessai.com/api/create-complete-video \
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
curl -X POST https://launchbusinessai.com/api/magic-launch-pack \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourproduct.com"}'
# Returns: 4 videos + 3 scripts + 2 posters
```

### Talking Head
```bash
# Step 1: verify identity (returns Stripe session URL)
curl -X POST https://launchbusinessai.com/api/talking-head/verify-identity \
  -H "Authorization: Bearer <token>"

# Step 2: record consent
curl -X POST https://launchbusinessai.com/api/talking-head/consent \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"photo_hash": "<sha256 of portrait>", "audio_hash": "<sha256 of audio>"}'

# Step 3: generate
curl -X POST https://launchbusinessai.com/api/talking-head/generate \
  -H "Authorization: Bearer <token>" \
  -F "portrait=@portrait.jpg" \
  -F "audio=@voiceover.mp3" \
  -F "photo_hash=<sha256>" \
  -F "still_mode=true" \
  -F "size=256"
```
