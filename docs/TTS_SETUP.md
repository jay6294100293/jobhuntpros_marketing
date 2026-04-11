# 🎤 Google Cloud Text-to-Speech Setup Guide

Add professional AI voiceovers to your JobHuntPro Content Studio with Google Cloud TTS!

## 💰 Pricing Summary
- **FREE**: First 4 million characters/month (Standard/WaveNet voices)
- **FREE**: First 1 million characters/month (Neural2 voices - better quality)
- **Your usage**: ~50 scripts/month = ~20,000 characters = **100% FREE** ✅
- **After free tier**: $0.000004 per character ($4 per 1M characters)

## 🚀 Setup Instructions (5 minutes)

### Step 1: Create Google Cloud Project
1. Go to: **https://console.cloud.google.com/**
2. Sign in with your Google account
3. Click **"Select a project"** → **"New Project"**
4. Name it: `jobhuntpro-tts` (or any name)
5. Click **"Create"**

### Step 2: Enable Text-to-Speech API
1. In your new project, go to: **https://console.cloud.google.com/apis/library/texttospeech.googleapis.com**
2. Click **"Enable"** button
3. Wait 10-20 seconds for activation

### Step 3: Enable Billing (Required for API, but FREE tier is generous!)
1. Go to: **https://console.cloud.google.com/billing**
2. Click **"Link a billing account"** or **"Create billing account"**
3. Add payment method (credit card)
   - **Don't worry**: You get $300 free credits for new users
   - **You won't be charged** unless you exceed 4M characters/month (very unlikely!)
4. Link billing account to your project

### Step 4: Create Service Account Credentials
1. Go to: **https://console.cloud.google.com/iam-admin/serviceaccounts**
2. Click **"+ CREATE SERVICE ACCOUNT"**
3. Enter details:
   - **Name**: `tts-service-account`
   - **Description**: `Service account for JobHuntPro TTS`
4. Click **"Create and Continue"**
5. Grant role: Select **"Project" → "Editor"** (or **"Cloud Text-to-Speech User"** for restricted access)
6. Click **"Continue"** → **"Done"**

### Step 5: Download JSON Key File
1. In the service accounts list, click on the account you just created (`tts-service-account`)
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Choose **"JSON"** format
5. Click **"Create"** - a JSON file will download automatically
6. **IMPORTANT**: Save this file securely - it contains your credentials!

### Step 6: Add Credentials to Your App
1. Rename the downloaded file to: `gcloud-tts-key.json`
2. Upload it to: `/app/backend/gcloud-tts-key.json`
   - You can use the file editor or upload via terminal
3. Set permissions (optional but recommended):
   ```bash
   chmod 600 /app/backend/gcloud-tts-key.json
   ```

### Step 7: Restart Backend
```bash
sudo supervisorctl restart backend
```

## ✅ Verify Setup

Test the voiceover endpoint:
```bash
curl -X POST "http://localhost:8001/api/generate-voiceover" \
  -H "Content-Type: application/json" \
  -d '{"text": "Welcome to JobHuntPro Content Studio!", "voice_name": "en-US-Neural2-A", "speaking_rate": 1.0}'
```

If successful, you'll get a response with an audio file URL!

## 📊 Usage Monitoring

The app automatically tracks your TTS usage:
- Each API call logs character count
- Response includes estimated cost
- You'll see: `"estimated_cost": "$0.00 (within free tier)"`

**Free Tier Limits:**
- Standard/WaveNet: 4,000,000 characters/month
- Neural2: 1,000,000 characters/month

**Your estimated usage (50 scripts/month):**
- ~20,000 characters = **0.5% of free tier** ✅

## 🎯 Available Voices

**Standard Voices** (4M free chars/month):
- Cheaper, robotic sound
- Good for testing

**WaveNet Voices** (4M free chars/month):
- Natural-sounding
- Recommended for production

**Neural2 Voices** (1M free chars/month):
- Most natural and human-like
- Best quality
- **Recommended**: `en-US-Neural2-A` (Female), `en-US-Neural2-D` (Male)

**Studio Voices** (1M free chars/month, $160 per 1M after):
- Professional broadcast quality
- Overkill for most use cases

## 🔒 Security Best Practices

1. **Never commit** `gcloud-tts-key.json` to version control
2. Add to `.gitignore`:
   ```
   gcloud-tts-key.json
   *.json
   ```
3. Use service accounts with minimal permissions
4. Rotate keys periodically (every 90 days)

## 💡 Cost Management Tips

1. **Use Standard/WaveNet voices** (4M free) instead of Neural2 (1M free)
2. **Cache generated audio** - don't regenerate for same text
3. **Monitor usage** in Google Cloud Console:
   - https://console.cloud.google.com/billing/reports
4. **Set budget alerts** at $5, $10, $20 thresholds

## 🆘 Troubleshooting

### Error: "TTS service not available"
- Check if `gcloud-tts-key.json` exists at `/app/backend/gcloud-tts-key.json`
- Verify file permissions: `ls -la /app/backend/gcloud-tts-key.json`
- Ensure API is enabled in Google Cloud Console

### Error: "Permission denied"
- Check service account has correct roles
- Verify billing is enabled on the project

### Error: "Quota exceeded"
- You've used more than free tier (very unlikely)
- Check usage: https://console.cloud.google.com/apis/api/texttospeech.googleapis.com/quotas
- Consider upgrading or caching audio files

## 🔗 Useful Links

- **Google Cloud Console**: https://console.cloud.google.com/
- **TTS Pricing**: https://cloud.google.com/text-to-speech/pricing
- **Voice Samples**: https://cloud.google.com/text-to-speech/docs/voices
- **API Documentation**: https://cloud.google.com/text-to-speech/docs
- **Quota Management**: https://console.cloud.google.com/iam-admin/quotas

## 📝 File Locations

- Backend config: `/app/backend/.env`
- Credentials file: `/app/backend/gcloud-tts-key.json` (you need to add this)
- Setup guide: `/app/TTS_SETUP.md` (this file)

---

**Current Status**: ⏳ Waiting for you to add `gcloud-tts-key.json` credentials file

**Next Steps**: Follow Steps 1-7 above to enable TTS voiceovers!
