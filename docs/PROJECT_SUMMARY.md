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

**Working in production:**
- Magic Button full pipeline (scrape → scripts → videos → posters)
- JWT authentication + beta agreement gate
- Image slideshow videos with Ken Burns zoom/pan (replaced solid color)
- Edge TTS / gTTS voiceover
- Gemini 2.5 Flash script generation
- Pillow poster generation
- Docker Compose deployment on EC2 (swiftpackai.tech)
- SSL via Let's Encrypt
- Login enforcement (all routes protected)
- Invite-only registration (admin creates users via API)

**Known limitations:**
- Voice is gTTS (robotic) — needs Edge TTS upgrade
- Slides are gradient fallback (example.com has no images)
- No subscription billing active yet
- No talking head feature yet

---

## Tech Stack

```
Backend:    FastAPI (Python 3.11) — server.py is entire backend
Frontend:   React 19 + Tailwind CSS 3.4 + React Router DOM 7.5.1
Database:   MongoDB (Motor async driver) — resilient, works without it
AI/LLM:     Google Gemini 2.5 Flash (google-genai SDK)
TTS:        gTTS (current) → Edge TTS (planned upgrade)
Video:      FFmpeg + Pillow (CPU, no GPU)
Scraping:   BeautifulSoup4 + httpx (verify=False for SSL)
Auth:       JWT (jose) + bcrypt + beta agreement modal
Payments:   Stripe (in code, not yet active)
Ports:      Backend 8001, Frontend 3000
Proxy:      Nginx (SSL termination + reverse proxy)
Deploy:     Docker Compose (4 containers: mongo, backend, frontend, nginx)
Server:     AWS EC2 (ubuntu@99.79.39.115)
Repo path:  /home/ubuntu/swiftpack
SSH key:    novajaytechserver_testing-key.pem (in ~/Downloads)
```

---

## Magic Button Pipeline

```
POST /api/magic-button
  1. scrape_url()           → brand colors, headline, features, images[]
  2. generate_script(PAS)   → ad script via Gemini
  3. generate_script(Step)  → tutorial script via Gemini
  4. create_complete_video() → 9:16 ad video
     - Download scraped images OR generate gradient slides (Pillow)
     - Ken Burns zoompan per image
     - Edge TTS / gTTS voiceover
     - Drawtext captions with box background
     - Progress bar (drawbox dynamic width)
     - FFmpeg render
  5. create_complete_video() → 16:9 tutorial video (same pipeline)
  6. create_poster()        → 1:1 social poster
  7. create_poster()        → 9:16 social poster
```

---

## Key Files

```
backend/server.py              Main FastAPI backend (entire app)
backend/requirements.txt       Python dependencies
backend/.env                   Local env vars (gitignored)
frontend/src/App.js            React routing + auth gate
frontend/src/components/
  Dashboard.js                 Magic Button UI + progress bar
  auth/Login.js                Login page (invite-only message)
  auth/BetaAgreementModal.js   Beta agreement gate
  Layout.js                    Nav wrapper
docker-compose.prod.yml        Production Docker Compose
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
DB_NAME=jobhuntpro_db
CORS_ORIGINS=https://swiftpackai.tech,https://www.swiftpackai.tech
GEMINI_API_KEY=...
JWT_SECRET=...
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/tts-key.json
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRO_PRICE_ID=...
```

---

## Deploy Commands

```bash
# SSH into server
ssh -i ~/Downloads/novajaytechserver_testing-key.pem ubuntu@99.79.39.115

# Pull + rebuild backend
cd /home/ubuntu/swiftpack
git pull origin main
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend

# Pull + rebuild frontend
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d frontend

# Check logs
docker logs swiftpack-backend-1 --tail=50
docker logs swiftpack-frontend-1 --tail=20

# Check all containers
docker compose -f docker-compose.prod.yml ps
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
Current monthly infra:
  EC2 (t3.micro):  ~$10-20/month
  MongoDB:         $0 (self-hosted in Docker)
  Gemini API:      $0 (within free tier)
  gTTS:            $0
  Total:           ~$10-20/month

Planned (with Modal GPU for Pro tier):
  EC2:             ~$20/month
  Modal (GPU):     ~$0.65/generation (pay per use, $0 when idle)
  At 500 pro gens/month: ~$325 GPU + $20 EC2 = $345/month
  Pro revenue at 500 gens: ~$490+/month → still profitable
```

---

## What's Next (Priority Order)

See `docs/PRODUCT_STRATEGY.md` for full roadmap. Short version:

1. **Edge TTS** — replace gTTS with neural voice (free, huge quality jump)
2. **Pillow slide design system** — 6 structured templates, real design
3. **Crossfade transitions** — FFmpeg xfade filter
4. **Watermark in slide design** — not corner, burned into content
5. **Stripe subscription enforcement** — free 3-gen limit, paid tiers
6. **Modal + LTX-Video** — real AI backgrounds for Pro tier
7. **SadTalker talking head** — Pro feature, behind ID verification
8. **AppSumo LTD launch** — after quality is solid

---

## Known Issues / Decisions

- MongoDB writes silently skipped if unavailable (content still generates)
- httpx uses verify=False for scraping (SSL cert issues on some sites)
- gTTS is robotic — Edge TTS is the fix
- GTX 1080 Ti is reserved for Mother AI — NEVER route SwiftPack traffic to it
- Playwright/Chromium too heavy for EC2 t3.micro — don't install on server
- No deepfake protection yet — must be added before talking head goes live
