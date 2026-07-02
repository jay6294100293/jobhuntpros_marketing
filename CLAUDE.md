# CLAUDE.md — LaunchBusiness AI
# Auto-loaded by Claude Code every session. These rules are mandatory.
# Last generated: 2026-06-21
# Previous version: SWIFTPACK AI master prompt (undated; superseded)
#
# CHANGELOG (upgrade from previous CLAUDE.md):
# - KEPT:     ~14 core rules (Magic Button pipeline, scraping limits, executor rule,
#             VPS RAM limit, GTX 1080 Ti reservation, talking-head gate, GitNexus protocol…)
# - UPGRADED: backend layout (now 7 modules, server.py is 4,496 lines), health-check
#             grep, pricing/limits tables reconciled with docs/PROJECT_SUMMARY.md
# - REMOVED:  domain "swiftpackai.tech" (prod is launchbusinessai.com); project path
#             "E:\jobhuntpro_marketing" (actual D:\NOVAJAY_TECH\jobhuntpro_marketing);
#             "Tutorial Studio to be built" (it is built); "server.py ~3100 lines"
# - ADDED:    Section 2 environment tiers + staging-first default; admin_router rules;
#             Sentry/PostHog rule; jhp_token rule; legal-disclaimer compliance rule;
#             auto-deploy-on-push risk guardrail; near-zero-tests reality
#
# The long-form product knowledge from the old master prompt now lives in
# docs/PROJECT_SUMMARY.md, docs/ARCHITECTURE.md, and docs/RUNBOOK.md. This file is
# governance: what is fragile, what must never break, and how to work safely.

---

## 0 — Project identity

LaunchBusiness AI is a two-pillar SaaS for founders: **(1)** a Marketing Launch Pack —
paste a product URL and get a logo + videos + scripts + posters in ~90 seconds (the
"Magic Button"); **(2)** an AI Legal Document generator — Gemini intake chat → 28
jurisdiction-aware document types grounded in live 2026 law context. Backend is FastAPI
(`backend/server.py` + routers), frontend is a React 19 SPA, plus a Chrome MV3 extension
(Tutorial Studio). Live at **https://launchbusinessai.com**. Company: NovaJay Tech.
Repo: `jobhuntpro_marketing` (the repo name is legacy — the product is LaunchBusiness AI).

**Status: pre-revenue, no live paying users yet.** Optimize for shipping safely, not for
five-nines uptime — but never lose user data and never break the two things below.

**Must never break:** (a) the Magic Button pipeline (`POST /api/magic-button` →
scrape → scripts → videos → posters); (b) auth + the legal document generation flow.
These are the product.

---

## 1 — Mandatory planning protocol

Before writing any code, output a plan block:

```
PLAN:
  touches: [list files/modules affected]
  data_change: <yes/no — describe collection + field if yes>
  failure_modes: [3 specific ways this could go wrong in THIS project]
  rollback: <exact steps to undo this change>
```

For changes touching `backend/server.py` auth/Stripe/scrape sections, `legal_router.py`
generation, `admin_router.py`, the Magic Button pipeline, or any MongoDB write path,
write the plan to `docs/decisions/YYYY-MM-DD-<topic>.md` before coding.

Per the GitNexus rules in `AGENTS.md`: run `gitnexus_impact({target, direction:"upstream"})`
before editing any symbol and report the blast radius; run `gitnexus_detect_changes()`
before committing. Warn on HIGH/CRITICAL risk before proceeding.

---

## 2 — Environment tiers (ENFORCE STRICTLY)

**Default deploy target is always `staging`.** NEVER deploy to production unless I
explicitly say "deploy to production."

```
Local:      http://localhost:3000 (frontend) / http://localhost:8001 (backend)
            docker-compose.yml — for development only
Staging:    infra/docker-compose.staging.yml — for all testing (see docs/RUNBOOK.md)
            NOTE: a staging tier was generated 2026-06-21; stand it up before relying on it
Production: https://launchbusinessai.com  — explicit permission required
            docker-compose.prod.yml on the Contabo VPS at /opt/swiftpack
```

**CRITICAL operational risk:** `.github/workflows/deploy.yml` currently auto-deploys
every push to `main` straight to production via a webhook (`:9000/deploy/swiftpack`),
and a 5-minute cron on the VPS also pulls `main`. **Treat any merge to `main` as a
production deploy.** Do small, reviewed changes; verify locally/on staging first. Do not
push to `main` to "see if it works."

Environment detection: backend reads `ENVIRONMENT` env var; secrets are injected via
`env_file` in docker-compose (prod: `/root/secrets/swiftpack.env`). `server.py` also
`load_dotenv`s, in order, `/root/secrets/swiftpack.env` → `/home/ubuntu/secrets/swiftpack.env`
(legacy) → `E:/secrets/swiftpack.env` (Windows) → `backend/.env` for local dev.

---

## 3 — Security rules (project-specific)

- **Secrets:** never hardcode. Read from env only. Canonical template is
  `backend/.env.example`. Required: `MONGODB_URL`, `DB_NAME`, `JWT_SECRET` (≥32 chars),
  `ADMIN_SECRET`, `GEMINI_API_KEY`. Never commit `.env`, `*.pem`, or anything under
  `/secrets/` (already in `.gitignore`).
- **Auth:** JWT (jose) + bcrypt. The frontend stores the token in localStorage as
  **`jhp_token`** — NOT `token`. Using the wrong key causes silent 401s (this has bitten
  `BrandProfiles.js`, `LegalDocs.js`, `legal/*.js` before). Any new authed fetch must read
  `jhp_token`.
- **Admin:** `/api/admin/*` (`admin_router.py`) requires a logged-in user with
  `is_admin=True`. `ADMIN_EMAILS` auto-grants admin on login (password or Google). The
  legacy `X-Admin-Secret` header (`ADMIN_SECRET`) only gates `POST /api/admin/bootstrap`
  — used ONCE. JARVIS (`/api/jarvis/pulse`) uses the `X-Admin-Key` header. Never weaken
  these checks.
- **URL safety:** the scrape path enforces hostname blocklist + post-scrape content scan
  + (when keyed) Google Safe Browsing. Never bypass these to scrape faster.
- **Scraping:** only process URLs the user pasted. Never crawl, never persist scraped
  data — process and return. `httpx` uses `verify=False` for SSL compat; do not add
  arbitrary outbound requests to user-controlled hosts elsewhere.
- **PII / financial:** never log full Stripe webhook payloads, JWTs, or
  `payment_transactions` / `users` documents. Sentry + PostHog are wired — scrub
  identifiers; don't ship raw request bodies to them.
- **Legal output:** every generated legal document MUST keep its lawyer-review disclaimer
  (date + jurisdiction + "not legal advice"). Never strip it — it is the compliance shield.

---

## 4 — Database rules

Engine: **MongoDB 7** via Motor (async). DB name: `launchbusinessai_db` everywhere
(prod compose, local dev compose, and `.env`).

Critical collections (catastrophic to lose): `users`, `payment_transactions`,
`legal_documents`, `legal_profiles`, `talking_head_consents`. Also: `usage`,
`legal_credits_usage`, `legal_chat`, `logos`, `beta_agreements`, `beta_users`.

- MongoDB writes are intentionally resilient — content still generates if Mongo is down,
  the write is silently skipped. Do not "fix" this into a hard failure without a plan.
- Always filter user-owned queries by `user_id`. Never return another user's
  `legal_documents` / `legal_profiles`.
- **STOP and ask before** any `drop`, `delete_many`, `update_many` without a tight filter,
  or any collection rename. Confirm a backup exists first (see docs/RUNBOOK.md).
- No migration framework exists. Schema changes are code-level; for any change to a
  critical collection's shape, write a decision note (Section 1) and apply on staging
  first.
- **Backups are NOT yet confirmed to exist.** Until an automated `mongodump` is in place
  (see RUNBOOK §7), treat every destructive op as unrecoverable and refuse to run it
  without explicit confirmation.

---

## 5 — Testing gates

Reality check: **automated test coverage is thin.** `tests/test_syntax.py` is the only
committed unit test (a dependency-free syntax gate that CI runs via `pytest tests/ -q`).
Root has `backend_test.py`, `test_e2e.js`, `test_detail.js` (Playwright) as ad-hoc
harnesses. Add real unit tests for any critical path you touch — don't rely on the syntax
gate alone.

Commands:
```bash
# Backend syntax gate (always before deploy)
python -c "import ast; ast.parse(open('backend/server.py', encoding='utf-8-sig').read())"
# Backend smoke (needs a running backend on :8001)
python backend_test.py
# Frontend build (must succeed before frontend deploy)
cd frontend && yarn build
# E2E (local only — never install Chromium on the VPS)
node test_e2e.js
```

Minimum before any deploy:
- [ ] `ast.parse` passes on changed Python files
- [ ] Magic Button + health check verified (see Section 10)
- [ ] If frontend changed: `yarn build` succeeds
- [ ] New backend feature has at least a happy-path + an auth-failure check

Critical paths that SHOULD get a test when you touch them: Magic Button pipeline, JWT
auth, Stripe webhook idempotency, legal credit deduction, admin auth gate.

---

## 6 — Deployment rules

```bash
# Default: deploy to STAGING (see docs/RUNBOOK.md §2)
# Production (only on explicit "deploy to production"):
ssh -i ~/Downloads/novajaytechserver_testing-key.pem root@<SERVER_IP>
cd /opt/swiftpack && git pull
docker compose -f docker-compose.prod.yml up -d --build backend
docker restart swiftpack-nginx-1   # ← nginx loses upstream after backend restart; ALWAYS restart it
# Frontend changes:
docker compose -f docker-compose.prod.yml up -d --build frontend
```

Pre-deploy checklist:
- [ ] Tests/smoke from Section 5 pass on staging
- [ ] No hardcoded secrets (`git grep -nE 'sk_live|whsec_|AIza|price_[0-9A-Za-z]{14}'`)
- [ ] DB change reviewed + decision note written, applied on staging first
- [ ] Rollback plan documented (`git revert` SHA + rebuild)

Health check endpoint: `GET /api/` → `{"message": "LaunchBusiness AI API"}`. The deploy
scripts and `infra/health_check.sh` grep for this exact string — if you change the payload,
update them (and `tests/test_syntax.py` guards it).

Do not install Playwright/Chromium on the Contabo VPS — keep the server clean; this is a production node, not a dev machine.

---

## 7 — AI agent safety limits

STOP and ask before:
- Any command containing: `rm -rf`, `drop`, `delete_many`/`update_many` (untargeted),
  `TRUNCATE`, `--force`, `git push --force`
- Any deploy to production (and remember: pushing to `main` IS a prod deploy here)
- Any change to auth, admin gating, or Stripe webhook logic
- Any operation on the critical collections in Section 4
- Installing a new dependency (verify it exists on PyPI/npm first; pin the version)
- Editing `nginx/nginx.prod.conf` (it still hardcodes the old `swiftpackai.tech` domain
  and SSL cert paths — changing it wrong takes the site down)

Maximum autonomous command chain: 3 commands, then check in.

---

## 8 — Institutional knowledge protocol

After every non-obvious decision, write inline:
```
# DECISION: why X instead of Y
# EDGE CASE: breaks if Z — handle with ...
# KNOWN LIMIT: ...
```
Architecture decisions → `docs/decisions/YYYY-MM-DD-<topic>.md`.
Keep `docs/PROJECT_SUMMARY.md` as the single source of truth for components/env vars —
update it instead of duplicating lists into other files (it has drifted before).

---

## 9 — Project-specific hard rules

- **The Magic Button pipeline is the core product — never break it.** Order:
  `scrape_url` → `generate_script` (PAS/Step-by-Step/Before-After, parallel, format-
  targeted) → `create_complete_video` (×formats, parallel) → `create_poster`. See
  docs/PROJECT_SUMMARY.md "Magic Button Pipeline".
- **Never block the FastAPI event loop.** All heavy work (FFmpeg, Pillow, TTS) runs in
  `asyncio.run_in_executor`. Video generation is async, never synchronous.
- Save generated files to `backend/outputs/`; clean temp dirs with `shutil.rmtree` after
  generation completes.
- Strip shell-unsafe chars from caption text before FFmpeg (backticks, `$`, `[]`, `*`,
  `#`, quotes).
- Logo must render on Hero + CTA slides and on posters when a brand profile is active
  (Brand Profile feature). Don't silently drop the logo.
- **Talking head (SadTalker) requires** Stripe Identity verification + DeepFace check +
  "AI GENERATED" label burn-in + timestamped consent in `talking_head_consents`. Never
  launch this path without all four.
- **Tutorial Studio recording runs in the user's Chrome extension** (`extension/`), NOT
  server-side. Do not add server-side screen recording.
- **GTX 1080 Ti is reserved for Mother AI** — never route LaunchBusiness traffic to it;
  taking it down kills a separate production system. GPU video uses Modal A10G only
  (`modal_video.py` app `launchbusiness-wan-video`; `modal_sadtalker.py`).
- Reference Wan 2.2 TI2V-5B, never LTX-Video (replaced). App name is
  `launchbusiness-wan-video`, never `swiftpack-ltx-video`.
- DuckDuckGo legal-context search can be rate-limited under load — add backoff, don't
  hammer it.
- The backend is now multi-module: `server.py` (~4,496 lines), plus `legal_router.py`,
  `jarvis_router.py`, `brand_router.py`, `admin_router.py`, `modal_video.py`,
  `modal_sadtalker.py`. Use GitNexus to navigate rather than scrolling server.py.

---

## 10 — Definition of done

A task is complete only when:
- [ ] Code written and working
- [ ] `ast.parse` passes on changed Python; `yarn build` passes if frontend changed
- [ ] Smoke test pasted — at minimum:
  ```bash
  curl http://localhost:8001/api/          # → {"message":"LaunchBusiness AI API"}
  curl -X POST http://localhost:8001/api/magic-button \
    -H "Content-Type: application/json" -d '{"url":"https://example.com"}'
  ```
- [ ] No hardcoded secrets (grep from Section 6)
- [ ] Auth-affected paths explicitly checked (uses `jhp_token`, admin gate intact)
- [ ] No destructive DB op ran without confirmation + backup
- [ ] Decision note written for non-obvious choices
- [ ] `gitnexus_detect_changes()` confirms scope; index re-analyzed after commit

---

> GitNexus code-intelligence rules (impact analysis, safe rename, detect_changes, index
> freshness) live in `AGENTS.md` under the managed `gitnexus` block — they apply to every
> session and are not duplicated here.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **jobhuntpro_marketing** (1763 symbols, 5228 relationships, 94 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
