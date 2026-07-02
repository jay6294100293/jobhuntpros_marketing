# ARCHITECTURE — LaunchBusiness AI
# Generated: 2026-06-21. Companion to docs/PROJECT_SUMMARY.md (state) and CLAUDE.md (rules).

---

## 1. System overview

LaunchBusiness AI is a two-pillar B2B SaaS for founders:

- **Pillar 1 — Marketing Launch Pack:** paste a product URL → logo + videos (9:16/16:9/1:1/4:5)
  + scripts (PAS / Step-by-Step / Before-After) + posters, in ~90 seconds ("Magic Button").
- **Pillar 2 — Legal Documents:** Gemini intake chat → 28 jurisdiction-aware document types
  generated with live 2026 law context (DuckDuckGo), credit-metered.

Users: solo founders and small agencies (Agency tier manages multiple brand profiles).
Currently pre-revenue. Live at https://launchbusinessai.com.

---

## 2. Component map

```
                         ┌─────────────────────────────┐
   Browser (React 19 SPA)│  launchbusinessai.com        │
   localStorage: jhp_token│  Pillar 1 UI · Pillar 2 UI  │
                         └──────────────┬──────────────┘
                                        │ HTTPS
                              ┌─────────▼─────────┐
                              │  Nginx (alpine)   │  TLS, /api/ + /admin/ → backend,
                              │  Let's Encrypt    │  / → frontend static
                              └─────────┬─────────┘
                ┌───────────────────────┼───────────────────────┐
        ┌───────▼────────┐      ┌───────▼────────┐      ┌────────▼────────┐
        │ frontend (CRA  │      │ backend         │      │ mongo:7         │
        │ build, nginx)  │      │ FastAPI :8001   │◄────►│ launchbusinessai│
        │ :80            │      │ Uvicorn         │      │ _db (Motor)     │
        └────────────────┘      └───────┬─────────┘      └─────────────────┘
                                        │
   External services (all via env-keyed clients, graceful-degrade if absent):
   ├─ Google Gemini 2.5 Flash (google-genai)  — scripts, logos, legal gen, intake chat
   ├─ Modal.com A10G GPU                       — Wan 2.2 TI2V-5B video, SadTalker talking head
   ├─ Stripe                                   — subscriptions + one-time legal-credit topups
   ├─ Pexels                                   — stock B-roll for videos
   ├─ Google Safe Browsing                     — URL safety pre-scrape
   ├─ Edge TTS (free) → gTTS fallback          — voiceover
   ├─ DuckDuckGo HTML                           — live legal context per document
   ├─ Ideogram                                 — AI logo concepts
   ├─ Brevo                                    — transactional email (reset/welcome)
   ├─ OpenRouter                               — Gemini fallback chain
   └─ Sentry + PostHog + Helicone              — error/product/LLM-cost observability

   Chrome MV3 extension (extension/) runs on the USER's machine — records tabs, uploads
   to POST /api/tutorial/process. Never runs on the server.

Backend modules:
  server.py (4,496 ln) — auth, scrape, scripts, video, posters, Magic Button, Stripe, uploads
  legal_router.py     — legal profiles, intake chat, catalog, generate, regenerate, topup
  admin_router.py     — /api/admin/* operator console (users, revenue, usage, coupons, beta)
  brand_router.py     — brand profile CRUD (shared identity across tools)
  jarvis_router.py    — GET /api/jarvis/pulse business-intelligence (X-Admin-Key)
  modal_video.py      — Modal Wan 2.2 TI2V-5B GPU app (launchbusiness-wan-video)
  modal_sadtalker.py  — Modal SadTalker talking-head GPU app
```

---

## 3. Data flow — the Magic Button (most important action)

```
1. POST /api/magic-button {url}
2. URL safety: hostname blocklist → DNS-resolve host + block private/loopback IPs (SSRF) →
   (Google Safe Browsing if keyed) → fetch
3. scrape_url(): httpx (verify=False) + BeautifulSoup → brand colors, headline,
   features, images[]   [NOT persisted]
4. generate_script() × N in parallel (Gemini): PAS@9:16, Step@16:9, Before/After@9:16,
   PAS@1:1, PAS@4:5 — each word-count-targeted to its format
5. create_complete_video() × formats in parallel, each in run_in_executor:
   Pillow slides (Hero/Problem/Solution/Features/HowItWorks/CTA, brand colors + logo)
   + Pexels B-roll + optional Wan 2.2 AI clip + Edge TTS voiceover + music bed
   + word-chunk captions + xfade transitions; duration audio-driven via ffprobe
6. create_poster() × 2 (Pillow) → 1:1 + 9:16 social graphics
7. PRE-generation input safety scan: `_is_safe_content()` checks scraped content for adult/explicit signals before video generation begins (not a post-output scan)
8. Response: videos + scripts + posters. Files in backend/outputs/, temp dirs rmtree'd.
9. usage collection incremented; enforced against tier limits.
```

---

## 4. Authentication flow

```
Register/Login → server.py issues JWT (jose, HS256, JWT_SECRET) + bcrypt password hash
              → frontend stores token in localStorage key `jhp_token`
Each request  → Authorization: Bearer <jhp_token> → HTTPBearer dependency decodes →
                loads user from `users` collection
Google OAuth  → /api/auth/google/callback (optional, GOOGLE_CLIENT_ID/SECRET)
Admin         → user.is_admin gate on /api/admin/*; ADMIN_EMAILS auto-grants on login;
                X-Admin-Secret only for one-time POST /api/admin/bootstrap
JARVIS        → X-Admin-Key header (ADMIN_SECRET) on /api/jarvis/pulse
Beta gate     → beta agreement modal; acceptance logged to beta_agreements (ip+ua+ts)
Rate limiting → in-process sliding-window middleware; IP read from X-Real-IP (Nginx sets
                this); login/register 5/min, forgot-password/resend-verification 3/min,
                magic-button 5/min. Not shared across workers (single-worker deployment).
```

---

## 5. Environment architecture

| | Local | Staging (new, infra/) | Production |
|---|---|---|---|
| Compose | docker-compose.yml | infra/docker-compose.staging.yml | docker-compose.prod.yml |
| URL | localhost:3000 / :8001 | staging host (TBD) | launchbusinessai.com |
| DB name | launchbusinessai_db | launchbusinessai_staging | launchbusinessai_db |
| Secrets | backend/.env | infra/.env.staging | /root/secrets/swiftpack.env |
| Nginx | none | infra/nginx.staging.conf | nginx/nginx.prod.conf |
| Deploy | manual | manual / webhook | auto on push to main (⚠) |
| Repo path | local | local | /opt/swiftpack (root) |

Secret loading order in `server.py`: `/root/secrets/swiftpack.env` →
`/home/ubuntu/secrets/swiftpack.env` (legacy) → `E:/secrets/swiftpack.env` → `backend/.env`.
In prod, docker-compose `env_file` injects `/root/secrets/swiftpack.env` as container env
directly.

---

## 6. Scaling model

Current baseline: single Contabo VPS (~1GB RAM) running 4 containers; GPU work offloaded
to Modal (pay-per-use A10G), so the VPS never does heavy ML. Mongo is single-node on the
same box.

- **~100 users:** current setup is fine. Bottlenecks: VPS RAM during concurrent FFmpeg
  renders, and Mongo on the same host. Mitigation: cap concurrent video jobs; ensure
  temp-dir cleanup runs.
- **~1,000 users:** move Mongo to a managed instance (Atlas) or a dedicated volume/box;
  add a job queue so video renders don't contend for VPS CPU; rely on Modal autoscale for
  GPU. Add CDN for `backend/outputs/`.
- **~10,000 / AppSumo LTD spike:** front with a real queue + worker pool, separate the
  render workers from the API, object storage (S3-compatible) for outputs, Mongo Atlas
  with backups, and per-tier rate limiting. See infra/autoscale_policy.md.

Scale is currently **unknown** — do not over-build. The next concrete trigger is the
planned AppSumo launch; revisit then.

---

## 7. Known technical debt / fragility

1. **Auto-deploy on push to main** straight to production (no staging gate today). Biggest
   operational risk. (Mitigated by the new staging tier — adopt it.)
2. **`nginx/nginx.prod.conf` already correct** — uses `launchbusinessai.com` domain and
   `/etc/letsencrypt/live/launchbusinessai.com/` cert paths. Confirm the running container
   has this version by redeploying nginx after any config change (RUNBOOK §6).
3. **Thin automated tests.** CI runs `tests/test_syntax.py` (AST syntax gate) and
   `tests/test_billing_idempotency.py` (24 AST-level guards for Stripe webhook idempotency,
   payment ledger, product isolation, subscription sync — import-free, no secrets needed).
   No behavioral coverage of business logic — add tests for critical paths.
4. **DB backup procedure documented** (RUNBOOK §7); cron commands provided 2026-06-27.
   Status: pending VPS execution by Ajay. Until confirmed, treat data as unrecoverable.
5. **Config drift reconciled (2026-06-21):** DB name now `launchbusinessai_db` everywhere;
   secrets path now lists `/root/secrets` first; legacy root `deploy.sh`/`server-setup.sh`
   deleted. Remaining cosmetic drift: repo name `jobhuntpro_marketing` vs product name.
6. **`server.py` is a 4,496-line monolith.** Use GitNexus to navigate; consider extracting
   more routers over time (legal/admin/brand already split out).
7. **Two-era deploy tooling:** `scripts/` (auto-deploy.sh + server-setup.sh + setup-cron.sh)
   is canonical (root, `/opt/swiftpack`). `scripts/deploy.sh` is the manual-deploy fallback.
8. **MongoDB writes silently skipped when DB down** — convenient, but can mask data loss.

---

## 8. Dependency inventory

| Service | Purpose | If it goes down | Fallback |
|---|---|---|---|
| MongoDB | All persistence | Content still generates; nothing saved | Writes silently skipped (by design) |
| Google Gemini | Scripts, logos, legal gen, chat | Core generation fails | OpenRouter → built-in template |
| Modal A10G | GPU video + talking head | No AI clips / talking head | Pillow slides + Pexels only |
| Stripe | Billing + topups | No new subs/topups | App works; billing paused |
| Pexels | Video B-roll | Plainer videos | Pillow design slides only |
| Edge TTS | Voiceover | No Edge voice | gTTS fallback |
| Google Safe Browsing | URL safety | Weaker filtering | hostname + content scan still run |
| DuckDuckGo | Legal context | Less current legal text | Generation proceeds w/o fresh ctx |
| Ideogram | AI logo concepts | No AI concepts | 6 Pillow logo templates |
| Brevo | Email (reset/welcome) | No emails sent | Manual/none |
| Sentry/PostHog/Helicone | Observability | Blind spot only | App unaffected |
| Nginx + Let's Encrypt | TLS + proxy | Site unreachable | None — critical path |
