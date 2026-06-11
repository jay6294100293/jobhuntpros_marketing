# LaunchBusiness AI — Local Setup

LaunchBusiness AI runs as 3 services via Docker Compose: FastAPI backend (`backend/`, port 8001),
React frontend (`frontend/`, port 3000), and MongoDB. See `docs/PROJECT_SUMMARY.md` for full
architecture, production deploy commands, and the complete environment variable reference.

---

## STEP 1: Add your Gemini API key (the only hard requirement)

1. Go to **https://aistudio.google.com/apikey** and sign in with a Google account
2. Click **"Create API key"** and copy it (starts with `AIzaSy...`)
3. Copy `backend/.env.example` to `backend/.env`
4. Set:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualKeyHere
   ```

This is the only key required for the core pipeline (scraping, script generation, Brand Profile,
legal intake chat, Tutorial Studio narration) to work locally. Everything else in
`backend/.env.example` is optional for local dev — the app runs without them, just with reduced
functionality (see below).

**No TTS setup needed** — voiceover uses **Edge TTS** (Microsoft Neural voices), which is free
and requires no API key or credentials file. gTTS is an automatic fallback if Edge TTS fails.
There is no Google Cloud TTS step anymore.

---

## STEP 2: Run it

```bash
docker compose up -d --build
```

- Backend: http://localhost:8001/api/ (health check)
- Frontend: http://localhost:3000

---

## What works without optional keys

| Feature | Without optional keys | With key set |
|---------|----------------------|---------------|
| Script generation, Brand Profile, scraping | ✅ Full (Gemini only) | — |
| Voiceover | ✅ Edge TTS (free, no key) | — |
| Video B-roll | Pillow design slides only | + real stock footage (`PEXELS_API_KEY`) |
| URL safety checks | Hostname/content checks only | + Google Safe Browsing API (`GOOGLE_SAFE_BROWSING_API_KEY`) |
| GPU AI video / talking head | Disabled | Modal Wan 2.2 + SadTalker (`MODAL_TOKEN_ID`/`MODAL_TOKEN_SECRET`) |
| Subscriptions / billing | Disabled | Stripe (`STRIPE_SECRET_KEY` + price IDs) |
| Logo AI concepts | Pillow templates only | + Ideogram AI (`IDEOGRAM_API_KEY`) |
| Password reset / welcome emails | Disabled | Brevo (`BREVO_API_KEY`) |

For the full production environment variable list, Docker rebuild commands, and Modal deploy
steps, see `docs/PROJECT_SUMMARY.md` → "Environment Variables" and "Deploy Commands".

---

## Troubleshooting

**"GEMINI_API_KEY not configured" error**
- Confirm `backend/.env` has `GEMINI_API_KEY` set, then `docker compose up -d --build backend`

**Test the core pipeline end-to-end:**
```bash
curl -X POST http://localhost:8001/api/magic-launch-pack \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```
Should return videos + scripts + posters.
