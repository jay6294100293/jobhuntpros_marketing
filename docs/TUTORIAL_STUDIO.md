# LaunchBusiness AI — Tutorial Studio (Chrome Extension)
# Feature decision: June 2026 | Status: ✅ Implemented — extension/ (manifest.json,
# background.js, popup.html, popup.js, icons), POST /api/tutorial/process (server.py), and
# TutorialStudio.js all exist. Verify Chrome Web Store submission / sideload testing.

---

## What Is This In Plain English?

Right now, LaunchBusiness AI generates marketing videos from a website URL. It scrapes the landing page and makes a slideshow-style ad. That works for ads.

But **YouTube tutorials are different.** A YouTube tutorial needs to *show the product actually working* — the real dashboard, the real buttons, the real user flow. You cannot fake that from a landing page scrape.

Tutorial Studio solves this with a **Chrome browser extension**.

The founder installs the extension. When they want to make a tutorial, they:
1. Open their product in Chrome (logged in, real dashboard)
2. Click the LaunchBusiness AI extension icon
3. Click "Start Recording"
4. Demo their product for 30–90 seconds
5. Click "Stop"

The extension uploads the recording to LaunchBusiness AI. Our server automatically turns it into a polished YouTube tutorial video with AI narration, captions, music, and a branded CTA slide.

**Input:** Raw screen recording (founder demos their own product)
**Output:** Professional 16:9 YouTube tutorial MP4, ready to upload

---

## Why We Are Building This

### The Problem It Solves

The existing Magic Button generates videos from scraped data. Those are great for short ads. But they look like what they are — AI-generated slideshows based on a website description. They are NOT actual product demonstrations.

For YouTube, people want to see the product WORKING. "Show me the dashboard. Show me how to actually use it." A slideshow of scraped text cannot do that.

### Why a Browser Extension Is The Right Solution

We evaluated three approaches:

| Approach | Problem | Verdict |
|---|---|---|
| Server-side Playwright automation | Can't log into the product — gets locked out at the login page | ❌ Rejected |
| Founder uploads their own screen recording | Requires OBS or Loom, adds friction, founder has to figure it out | ⚠️ Works but worse UX |
| Chrome extension (our choice) | Already logged in. One click. Auto-uploads. Fully integrated into LaunchBusiness AI | ✅ Best approach |

The extension is the best because:
- It runs on the **founder's computer**, not our server — so it's already logged into the product
- It captures the **real, live dashboard** — not the marketing page
- It's **one click** — no external software needed
- It **auto-uploads** directly to LaunchBusiness AI — founder never leaves the product

### Why NOT Server-Side (Playwright)

Our CLAUDE.md has a hard rule: **NEVER install Playwright on the Contabo VPS**. The server has 1GB RAM. Chromium alone needs 300–400MB to launch. With FFmpeg and the rest of the stack, it would crash the server instantly.

Even if we ran Playwright on Modal (a separate cloud server), we still can't get past login walls. Most SaaS products require authentication to show anything useful. We'd just be recording the marketing homepage — which is useless for a tutorial.

---

## How It Works — Step by Step

```
1. Founder opens product in Chrome tab (logged in — real dashboard visible)
        ↓
2. Founder clicks LaunchBusiness AI extension icon in Chrome toolbar
        ↓
3. Popup appears: "Start Recording" button
        ↓
4. Founder clicks Start — Chrome asks permission to capture tab
        ↓
5. Founder demos product: clicks through features, shows dashboard, walks through workflow
   (30–90 seconds is ideal. Extension shows a live timer.)
        ↓
6. Founder clicks "Stop Recording"
        ↓
7. Extension shows: "Uploading to LaunchBusiness AI..." with progress bar
        ↓
8. Recording uploads to POST /api/tutorial/process
        ↓
9. Server processes (takes ~60 seconds):
   a. FFmpeg extracts 1 screenshot every 4 seconds (max 12 frames)
   b. Each screenshot → Gemini Vision → 1 sentence of narration
      ("Here you can see the dashboard where founders manage their brand profile...")
   c. All sentences joined into a complete tutorial script
   d. Edge TTS generates professional voiceover (AndrewNeural)
   e. FFmpeg assembles: screenshots as slides + Ken Burns zoom + crossfades +
      word-chunk captions + background music + progress bar + CTA slide at end
        ↓
10. Server returns: download URL for polished 16:9 MP4
        ↓
11. Extension popup shows: "✅ Tutorial ready — View in LaunchBusiness AI"
        ↓
12. Founder downloads a professional YouTube tutorial video
```

---

## What the Output Looks Like

| Property | Value |
|---|---|
| Format | 16:9 (1920×1080) — YouTube standard |
| Duration | 4 seconds per captured frame (12 frames max = 48 seconds) |
| Content | Actual product screenshots, not AI-generated slides |
| Narration | Gemini Vision describes each screen → Edge TTS voices it |
| Captions | TikTok-style word-chunk captions (3 words at a time, large font) |
| Music | Background music bed at -18dB under voice (Starter+ only) |
| Transitions | Ken Burns zoom (100→110%) + xfade crossfades between frames |
| End slide | CTA slide (brand color, "Try [Product] free", product URL) |
| Watermark | None (Tutorial Studio is Starter+ only — watermark removed) |

**Example narration Gemini might generate from a frame:**
- Frame 1 (login screen): *"Welcome to FitnessGuru AI — sign in to access your dashboard"*
- Frame 2 (dashboard): *"The main dashboard shows your AI workout plan for today"*
- Frame 3 (workout screen): *"Here you can customize any exercise or swap it for an alternative"*
- Frame 4 (progress chart): *"Your progress tracker updates automatically after every session"*

---

## Files To Build

### Chrome Extension (4 files — new folder `extension/`)

```
jobhuntpro_marketing/
  extension/
    manifest.json     ← Chrome Extension Manifest V3 config
    background.js     ← Service worker: handles tab capture stream ID
    popup.html        ← The popup UI when you click the extension icon
    popup.js          ← Record/stop logic, MediaRecorder, upload to server
```

**How the recording works technically:**
1. `popup.js` sends a message to `background.js`: "get me a stream ID for this tab"
2. `background.js` calls `chrome.tabCapture.getMediaStreamId({targetTabId})` → returns a stream ID
3. `popup.js` calls `navigator.mediaDevices.getUserMedia({video: {mandatory: {chromeMediaSource: 'tab', chromeMediaSourceId: streamId}}})` to get the actual video stream
4. `MediaRecorder` records the stream into chunks (WebM format)
5. On stop, chunks are assembled into a Blob and uploaded as multipart form data to the server

**Permissions required in manifest.json:**
- `tabCapture` — to record any tab
- `activeTab` — to know which tab is active
- `storage` — to remember the user's auth token

### Backend (1 new endpoint in `server.py`)

```
POST /api/tutorial/process
  - Accepts: video file (WebM), format (default "16:9"), product_name, brand_color
  - Auth: Starter+ tier required
  - Returns: { "url": "/api/download/tutorial_xyz.mp4", "job_id": "...", "frames": 8 }
```

**What the endpoint does:**
1. Validates: user is Starter+ (not free)
2. Checks usage limit (counts as 1 video generation)
3. Saves uploaded WebM to temp file
4. Runs FFmpeg: extract 1 frame every 4 seconds, max 12 frames
5. For each frame: sends to Gemini Vision with prompt "describe this product screen in one tutorial sentence"
6. Joins all sentences into narration script
7. Generates Edge TTS audio from script
8. Calls existing `_build_slideshow_ffmpeg()` with: frame images as slides, narration sentences for captions, brand color, 16:9 dimensions
9. Saves result to `backend/outputs/tutorial_{job_id}.mp4`
10. Increments usage counter
11. Cleans up temp files
12. Returns download URL

### Frontend (1 new component)

```
frontend/src/components/TutorialStudio.js
  - Shows: "Download Extension" button (link to extension install)
  - Shows: Upload area for manual recording upload (fallback for non-Chrome users)
  - Shows: Processing status when video is being generated
  - Shows: Download button when video is ready
```

---

## Tier Placement

| Tier | Tutorial Studio | Why |
|---|---|---|
| Free | ❌ Not available | Free tier is for ads (9:16). Tutorial is a power feature. |
| Starter ($19/mo) | ✅ Available | The 16:9 YouTube format is unlocked on Starter. |
| Pro ($49/mo) | ✅ Available | Full access, same as Starter for this feature. |
| Agency ($149/mo) | ✅ Available | Can generate tutorials for multiple clients. |

Tutorial Studio consumes **1 video credit** per tutorial generated (same as Magic Button).

---

## Benefits vs. Current State

### Before Tutorial Studio
- Founders had no way to create tutorial videos inside LaunchBusiness AI
- If they wanted a tutorial, they had to: record screen with OBS → edit in CapCut → manually add captions → export → upload
- Total time: 2–4 hours minimum
- Result: most founders don't bother

### After Tutorial Studio
- Founder opens product, clicks "Record" in our extension
- Does a 60-second demo
- Gets a professional tutorial back in 2 minutes
- No external software. No editing. No manual work.

### Competitive Advantage
No competitor offers this exact combination:
- **Loom** records screen but gives you raw video — no AI narration, no auto-polish
- **Descript** polishes videos but you have to edit everything manually
- **HeyGen** creates presenter videos but can't show your actual product dashboard
- **LaunchBusiness AI** records your real product → returns polished tutorial automatically

This is a genuine gap in the market for founders at our price point.

---

## What This Is NOT

- This is **not** a general-purpose screen recorder (that's Loom/OBS)
- This is **not** an AI that auto-pilots your product (no automation, no button-clicking bots)
- This is **not** available as a server-side feature (the extension MUST run on the founder's machine)
- This is **not** available on free tier (free tier is ads only, 9:16 format)

---

## Build Order

Do these in order — each step depends on the previous one:

| Step | What | File | Time |
|---|---|---|---|
| 1 | Chrome Extension — 4 files | `extension/` | 4h |
| 2 | Server endpoint — tutorial processing | `backend/server.py` | 3h |
| 3 | Frontend component — Studio page | `frontend/src/components/TutorialStudio.js` | 2h |
| 4 | Add /tutorial route to App.js + nav link | `frontend/src/App.js`, `Layout.js` | 30min |

**Total estimated build time: ~10 hours**

Extension is step 1 because the endpoint needs to be tested against a real WebM upload, and the only way to get that WebM is from the extension.

---

## Known Constraints

- **Recording length limit:** Max 12 frames = 48 seconds of recording at 4s/frame. If the founder records 90 seconds, we still cap at 12 frames (every 7.5 seconds). This is intentional — YouTube tutorials under 60 seconds have higher completion rates.
- **WebM format:** Chrome's MediaRecorder outputs WebM by default. FFmpeg handles WebM fine.
- **Extension not on Firefox:** Chrome/Edge only (Manifest V3, tabCapture API). Safari has no tabCapture equivalent.
- **Chrome Web Store approval:** First deployment can take 1–3 days for Chrome Web Store review. For testing, use developer mode (sideload the extension).
- **Auth token storage:** The extension needs to know the user's JWT token to authenticate uploads. It stores this in `chrome.storage.local`. User must be logged into LaunchBusiness AI in a regular tab for the extension to grab the token.
