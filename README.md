# SwiftPack AI

> Transform any website URL into a complete marketing launch pack in 30 seconds — videos, scripts, and posters, all AI-powered and completely free to run.

---

## What It Does

Paste a URL. Click one button. Get:
- **2 Videos** — Ad (9:16 vertical) + Tutorial (16:9 landscape), with AI voiceover, animated captions, and dynamic zoom effects
- **2 Scripts** — PAS framework ad copy + Step-by-Step tutorial script
- **2 Posters** — Branded social graphics (1:1 square + 9:16 vertical)

Built for non-technical founders who need professional marketing content without hiring designers, copywriters, or video editors.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI 0.110.1, Python 3.11, Uvicorn |
| **Frontend** | React 19, Tailwind CSS 3.4, Shadcn/UI |
| **Database** | MongoDB (Motor async driver) |
| **AI / LLM** | Google Gemini 2.5 Flash |
| **TTS** | Google Cloud Text-to-Speech (Neural2) |
| **Video** | MoviePy 2.2.1, FFmpeg, Pillow |
| **Scraping** | BeautifulSoup4, Requests |
| **Infrastructure** | Docker, Supervisor, Nginx |

---

## Features

- **URL Intelligence** — Auto-extracts brand colors, headlines, and features from any website
- **AI Script Generation** — 3 frameworks: PAS (Problem-Agitate-Solution), Step-by-Step, Before/After
- **Video Automation** — Zoom/pan effects, UGC-style captions, progress bars, multi-format export
- **Poster Generation** — Branded graphics with custom colors and typography
- **Asset Manager** — Upload and reuse images, videos, and documents
- **Dark Theme UI** — Cybernetic studio design with Indigo/Violet gradients

---

## Project Structure

```
jobhuntpro_marketing/
├── backend/
│   ├── server.py              # FastAPI application (all API routes)
│   ├── requirements.txt       # Python dependencies
│   ├── uploads/               # User-uploaded assets
│   └── outputs/               # Generated videos & posters
│
├── frontend/
│   └── src/
│       ├── App.js             # Main React app + routing
│       └── components/
│           ├── Dashboard.js       # Home screen with Magic Button
│           ├── ScriptGenerator.js # AI script creation
│           ├── CreateContent.js   # Video & poster creator
│           ├── AssetUpload.js     # File upload manager
│           ├── Gallery.js         # Content gallery & downloads
│           └── Layout.js          # Navigation wrapper
│
├── PROJECT_SUMMARY.md         # Detailed project overview
├── SETUP_INSTRUCTIONS.md      # Full setup guide
├── TTS_SETUP.md               # Google Cloud TTS setup
└── VIDEO_FEATURES.md          # Video automation documentation
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB 5.0+
- FFmpeg

### 1. Clone & Configure Backend

```bash
git clone https://github.com/jay6294100293/jobhuntpros_marketing.git
cd jobhuntpros_marketing/backend

python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=jobhuntpro_db
CORS_ORIGINS=http://localhost:3000
GEMINI_API_KEY=your-gemini-api-key-here
GOOGLE_APPLICATION_CREDENTIALS=/path/to/gcloud-tts-key.json
```

Start backend:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Configure Frontend

```bash
cd ../frontend
yarn install
```

Create `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

Start frontend:
```bash
yarn start
```

### 3. Open App

Navigate to `http://localhost:3000` — paste any URL and hit the Magic Button.

---

## API Keys

| Key | Required | Free Tier | Get It |
|-----|----------|-----------|--------|
| Google Gemini API | Yes | 1,000 req/day | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Google Cloud TTS | Optional | 4M chars/month | [console.cloud.google.com](https://console.cloud.google.com) |

---

## Cost

**Zero for typical usage.** Both AI services have generous free tiers:

- 50 videos/month = **$0.00** (within all free tiers)
- After free tier: ~$0.002 per video

Production hosting (AWS/GCP/DigitalOcean): $20–55/month depending on provider.

---

## Local Development

**Secrets** live outside the repo in `E:\secrets\swiftpack.env` (Windows) — copy `.env.example` to that path and fill in real values.

The `docker-compose.yml` reads secrets from whatever path `ENV_FILE` is set to, defaulting to `./backend/.env` for simple local runs:

```bash
# Option A — use default fallback (backend/.env)
docker-compose up -d

# Option B — point at the external secrets file explicitly
ENV_FILE=E:/secrets/swiftpack.env docker-compose up -d

# Option C — run backend directly (no Docker)
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

---

## Deployment

### GitHub Secrets required

Before the CI/CD pipeline can deploy, add these secrets under  
**GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `SSH_PRIVATE_KEY` | Private SSH key (whose public key is in `~/.ssh/authorized_keys` on the server) |
| `SERVER_HOST` | EC2 public IP address (e.g. `54.123.45.67`) |
| `SERVER_USER` | `ubuntu` |

### Fresh server setup

Run once on a new EC2 instance:

```bash
# Copy the script to the server then run it
scp scripts/server-setup.sh ubuntu@YOUR_SERVER_IP:~/
ssh ubuntu@YOUR_SERVER_IP "bash ~/server-setup.sh"
```

What it does: installs Docker + Docker Compose + git, creates `/home/ubuntu/secrets/` (mode 700), clones the repo into `/home/ubuntu/swiftpack/`, configures the firewall (80/443/SSH), installs Certbot.

### Add secrets to the server manually

```bash
ssh ubuntu@YOUR_SERVER_IP
nano /home/ubuntu/secrets/swiftpack.env   # fill in all REPLACE_WITH_... values
```

### SSL certificate

```bash
ssh ubuntu@YOUR_SERVER_IP
sudo certbot certonly --standalone -d swiftpackai.tech -d www.swiftpackai.tech
```

### What happens on every push to main

1. GitHub Actions runs `pytest` against `backend/requirements.txt` (skips gracefully if no test files exist)
2. If tests pass, it SSHes into the server and runs:
   ```bash
   git pull origin main
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d --build
   docker system prune -f
   ```
3. Logs `SwiftPack AI deployed successfully`

### Manual deploy (emergency)

```bash
bash scripts/deploy.sh ubuntu@YOUR_SERVER_IP
```

---

## API Reference

```bash
# Health check
GET /api/

# Scrape website
POST /api/scrape
Body: { "url": "https://example.com" }

# Generate script
POST /api/generate-script
Body: { "framework": "PAS", "product_name": "...", "target_audience": "...", "key_features": [...] }

# Create video
POST /api/create-video
Body: { "script": "...", "format": "9:16", "brand_colors": [...] }

# Create poster
POST /api/create-poster
Body: { "headline": "...", "subtext": "...", "brand_colors": [...] }

# Magic Button (all-in-one)
POST /api/magic-launch-pack
Body: { "url": "https://yourproduct.com" }
```

---

## System Requirements

| | Minimum | Recommended |
|--|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 10 GB | 50 GB SSD |

---

## Troubleshooting

**MongoDB connection failed** — Start MongoDB: `mongod --dbpath /path/to/data`

**FFmpeg not found** — Install via `sudo apt-get install ffmpeg` (Linux) or `brew install ffmpeg` (macOS)

**CORS errors** — Set `CORS_ORIGINS=http://localhost:3000` in `backend/.env`

**Video creation fails / TextClip font error** — Install fonts: `sudo apt-get install fonts-liberation`

---

## License

MIT

---

**Built for non-creative founders who need professional marketing content at scale.**
