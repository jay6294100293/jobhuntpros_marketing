# CONTENT STUDIO — SESSION PROMPT
# Paste this at the start of every new Claude Code task.

---

## BEFORE YOU WRITE A SINGLE LINE OF CODE

**Step 1 — Read these files:**
- `PROJECT_SUMMARY.md` (full feature list + tech stack)
- `VIDEO_FEATURES.md` (if touching video generation)

**Step 2 — Activate GitNexus:**
Check if `gitnexus` MCP tools are available. Use `search_code` to verify
every file you plan to touch. If not: `npx gitnexus analyze E:\jobhuntpro_marketing`

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

- **Status:** Code complete — needs production deployment
- **Core feature:** Magic Button → URL → 2 videos + 2 scripts + 2 posters in 30s
- **Backend:** FastAPI, `server.py` is entire backend
- **AI:** Gemini 2.5 Flash (paid plan) + Google Cloud TTS Neural2
- **Immediate priority:** Production deployment + add Gemini fallback chain

## CRITICAL RULES
```
Video generation → async in executor (never block event loop)
Scraping → user-provided URLs only (legal)
API keys → environment variables only, never hardcode
Magic Button → never break this pipeline
LTX-Video → future upgrade (needs 2nd GPU, not yet)
```

## MAGIC BUTTON PIPELINE (never break)
```
/api/scrape → /api/generate-script → /api/create-complete-video + /api/create-poster
```

---

## MY TASK FOR THIS SESSION:
[DESCRIBE YOUR TASK HERE — replace this line]
