# LaunchBusiness AI — Credentials & Environment Setup
# Last updated: 2026-06-30

## Required Environment Variables

Create the secrets file at one of these paths (backend auto-loads in order):
- Production: `/root/secrets/swiftpack.env`
- Local dev: `backend/.env`

```env
# ── Required ─────────────────────────────────────────────────────────────
MONGODB_URL=mongodb://mongo:27017          # local: mongodb://localhost:27017
DB_NAME=launchbusinessai_db
JWT_SECRET=your-secret-min-32-chars-here  # use: openssl rand -hex 32
GEMINI_API_KEY=your-gemini-api-key        # console.cloud.google.com
FRONTEND_URL=https://launchbusinessai.com # local: http://localhost:3000
CORS_ORIGINS=https://launchbusinessai.com # local: http://localhost:3000
ADMIN_SECRET=your-admin-secret            # for JARVIS /api/jarvis/pulse

# ── Stripe (subscriptions + legal credit topups) ─────────────────────────
STRIPE_SECRET_KEY=sk_live_...             # or sk_test_... for sandbox
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_AGENCY_PRICE_ID=price_...

# ── Modal GPU (Wan 2.2 AI video — Starter+) ──────────────────────────────
MODAL_TOKEN_ID=...
MODAL_TOKEN_SECRET=...
MODAL_APP_NAME=launchbusiness-wan-video

# ── Optional ──────────────────────────────────────────────────────────────
BREVO_API_KEY=...              # transactional email (password reset, welcome)
BREVO_SENDER_EMAIL=noreply@launchbusinessai.com
BREVO_SENDER_NAME=LaunchBusiness AI
HELICONE_API_KEY=...           # Gemini cost/latency tracking
OPENROUTER_API_KEY=...         # Gemini fallback
GOOGLE_CLIENT_ID=...           # Google OAuth login
GOOGLE_CLIENT_SECRET=...       # Google OAuth login
PEXELS_API_KEY=...             # B-roll stock video (free: pexels.com/api)
GOOGLE_SAFE_BROWSING_API_KEY=... # URL safety (free: console.cloud.google.com)
SENTRY_DSN=...                 # Error monitoring
TELEGRAM_BOT_TOKEN=...         # CI/CD deploy notifications
TELEGRAM_CHAT_ID=...
ENVIRONMENT=production
```

## Setup Steps

### 1. Get Gemini API Key
- Go to https://aistudio.google.com/app/apikey
- Create API key → copy to GEMINI_API_KEY

### 2. Set up Stripe
- Create products at https://dashboard.stripe.com/products
- Create 3 price IDs (Starter $19, Pro $49, Agency $149/mo)
- Set webhook endpoint: `https://launchbusinessai.com/api/billing/webhook`
- Events: `customer.subscription.*`, `invoice.payment_*`

### 3. Set up Modal (for AI video)
```bash
pip install modal
modal token new
modal deploy backend/modal_video.py
# Then set MODAL_TOKEN_ID + MODAL_TOKEN_SECRET + MODAL_APP_NAME in secrets
```

### 4. TTS
No setup needed. Edge TTS (Microsoft AndrewNeural) works out of the box — free, no API key.

### 5. Google OAuth (optional)
- https://console.cloud.google.com → Create OAuth 2.0 credentials
- Authorized redirect URI: `https://launchbusinessai.com/api/auth/google/callback`
- Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in secrets

### 6. Pexels B-roll (optional)
- Free API key at https://www.pexels.com/api/
- Set PEXELS_API_KEY in secrets
