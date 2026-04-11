# CONTENT STUDIO — CREDENTIALS NEEDED
# Fill in tonight and paste into backend/.env

---

## STATUS — What's Already Filled In ✅

```
MONGO_URL           ✅ set (localhost — change for production)
DB_NAME             ✅ set
JWT_SECRET          ✅ set (already generated)
GEMINI_API_KEY      ✅ already set (AIzaSyBlUjFn...)
```

---

## MISSING — Fill These In Tonight

### 1. MongoDB Production URL (CRITICAL — replace localhost)
Create free cluster at: https://cloud.mongodb.com
M0 Free Tier is enough for launch.
Steps:
- Create cluster → Connect → Drivers → copy connection string
- Replace `<password>` with your DB user password
```
MONGO_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
DB_NAME=jobhuntpro
```

### 2. Google Cloud TTS (CRITICAL — AI voiceover in videos)
This is what generates the voice in your videos.
Steps:
1. Go to: https://console.cloud.google.com
2. Create project (or use existing)
3. Enable: Text-to-Speech API
4. Go to: IAM & Admin → Service Accounts → Create Service Account
5. Grant role: Cloud Text-to-Speech → Create key → JSON
6. Download the JSON file → save as `backend/gcloud-tts-key.json`
```
GOOGLE_APPLICATION_CREDENTIALS=/app/backend/gcloud-tts-key.json
```
(the path is already set — just drop the JSON file in the right place)

### 3. OpenRouter API Key (RECOMMENDED — Gemini fallback)
Free tier available at: https://openrouter.ai/keys
Used as fallback if Gemini API is down or rate limited.
```
OPENROUTER_API_KEY=sk-or-v1-_____________________________________
```

### 4. Google OAuth (OPTIONAL — if you add user login)
Currently the app has no login — skip this for now unless you add auth.
```
GOOGLE_CLIENT_ID=________________________________________________
GOOGLE_CLIENT_SECRET=____________________________________________
```

### 5. Stripe (OPTIONAL — if you add paid plans)
Not needed for launch if you keep the app free.
```
STRIPE_SECRET_KEY=sk_live_______________________________________
STRIPE_WEBHOOK_SECRET=whsec____________________________________
STRIPE_PRO_PRICE_ID=price_______________________________________
```

### 6. Brevo Email (OPTIONAL — for notifications)
Not needed for launch. Add later if you want email alerts.
```
BREVO_API_KEY=___________________________________________________
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=JobHuntPro Studio
```

### 7. CORS Origins — Update for Production Domain
```
CORS_ORIGINS=https://yourdomain.com,http://localhost:3000
```

### 8. Backend + Frontend URLs — Update for Production
```
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

---

## MINIMUM TO GO LIVE TONIGHT

You only need these 3 things to deploy:
```
1. MONGO_URL          → MongoDB Atlas free cluster
2. gcloud-tts-key.json → Google Cloud TTS JSON key file
3. CORS_ORIGINS       → your production domain
```

GEMINI_API_KEY is already set. MongoDB localhost works for testing.
The app can go live with just these 3.

---

## AFTER FILLING IN

1. Drop `gcloud-tts-key.json` into `E:\jobhuntpro_marketing\backend\`
2. Update `backend/.env` with MongoDB Atlas URL
3. Run: `docker-compose up -d`
4. Test Magic Button with a real URL
