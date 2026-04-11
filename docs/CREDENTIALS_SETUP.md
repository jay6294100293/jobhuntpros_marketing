# CONTENT STUDIO — COMPLETE CREDENTIALS SETUP
# Every single credential needed. No skipping. Replace everything with new keys.
# Last updated: 2026-04-06

---

## ACCOUNTS TO CREATE FIRST (before getting any keys)

| What | Account Type | Email to use |
|------|-------------|--------------|
| Gmail for this project | Personal Gmail | swiftpackai.dev@gmail.com |
| All services below | Use that Gmail | swiftpackai.dev@gmail.com |
| Billing card | RBC Business Mastercard | Use for every paid service |

---

## STEP 1 — GENERATE LOCALLY (no accounts needed)

Run in terminal:
```bash
# JWT Secret (already exists but generate fresh)
python -c "import secrets; print(secrets.token_hex(32))"
```

```
JWT_SECRET=
```

---

## STEP 2 — DATABASE (MongoDB Atlas — free)

**Account:** Sign up at https://cloud.mongodb.com
**Email:** contentstudio.dev@gmail.com
**Card:** Not needed (M0 free cluster — 512MB)

Steps:
1. Sign up → Create project → name: "content-studio"
2. Build a database → Free tier (M0) → your region
3. Create database user: username + strong password
4. Network access → Add IP Address → Allow from anywhere (0.0.0.0/0)
5. Connect → Drivers → copy connection string
6. Replace `<password>` with your DB user password

```
MONGO_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
DB_NAME=jobhuntpro
```

---

## STEP 3 — AI SERVICES

### 3a. Google Gemini (Script Generation — Primary)
**Account:** Sign up at https://aistudio.google.com
**Email:** contentstudio.dev@gmail.com
**Card:** Not needed (free: 1,000 req/day on Flash)

Steps:
1. Go to: https://aistudio.google.com/apikey
2. Sign in with contentstudio.dev@gmail.com
3. Click "Create API Key"
4. Copy key

```
GEMINI_API_KEY=
```

### 3b. OpenRouter (Gemini Fallback)
**Account:** Sign up at https://openrouter.ai
**Email:** contentstudio.dev@gmail.com
**Card:** RBC Business Mastercard (add ~$5 credit)

Steps:
1. Sign up → Keys → Create key
2. Add credit via RBC Business card
3. Copy key

```
OPENROUTER_API_KEY=
```

---

## STEP 4 — GOOGLE CLOUD TTS (AI Voiceover — CRITICAL)

This generates the voice in your videos. Without it videos have no voiceover.

**Account:** Google Cloud Console
**Email:** contentstudio.dev@gmail.com
**Card:** RBC Business Mastercard (free: 4M chars/month — card needed for billing setup only)

Steps:
1. Go to: https://console.cloud.google.com
2. Sign in with contentstudio.dev@gmail.com
3. Create new project → name: "Content Studio TTS"
4. APIs & Services → Library → search "Text-to-Speech" → Enable
5. APIs & Services → Credentials → Create Credentials → Service Account:
   - Name: content-studio-tts
   - Role: Cloud Text-to-Speech User
6. Click the service account → Keys tab → Add Key → JSON
7. Download the JSON file
8. Save it as: `E:\jobhuntpro_marketing\backend\gcloud-tts-key.json`
9. Add billing account (requires RBC Business card — but free tier covers 4M chars/month)

```
GOOGLE_APPLICATION_CREDENTIALS=/app/backend/gcloud-tts-key.json
```
(path is already correct in .env — just drop the JSON file in the right place)

**File to save:**
```
E:\jobhuntpro_marketing\backend\gcloud-tts-key.json   ← drop the downloaded JSON here
```

---

## STEP 5 — GOOGLE OAUTH (User Login — optional for now)

Only needed if you add user accounts to the app.
Skip for initial launch — the app works without login.

**Account:** Google Cloud Console (same project as TTS above)
**Email:** contentstudio.dev@gmail.com
**Card:** Not needed

Steps (when ready):
1. Same GCP project → APIs & Services → OAuth consent screen
2. Credentials → OAuth 2.0 Client ID → Web application
3. Add redirect URIs for your domain

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## STEP 6 — STRIPE (Paid Plans — optional for now)

Only needed if you add paid plans. Skip for free launch.

**Account:** Sign up at https://dashboard.stripe.com
**Email:** Use your Google Workspace business email
**Card:** RBC Business Mastercard

Steps (when ready):
1. Create account → complete verification
2. Create product "Content Studio Pro"
3. Add monthly price
4. Developers → API Keys → copy live keys
5. Set up webhook endpoint

```
STRIPE_SECRET_KEY=sk_live_
STRIPE_WEBHOOK_SECRET=whsec_
STRIPE_PRO_PRICE_ID=price_
```

---

## STEP 7 — EMAIL (Brevo — optional for now)

Only needed for sending email notifications. Skip for initial launch.

**Account:** Sign up at https://app.brevo.com
**Email:** contentstudio.dev@gmail.com
**Card:** Not needed (300 emails/day free)

```
BREVO_API_KEY=
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=JobHuntPro Studio
```

---

## STEP 8 — DEPLOYMENT DOMAIN + SERVER

**Option A — VPS (recommended for video processing)**
**Account:** Sign up at https://www.hetzner.com
**Email:** contentstudio.dev@gmail.com
**Card:** RBC Business Mastercard (~€6-10/month)

Steps:
1. Create account → New Server
2. Select: CX22 (2 vCPU, 4GB RAM) minimum, CX32 (4 vCPU, 8GB) recommended for video
3. OS: Ubuntu 22.04
4. Add your SSH public key
5. Note the server IPv4 address

```
SERVER_IP=
CORS_ORIGINS=https://yourdomain.com,http://localhost:3000
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

**Option B — Keep local for now**
```
CORS_ORIGINS=http://localhost:3000
BACKEND_URL=http://localhost:8001
FRONTEND_URL=http://localhost:3000
```

---

## COMPLETE backend/.env FILE TEMPLATE

Copy this into `E:\jobhuntpro_marketing\backend\.env` and fill in all values:

```env
# DATABASE
MONGO_URL=
DB_NAME=jobhuntpro

# CORS
CORS_ORIGINS=http://localhost:3000

# AI
GEMINI_API_KEY=
OPENROUTER_API_KEY=

# GOOGLE CLOUD TTS
GOOGLE_APPLICATION_CREDENTIALS=/app/backend/gcloud-tts-key.json

# AUTH
JWT_SECRET=

# URLS
BACKEND_URL=http://localhost:8001
FRONTEND_URL=http://localhost:3000

# GOOGLE OAUTH (fill when adding login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# STRIPE (fill when adding paid plans)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=

# EMAIL (fill when adding notifications)
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=JobHuntPro Studio
```

---

## MINIMUM TO GO LIVE (just these 3)

```
1. MONGO_URL           → MongoDB Atlas connection string
2. GEMINI_API_KEY      → Google AI Studio key
3. gcloud-tts-key.json → drop file in backend/ folder
```

Everything else can be added later.

---

## CHECKLIST

- [ ] contentstudio.dev@gmail.com created
- [ ] JWT Secret generated locally
- [ ] MongoDB Atlas M0 cluster created, connection string copied
- [ ] Gemini API key created (aistudio.google.com — contentstudio Gmail)
- [ ] OpenRouter API key created, small credit added via RBC Business card
- [ ] Google Cloud project created (contentstudio Gmail)
- [ ] Text-to-Speech API enabled in GCP
- [ ] Service account created, JSON key downloaded
- [ ] gcloud-tts-key.json saved to backend/ folder
- [ ] backend/.env filled in completely
- [ ] docker-compose up -d tested
- [ ] Magic Button tested with a real URL end-to-end
