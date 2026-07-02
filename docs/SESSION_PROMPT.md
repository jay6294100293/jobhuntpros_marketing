# LAUNCHBUSINESS AI — SESSION PROMPT
# Paste this at the start of every new Claude Code task.

---

## BEFORE YOU WRITE A SINGLE LINE OF CODE

**Step 1 — Read these files:**
- `docs/PROJECT_SUMMARY.md` (full feature list + tech stack)
- `docs/VIDEO_FEATURES.md` (if touching video generation)
- `docs/WAN_VIDEO_UPGRADE.md` (if touching modal_video.py or video pipeline)
- `docs/TUTORIAL_STUDIO.md` (if touching Tutorial Studio / extension)

**Step 2 — Activate GitNexus:**
Check if `gitnexus` MCP tools are available. Use `search_code` to verify
every file you plan to touch. If not: `npx gitnexus analyze D:\NOVAJAY_TECH\jobhuntpro_marketing`

**Step 3 — Activate agent:**
- FastAPI / Python → `fastapi-developer`
- React UI → `react-developer`
- Landing page → `frontend-developer` + load marketingskills below

**Step 4 — Load marketing skills (if landing page / copy work):**
```bash
npx skillkit install coreyhaines31/marketingskills --skill page-cro copywriting signup-flow-cro
```

**Step 5 — Use ccg-workflow:**
```
/ccg:spec-research [task]
/ccg:spec-plan
/ccg:spec-impl
```

---

## CURRENT STATE

- **Status:** Live at launchbusinessai.com — quality upgrade phase
- **Core feature:** Magic Button → URL → 4 videos (all formats) + 3 scripts + 2 posters in 90s
- **Backend:** 7 modules — server.py (~4,496 lines) + legal_router.py (714) + admin_router.py (525) + modal_sadtalker.py (247) + modal_video.py (178) + brand_router.py (176) + jarvis_router.py (117)
- **AI:** Gemini 2.5 Flash + Edge TTS (AndrewNeural, free, no key)
- **GPU video:** Wan 2.2 TI2V-5B on Modal A10G — animates Hero slide ($0.03/clip)
- **Tutorial Studio:** Chrome extension records product → AI narrates → YouTube tutorial

## CRITICAL RULES
```
Video generation → async in executor (never block event loop)
Scraping → user-provided URLs only (legal)
API keys → environment variables only, never hardcode
Magic Button → never break this pipeline
GTX 1080 Ti → NEVER use it for SwiftPack — it runs Mother AI
VPS (Contabo 1GB RAM) → NEVER install Playwright/Chromium
LTX-Video → COMPLETELY REPLACED by Wan 2.2 TI2V-5B (do NOT reference LTX-Video)
APP_NAME → "launchbusiness-wan-video" (NOT "swiftpack-ltx-video")
Tutorial recording → Chrome extension on user's machine, NEVER server-side
```

## MAGIC BUTTON PIPELINE (never break)
```
/api/scrape → /api/generate-script (×5 parallel, format-targeted)
           → /api/create-complete-video (×4 parallel: 9:16, 16:9, 1:1, 4:5)
           → /api/create-poster (×2)
```

---

## MY TASK FOR THIS SESSION:
[DESCRIBE YOUR TASK HERE — replace this line]
