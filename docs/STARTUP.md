# LAUNCHBUSINESS AI — STARTUP GUIDE
# Product: LaunchBusiness AI | Domain: launchbusinessai.com
# Company: NovaJay Tech (novajaytech.com) | Entity: FM1032559
# Last updated: 2026-06-08

---

## WHAT THIS DOCUMENT IS

Complete guide for new sessions: what each file does, deployment steps, credential
order, legal requirements, and how to get first users.

---

## PART 1 — WHAT LAUNCHBUSINESS AI IS

LaunchBusiness AI is a two-pillar platform for founders:

**Pillar 1 — Marketing Launch Pack**
Paste any product URL. Get a complete marketing pack in 90 seconds:
- 4 videos (9:16 TikTok, 16:9 YouTube, 1:1 Instagram, 4:5 Facebook)
- 3 AI scripts (PAS, Step-by-Step, Before/After)
- 2 branded posters (1:1 and 9:16)
- Logo (6 templates + Ideogram AI concepts)
- GPU AI video for paid tiers: Wan 2.2 TI2V-5B animates your actual Hero slide

**Pillar 2 — Legal Documents**
AI-powered legal document generation:
- 28 document types (Privacy Policy, NDA, Employment Contract, Shareholder Agreement, etc.)
- Adaptive intake chat via Gemini — gathers your business profile
- Jurisdiction-aware (Canada, USA, EU)
- 2026 law context via live DuckDuckGo search
- Credit-based billing via Stripe

Target users: Founders, solo marketers, agencies replacing a $400-$1,900/5-day agency workflow.

---

## PART 2 — DOCUMENTS IN THIS PROJECT

### Documents to read every session

| Document | What it is |
|----------|-----------|
| `docs/PROJECT_SUMMARY.md` | Complete feature list, tech stack, deploy commands |
| `docs/VIDEO_FEATURES.md` | Full video pipeline spec — read before any video work |
| `docs/WAN_VIDEO_UPGRADE.md` | Wan 2.2 decision doc — read before any modal_video.py work |
| `docs/TUTORIAL_STUDIO.md` | Chrome extension + Tutorial Studio spec |
| `CLAUDE.md` | Auto-loaded rules — hard constraints, priority order, NEVER DO list |

### Documents for new Claude Code sessions

| Document | What it is |
|----------|-----------|
| `docs/SESSION_PROMPT.md` | Paste at the start of every Claude Code task |
| `docs/AUDIT_PROMPT.md` | Full codebase audit against master docs |
| `docs/AUDIT_FIX_PROMPT.md` | Fix audit issues by priority tier |

### Business setup documents

| Document | What it is |
|----------|-----------|
| `docs/CREDENTIALS_SETUP.md` | Every credential needed + exact setup steps |
| `docs/BRAND.md` | Brand colors, tone, logo requirements |
| `docs/PRODUCT_STRATEGY.md` | Business model, pricing, roadmap |

### Supporting technical documents

| Document | What it is |
|----------|-----------|
| `README.md` | Public-facing overview |
| `docs/SETUP_INSTRUCTIONS.md` | Step-by-step deployment guide |
| `docs/BRAND_PROFILE_FEATURE.md` | Brand Profile feature — all 15 items DONE |

---

## PART 3 — LEGAL (complete before taking any payments)

### Work Permit
Before accepting payment from any customer, verify your open work permit allows
self-employment income in Canada.

Call IRCC: 1-888-242-2100
Ask: "I have an open work permit. Am I permitted to operate a sole proprietorship
and receive income from software products I have built?"
Record the date, agent name, and their response. Keep this permanently.

### Business Registration
LaunchBusiness AI operates under FM1032559 as a trade name of NovaJay Tech.
No separate registration is needed.

### Privacy Policy and Terms of Service
Already built into the product. Review the /privacy and /terms pages before launch
to make sure all AI providers (Gemini, Edge TTS, Modal) are mentioned.

### GST Registration
Not required until you earn $30,000 CAD in a year.

### Insurance
Your Zensurance E&O and Cyber Liability policy covers all NovaJay Tech products
including LaunchBusiness AI under one policy.

---

## PART 4 — CREDENTIALS (complete in this order)

All steps documented in `docs/CREDENTIALS_SETUP.md`.

### Minimum required to run the full product

1. `MONGODB_URL` — MongoDB Atlas free cluster connection string
2. `GEMINI_API_KEY` — Google AI Studio key (for scripts, poster AI, Tutorial narration)
3. `JWT_SECRET` — any 32+ char random string
4. `GOOGLE_SAFE_BROWSING_API_KEY` — blocks malware/phishing URLs (free, 10k/day)
5. `STRIPE_SECRET_KEY` + webhook secret + 3 price IDs — for subscriptions

### For GPU video (Starter+ tiers)

6. `MODAL_TOKEN_ID` + `MODAL_TOKEN_SECRET` — Modal.com account
7. Deploy: `modal deploy backend/modal_video.py`
8. Add to secrets: `MODAL_APP_NAME=launchbusiness-wan-video`

### Optional (activate features)

9. `PEXELS_API_KEY` — free at pexels.com/api — enables B-roll in video pipeline
10. `BREVO_API_KEY` — transactional email (password reset, etc.)
11. `OPENROUTER_API_KEY` — Gemini fallback during outages

### How to get GOOGLE_SAFE_BROWSING_API_KEY (5 minutes, free)

1. Go to console.cloud.google.com
2. Select or create a project
3. APIs & Services → Library → search "Safe Browsing API" → Enable
4. APIs & Services → Credentials → Create Credentials → API Key
5. Add to `/root/secrets/swiftpack.env`: `GOOGLE_SAFE_BROWSING_API_KEY=your_key`

What it protects against: phishing sites, malware distribution sites, social engineering
pages that have clean-looking domain names but are known to Google's threat database.
Free quota is 10,000 URL checks/day — more than enough for any launch volume.

Edge TTS (AndrewNeural voice) requires **no API key** — it's free and already working.

---

## PART 5 — DEPLOYMENT (step by step)

LaunchBusiness AI uses Docker Compose on a Contabo VPS.

### Step 1 — Server
Contabo VPS (existing server at root@YOUR_SERVER_IP).
SSH key: `novajaytechserver_testing-key.pem` in ~/Downloads.

### Step 2 — Upload code
```bash
git pull   # on the server inside /root/swiftpack
```
Or from local:
```bash
scp -i ~/Downloads/novajaytechserver_testing-key.pem -r . root@YOUR_SERVER_IP:/root/swiftpack
```

### Step 3 — Configure secrets
```bash
nano /root/secrets/swiftpack.env
```
Required vars: MONGODB_URL, GEMINI_API_KEY, JWT_SECRET, STRIPE_SECRET_KEY,
STRIPE_WEBHOOK_SECRET, STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_AGENCY_PRICE_ID,
MODAL_TOKEN_ID, MODAL_TOKEN_SECRET, MODAL_APP_NAME=launchbusiness-wan-video

### Step 4 — Build and start
```bash
cd /root/swiftpack
docker compose build backend && docker compose up -d
docker restart swiftpack-nginx-1
```

### Step 5 — Verify
```bash
curl http://localhost:8001/api/
# Returns: {"message": "LaunchBusiness AI API"}

docker logs swiftpack-backend-1 --tail=50
```

### Step 6 — Deploy Wan 2.2 to Modal (first time only)
```bash
docker exec swiftpack-backend-1 modal deploy /app/backend/modal_video.py
```

### Step 7 — Test end to end
Go to https://launchbusinessai.com
Paste your own URL into the Magic Button.
Expected: 4 videos + 3 scripts + 2 posters generated and downloadable.

---

## PART 6 — FIRST USERS

### Who to target
Founders and solo marketers who create content regularly but have no team.
Message: "What used to cost $400-1,900 and 5-10 days now takes 90 seconds."

### Where to find them

**Reddit:**
- r/SaaS — launch story with before/after example
- r/entrepreneur — how you built it and what it does
- r/startups — same approach

**Indie Hackers (indiehackers.com):**
- Write a launch post explaining the product and the build process

**ProductHunt:**
- Launch after you have 5 real testimonials
- Use LaunchBusiness AI itself to create the launch video

**LinkedIn:**
- Record a 90-second screen recording of the Magic Button working
- Post: "I built a tool that turns any website URL into a complete 4-format
  marketing pack in 90 seconds. Here is what it produced for my own site."

### What to offer first users
First 20 users: One month of Pro tier free in exchange for feedback and a testimonial.

### The meta-marketing opportunity
LaunchBusiness AI markets itself. Use it to create content for all your other products.
Every video you publish for other NovaJay Tech products is a demo of this product.

---

## PART 7 — WEEK BY WEEK PLAN

### This week
- Verify all secrets are set in /root/secrets/swiftpack.env
- Deploy Wan 2.2: `modal deploy backend/modal_video.py`
- Add PEXELS_API_KEY for B-roll (free at pexels.com/api)
- Test Magic Button end to end on live server
- Add Chrome Extension icons (16px, 48px, 128px PNG to extension/icons/)
- Submit Chrome Extension to Chrome Web Store

### Next week
- Post launch announcement on Reddit and LinkedIn
- Use LaunchBusiness AI to create a launch video for itself
- Reach out to 10 potential users personally

### Week 3
- Fix any issues from early user feedback
- AppSumo lifetime deal prep (after first 5 testimonials)
- Apply for AWS Activate startup credits

---

## PART 8 — KEY RULES FOR THIS PROJECT

- Video generation must always run in asyncio.run_in_executor — never block the event loop
- API keys must always be read from environment variables — never hardcode them
- The Magic Button pipeline must never be broken — test it after any change to server.py
- Generated files are saved to `backend/outputs/` — never to arbitrary paths
- Temp dirs must be cleaned up (shutil.rmtree) after video generation completes
- The URL scraper only processes URLs that users provide — never automatic scraping
- NEVER install Playwright/Chromium on VPS — Contabo has 1GB RAM, it will OOM
- NEVER use the GTX 1080 Ti for SwiftPack — it runs Mother AI
- NEVER reference LTX-Video — it is completely replaced by Wan 2.2 TI2V-5B
- NEVER use APP_NAME "swiftpack-ltx-video" — correct name is "launchbusiness-wan-video"
- Tutorial Studio recording runs on the user's Chrome extension, NEVER server-side

---

## REVENUE MILESTONE

Target: First paying user within 2 weeks of launch.
When NovaJay Tech reaches $2,000 CAD MRR across all products, begin incorporation.
