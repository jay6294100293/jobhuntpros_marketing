# LaunchBusiness AI — Video Pipeline & Roadmap
# Created: June 2026 | Source of truth for video architecture decisions

---

## Current Video Stack (Production — No GPU Required)

Every video generated today uses this pipeline:

```
URL scrape → Pillow slides → Edge TTS audio → FFmpeg assembly → MP4
```

### 1. Pillow (slide design)
- Renders 6 structured marketing slides as PNG images
- Brand colors auto-extracted from the scraped URL
- Slide templates: Hero → Problem → Solution → Features → How It Works → CTA
- Watermark burned diagonally into free-tier slides
- Library: Pillow 11.x (Python)

### 2. Edge TTS (neural voiceover)
- Microsoft AndrewNeural voice — sounds like a real human presenter
- Free, no API key required
- Rate: +5% speed for marketing pacing
- Output: 16kHz WAV → overlaid by FFmpeg
- Library: edge-tts 7.x (Python)

### 3. FFmpeg (video assembly)
- Stitches Pillow slides into video with:
  - Ken Burns zoom/pan effects (100% → 110%)
  - xfade crossfade transitions between slides (0.5s)
  - Animated captions (lower-third, UGC style, fade in/out)
  - Progress bar (branded color)
  - Background music bed (royalty-free MP3, ducked -18dB under voice)
- Multi-format export: 9:16 (TikTok), 16:9 (YouTube), 1:1 (Instagram)
- Free open-source, runs on CPU — no GPU needed

### 4. Google Gemini 2.5 Flash (script generation)
- Generates scripts for 3 frameworks: PAS, Step-by-Step, Before/After
- Input: scraped URL data (brand colors, headlines, features, description)
- SDK: google-genai (NOT google.generativeai)
- Fallback: OpenRouter if Gemini fails

### 5. BeautifulSoup + httpx (URL scraping)
- Extracts: brand colors, headlines, features, product description, images
- verify=False for SSL compatibility
- SSRF protection: blocks private IP ranges

---

## Current Tier Differences

| Feature | Free | Starter | Pro | Agency |
|---|---|---|---|---|
| Videos / month | 3 lifetime | 15 | 50 | 200 |
| Formats | 9:16 only | All | All | All |
| Watermark | Yes | No | No | No |
| Music bed | No | Yes | Yes | Yes |
| Video engine | FFmpeg | FFmpeg | FFmpeg | FFmpeg |
| AI video (Modal) | No | No | No (not deployed) | No (not deployed) |

**Note:** Modal/LTX-Video is NOT deployed. All tiers currently get identical FFmpeg slideshow quality. Pro/Agency differentiation is volume only. This is a known gap — see Phase 2 below.

---

## Planned: Creative Direction Input (Phase 1)

### What It Is
An optional text field on the Dashboard where founders describe their creative vision before clicking the Magic Button. It improves Gemini script quality without changing the video engine.

### User Flow
```
Default (unchanged):
  URL + Product Name + Audience → Magic Button → Pack

With Creative Direction (opt-in):
  URL + Product Name + Audience
  + [✦ Add creative direction — click to expand]
      → textarea (300 char max)
      → e.g. "Dark, urgent. Start with the problem. End bold."
  → Magic Button → Better-tailored scripts, same FFmpeg video
```

### How Creative Direction Changes Gemini Prompt
Current prompt structure:
```
Generate a {framework} script for {product_name} targeting {audience}.
Features: {features}
```

With creative direction injected:
```
Generate a {framework} script for {product_name} targeting {audience}.
Features: {features}

Founder's creative direction: "{creative_direction}"
Incorporate this vision into the tone, opening hook, and messaging.
Keep the {framework} structure but let the creative direction shape
the character, energy, and angle of the script.
```

### Plan Gating
- Free: Field visible but locked → upgrade prompt shown
- Starter/Pro/Agency: Fully usable

### Credit Cost (Phase 1)
- No extra credit charge — creative direction counts as one normal generation
- The upgrade incentive is: Free users can't use it (encourages Starter upgrade)

### What Does NOT Change in Phase 1
- Video engine: same FFmpeg slideshow
- Processing time: +5-10 seconds (richer Gemini prompt)
- Output: same 2 videos + 2 scripts + 2 posters
- Credit/billing: no new charge event

### Files to Change (Phase 1)
- `backend/server.py`: Add `creative_direction: Optional[str]` to `MagicButtonRequest`
- `backend/server.py`: Inject creative_direction into Gemini script prompt in `_magic_launch_pack_handler`
- `frontend/src/components/Dashboard.js`: Add expandable creative direction field with tier gating
- Status: **PLANNED — not yet built**

---

## Planned: AI Video Engine (Phase 2)

### The Problem with Pure Text-to-Video
Models like LTX-Video, CogVideoX, Runway generate cinematic atmosphere footage — but they cannot reliably embed a specific brand's logo or product UI. They hallucinate something logo-shaped but it won't be YOUR brand mark.

### The Right Approach: Image-to-Video (Hybrid)
Instead of generating video from nothing, animate the EXISTING Pillow slides using AI motion:

```
Pillow slide (PNG) → SVD/AI model → 3-4s animated clip
                  → FFmpeg stitches all clips + Edge TTS audio → MP4
```

Result: cinematic-looking video that ACTUALLY shows the product's content, not generic AI footage.

### Model Options

**Stable Video Diffusion (SVD-XT)** — recommended for Phase 2
- Stability AI, Apache 2.0 (commercial OK)
- Input: one image → output: 3-4 seconds smooth animated motion
- Needs: A100 20GB VRAM
- Proven in production by many apps
- Makes still product slides "come alive" with natural camera motion

**CogVideoX-5B image-to-video mode** — higher quality alternative
- Apache 2.0 (commercial OK)
- Better motion quality than SVD
- Needs: A100 80GB
- More complex setup

**Runway Gen-3 image-to-video** — zero GPU management
- Commercial API, ~$0.05/second of video
- No Modal needed, just API key
- Best quality, most reliable
- Pay per video (no GPU overhead)

### Infrastructure: Modal.com
- Serverless GPU cloud — functions spin up on demand, shut down automatically
- Pay only for seconds of compute (~$0.20-0.40 per video on A100)
- Zero server management vs Vast.ai (which needs SSH + manual management)
- Code already exists in `backend/modal_video.py`
- Needs: MODAL_TOKEN_ID + MODAL_TOKEN_SECRET in `/root/secrets/swiftpack.env`

### Phase 2 Tier Upgrade Plan

| Plan | Creative Direction | Video Engine |
|---|---|---|
| Free | Locked | FFmpeg slideshow |
| Starter | ✅ Better script | FFmpeg slideshow |
| Pro | ✅ Better script | SVD animated slides (Modal A100) |
| Agency | ✅ Better script + scene hints | SVD animated slides (Modal A100) |

### Credit Cost (Phase 2)
- Creative Direction on Pro: +5 credits (triggers Modal GPU)
- Creative Direction on Agency: +10 credits (full scene generation)

---

## Phase 3: Custom Scene Generation (Future)

For Agency users who write creative directions like "logo coming out of the sun":

```
Creative direction: "Logo comes out of the sun, then show the dashboard"
         ↓
Scene parser (Gemini) identifies:
  Scene 1: "golden sunrise" → text-to-video AI generates background
                            → actual logo PNG composited on top (FFmpeg overlay)
  Scene 2: "dashboard" → actual product screenshot from URL scrape
                       → SVD animates it
         ↓
FFmpeg stitches all scenes + Edge TTS audio → MP4
```

**Models for Phase 3:**
- Scene backgrounds: CogVideoX-5B text-to-video (A100 80GB) or Runway API
- Logo compositing: FFmpeg overlay with scale/fade/slide animation (already supported)
- Product UI: existing URL screenshot pipeline

**Note:** AI cannot reliably render specific logos from text description.
The logo always comes from the user's actual asset — AI generates the BACKGROUND,
FFmpeg composites the logo on top. This is how Runway, HeyGen, and professional tools work.

---

## What Is NOT Changing

- URL scraping pipeline (BeautifulSoup + httpx) — stays as-is
- Gemini script generation — Phase 1 adds creative direction injection, structure unchanged
- Poster generation (Pillow) — separate from video, not affected
- Logo Creator — separate feature, not part of Magic Button video pipeline
- Edge TTS — stays as the voiceover engine for all phases

---

## Decision Log

| Date | Decision | Reason |
|---|---|---|
| June 2026 | Remove LTX-Video from landing page Pro claim | LTX-Video not deployed, misleading to paying users |
| June 2026 | Image-to-video (SVD) preferred over text-to-video for Pro | Shows actual product content, not generic AI footage |
| June 2026 | Modal for GPU, not Vast.ai | Serverless = zero management, pay per second |
| June 2026 | Phase 1 = better script only (no GPU) | Ships value fast, no GPU dependency |
| June 2026 | Creative direction: Starter+ only | Incentivizes upgrade from Free |
