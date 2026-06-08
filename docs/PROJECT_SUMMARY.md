# LaunchBusiness AI — Project Summary
# Last updated: June 2026

---

## What It Is

LaunchBusiness AI is a two-pillar platform for founders:

**Pillar 1 — Marketing Launch Pack:** Paste a product URL → get logo + 2 videos + 2 scripts + 2 posters in 90 seconds.

**Pillar 2 — Legal Documents:** AI intake chat → select from 28 document types → generate jurisdiction-aware legal drafts grounded in 2026 law.

**Live at:** https://launchbusinessai.com  
**Company:** NovaJay Tech (novajaytech.com)  
**Repo:** https://github.com/jay6294100293/jobhuntpros_marketing  
**Server:** Contabo VPS · root@YOUR_SERVER_IP · /root/swiftpack  

---

## Current State (June 2026)

### ✅ Marketing Features (all complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Magic Button pipeline | ✅ Live | URL → 5 parallel scripts → 4 format videos → 2 posters |
| Logo Creator | ✅ Live | 6 Pillow templates + Ideogram AI concepts |
| Edge TTS voiceover | ✅ Live | Microsoft AndrewNeural, free, no API key needed |
| 6-slide design system | ✅ Live | Hero, Problem, Solution, Features, HowItWorks, CTA |
| Crossfade transitions | ✅ Live | FFmpeg xfade, 0.5s fade |
| Background music bed | ✅ Live | Drop .mp3 into `backend/assets/music_beds/` |
| Watermark | ✅ Live | Diagonal stamps burned into slide content, 30% opacity |
| Stripe subscriptions | ✅ Code done | Needs STRIPE_SECRET_KEY + price IDs in secrets |
| Modal Wan 2.2 Video | ✅ Code done | Wan 2.2 TI2V-5B on A10G — needs `modal deploy backend/modal_video.py` |
| Tutorial Studio | ✅ Code done | Chrome extension + server endpoint + frontend (Starter+) |
| Brand Profiles | ✅ Live | CRUD, logo-on-slides, 4:5 format, ZIP download |
| Format-specific scripts | ✅ Live | Each format gets word-count-targeted Gemini prompt |
| Audio-driven duration | ✅ Live | Video length matches narration via ffprobe |
| URL safety — hostname | ✅ Live | Blocks adult domains + malicious hostnames + bad TLDs |
| URL safety — content | ✅ Live | Post-scrape scan for adult/explicit signals in title+desc |
| URL safety — Safe Browsing | ✅ Code done | Google Safe Browsing API v4 — needs GOOGLE_SAFE_BROWSING_API_KEY |
| SadTalker talking head | ✅ Code done | Needs Modal deploy + Stripe Identity activation |
| Open registration | ✅ Live | Auto-login, password + confirm fields |

### ✅ Legal Documents Feature (June 2026 — new)

| Feature | Status |
|---------|--------|
| 28 document types, 5 categories | ✅ Live |
| Gemini-powered intake chat | ✅ Live |
| Live DuckDuckGo legal context search | ✅ Live |
| GDPR / PIPEDA+Law25 / CCPA jurisdiction support | ✅ Live |
| Credit system (monthly + topup) | ✅ Live |
| Business profile management (plan-limited) | ✅ Live |
| Regeneration at 10% discount | ✅ Live |
| Stripe one-time topup checkout | ✅ Live |
| Document vault with download/copy | ✅ Live |
| 90-day laws-changed nudge | ✅ Live |

---

## Tech Stack

```
Backend:    FastAPI (Python 3.11) — server.py (~3100 lines) + legal_router.py + jarvis_router.py + brand_router.py
Frontend:   React 19 + Tailwind CSS 3.4 + Shadcn/UI + Framer Motion + React Router DOM 7.5.1
Database:   MongoDB (Motor async driver)
AI/LLM:     Google Gemini 2.5 Flash (google-genai SDK)
TTS:        Edge TTS — Microsoft AndrewNeural (free, no API key)
Video:      FFmpeg + Pillow (CPU) → Modal A100/A10G GPU for Pro tier
Legal ctx:  DuckDuckGo HTML scraping (no API key, latest law context per doc)
Auth:       JWT (jose) + bcrypt + beta agreement modal
Payments:   Stripe — subscriptions + one-time credit topups (legal)
GPU:        Modal.com — Wan 2.2 TI2V-5B (A10G, replaces LTX-Video), SadTalker (A10G)
Ports:      Backend 8001, Frontend 3000
Proxy:      Nginx (SSL + reverse proxy, Let's Encrypt)
Deploy:     Docker Compose (mongo + backend + frontend + nginx)
Server:     Contabo VPS as root, /root/swiftpack
SSH key:    novajaytechserver_testing-key.pem
```

---

## Magic Button Pipeline

```
POST /api/magic-button
  1. scrape_url()             → brand colors, headline, features, images[]
  2. generate_script(PAS)     → ad script (Gemini)
  3. generate_script(Step)    → tutorial script (Gemini)
  2. generate_script() × 5 parallel (PAS@9:16, Step-by-Step@16:9,
     Before/After@9:16, PAS@1:1, PAS@4:5) — format-targeted word counts
  3. create_complete_video() × 4 parallel:
     ├── 9:16  TikTok / Reels / Shorts
     ├── 16:9  YouTube / LinkedIn
     ├── 1:1   Instagram / Twitter
     └── 4:5   Facebook / IG Feed
     Each: Pillow slides + Pexels B-roll + Wan 2.2 AI clip + Edge TTS + music
     Duration: audio-driven via ffprobe (not flat 3s/slide)
  4. create_poster()  → 1:1 social poster
  5. create_poster()  → 9:16 social poster
```

---

## Legal Documents Pipeline

```
POST /api/legal/chat/{profile_id}         ← Gemini intake chat
  - Detects [PROFILE_COMPLETE] → saves intake_data JSON to profile

POST /api/legal/generate
  For each selected doc_id:
  1. DuckDuckGo search: "[doc_name] [jurisdiction] requirements 2026"
  2. Gemini generation: search context + intake_data + doc template
  3. Append legal disclaimer (date + jurisdiction + lawyer review warning)
  4. Store in legal_documents collection
  5. Deduct credits (monthly first, then topup)

POST /api/legal/regenerate/{id}
  - Same as generate, 10% fewer credits than original
```

---

## Key Files

```
backend/server.py              Main FastAPI backend — auth, video, posters, Stripe, Magic Button
backend/legal_router.py        Legal documents — profiles, chat, catalog, generate, topup
backend/jarvis_router.py       JARVIS business intelligence (GET /api/jarvis/pulse)
backend/modal_video.py         Modal Wan 2.2 TI2V-5B serverless GPU app (A10G)
backend/modal_sadtalker.py     Modal SadTalker talking head GPU app
backend/requirements.txt       Python dependencies

frontend/src/App.js            React routing + auth gate
frontend/src/components/
  Landing.js                   Marketing landing page (two pillars: marketing + legal)
  Dashboard.js                 Magic Button UI + progress
  LegalDocs.js                 Legal documents — disclaimer gate + view router
  legal/ProfileManager.js      Business profile CRUD with plan limits
  legal/ChatIntake.js          Gemini intake chat UI with typing indicators
  legal/DocumentCatalog.js     Category grid + checkboxes + sticky credit panel
  legal/DocumentVault.js       Document list + markdown viewer + regen button
  legal/TopupModal.js          Stripe credit topup — 3 packages
  LogoCreator.js               Logo generator UI
  Layout.js                    Nav with Legal + Tutorial + Brands links
  TutorialStudio.js            Tutorial Studio — upload recording, view result
  BrandProfiles.js             Brand profile CRUD + logo picker

extension/
  manifest.json                Chrome Extension Manifest V3
  background.js                Service worker — tab capture stream ID
  popup.html / popup.js        Record/Stop UI + MediaRecorder + upload

docs/PROJECT_SUMMARY.md        This file
docs/PRODUCT_STRATEGY.md       Business model, pricing strategy, roadmap
docs/VIDEO_FEATURES.md         Video pipeline detail
docs/WAN_VIDEO_UPGRADE.md      Wan 2.2 decision doc + code change summary
docs/TUTORIAL_STUDIO.md        Chrome extension spec + server endpoint spec
docs/BRAND_PROFILE_FEATURE.md  Brand Profile feature — all 15 items DONE
```

---

## MongoDB Collections

```
users                  Accounts + tier + legal_credits_topup field
usage                  Monthly video/script/poster counters
legal_profiles         Business profiles (user_id, intake_data, intake_complete)
legal_chat             Chat messages per profile (role: user|assistant)
legal_documents        Generated docs (content, credits_cost, jurisdiction, generated_at)
legal_credits_usage    Monthly legal credit counters (user_id + year_month)
logos                  Saved logo URLs
beta_agreements        Beta acceptance log (user_id + ip + ua + timestamp)
beta_users             Beta waitlist
payment_transactions   Stripe session records (subscriptions + legal topups)
talking_head_consents  Talking head consent records (photo_hash + timestamp)
```

---

## Environment Variables

```env
# /root/secrets/swiftpack.env (production)

MONGODB_URL=mongodb://mongo:27017
DB_NAME=launchbusinessai_db
CORS_ORIGINS=https://launchbusinessai.com
FRONTEND_URL=https://launchbusinessai.com
GEMINI_API_KEY=...
JWT_SECRET=...                          # min 32 chars
ADMIN_SECRET=...                        # JARVIS auth

# Stripe (subscriptions + legal topups)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_AGENCY_PRICE_ID=price_...

# URL safety
GOOGLE_SAFE_BROWSING_API_KEY=...  # console.cloud.google.com → Enable Safe Browsing API

# Pexels B-roll (free at pexels.com/api)
PEXELS_API_KEY=...

# Modal GPU (Starter+/Pro/Agency)
MODAL_TOKEN_ID=...
MODAL_TOKEN_SECRET=...
MODAL_APP_NAME=launchbusiness-wan-video
MODAL_SADTALKER_APP=launchbusiness-sadtalker

# Optional
BREVO_API_KEY=...
HELICONE_API_KEY=...
OPENROUTER_API_KEY=...
ENVIRONMENT=production
```

---

## Plans & Legal Credits

| Plan | Price | Videos/mo | Legal Credits/mo | Max Profiles |
|------|-------|-----------|-----------------|--------------|
| Free | $0 | 3 lifetime | 0 (catalog view only) | 0 |
| Starter | $19/mo | 15 | 20 | 1 |
| Pro | $49/mo | 50 | 60 | 3 |
| Agency | $149/mo | 200 | 150 | Unlimited |

**Topup packages:** 15cr/$5 · 35cr/$10 (best value) · 80cr/$20

**Legal credit costs per document:** 1–5 credits (Privacy Policies, NDAs: 2–4cr · Business Plans, Shareholder Agreements: 4–5cr)

---

## Deploy Commands

```bash
# SSH
ssh -i ~/Downloads/novajaytechserver_testing-key.pem root@YOUR_SERVER_IP

# Rebuild backend (after legal_router.py or server.py changes)
cd /root/swiftpack && git pull
docker compose build backend && docker compose up -d backend
docker restart swiftpack-nginx-1    # ← always restart nginx after backend

# Rebuild frontend (after any .js component changes)
docker compose build frontend && docker compose up -d frontend

# Logs
docker logs swiftpack-backend-1 --tail=50
docker logs swiftpack-frontend-1 --tail=20

# Deploy Modal apps (run once, re-run after changes)
modal deploy backend/modal_video.py
modal deploy backend/modal_sadtalker.py

# Auto-deploy cron (runs on server every 5 min)
tail -f /root/logs/swiftpack-deploy.log
```

---

## Activating Pending Features

| Feature | What to do |
|---------|-----------|
| Stripe billing | Set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + price IDs in secrets |
| Legal topups | Stripe already handles it via existing webhook — just needs STRIPE_SECRET_KEY |
| Modal Wan 2.2 Video | Rewrite `modal_video.py` (see WAN_VIDEO_UPGRADE.md) → `modal deploy backend/modal_video.py` → set `MODAL_APP_NAME=launchbusiness-wan-video` in secrets |
| SadTalker | Set Modal tokens, run `modal deploy backend/modal_sadtalker.py`, activate Stripe Identity |
| Music bed | Drop royalty-free .mp3 into `backend/assets/music_beds/` (Pixabay / ccMixter) |
| Pexels B-roll | Set `PEXELS_API_KEY` in secrets (free key at pexels.com/api) |
| Tutorial Studio | Build extension (`extension/` folder) + server endpoint + frontend component (see TUTORIAL_STUDIO.md) |

---

## Known Issues / Notes

- After backend container restart, nginx loses upstream — always `docker restart swiftpack-nginx-1`
- MongoDB writes silently skipped if unavailable (content still generates)
- httpx uses verify=False for scraping (SSL cert issues on some sites)
- GTX 1080 Ti is reserved for Mother AI — never route SwiftPack traffic to it
- Playwright/Chromium too heavy for Contabo VPS (1GB RAM limit) — do not install
- Legal documents require lawyer review — all docs include prominent disclaimer
- DuckDuckGo search in legal_router may be rate-limited under heavy load (add backoff if needed)

---

## What's Next

1. **Activate Stripe** — set price IDs + keys → billing goes live
2. **Wan 2.2 GPU Video Upgrade** — rewrite `backend/modal_video.py`, deploy to Modal
   - Replaces LTX-Video (A100 $0.44) with Wan 2.2 TI2V-5B (A10G $0.03) — 14× cheaper
   - Takes Hero Pillow slide as input → animates actual branded content
   - Unlocks AI video for ALL paid tiers (not just Pro)
   - Full decision: `docs/WAN_VIDEO_UPGRADE.md` | Est. ~5 hours
3. **Tutorial Studio** — Chrome extension + server endpoint for YouTube tutorial generation
   - Founder records their real product, gets polished tutorial back automatically
   - Full spec: `docs/TUTORIAL_STUDIO.md` | Est. ~10 hours
4. **AppSumo LTD launch** — after Stripe active + Wan 2.2 deployed
5. **More legal jurisdictions** — Australia (Privacy Act), UK (UK GDPR), India (PDPB)
6. **Lawyer marketplace (V2)** — connect users with vetted lawyers for document review
