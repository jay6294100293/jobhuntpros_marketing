# SwiftPack AI — Project Summary
# Last updated: April 2026

---

## What It Is

SwiftPack AI turns any product URL into a complete marketing launch pack in 90 seconds.

**Input:** Website URL + Product Name + Target Audience
**Output:** 2 videos + 2 scripts + 2 posters — ready to post

**Live at:** https://swiftpackai.tech
**Company:** NovaJay Tech (novajaytech.com)
**Repo:** https://github.com/jay6294100293/jobhuntpros_marketing

---

## Current State (April 2026)

**Working in production (Priorities 1–7 complete):**
- Magic Button full pipeline (scrape → scripts → videos → posters)
- JWT authentication + beta agreement gate
- Invite-only registration (admin creates users via API)
- **Edge TTS** — Microsoft AndrewNeural voice (Priority 1, replaces gTTS)
- **Pillow slide design system** — 6 structured marketing templates (Priority 2):
  - Hero, Problem, Solution, Features (checkmarks), How It Works, CTA
  - Brand color gradients, typography hierarchy, decorative shapes
- **Crossfade transitions** — FFmpeg xfade filter between slides, 0.5s fade (Priority 3)
- **Watermark** — diagonal "SwiftPack AI" stamps burned into slide content area, 30% opacity, RGBA compositing (Priority 4)
- **Stripe subscription tiers** — Free/Starter/Pro/Agency with usage enforcement (Priority 5):
  - Free: 3 lifetime videos, watermarked, 9:16 only
  - Starter $19/mo: 15 videos, no watermark, all formats
  - Pro $49/mo: 50 videos, talking head, priority queue
  - Agency $149/mo: 200 videos, team seats, white label
- **Modal + LTX-Video** — serverless A100 GPU for Pro/Agency tier (Priority 6):
  - `backend/modal_video.py` deploys `swiftpack-ltx-video` app
  - Free tier falls back to FFmpeg slideshow automatically
- **SadTalker talking head** — portrait photo → lip-synced video (Priority 7):
  - `backend/modal_sadtalker.py` deploys `swiftpack-sadtalker` on A10G GPU
  - 5-layer protection: tier gate, Stripe Identity, DeepFace, consent, "AI GENERATED" label
  - All endpoints live: `/api/talking-head/consent`, `/api/talking-head/verify-identity`, `/api/talking-head/generate`
- Docker Compose deployment on EC2 (swiftpackai.tech)
- SSL via Let's Encrypt + Nginx reverse proxy
- Rate limiting (in-process per-route limits)

**Pending activation (code ready, needs env vars):**
- Modal GPU (needs `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET` in secrets file)
- Stripe billing (needs `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs)
- SadTalker (needs Modal deployed: `modal deploy backend/modal_sadtalker.py`)

---

## Tech Stack

```
Backend:    FastAPI (Python 3.11) — server.py is entire backend
Frontend:   React 19 + Tailwind CSS 3.4 + React Router DOM 7.5.1
Database:   MongoDB (Motor async driver) — resilient, works without it
AI/LLM:     Google Gemini 2.5 Flash (google-genai SDK)
TTS:        Edge TTS — Microsoft AndrewNeural voice (free, no API key)
Video:      FFmpeg + Pillow (CPU) → Modal A100/A10G GPU for Pro tier
Scraping:   BeautifulSoup4 + httpx (verify=False for SSL)
Auth:       JWT (jose) + bcrypt + beta agreement modal
Payments:   Stripe subscriptions + Stripe Identity (code complete, needs activation)
GPU:        Modal.com — LTX-Video (A100-40GB), SadTalker (A10G)
Ports:      Backend 8001, Frontend 3000
Proxy:      Nginx (SSL termination + reverse proxy)
Deploy:     Docker Compose (4 containers: mongo, backend, frontend, nginx)
Server:     AWS EC2 (ubuntu@99.79.39.115)
Repo path:  /home/ubuntu/swiftpack
SSH key:    novajaytechserver_testing-key.pem (in ~/Downloads or E:\secrets\)
```

---

## Magic Button Pipeline

```
POST /api/magic-button
  1. scrape_url()             → brand colors, headline, features, images[]
  2. generate_script(PAS)     → ad script via Gemini
  3. generate_script(Step)    → tutorial script via Gemini
  4. create_complete_video()  → 9:16 ad video
     ├── Free tier:   Pillow 6-slide design system + xfade + Edge TTS + watermark
     └── Pro/Agency:  Modal LTX-Video AI clip → FFmpeg loop + captions (fallback: slideshow)
  5. create_complete_video()  → 16:9 tutorial video (same pipeline)
  6. create_poster()          → 1:1 social poster
  7. create_poster()          → 9:16 social poster
```

---

## Key Files

```
backend/server.py              Main FastAPI backend (entire app — ~2700 lines)
backend/modal_video.py         Modal LTX-Video serverless GPU app (Priority 6)
backend/modal_sadtalker.py     Modal SadTalker talking head GPU app (Priority 7)
backend/requirements.txt       Python dependencies (includes modal>=0.64.0)
backend/.env                   Local env vars (gitignored)
frontend/src/App.js            React routing + auth gate
frontend/src/components/
  Dashboard.js                 Magic Button UI + progress bar
  auth/Login.js                Login page (invite-only message)
  auth/BetaAgreementModal.js   Beta agreement gate
  Layout.js                    Nav wrapper
docker-compose.yml             Production Docker Compose
nginx.prod.conf                Nginx SSL + proxy config
docs/PRODUCT_STRATEGY.md       Business model, pricing, roadmap
docs/PROJECT_SUMMARY.md        This file
```

---

## Environment Variables

```env
# /home/ubuntu/secrets/swiftpack.env (production)
# E:/secrets/swiftpack.env (local Windows dev)

MONGO_URL=mongodb://mongo:27017
DB_NAME=swiftpackai_db
CORS_ORIGINS=https://swiftpackai.tech,https://www.swiftpackai.tech
BACKEND_URL=https://swiftpackai.tech
FRONTEND_URL=https://swiftpackai.tech
GEMINI_API_KEY=...
JWT_SECRET=...
ADMIN_SECRET=...

# Stripe (activate when ready)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_STARTER_PRICE_ID=...
STRIPE_PRO_PRICE_ID=...
STRIPE_AGENCY_PRICE_ID=...

# Modal GPU (activate when ready)
MODAL_TOKEN_ID=...
MODAL_TOKEN_SECRET=...
MODAL_APP_NAME=swiftpack-ltx-video          # default
MODAL_SADTALKER_APP=swiftpack-sadtalker     # default
```

---

## Deploy Commands

```bash
# SSH into server
ssh -i ~/Downloads/novajaytechserver_testing-key.pem ubuntu@99.79.39.115

# Pull + rebuild backend
cd /home/ubuntu/swiftpack
git pull
docker compose build backend
docker compose up -d backend

# After backend container restart, nginx may lose upstream — restart it
docker restart swiftpack-nginx-1

# Pull + rebuild frontend
docker compose build frontend
docker compose up -d frontend

# Check logs
docker logs swiftpack-backend-1 --tail=50
docker logs swiftpack-frontend-1 --tail=20

# Deploy Modal apps (run once, re-run after changes)
modal deploy backend/modal_video.py
modal deploy backend/modal_sadtalker.py
```

---

## Create User (Admin)

```bash
curl -X POST https://swiftpackai.tech/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"TempPass123!","name":"User Name"}'
```

---

## Cost Breakdown

```
Current monthly infra (no GPU active):
  EC2 (t3.micro):  ~$10-20/month
  MongoDB:         $0 (self-hosted in Docker)
  Gemini API:      $0 (within free tier for current volume)
  Edge TTS:        $0 (Microsoft free, no API key)
  Total:           ~$10-20/month

With Modal GPU active (Pro/Agency tier):
  EC2:             ~$20/month
  LTX-Video:       ~$0.44/generation on A100 (pay per second, $0 idle)
  SadTalker:       ~$0.10/generation on A10G
  At 500 pro gens: ~$270 GPU + $20 EC2 = $290/month
  Pro revenue (50 users × $49): $2,450/month → very profitable
```

---

## What's Next (Priority Order)

See `docs/PRODUCT_STRATEGY.md` for full strategy.

1. ~~Edge TTS~~ ✅ Done
2. ~~Pillow slide design system~~ ✅ Done
3. ~~Crossfade transitions~~ ✅ Done
4. ~~Watermark in slide design~~ ✅ Done
5. ~~Stripe subscription enforcement~~ ✅ Done (needs activation)
6. ~~Modal + LTX-Video~~ ✅ Done (needs Modal token)
7. ~~SadTalker talking head~~ ✅ Done (needs Modal deploy)
8. **AppSumo LTD launch** — next priority after activating Stripe + Modal

---

## Known Issues / Decisions

- After backend container restart, nginx loses upstream — always `docker restart swiftpack-nginx-1`
- MongoDB writes silently skipped if unavailable (content still generates)
- httpx uses verify=False for scraping (SSL cert issues on some sites)
- GTX 1080 Ti is reserved for Mother AI — NEVER route SwiftPack traffic to it
- Playwright/Chromium too heavy for EC2 t3.micro — don't install on server
- Modal GPU not active until `MODAL_TOKEN_ID`/`MODAL_TOKEN_SECRET` set in secrets file
- Stripe billing not active until price IDs and keys added to secrets file
