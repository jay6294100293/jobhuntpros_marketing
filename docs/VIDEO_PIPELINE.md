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

## Planned: AI Video Engine (Phase 2) — REVISED June 2026

### DECISION: Wan 2.2 TI2V-5B replaces LTX-Video and SVD

Full decision doc: `docs/WAN_VIDEO_UPGRADE.md`

### The Problem with Pure Text-to-Video
Models like LTX-Video, CogVideoX, Runway generate cinematic atmosphere footage — but they cannot reliably embed a specific brand's logo or product UI. They hallucinate something logo-shaped but it won't be YOUR brand mark.

### The Right Approach: Image-to-Video (Hybrid)
Instead of generating video from nothing, animate the EXISTING Pillow slides using AI motion:

```
Hero Pillow slide (PNG) → Wan 2.2 TI2V-5B → 1.3s animated branded clip
                        → reversed clip = outro
                        → Pexels B-roll for middle segments
                        → FFmpeg stitches all + Edge TTS audio → MP4
```

Result: the AI video clip literally shows the product's real brand colors, logo, and headline — not generic footage. This is what competitors charge $35–100/mo for.

### Chosen Model: Wan 2.2 TI2V-5B

**Why Wan 2.2 over everything else:**

| | LTX-Video (old) | SVD-XT (considered) | Wan 2.2 TI2V-5B (chosen) |
|---|---|---|---|
| Input | Text only | Image only | Text + Image ✅ |
| Shows brand content | ❌ Generic footage | ✅ Animates slide | ✅ Animates slide + reads prompt |
| GPU required | A100 40GB | A100 20GB | A10G 24GB ✅ |
| Cost per clip | ~$0.44 | ~$0.25 | ~$0.03 ✅ |
| Model size | 12GB | 10GB | 10GB FP8 ✅ |
| License | Apache 2.0 | Apache 2.0 | Apache 2.0 ✅ |

Wan 2.2 wins on all three dimensions: quality (shows real brand), cost (14× cheaper), GPU (smaller = cheaper Modal tier).

**What it does for our pipeline:**
- Input: Hero Pillow slide PNG + text prompt ("cinematic product intro, brand colors {color}, professional")
- Output: 33-frame (1.3s) cinematic clip of the ACTUAL branded slide animating
- That clip plays as intro. Reversed, it plays as outro. One generation, two uses.
- Cost: ~$0.03 vs $0.44 for LTX-Video

### Infrastructure: Modal.com (unchanged)
- Serverless GPU cloud — functions spin up on demand, shut down automatically
- Pay only for seconds of compute (~$0.03 per clip on A10G)
- Zero server management
- Code: `backend/modal_video.py` — REWRITE for Wan 2.2
- New APP_NAME: `launchbusiness-wan-video` (fixes existing APP_NAME mismatch bug)
- Needs: MODAL_TOKEN_ID + MODAL_TOKEN_SECRET in `/root/secrets/swiftpack.env`

### Phase 2 Tier Plan (updated)

At $0.03/clip, AI video is affordable for ALL paid tiers — no need to gate it to Pro/Agency.

| Plan | Video Engine |
|---|---|
| Free | FFmpeg slideshow (no GPU) |
| Starter | Wan 2.2 animated branded intro/outro + Pexels B-roll (if PEXELS_API_KEY set) |
| Pro | Same as Starter + Talking Head |
| Agency | Same as Pro + unlimited brand profiles |

### No Extra Credit Cost for Phase 2
GPU cost at $0.03/clip means it costs less than 1 cent extra per video vs the old FFmpeg-only pipeline.
No need to charge extra credits. AI video is included in the normal video credit.

---

## Phase 3: Tutorial Studio — Chrome Extension (Planned)

Full spec: `docs/TUTORIAL_STUDIO.md`

Tutorial Studio adds a fourth type of video output: a real product walkthrough tutorial generated from a screen recording.

**The problem it solves:** The existing Magic Button generates slideshow-style ad videos from a scraped URL. Those are great for ads. But YouTube tutorials need to show the product ACTUALLY WORKING — the real dashboard, real buttons, real user flow. You can't generate that from scraped data.

**The solution:** A Chrome extension that records the founder's browser tab (already logged in, real product visible), uploads the recording, and our server auto-generates a polished 16:9 YouTube tutorial.

```
Chrome extension records active browser tab (founder logged into product)
        ↓
WebM video uploads to POST /api/tutorial/process
        ↓
FFmpeg extracts 1 frame every 4 seconds (max 12 frames)
        ↓
Each frame → Gemini Vision → 1 narration sentence
        ↓
Edge TTS voices the narration
        ↓
_build_slideshow_ffmpeg: frames as slides + captions + music + CTA
        ↓
16:9 MP4 YouTube tutorial ready for download
```

**Why extension, not server-side automation:**
- Server-side Playwright cannot get past login walls (real products require auth)
- VPS has 1GB RAM — Chromium alone would OOM the server
- Extension runs on founder's machine = already logged in, zero RAM cost for us

**Tier:** Starter+ only. Counts as 1 video credit per tutorial.

---

## Phase 4: Custom Scene Generation (Future)

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
| June 2026 | Image-to-video preferred over text-to-video | Shows actual product content, not generic AI footage |
| June 2026 | Modal for GPU, not Vast.ai | Serverless = zero management, pay per second |
| June 2026 | Phase 1 = better script only (no GPU) | Ships value fast, no GPU dependency |
| June 2026 | Creative direction: Starter+ only | Incentivizes upgrade from Free |
| June 2026 | **Replace LTX-Video with Wan 2.2 TI2V-5B** | 14× cost reduction ($0.44→$0.03) + accepts image input so shows actual brand |
| June 2026 | **Use A10G not A100 for Wan 2.2** | 5B FP8 model fits in 24GB A10G; no need for A100 40GB |
| June 2026 | **Fix APP_NAME mismatch with Wan 2.2 upgrade** | `swiftpack-ltx-video` never matched `launchbusiness-ltx-video` default — silent failure |
| June 2026 | **Give AI video to all paid tiers (not just Pro)** | At $0.03/clip, margin is ~98% even on Starter — no reason to gate it |
| June 2026 | **Tutorial Studio = Chrome extension, not server automation** | Server can't log into products; extension is already logged in; VPS can't run Chromium (1GB RAM) |
