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

1. `docs/PROJECT_SUMMARY.md` ← current state, tech stack, deploy commands
2. `docs/PRODUCT_STRATEGY.md` ← business model, pricing, roadmap (READ THIS)
3. `docs/VIDEO_FEATURES.md` ← video generation spec (read before any video work)
4. `docs/SETUP_INSTRUCTIONS.md` ← deployment guide

---

## STEP 3 — VERIFIED ARCHITECTURE

```
Backend     → FastAPI 0.110.1 (Python 3.11) — server.py is the entire backend
Frontend    → React 19 + Tailwind CSS 3.4 + Shadcn/UI + React Router DOM 7.5.1
Database    → MongoDB (Motor async driver) — resilient, works without it
AI / LLM    → Google Gemini 2.5 Flash (google-genai SDK — NOT google-generativeai)
TTS         → gTTS (current) → Edge TTS planned (free, neural voices, no key)
Video       → FFmpeg + Pillow (CPU only — no GPU on EC2)
Scraping    → BeautifulSoup4 + httpx (verify=False for SSL compat)
Auth        → JWT (jose) + bcrypt + beta agreement modal
Payments    → Stripe (in code, not yet active)
Ports       → Backend: 8001, Frontend: 3000
Proxy       → Nginx (SSL + reverse proxy, Let's Encrypt cert)
Deployment  → Docker Compose (4 containers: mongo, backend, frontend, nginx)
Domain      → swiftpackai.tech
Server      → AWS EC2 ubuntu@99.79.39.115, repo at /home/ubuntu/swiftpack
SSH key     → novajaytechserver_testing-key.pem (in ~/Downloads)
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
- Use the GTX 1080 Ti for SwiftPack — it runs Mother AI, taking it down kills production
- Hardcode API keys — always read from environment variables
- Use synchronous operations for video generation — all heavy ops must be async
- Block the FastAPI event loop — run heavy work in `asyncio.run_in_executor`
- Install Playwright/Chromium on EC2 — t3.micro has 1GB RAM, it will OOM
- Launch talking head feature without ID verification + DeepFace check (deepfake risk)

### ALWAYS DO THESE
- Run video generation in executor (not blocking the event loop)
- Save generated files to `backend/outputs/` directory
- Clean up temp dirs (shutil.rmtree) after video generation completes
- Strip shell-unsafe chars from caption text (backticks, $, [], *, #, ', ")
- Use audio map index = n (number of images) not hardcoded 1 in slideshow FFmpeg
- Validate all user inputs before passing to Gemini
- Use `httpx` with verify=False for async HTTP scraping
- Check syntax (ast.parse) before deploying backend changes
- Test with Playwright E2E (test_e2e.js) before declaring done

---

## STEP 6 — CURRENT PRIORITIES

### Status: Live in production. Quality upgrade phase.

Full strategy in `docs/PRODUCT_STRATEGY.md`. Implementation order:

### Priority 1 — Edge TTS (DO THIS FIRST)
Replace gTTS with edge-tts (Microsoft Neural voices, free, no API key).
Biggest single quality improvement. 2 hours of work.
```python
import edge_tts
communicate = edge_tts.Communicate(text, voice="en-US-AndrewNeural")
await communicate.save(output_path)
```
Install: `pip install edge-tts` (add to requirements.txt)
The voice sounds like a real human presenter. gTTS sounds like 2003.

### Priority 2 — Pillow Slide Design System
Replace single-caption gradient with 6 structured slide templates:
- Slide 1: Hero (product name + headline, strong contrast)
- Slide 2: Problem (pain point, emotional)
- Slide 3: Solution (product name + value prop)
- Slide 4: Features (3 checkmarks from scraped data)
- Slide 5: How it works (numbered steps)
- Slide 6: CTA (URL, urgency)
Each slide: proper typography hierarchy, brand colors, decorative elements.

### Priority 3 — Crossfade Transitions
FFmpeg xfade filter between slides. Makes video feel polished.
Replace hard-cut concat with xfade=transition=fade:duration=0.5

### Priority 4 — Watermark in Slide Design
Burn "SwiftPack AI" into slide template content area (not corner).
Integrated into design — cropping destroys content, not just watermark.
Corner watermarks are useless (users crop in 5 seconds).

### Priority 5 — Stripe Subscription Enforcement
- Free: 3 lifetime generations (not per month)
- Starter $19/mo: 15 gens
- Pro $49/mo: 50 gens + talking head
- Agency $149/mo: 200 gens + team + white label
Stripe is already in the codebase — just needs activation + limit logic.

### Priority 6 — Modal + LTX-Video (Pro Tier GPU)
Deploy LTX-Video (Apache 2.0) on Modal.com as serverless GPU function.
Route pro users to Modal. Free users keep FFmpeg slideshow.
Cost: ~$0.44/video on A100. True pay-per-second, $0 when idle.

### Priority 7 — SadTalker Talking Head (Pro Feature)
User uploads portrait photo → lip-synced talking head video.
MUST have before launch:
  - Stripe Identity ID verification ($1.50/user)
  - DeepFace check against known public figures
  - "AI GENERATED" label burned into all talking head videos
  - Explicit consent checkbox (timestamped in DB)
  - EU AI Act compliance

### Priority 8 — AppSumo Lifetime Deal
Only after Priority 1-5 complete (product must look good before LTD).
LTD Tier 1: $79 / 15 gens per month forever
LTD Tier 2: $149 / 50 gens per month forever
Cap: 500 codes total. AppSumo takes 30%, you keep 70%.

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
