# CONTENT STUDIO — FULL CODEBASE AUDIT PROMPT
# Paste this into Claude Code to run a complete audit against the master plan.
# Last updated: 2026-04-06

---

## WHAT THIS AUDIT DOES

This is a deep audit of the entire Content Studio codebase against its master plan documents.
The goal is to find every gap, broken feature, missing implementation, placeholder value,
security issue, and spec violation — and produce a single prioritised action list.

---

## STEP 1 — READ ALL SOURCE OF TRUTH DOCUMENTS FIRST

Before auditing a single file, read ALL of these in full:

1. `PROJECT_SUMMARY.md` — complete feature list, tech stack, cost breakdown
2. `README.md` — architecture, API reference, quick start
3. `VIDEO_FEATURES.md` — full video generation pipeline spec
4. `SETUP_INSTRUCTIONS.md` — deployment requirements
5. `TTS_SETUP.md` — Google Cloud TTS setup spec

Use GitNexus MCP tools throughout:
- `gitnexus_query({query: "concept"})` — find code by concept
- `gitnexus_context({name: "functionName"})` — full context on any function

---

## STEP 2 — AUDIT SCOPE (check every item)

### 2A — BACKEND: server.py (THE ENTIRE BACKEND)

Read `backend/server.py` in full. Cross-reference against `README.md` API Reference:

**Endpoints — verify each exists and works:**
- [ ] `GET /api/` — health check returns `{"message": "JobHuntPro Content Studio API"}`
- [ ] `POST /api/scrape` — URL scraping with BeautifulSoup, extracts brand colors + headlines
- [ ] `POST /api/generate-script` — Gemini 2.5 Flash, 3 frameworks (PAS/Step-by-Step/Before-After)
- [ ] `POST /api/create-video` — basic video creation
- [ ] `POST /api/create-complete-video` — full pipeline: TTS + captions + zoom + progress bar
- [ ] `POST /api/create-poster` — Pillow poster generation
- [ ] `POST /api/magic-launch-pack` — ALL-IN-ONE: 2 videos + 2 scripts + 2 posters
- [ ] `POST /api/upload` — asset file upload
- [ ] `GET /api/gallery` — list generated content

**Magic Button Pipeline — verify complete chain exists:**
- [ ] URL scrape → extract brand colors ✓/✗
- [ ] Brand colors → script generation via Gemini ✓/✗
- [ ] Script → Google TTS Neural2 voiceover ✓/✗
- [ ] Script → UGC animated captions (lower third, fade in/out) ✓/✗
- [ ] Video → zoom/pan effects (100% → 110%) ✓/✗
- [ ] Video → progress bar (branded color) ✓/✗
- [ ] Export → 9:16 (TikTok), 16:9 (YouTube), 1:1 (Instagram) ✓/✗
- [ ] Poster generation → 1:1 + 9:16 ✓/✗

**Video Generation Spec — verify against VIDEO_FEATURES.md:**
- [ ] Is video generation running in `asyncio.run_in_executor`? (MUST — never block event loop)
- [ ] Frame rate: 24 FPS ✓/✗
- [ ] Audio codec: AAC ✓/✗
- [ ] Video codec: H.264 (libx264) ✓/✗
- [ ] Caption font: Arial Bold ✓/✗
- [ ] Caption position: lower third (75% from top) ✓/✗
- [ ] Zoom: linear from 100% to 110% ✓/✗
- [ ] Progress bar height: 10px, 20px from bottom ✓/✗
- [ ] TTS: Google Cloud TTS Neural2 (not standard) ✓/✗

**AI Resilience:**
- [ ] Is there a fallback if Gemini API fails? (should be: Gemini → OpenRouter → template)
- [ ] Is `OPENROUTER_API_KEY` read from environment?
- [ ] Is there a template-based emergency fallback if all AI fails?

**Security:**
- [ ] Are ALL API keys read from environment variables? (never hardcoded)
- [ ] Is `GEMINI_API_KEY` read from `.env` not hardcoded?
- [ ] Is `JWT_SECRET` read from `.env`?
- [ ] Is CORS configured correctly? (`CORS_ORIGINS` from env)
- [ ] Is there input validation before passing user URLs to scraper?
- [ ] Are generated files saved to `backend/outputs/` not arbitrary paths?
- [ ] Is disk space checked before starting video generation?
- [ ] Are temp audio files cleaned up after video generation?

**Performance:**
- [ ] Is `httpx` used for async HTTP? (not `requests` in async contexts)
- [ ] Are long operations returning progress updates to frontend?

### 2B — FRONTEND COMPONENTS

For each component in `frontend/src/components/`:

**Dashboard.js (Magic Button — PRIMARY SCREEN):**
- [ ] URL input field present?
- [ ] Magic Button present and wired to `/api/magic-launch-pack`?
- [ ] Loading state during generation?
- [ ] Error handling if generation fails?
- [ ] Results display: 2 videos + 2 scripts + 2 posters?

**ScriptGenerator.js:**
- [ ] All 3 frameworks selectable? (PAS, Step-by-Step, Before-After)
- [ ] Wired to `POST /api/generate-script`?
- [ ] Script output editable?

**CreateContent.js:**
- [ ] Video format selector: 9:16, 16:9, 1:1?
- [ ] Wired to `POST /api/create-complete-video`?
- [ ] Brand color input?
- [ ] Voiceover toggle?
- [ ] Captions toggle?

**AssetUpload.js:**
- [ ] Wired to `POST /api/upload`?
- [ ] File type validation?

**Gallery.js:**
- [ ] Wired to `GET /api/gallery`?
- [ ] Download buttons for each generated file?

**Layout.js:**
- [ ] Navigation to all 5 sections?
- [ ] Active route highlighted?

### 2C — ENVIRONMENT VARIABLES

Read `backend/.env`:
- [ ] `MONGO_URL` — is it still `localhost`? (needs Atlas URL for production)
- [ ] `GEMINI_API_KEY` — is it set? is it valid format?
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` — does the JSON file actually exist at the path?
- [ ] `OPENROUTER_API_KEY` — is it set? (fallback chain)
- [ ] `JWT_SECRET` — is it set and strong?
- [ ] `CORS_ORIGINS` — is it still localhost only?

Check: does `backend/gcloud-tts-key.json` actually exist?
- [ ] File exists at `backend/gcloud-tts-key.json`? ✓/✗

### 2D — DOCKER + DEPLOYMENT

Read `docker-compose.yml`:
- [ ] Are all 3 services defined: mongodb, backend, frontend?
- [ ] Are environment variables passed correctly?
- [ ] Are volumes mounted correctly for `outputs/` and `uploads/`?
- [ ] Is the backend port correct (8001)?
- [ ] Is the frontend port correct (3000)?

Read `backend/requirements.txt`:
- [ ] Is `fastapi` present?
- [ ] Is `moviepy` present? (correct version: 2.2.1)
- [ ] Is `pillow` present?
- [ ] Is `google-cloud-texttospeech` present?
- [ ] Is `beautifulsoup4` present?
- [ ] Is `httpx` present?
- [ ] Is `motor` present? (async MongoDB)
- [ ] Is `aiofiles` present?

Read `frontend/package.json`:
- [ ] Is React 19 the version?
- [ ] Is Tailwind CSS 3.4 present?
- [ ] Is Shadcn/UI present?
- [ ] Is React Router DOM 7.x present?
- [ ] Is axios present?
- [ ] Is framer-motion present?

### 2E — TESTS

Read `backend_test.py` and `tests/` directory:
- [ ] Is the Magic Button tested end-to-end?
- [ ] Is the scraper tested?
- [ ] Is video generation tested?
- [ ] Run: `python backend_test.py` — do tests pass?

### 2F — FEATURE COMPLETENESS vs PROJECT_SUMMARY.md

Cross-reference every feature claimed in `PROJECT_SUMMARY.md` Section "Features Implemented":
- [ ] AI-Powered Content Generation (Gemini) — implemented? ✓/✗
- [ ] URL Intelligence (color extraction + feature detection) — implemented? ✓/✗
- [ ] Professional Video Creation (all 6 sub-features) — implemented? ✓/✗
- [ ] Poster Generation (both formats) — implemented? ✓/✗
- [ ] Magic Button Workflow (all 6 outputs) — implemented? ✓/✗
- [ ] Asset Management (upload + organize) — implemented? ✓/✗
- [ ] Dark Theme UI — implemented? ✓/✗

### 2G — COST ANALYSIS VERIFICATION

Per `PROJECT_SUMMARY.md` cost breakdown:
- [ ] Is TTS using the Neural2 voice (free 4M chars/month)?
- [ ] Is Gemini using Flash not Pro? (Flash is free tier, Pro is paid)
- [ ] Are there any unexpected paid API calls?

---

## STEP 3 — AUDIT OUTPUT FORMAT

```
# CONTENT STUDIO — AUDIT REPORT
# Generated: [date]
# Audited against: PROJECT_SUMMARY.md + README.md + VIDEO_FEATURES.md

---

## CRITICAL (Magic Button broken, event loop blocking, hardcoded secrets)
| # | Issue | File | Line | Fix Required |
|---|-------|------|------|-------------|

## HIGH (missing endpoint, missing feature claimed as done, no fallback)
| # | Issue | File | Line | Fix Required |
|---|-------|------|------|-------------|

## MEDIUM (partial implementation, env var not set, stale doc)
| # | Issue | File | Line | Fix Required |
|---|-------|------|------|-------------|

## LOW (minor inconsistency, dead code, nice-to-have)
| # | Issue | File | Line | Fix Required |
|---|-------|------|------|-------------|

---

## ENDPOINTS AUDIT
| Endpoint | In README | Implemented | Works | Status |
|----------|-----------|-------------|-------|--------|

---

## MAGIC BUTTON PIPELINE AUDIT
| Step | Implemented | Works | Notes |
|------|-------------|-------|-------|

---

## ENVIRONMENT VARIABLES AUDIT
| Variable | Required | Set in .env | Valid | Status |
|----------|----------|-------------|-------|--------|

---

## DEPENDENCIES AUDIT
| Package | Required | In requirements.txt | Status |
|---------|----------|---------------------|--------|

---

## FEATURES vs PROJECT_SUMMARY.md
| Feature | Claimed | Actually Implemented | Gap |
|---------|---------|---------------------|-----|

---

## PRIORITY ACTION LIST (in order)
1. [CRITICAL] ...
2. [HIGH] ...
3. [MEDIUM] ...
```

---

## STEP 4 — SAVE THE REPORT

Save to: `AUDIT_REPORT_[YYYY-MM-DD].md`

---

## AUDIT RULES

- Do NOT fix anything during the audit — document only
- Test the Magic Button manually if possible: `curl -X POST http://localhost:8001/api/magic-launch-pack -H "Content-Type: application/json" -d '{"url": "https://example.com"}'`
- Check every claim in PROJECT_SUMMARY.md against actual code
- Any blocking event loop issue is CRITICAL — video generation must use executor
- Missing gcloud-tts-key.json is CRITICAL — videos have no voice without it
- The audit is complete only when every item in STEP 2 is checked
