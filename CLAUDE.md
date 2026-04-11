# SWIFTPACK AI (formerly Content Studio) — CLAUDE CODE MASTER PROMPT
# Read this entire file before touching any code. No exceptions.

---

## STEP 1 — ACTIVATE TOOLS (DO THIS FIRST, EVERY SESSION)

### 1a. GitNexus Knowledge Graph
- Check if `gitnexus` MCP tools are available
- If YES → use `search_code` before editing `server.py` or any component
- If NO → run: `npx gitnexus analyze E:\jobhuntpro_marketing` then `npx gitnexus setup`

### 1b. Agent Persona
Activate from `~/.claude/agents/` based on task:
- FastAPI routes / Python backend → `fastapi-developer`
- React components / UI → `react-developer`
- Video generation / MoviePy → `python-developer`
- Landing page / copy / pricing → `frontend-developer` + load marketingskills (see 1d)
- Pre-deploy → `security-auditor` then `qa-engineer`

### 1c. ccg-workflow
```
/ccg:spec-research [task]
/ccg:spec-plan
/ccg:spec-impl
/ccg:spec-review

/ccg:frontend [task]   ← React UI work → routes to Gemini (paid plan)
/ccg:backend [task]    ← FastAPI work → routes to Codex
```

### 1d. Marketing Skills (MANDATORY for any landing page / copy / pricing work)
```bash
npx skillkit install coreyhaines31/marketingskills --skill page-cro copywriting email-sequence seo-audit
```
Then reference skills automatically when writing landing page copy, email sequences, or pricing pages.

---

## STEP 2 — READ THESE FILES FIRST

1. `docs/PROJECT_SUMMARY.md` ← complete feature list, tech stack, cost breakdown
2. `README.md` ← architecture, API reference, quick start
3. `docs/VIDEO_FEATURES.md` ← video generation spec (read before any video work)
4. `docs/SETUP_INSTRUCTIONS.md` ← deployment guide

---

## STEP 3 — VERIFIED ARCHITECTURE

```
Backend     → FastAPI 0.110.1 (Python 3.11) — server.py is the entire backend
Frontend    → React 19 + Tailwind CSS 3.4 + Shadcn/UI + React Router DOM 7.5.1
Database    → MongoDB (Motor async driver)
AI / LLM    → Google Gemini 2.5 Flash (primary) — 1,000 req/day free, paid plan available
TTS         → Google Cloud TTS Neural2 (4M chars/month free)
Video       → MoviePy 2.2.1 + FFmpeg + Pillow 11.3.0
Scraping    → BeautifulSoup4 + Requests (user-provided URLs only — legal)
Ports       → Backend: 8001, Frontend: 3000
Process     → Supervisor (manages both processes)
Proxy       → Nginx (reverse proxy)
Deployment  → Docker Compose
Domain      → swiftpackai.tech
Company     → NovaJay Tech (novajaytech.com)
```

---

## STEP 4 — THE CORE FEATURE (Magic Button)

The entire product revolves around this pipeline — never break it:
```
User pastes URL
    ↓
POST /api/scrape → BeautifulSoup extracts brand colors, headlines, features
    ↓
POST /api/generate-script → Gemini 2.5 Flash → script (PAS / Step-by-Step / Before-After)
    ↓
POST /api/create-complete-video → MoviePy pipeline:
    - Google TTS Neural2 voiceover
    - UGC-style animated captions (lower third, fade in/out)
    - Zoom/pan effects (100% → 110%)
    - Progress bar (branded color)
    - Multi-format export: 9:16 (TikTok), 16:9 (YouTube), 1:1 (Instagram)
    ↓
POST /api/create-poster → Pillow → branded social graphics
    ↓
Magic Button response: 2 videos + 2 scripts + 2 posters
```

---

## STEP 5 — ABSOLUTE RULES

### NEVER DO THESE
- Scrape any URL the user didn't provide — only process URLs users paste themselves
- Store any scraped data permanently — process and return, no persistent scraping DB
- Break the Magic Button pipeline — it is the core product feature
- Use a video generation model that requires GPU not available (GTX 1080 Ti is Mother's — do not use it)
- Hardcode API keys — always read from environment variables
- Use synchronous operations for video generation — all heavy ops must be async
- Block the FastAPI event loop with MoviePy — run in `asyncio.run_in_executor`

### ALWAYS DO THESE
- Run video generation in executor (not blocking the event loop)
- Save generated files to `backend/outputs/` directory
- Clean up temp audio files after video generation completes
- Return progress updates for long operations (video gen can take 15-30 seconds)
- Validate all user inputs before passing to Gemini
- Use `httpx` for async HTTP (not `requests` in async contexts)
- Check available disk space before starting video generation

---

## STEP 6 — CURRENT PRIORITIES

### Status: Code Complete — Needs Production Deployment

The code is fully built. Current priority is deployment and enhancement:

### Priority 1 — Production Deployment
1. Set real `GEMINI_API_KEY` in `backend/.env` (paid plan key)
2. Set up Google Cloud TTS credentials (`gcloud-tts-key.json`)
3. Configure MongoDB connection string
4. Set `CORS_ORIGINS` to production domain
5. Run `docker-compose up -d`
6. Configure Nginx SSL with Let's Encrypt
7. Test Magic Button end-to-end in production

### Priority 2 — AI Fallback (add resilience)
Add fallback chain to script generation (currently single-point failure on Gemini):
- Primary: Gemini 2.5 Flash (paid plan — high rate limit)
- Fallback: OpenRouter (if Gemini fails)
- Emergency: Template-based script (no AI — always works)
Implement in `backend/server.py` — wrap Gemini call with try/except + fallback

### Priority 3 — URL Scraper Reliability (Crawlee upgrade)
Current: `requests + BeautifulSoup` — fails on JS-heavy sites
Upgrade: `crawlee[beautifulsoup]` — stealth crawling, anti-bot fingerprinting
```bash
pip install crawlee[beautifulsoup]
```
Rewrite the `/api/scrape` endpoint to use Crawlee's `BeautifulSoupCrawler`
Only applies to user-provided URLs — still fully legal

### Priority 4 — LTX-Video Integration (FUTURE — needs 2nd GPU)
When second GPU is added to home server:
- Integrate LTX-Video (Lightricks, Apache 2.0) for actual AI video generation
- Replaces MoviePy slideshow approach with real generative video
- 4K output, synchronized audio, up to 20 seconds per clip
- GTX 1080 Ti stays on Mother — second GPU handles LTX inference

### Priority 5 — Landing Page
Build public marketing page using marketingskills:
- Load `page-cro` + `copywriting` + `signup-flow-cro` skills
- Headline: URL → complete launch pack in 30 seconds, free
- Show before/after: traditional process ($400-1900, 5-10 days) vs Studio (30 seconds, $0)

---

## STEP 7 — API ENDPOINTS REFERENCE

```
GET  /api/                         Health check
POST /api/scrape                   Scrape URL → brand data
POST /api/generate-script          Script generation (PAS/Step-by-Step/Before-After)
POST /api/create-video             Basic video
POST /api/create-complete-video    Full video with TTS + captions + effects
POST /api/create-poster            Social graphic PNG
POST /api/magic-launch-pack        All-in-one: 2 videos + 2 scripts + 2 posters
POST /api/upload                   Upload asset file
GET  /api/gallery                  List generated content
```

---

## STEP 8 — FRONTEND COMPONENTS

```
frontend/src/components/
├── Dashboard.js       ← Magic Button + URL input (PRIMARY SCREEN)
├── ScriptGenerator.js ← Manual script creation
├── CreateContent.js   ← Video + poster creator
├── AssetUpload.js     ← File upload manager
├── Gallery.js         ← Generated content + downloads
└── Layout.js          ← Nav wrapper
```

---

## STEP 9 — ENVIRONMENT VARIABLES

```env
# backend/.env
MONGO_URL=mongodb://localhost:27017
DB_NAME=jobhuntpro_db
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
GEMINI_API_KEY=your-paid-gemini-key
GOOGLE_APPLICATION_CREDENTIALS=/app/backend/gcloud-tts-key.json

# frontend/.env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## STEP 10 — BEFORE MARKING TASK DONE

```bash
# Test Magic Button end-to-end
curl -X POST http://localhost:8001/api/magic-launch-pack \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
# Must return 2 videos + 2 scripts + 2 posters

# Test health
curl http://localhost:8001/api/
# Must return: {"message": "JobHuntPro Content Studio API"}
```

---

## MOTHER AI INTEGRATION

Mother monitors Content Studio via:
- `GET /api/` — health check (Mother polls this endpoint)
- Mother alerts if health check fails for 2+ consecutive polls
- No dedicated Mother endpoint needed — standard health check is sufficient
- Add `X-Mother-Key` header auth to health endpoint when Mother Phase 10 is built

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **jobhuntpro_marketing** (818 symbols, 1749 relationships, 41 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/jobhuntpro_marketing/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/jobhuntpro_marketing/context` | Codebase overview, check index freshness |
| `gitnexus://repo/jobhuntpro_marketing/clusters` | All functional areas |
| `gitnexus://repo/jobhuntpro_marketing/processes` | All execution flows |
| `gitnexus://repo/jobhuntpro_marketing/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
