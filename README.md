# LaunchBusiness AI

> **Marketing pack in 90 seconds. Legal documents in minutes. Everything a founder needs to launch.**

Live at **[launchbusinessai.com](https://launchbusinessai.com)** — built by [NovaJay Tech](https://novajaytech.com)

---

## What It Does

LaunchBusiness AI is a two-pillar platform for founders:

### 🚀 Pillar 1 — Marketing Launch Pack
Paste your product URL. Get a complete marketing pack in 90 seconds:
- **Logo** — 6 AI-powered templates + Ideogram AI concepts
- **2 Videos** — Ad (9:16) + Tutorial (16:9) with neural voiceover, animated captions, crossfade transitions
- **2 Scripts** — PAS framework + Step-by-Step tutorial via Gemini 2.5 Flash
- **2 Posters** — Brand-matched social graphics (1:1 + 9:16)

### ⚖️ Pillar 2 — Legal Documents
AI-powered legal document generation with 2026 law context:
- **Adaptive intake chat** — Gemini-powered conversation gathers your business profile
- **28 document types** — Privacy Policy, NDA, Employment Contract, Shareholder Agreement, and more
- **Live web search** — fetches latest GDPR, PIPEDA, CCPA requirements before each generation
- **Jurisdiction-aware** — Canada, USA, EU supported
- **Credit-based** — monthly credits per plan + topup via Stripe
- **Regeneration discount** — 10% fewer credits when regenerating (laws change)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI (Python 3.11) — `server.py` + `legal_router.py` + `jarvis_router.py` |
| **Frontend** | React 19, Tailwind CSS 3.4, Shadcn/UI, Framer Motion |
| **Database** | MongoDB (Motor async driver) |
| **AI / LLM** | Google Gemini 2.5 Flash (`google-genai` SDK) |
| **TTS** | Microsoft Edge TTS — AndrewNeural (free, no API key) |
| **Video** | FFmpeg + Pillow (CPU) → Modal A100 GPU for Pro tier |
| **GPU** | Modal.com — LTX-Video (A100-40GB), SadTalker (A10G) |
| **Payments** | Stripe — subscriptions + one-time credit topups |
| **Legal Search** | DuckDuckGo HTML (no API key, fetches latest law context) |
| **Proxy** | Nginx (SSL + reverse proxy) |
| **Deploy** | Docker Compose (4 containers: mongo, backend, frontend, nginx) |

---

## Features

### Marketing
- **URL Intelligence** — auto-extracts brand colors, headlines, features from any site
- **Logo Creator** — 6 Pillow templates + Ideogram AI concepts; 1024×1024 PNG output
- **Video Pipeline** — 6-slide design system, xfade transitions, Edge TTS, music bed, captions
- **AI Videos (Pro)** — LTX-Video on Modal A100 serverless GPU
- **Talking Head (Pro)** — SadTalker lip-sync; Stripe Identity verification + DeepFace gate
- **Script Generator** — PAS, Step-by-Step, Before/After frameworks
- **Poster Generator** — brand-matched social graphics

### Legal Documents
- **28 document types** across 5 categories:
  - *Privacy & Compliance*: Privacy Policy (GDPR/PIPEDA/CCPA), DPA, Cookie Policy, ROPA, Breach Plan, PIA
  - *Business Agreements*: NDA, Terms of Service, Service Agreement, Contractor Agreement, IP Assignment
  - *Corporate & Equity*: Founder Agreement, Shareholder Agreement, Vesting Schedule, Operating Agreement
  - *Finance & Operations*: Invoice Template, SOW, Business Plan, Equity Agreement
  - *HR & Employment*: Employment Contract, Offer Letter, Employee Handbook
- **Intake chat** — Gemini conversation, detects completion, saves structured business profile
- **Credit system** — monthly allowance (plan-based) + permanent topup wallet
- **Profile limits** — Starter: 1 profile · Pro: 3 profiles · Agency: unlimited
- **Document vault** — history, copy, download, 90-day laws-changed nudge

---

## Project Structure

```
jobhuntpro_marketing/
├── backend/
│   ├── server.py              # FastAPI backend (~2900 lines) — all core routes
│   ├── legal_router.py        # Legal documents feature — profiles, chat, generate
│   ├── jarvis_router.py       # JARVIS business intelligence endpoint
│   ├── modal_video.py         # Modal LTX-Video serverless GPU app
│   ├── modal_sadtalker.py     # Modal SadTalker talking head GPU app
│   ├── requirements.txt       # Python dependencies
│   ├── outputs/               # Generated videos & posters
│   └── assets/music_beds/     # Drop .mp3 files here to activate music bed
│
├── frontend/src/
│   ├── App.js                 # React routing + auth gate
│   └── components/
│       ├── Landing.js             # Marketing landing page
│       ├── Dashboard.js           # Magic Button UI
│       ├── LegalDocs.js           # Legal documents main page
│       ├── legal/
│       │   ├── ProfileManager.js  # Business profile CRUD
│       │   ├── ChatIntake.js      # AI intake chat UI
│       │   ├── DocumentCatalog.js # Document picker with credits
│       │   ├── DocumentVault.js   # Generated doc viewer
│       │   └── TopupModal.js      # Stripe credit topup
│       ├── LogoCreator.js         # Logo generator UI
│       ├── ScriptGenerator.js     # Script creation
│       ├── CreateContent.js       # Video & poster creator
│       ├── Gallery.js             # Content gallery
│       └── Layout.js              # Nav wrapper
│
├── docs/
│   ├── PROJECT_SUMMARY.md     # Full project state + deploy reference
│   ├── PRODUCT_STRATEGY.md    # Business model + roadmap
│   └── VIDEO_FEATURES.md      # Video pipeline documentation
│
├── docker-compose.yml         # Production Docker Compose
└── README.md                  # This file
```

---

## Quick Start

### Prerequisites
- Python 3.11+, Node.js 18+, MongoDB 6+, FFmpeg

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

`backend/.env`:
```env
MONGODB_URL=mongodb://localhost:27017
DB_NAME=launchbusinessai_db
CORS_ORIGINS=http://localhost:3000
GEMINI_API_KEY=your-gemini-key
JWT_SECRET=your-secret-min-32-chars
FRONTEND_URL=http://localhost:3000
```

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
yarn install
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
yarn start
```

Open `http://localhost:3000`

---

## API Reference

### Marketing
```
POST /api/magic-launch-pack     URL → 2 videos + 2 scripts + 2 posters (all-in-one)
POST /api/scrape                URL → brand data
POST /api/generate-script       AI script generation
POST /api/create-complete-video Full video with TTS + captions
POST /api/create-poster         Branded social graphic
POST /api/logos/generate        Logo templates + AI concepts
```

### Legal Documents
```
POST   /api/legal/profiles              Create business profile
GET    /api/legal/profiles              List user's profiles
DELETE /api/legal/profiles/{id}         Delete profile
POST   /api/legal/chat/{profile_id}/start  Start intake chat
POST   /api/legal/chat/{profile_id}     Send chat message
GET    /api/legal/catalog               All document types + credit costs
POST   /api/legal/generate              Generate selected documents
GET    /api/legal/history/{profile_id}  Generated document history
GET    /api/legal/document/{id}         Single document content
POST   /api/legal/regenerate/{id}       Regenerate at 10% credit discount
GET    /api/legal/credits               Credit balance
GET    /api/legal/topup/packages        Available topup packages
POST   /api/legal/topup/checkout        Stripe one-time payment session
```

### Auth + Billing
```
POST /api/auth/register         Create account
POST /api/auth/login            Sign in
GET  /api/auth/me               User profile + usage + legal credits
POST /api/billing/checkout/pro  Stripe subscription checkout
POST /api/billing/webhook       Stripe webhook (subscriptions + legal topups)
GET  /api/billing/portal        Stripe billing portal
```

---

## Environment Variables

```env
# Required
MONGODB_URL=mongodb://mongo:27017
DB_NAME=launchbusinessai_db
GEMINI_API_KEY=...
JWT_SECRET=...                          # min 32 chars
FRONTEND_URL=https://launchbusinessai.com
CORS_ORIGINS=https://launchbusinessai.com

# Stripe (subscriptions + legal topups)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_STARTER_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_AGENCY_PRICE_ID=price_xxx

# Modal GPU — Pro/Agency video + talking head
MODAL_TOKEN_ID=...
MODAL_TOKEN_SECRET=...

# Optional
BREVO_API_KEY=...                       # transactional email
HELICONE_API_KEY=...                    # AI cost tracking
OPENROUTER_API_KEY=...                  # Gemini fallback
ADMIN_SECRET=...                        # JARVIS intelligence endpoint
```

---

## MongoDB Collections

| Collection | Purpose |
|-----------|---------|
| `users` | Accounts, tiers, legal_credits_topup |
| `usage` | Monthly video/script/poster counters |
| `legal_profiles` | Business profiles for legal docs |
| `legal_chat` | Intake chat history per profile |
| `legal_documents` | Generated legal document content |
| `legal_credits_usage` | Monthly legal credit counters |
| `logos` | Saved logo records |
| `beta_agreements` | Beta agreement acceptance log |
| `payment_transactions` | Stripe session records |

---

## Deployment

Pull-based auto-deploy — push to `main`, server picks it up within 5 minutes.

```bash
# SSH
ssh -i ~/Downloads/novajaytechserver_testing-key.pem root@YOUR_SERVER_IP

# Rebuild + restart
cd /root/swiftpack
git pull
docker compose build backend && docker compose up -d backend
docker restart swiftpack-nginx-1   # always restart nginx after backend

# Logs
docker logs swiftpack-backend-1 --tail=50
```

### Fresh server setup
```bash
git clone https://github.com/jay6294100293/jobhuntpros_marketing.git /root/swiftpack
bash /root/swiftpack/scripts/setup-cron.sh
nano /root/secrets/swiftpack.env
```

---

## Plans & Legal Credits

| Plan | Price | Videos | Legal Credits | Business Profiles |
|------|-------|--------|---------------|-------------------|
| Free | $0 | 3 lifetime | — (catalog visible) | 0 |
| Starter | $19/mo | 15/mo | 20/mo | 1 |
| Pro | $49/mo | 50/mo | 60/mo | 3 |
| Agency | $149/mo | 200/mo | 150/mo | Unlimited |

Credit topups: 15 credits/$5 · 35 credits/$10 · 80 credits/$20

---

## License

MIT — built by NovaJay Tech
