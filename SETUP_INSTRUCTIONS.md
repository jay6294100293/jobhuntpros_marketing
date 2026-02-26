# 🔑 Setup Instructions for JobHuntPro Content Studio

Your app is configured with **FREE AI features** using Google Gemini and optional Google Cloud TTS!

## ✅ What's Already Done
- ✅ Backend code updated to use Gemini 2.5 Flash (FREE)
- ✅ Google Cloud TTS integration ready (optional)
- ✅ All integrations configured
- ✅ Error handling with helpful messages
- ✅ Usage tracking for free tier monitoring
- ✅ System restarted and ready

---

## 🎯 STEP 1: Add FREE Gemini API Key (REQUIRED - 2 minutes)

### Get Your FREE Gemini API Key
1. Go to: **https://aistudio.google.com/apikey**
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API key"**
4. Copy the API key (looks like: `AIzaSy...`)

### Add the Key to Your App
1. Open the file: `/app/backend/.env`
2. Find this line:
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   ```
3. Replace `your-gemini-api-key-here` with your actual key:
   ```
   GEMINI_API_KEY=AIzaSyYourActualKeyHere
   ```
4. Save the file

### Restart the Backend
```bash
sudo supervisorctl restart backend
```

---

## 🎤 STEP 2: Add Google Cloud TTS (OPTIONAL - 5 minutes)

**Benefits:**
- ✅ Professional AI voiceovers for videos
- ✅ 4 million characters/month FREE
- ✅ Your usage (~50 scripts/month) = **100% FREE**

**See detailed instructions in**: `/app/TTS_SETUP.md`

**Quick Summary:**
1. Create Google Cloud project
2. Enable Text-to-Speech API
3. Enable billing (don't worry, free tier is generous!)
4. Create service account
5. Download JSON key file as `gcloud-tts-key.json`
6. Upload to `/app/backend/gcloud-tts-key.json`
7. Restart backend

**Skip TTS?** The app works perfectly without it. You can add it later anytime!

---

## 🎉 What You Get

### With Gemini API Key (Required):
- ✅ **FREE AI script generation** (up to 1,000 requests/day)
- ✅ **Magic Button** - generates complete launch packs
- ✅ **3 Script Frameworks**: PAS, Step-by-Step, Before/After
- ✅ **No monthly costs** for AI features

### With Google Cloud TTS (Optional):
- ✅ **Professional voiceovers** for your videos
- ✅ **Human-like voices** (Neural2 quality)
- ✅ **4M characters/month FREE** (way more than you need)

### Always Available:
- ✅ **URL scraping** - extracts brand colors, features
- ✅ **Asset uploads** - images, videos, documents
- ✅ **Poster generator** - 1:1 and 9:16 formats
- ✅ **Video creator** - multi-format (16:9, 9:16, 1:1)

---

## 💰 Total Monthly Cost

| Feature | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| **Gemini AI Scripts** | 1,000 req/day | 50 scripts/month | **$0** ✅ |
| **Google Cloud TTS** | 4M chars/month | 20K chars/month | **$0** ✅ |
| **URL Scraping** | Unlimited | Unlimited | **$0** ✅ |
| **Poster/Video Gen** | Unlimited | Unlimited | **$0** ✅ |
| **TOTAL** | - | - | **$0/month** 🎉 |

---

## 🆘 Need Help?

### "GEMINI_API_KEY not configured" error?
- Add your Gemini API key to `/app/backend/.env` (see Step 1)
- Restart backend: `sudo supervisorctl restart backend`

### "TTS service not available" error?
- This is normal if you haven't added TTS credentials yet
- TTS is optional - app works without it
- To add TTS: Follow `/app/TTS_SETUP.md`

### Test if Gemini is working:
```bash
curl -X POST "http://localhost:8001/api/generate-script" \
  -H "Content-Type: application/json" \
  -d '{"framework":"PAS","product_name":"TestProduct","target_audience":"developers","key_features":["fast","simple","free"]}'
```

---

## 🔗 Quick Links

- **Gemini API Key**: https://aistudio.google.com/apikey
- **Google Cloud Console**: https://console.cloud.google.com/
- **TTS Setup Guide**: `/app/TTS_SETUP.md`
- **Your App**: https://ugc-creator-13.preview.emergentagent.com/

---

**Current Status**: 
- ⏳ **Gemini**: Waiting for API key in `/app/backend/.env`
- ⏳ **TTS**: Optional - add credentials if you want voiceovers

**Priority**: Add Gemini API key first (Step 1) - TTS is optional!
