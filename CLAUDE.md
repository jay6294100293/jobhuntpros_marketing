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
5. `docs/BRAND_PROFILE_FEATURE.md` ← Brand Profile feature — all 15 items DONE
6. `docs/WAN_VIDEO_UPGRADE.md` ← Wan 2.2 TI2V-5B is implemented in `backend/modal_video.py` (model `Wan-AI/Wan2.2-TI2V-5B`, A10G GPU, app name `launchbusiness-wan-video`) — read this doc only if touching `modal_video.py`, or to verify `modal deploy` has been run and `MODAL_APP_NAME` is set in prod secrets
7. `docs/TUTORIAL_STUDIO.md` ← Tutorial Studio is implemented — `extension/` has manifest.json/background.js/popup.html/popup.js/icons, `POST /api/tutorial/process` exists in server.py, and `TutorialStudio.js` is built. Read this doc for spec/UX details or to verify Chrome Web Store submission status

---

## STEP 3 — VERIFIED ARCHITECTURE

```
Backend     → FastAPI 0.110.1 (Python 3.11) — server.py is the entire backend
Frontend    → React 19 + Tailwind CSS 3.4 + Shadcn/UI + React Router DOM 7.5.1
Database    → MongoDB (Motor async driver) — resilient, works without it
AI / LLM    → Google Gemini 2.5 Flash (google-genai SDK — NOT google-generativeai)
TTS         → Edge TTS (Microsoft Neural, primary, free, no key) → gTTS fallback if Edge fails
Video       → FFmpeg + Pillow (CPU, VPS) + Modal A10G GPU (Wan 2.2 TI2V-5B) for branded AI clips
Scraping    → BeautifulSoup4 + httpx (verify=False for SSL compat)
Auth        → JWT (jose) + bcrypt + beta agreement modal
Payments    → Stripe — subscriptions, webhooks, usage-limit enforcement, coupons all wired; verify live keys/price IDs are set in prod secrets
Ports       → Backend: 8001, Frontend: 3000
Proxy       → Nginx (SSL + reverse proxy, Let's Encrypt cert)
Deployment  → Docker Compose (4 containers: mongo, backend, frontend, nginx)
Domain      → swiftpackai.tech
Server      → Contabo VPS root@YOUR_SERVER_IP, repo at /root/swiftpack
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
- Install Playwright/Chromium on VPS — Contabo VPS has 1GB RAM, it will OOM
- Launch talking head feature without ID verification + DeepFace check (deepfake risk)
- Reference LTX-Video anywhere — it is REPLACED by Wan 2.2 TI2V-5B (see docs/WAN_VIDEO_UPGRADE.md)
- Use APP_NAME "swiftpack-ltx-video" — the correct new name is "launchbusiness-wan-video"
- Run Tutorial Studio recording server-side — the Chrome extension runs on the user's machine, NOT the VPS

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

### Status: Core roadmap is code-complete. Focus is deployment verification + AppSumo launch.

Full strategy in `docs/PRODUCT_STRATEGY.md`.

### ✅ DONE — Quality & Platform Roadmap (Priorities 1–7)
All of the following are implemented in `backend/server.py` / `backend/modal_video.py` /
`backend/modal_sadtalker.py`. Do not re-build these — only fix bugs if found:

1. **Edge TTS** — Microsoft Neural voiceover (`en-US-AndrewNeural`) is primary; gTTS is the fallback if Edge fails
2. **Pillow Slide Design System** — 6 structured templates (Hero, Problem, Solution, Features, How It Works, CTA) with brand colors + logo overlay
3. **Crossfade Transitions** — FFmpeg `xfade` between slides (0.5s fade)
4. **Watermark** — burned into slide content area (not a corner overlay), free tier only
5. **Stripe Subscriptions** — checkout, webhooks, usage-limit enforcement, coupons all wired (Free: 3 lifetime gens / Starter $19 mo: 15 / Pro $49 mo: 50 + talking head / Agency $149 mo: 200 + team + white label)
6. **Modal Wan 2.2 TI2V-5B** — `backend/modal_video.py` uses model `Wan-AI/Wan2.2-TI2V-5B`, GPU A10G, app name `launchbusiness-wan-video`, takes the Hero Pillow slide PNG as image input. Decision history in `docs/WAN_VIDEO_UPGRADE.md`.
7. **SadTalker Talking Head** — `backend/modal_sadtalker.py` implemented with Stripe Identity verification gate, DeepFace check, "AI GENERATED" label burn-in, and timestamped consent tracking
8. **Tutorial Studio** — `extension/` (Chrome Manifest V3: manifest.json, background.js, popup.html, popup.js, icons), `POST /api/tutorial/process` (server.py), and `TutorialStudio.js` all built. Full spec in `docs/TUTORIAL_STUDIO.md`.

### 🔜 ACTUAL NEXT STEPS — Verification & Activation (not new builds)

The code above exists; what needs confirming is production *activation*:

1. **Wan 2.2 deployment** — confirm `modal deploy backend/modal_video.py` has been run and `MODAL_APP_NAME=launchbusiness-wan-video` is set in `/root/secrets/swiftpack.env`
2. **Stripe live keys** — confirm `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the Starter/Pro/Agency price IDs are set in prod secrets (subscription code is done, just needs keys)
3. **SadTalker deployment** — confirm `modal deploy backend/modal_sadtalker.py` has run and Stripe Identity is activated
4. **Tutorial Studio extension** — confirm the Chrome extension has been sideload-tested and/or submitted to the Chrome Web Store

### Priority 8 — AppSumo Lifetime Deal (still pending)
Only after the verification items above are confirmed (product must be fully live before LTD).
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

See `docs/PROJECT_SUMMARY.md` → "Key Files" for the current, maintained list of frontend
components (Dashboard, BrandProfiles, LogoCreator, LegalDocs + `legal/*`, TutorialStudio,
Pricing, `auth/*`, `context/AuthContext.js`, etc.). Don't duplicate that list here — update
`PROJECT_SUMMARY.md` instead so it doesn't drift out of sync again.

---

## STEP 9 — ENVIRONMENT VARIABLES

See `docs/PROJECT_SUMMARY.md` → "Environment Variables" for the full, current list (Mongo,
Gemini, JWT, Stripe, Modal, Pexels, Google Safe Browsing, etc.). Don't duplicate that list here —
update `PROJECT_SUMMARY.md` instead so it doesn't drift out of sync again.

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
# Must return: {"message": "LaunchBusiness AI API"}
```

---

## STEP 11 — NEXT MAJOR FEATURE: BRAND PROFILE + CONTENT CREATOR REPLACEMENT

**Full spec in `docs/BRAND_PROFILE_FEATURE.md` — read that file for implementation details.**

### What Jay Wants Built (decided June 2026)
Replace the human content creator/video editor/lawyer entirely.
A user inputs a client brand brief ONCE. All three tools (Logo, Video, Legal) read from it.
Right now the three tools are 100% siloed — they share zero data.

### The Core Problem
- Logo Creator: generates logos, but logo NEVER appears in videos or posters
- Magic Button: asks for URL every time, ignores any logo the user already made
- Legal Docs: AI chat asks all business questions from scratch every session

### The Fix: Brand Profile (MongoDB document, one per client)
Fields: brand_name, tagline, url, primary_color, secondary_color, active_logo_path,
        audience, tone, business_type, jurisdiction, revenue_model

All three tools read from this profile. User enters brand info once.

### What Changes Per Tool
**Logo Creator:** auto-filled from profile. "Set as active logo" button stores logo in profile.
**Video Pipeline:** logo rendered on Hero slide (top-left, 60px) + CTA slide (bottom, 50px).
                   3 hook variants generated per run. 4:5 format added. All formats in one job.
**Legal Docs:** intake chat pre-filled from profile (jurisdiction, business type, revenue model).
               Reduces 8–10 chat exchanges to 2–3.

### New Endpoint Needed
`POST /api/full-launch-pack` → reads brand profile → logo + videos + scripts + posters + legal starter → ZIP

### New UX Flow (5-step wizard, replaces URL-paste on Dashboard)
1. Brand Brief — name, tagline, URL (optional), audience, tone, business type
2. Brand Identity — logo upload or generate, color picker or auto-extract from URL
3. Script Selection — all 3 frameworks generated, user picks + edits before render
4. Format Selection — 9:16 / 16:9 / 1:1 / 4:5, choose hooks (up to 3) → up to 12 videos
5. Download Pack — all videos + posters + scripts, ZIP export

### Build Status — ALL COMPLETE ✅
1. Brand Profile CRUD (brand_router.py) + BrandProfiles.js UI              → DONE
2. Logo → Hero + CTA slide rendering (_paste_logo in server.py)            → DONE
3. Logo → poster rendering (create_poster reads profile_id)                → DONE
4. Manual color pickers in BrandProfiles form                               → DONE
5. 3 hook variants (PAS + Step-by-Step + Before/After in magic button)    → DONE
6. 4:5 format (TIER_CONFIG + format_map in server.py)                      → DONE
7. ZIP download (/api/download-pack endpoint)                               → DONE
8. Legal intake pre-fill (start_chat accepts brand_profile_id)             → DONE
9. Dashboard profile selector auto-fills fields + passes profile_id        → DONE
10. LogoCreator profile selector + "Set as active logo" button             → DONE

### Quality Fixes — ALL COMPLETE ✅
- Poppins-ExtraBold + Inter fonts bundled in backend/assets/fonts/         → DONE
- Word-chunk TikTok-style captions (3 words/frame) in all FFmpeg builders  → DONE
- Pexels B-roll (PEXELS_API_KEY env var activates real video backgrounds)  → DONE
- Poster redesign: Pillow gradient + bundled fonts + logo overlay           → DONE

### To Activate Pexels
Add to /root/secrets/swiftpack.env: PEXELS_API_KEY=your_key
Get free key at pexels.com/api (200 req/hr, no credit card)

### Agency Pitch After This Is Built
Content creators managing multiple clients use Agency ($149/mo, unlimited profiles).
They replace their entire stack: video editor + copywriter + social manager + lawyer.
They charge clients $500–$2,000/mo. They pay us $149. That's the pitch.

### Video Ad Social Media Formats (for when creating ads for LaunchBusiness AI itself)
The best ad for LaunchBusiness AI = screen recording the product running on its own URL.
Paste launchbusinessai.com → record the 76-second pipeline → show the output. That IS the ad.

Format specs (all from one 9:16 master recording):
- 9:16 (1080×1920): TikTok, Reels, Shorts, Stories — 21–34 sec ideal
- 4:5 (1080×1350): Facebook Feed, Instagram Feed — crop top of 9:16
- 1:1 (1080×1080): LinkedIn, Twitter/X — center crop
- 16:9 (1920×1080): YouTube pre-roll — extended 60–90 sec cut

Hook formula (first 5 seconds = everything):
- V1 Pain: "Starting a business shouldn't cost $6,900 in agency fees."
- V2 Speed: "We just pasted our own URL and got this video in 90 seconds."
- V3 Unique: "Marketing pack + legal documents. One platform. 90 seconds."

Production tools needed: OBS Studio (screen record) + CapCut Desktop (edit/export) — both free.

---

## MOTHER AI INTEGRATION

Mother monitors Content Studio via:
- `GET /api/` — health check (Mother polls this endpoint)
- Mother alerts if health check fails for 2+ consecutive polls
- No dedicated Mother endpoint needed — standard health check is sufficient
- Add `X-Mother-Key` header auth to health endpoint when Mother Phase 10 is built

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **jobhuntpro_marketing** (1522 symbols, 4521 relationships, 85 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
