# LaunchBusiness AI — Product Strategy & Business Model
# Last updated: June 2026 (source of truth for all sessions)

---

## Product Vision

**Original:** URL → complete AI marketing launch pack in 90 seconds.

**Expanded (June 2026):** Replace the human content creator, video editor, and lawyer — entirely.
A user inputs a client's brand brief once. LaunchBusiness AI acts as their full launch team:
logo designer + video editor + copywriter + social media manager + legal consultant.

The three pillars (Marketing, Legal, Logo) must connect through a shared Brand Profile.
Right now they are siloed — every tool asks for the same brand info separately.
The Brand Profile is the architectural fix that unlocks the "content creator replacement" pitch.

"Free = our best work, limited to 3 runs. Paid = unlimited."

---

## Core Output (Magic Button)

One click on any product URL produces:
- 1 brand logo (AI templates or Ideogram AI concepts)
- 2 AI videos (9:16 TikTok ad + 16:9 YouTube tutorial)
- 2 scripts (PAS ad script + Step-by-Step tutorial)
- 2 social posters (1:1 + 9:16)

Total: 7 assets per Magic Button click.

---

## Quality Tiers

### Current (FFmpeg-based, no GPU)
- Gradient slide backgrounds with Ken Burns zoom/pan
- gTTS voice (robotic — needs replacing)
- Scraped website images when available

### Near-term target (free tier quality) — ✅ ALL COMPLETE
- ~~Edge TTS neural voice~~ ✅ Microsoft AndrewNeural, free, sounds human
- ~~Proper Pillow-designed slide system~~ ✅ 6 structured templates (Hero, Problem, Solution, Features, How It Works, CTA)
- ~~Crossfade transitions~~ ✅ FFmpeg xfade, 0.5s between slides
- ~~Watermark burned into slide design~~ ✅ diagonal RGBA stamps, content area
- ~~Background music bed~~ ✅ FFmpeg amix, royalty-free .mp3, ducked -18dB under voice (paid tiers only)

### Paid tier target (GPU-powered via Modal.com) — REVISED June 2026
- ~~LTX-Video~~ → ~~SVD~~ → **REPLACED by Wan 2.2 TI2V-5B** (image+text to video)
  Reason: Wan 2.2 takes our Hero slide as input image → animates real branded content. Also 14× cheaper than LTX-Video ($0.03 vs $0.44/clip). Fits A10G not A100.
  Full decision: `docs/WAN_VIDEO_UPGRADE.md`
- AI video available to ALL paid tiers (Starter/Pro/Agency) — not just Pro. At $0.03/clip, margin stays at ~98% even on Starter.
- Tutorial Studio — Chrome extension for YouTube tutorial generation (Starter+ only)
  Full spec: `docs/TUTORIAL_STUDIO.md`
- Talking head (Pro/Agency — requires Modal + SadTalker deploy + ID verification)

---

## Why Free Must Be High Quality

The free tier IS the sales demo. If it looks cheap:
- Users leave in 30 seconds, no conversion opportunity
- The upgrade path dies before it starts

Reference model: Canva, Notion, Loom — all give genuinely excellent free tiers.
Paid adds LIMITS REMOVAL and POWER FEATURES, not basic quality.

---

## Subscription Model

### Free — Forever
- 3 lifetime generations (not per month — creates upgrade urgency)
- Full quality output (same pipeline as paid)
- Watermark burned into slide design
- 9:16 format only
- Pre-made animated character (no personal photo)
- Scripts visible but not downloadable

### Starter — $19/month
- 15 generations/month
- No watermark
- All 3 formats (9:16, 16:9, 1:1)
- Pre-made animated characters
- Download scripts
- Standard queue

### Pro — $49/month
- 50 generations/month
- Everything in Starter
- Talking head — upload your photo → you become the presenter (SadTalker)
- 5 saved brand profiles
- Priority queue (2x faster)
- Overage: $2/generation

### Agency — $149/month
- 200 generations/month
- Everything in Pro
- 5 team seats
- White label (remove SwiftPack AI branding)
- Multiple talking head profiles (5 people)
- API access
- Dedicated support
- Overage: $1.50/generation

### Annual Pricing (20% discount)
- Starter: $182/year
- Pro: $470/year
- Agency: $1,430/year

---

## Lifetime Deal (Early Adopter Strategy)

Run before subscriptions go live. Platform: AppSumo.

- LTD Tier 1: $79 — 15 gens/month forever (Starter equivalent)
- LTD Tier 2: $149 — 50 gens/month forever (Pro equivalent)
- Cap total codes: 500 maximum then close

AppSumo takes 30% commission, you receive 70%.
Example: 300 codes × $79 = $23,700 gross → $16,590 to you.

Break-even per LTD user:
- Tier 1 ($79): ~9 months at $9.75/month GPU cost
- Tier 2 ($149): ~5 months at $32.50/month GPU cost

After break-even, limit GPU exposure by capping monthly gens per LTD user.
DO NOT offer unlimited gens on LTD — always monthly cap.

---

## Unit Economics (with Modal + Wan 2.2 + SadTalker)

**UPDATED June 2026** — Wan 2.2 replaces LTX-Video. GPU cost drops from ~$0.44 to ~$0.03/clip.

GPU cost per generation: ~$0.038
(Wan 2.2 ~$0.03 + Pexels $0 + Edge TTS $0 + Gemini ~$0.008)

Real-world usage is ~50% of monthly allocation (users don't max out).

| Plan | Revenue | Actual GPU Cost | Gross Margin |
|------|---------|----------------|--------------|
| Starter (15 gens, ~8 used) | $19 | $0.30 | **~98%** |
| Pro (50 gens, ~25 used) | $49 | $0.95 | **~98%** |
| Agency (200 gens, ~100 used) | $149 | $3.80 | **~97%** |

**Previous with LTX-Video (A100 40GB) — for reference:**

| Plan | Revenue | Old GPU Cost | Old Margin |
|------|---------|-------------|-----------|
| Starter (15 gens, ~8 used) | $19 | $3.52 | ~81% |
| Pro (50 gens, ~25 used) | $49 | $11.00 | ~78% |
| Agency (200 gens, ~100 used) | $149 | $44.00 | ~70% |

---

## GPU Infrastructure

### Current (free tier)
- EC2 backend runs FFmpeg on CPU — $0 GPU cost
- Image slideshow with Ken Burns effect
- Gradient slides as fallback

### Pro tier GPU via Modal.com (recommended over Vast.ai/RunPod)
Why Modal over alternatives:
- ~3 second warm start (vs 2-5 minute for Vast.ai/RunPod)
- True pay-per-second — $0 when no one generates
- No instance management or SSH
- Just Python functions deployed to cloud GPUs

Cost reference:
- A100 40GB: ~$0.0004/second
- H100: ~$0.0008/second
- Per video: ~$0.22-0.29 (A100)

### Why NOT to use the GTX 1080 Ti
The 1080 Ti runs Mother AI — it's load-bearing for production.
If it goes down, all of Mother goes down. Never route SwiftPack traffic to it.

---

## Watermark Strategy

Corner watermarks DON'T work — users crop them in 5 seconds.

What works:
1. Burn "SwiftPack AI" as a design element inside the slide content area
   (integrated into the template, not overlaid — cropping destroys content)
2. Invisible steganographic watermark on every frame (python `invisible-watermark`)
   — encodes user ID invisibly, detectable by our server for abuse tracing
3. The real protection is the 3-generation lifetime limit, not the watermark
   — watermark is for marketing attribution, not piracy prevention

Free video shared = our ad. Watermark should be visible enough to be read,
not so aggressive it looks unprofessional.

---

## Deepfake & Fraud Prevention

### The Risk
Talking head feature + photo of a politician/celebrity = fake video of them
promoting scams. Legal liability + reputational destruction.

### Protection Stack (mandatory before launching talking head)

**Layer 1: Legal (Terms of Service)**
Explicit prohibition:
- No photos of real people without written consent
- No impersonation of public figures
- No fraud, misinformation, financial scams
- User is solely legally liable for violations

Checkbox on every photo upload: "I confirm I own rights to this image"
Timestamp + user ID stored in DB — this is your legal defense.

**Layer 2: ID Verification (Gate talking head feature)**
Stripe Identity ($1.50/user one-time) — government ID check.
Pro tier requires ID verification before talking head unlocks.
Nobody commits fraud with their real government ID attached.

```python
session = stripe.identity.VerificationSession.create(
    type='document',
    metadata={'user_id': user.id}
)
```

**Layer 3: AI Detection**
DeepFace (open source) checks uploaded photo against known public figures.
Catches ~90% of abuse attempts before processing begins.
AWS Rekognition Celebrity Recognition as alternative ($0.001/image).

**Layer 4: Mandatory AI Label (legally required in EU)**
All talking head videos — even Pro — get "AI GENERATED" label burned in.
EU AI Act compliance. Also signals synthetic content to viewers.

**Layer 5: Reporting + Takedown**
Report button on every shared video.
48-hour takedown SLA on confirmed abuse.
Permanent account ban on violation.

### Access Tier by Risk Level
- Free/Starter: Pre-made animated characters ONLY — zero deepfake risk
- Pro+: Personal photo after ID verification + consent + DeepFace check

---

## Build Roadmap

### Phase 1 — Free Tier Quality ✅ COMPLETE
1. ~~Edge TTS neural voice~~ ✅ — Microsoft AndrewNeural, $0, sounds human
2. ~~Proper Pillow slide design system~~ ✅ — 6 structured templates (Hero, Problem, Solution, Features, How It Works, CTA) with brand color gradients, typography hierarchy, shape-drawn checkmarks
3. ~~Crossfade transitions (FFmpeg xfade)~~ ✅ — 0.5s fade between slides, proper duration math
4. ~~Watermark in design (not corner)~~ ✅ — diagonal RGBA stamps burned into slide content area
5. ~~Background music bed~~ ✅ — FFmpeg amix, -18dB duck, paid tiers only; activate by dropping .mp3 into `backend/assets/music_beds/`

### Phase 2 — Monetization ✅ COMPLETE (pending activation)
1. ~~Stripe subscription integration~~ ✅ — /checkout/starter, /checkout/pro, /checkout/agency
2. ~~Generation limits enforcement per tier~~ ✅ — TIER_CONFIG, check_usage_limit()
3. ~~3-lifetime-gen limit for free users~~ ✅ — aggregate across all months
4. ~~Upgrade prompts at generation limit~~ ✅ — HTTP 429 with upgrade message
5. **To activate**: add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_*_PRICE_ID to secrets file

### Phase 3 — GPU Video Engine — REVISED: Wan 2.2 replaces LTX-Video
1. ~~Modal.com account + deployment~~ ✅ — infrastructure ready
2. ~~LTX-Video~~ → **REPLACE with Wan 2.2 TI2V-5B** — rewrite `backend/modal_video.py`
   - New GPU: A10G (not A100) — fits Wan 2.2 5B FP8 in 24GB, costs 3× less
   - New APP_NAME: `launchbusiness-wan-video` (fixes silent mismatch bug)
   - Adds image input: Hero Pillow slide as starting frame
   - Cost: ~$0.03/clip vs $0.44 (14× cheaper)
3. ~~Route pro users to Modal~~ → Route ALL PAID TIERS to Wan 2.2 (Starter/Pro/Agency)
4. ~~Keep FFmpeg slideshow for free tier~~ ✅ — unchanged
5. **To activate**: rewrite modal_video.py → `modal deploy backend/modal_video.py` → add `MODAL_APP_NAME=launchbusiness-wan-video` to secrets
6. Full spec: `docs/WAN_VIDEO_UPGRADE.md`

### Phase 4 — Talking Head ✅ COMPLETE (pending Modal deploy)
1. ~~Stripe Identity ID verification gate~~ ✅ — POST /api/talking-head/verify-identity, webhook sets identity_verified
2. ~~SadTalker endpoint on Modal~~ ✅ — backend/modal_sadtalker.py, A10G GPU
3. ~~DeepFace check on photo upload~~ ✅ — check_face() Modal CPU function, RetinaFace detector
4. ~~AI Generated label on all talking head videos~~ ✅ — FFmpeg drawtext burned into every frame
5. ~~Explicit consent timestamped in DB~~ ✅ — POST /api/talking-head/consent, photo_hash keyed
6. **To activate**: run `modal deploy backend/modal_sadtalker.py`

### Phase 5 — Creative Direction Input (next — see docs/VIDEO_PIPELINE.md)
1. Optional creative direction field on Dashboard (Starter+ only)
2. Feeds into Gemini prompt for better-tailored scripts
3. No GPU required — same FFmpeg video, better copy
4. Build time: ~3 hours

### Phase 6 — Wan 2.2 GPU Video Upgrade (replaces LTX-Video / SVD plan)
1. Rewrite `backend/modal_video.py` — swap LTX-Video for Wan 2.2 TI2V-5B on A10G
2. Fix APP_NAME: `launchbusiness-wan-video` (eliminates existing silent failure bug)
3. Add image input: pass Hero Pillow slide PNG to Wan 2.2 (animates real brand)
4. Enable for ALL paid tiers (not just Pro) — margin is ~98% even on Starter at $0.03/clip
5. Update `server.py` line 129: `MODAL_APP_NAME` default → `launchbusiness-wan-video`
6. Deploy + activate: `modal deploy backend/modal_video.py`
7. Full spec: `docs/WAN_VIDEO_UPGRADE.md` | Build time: ~5 hours

### Phase 7 — Tutorial Studio (Chrome Extension)
1. Build Chrome extension: `extension/` folder (4 files — manifest, background, popup.html, popup.js)
2. Extension uses Chrome's tabCapture API to record any tab the founder is on
3. Server endpoint: `POST /api/tutorial/process` — extracts frames → Gemini Vision narrates → Edge TTS → FFmpeg assembles 16:9 tutorial
4. Frontend component: `TutorialStudio.js` — extension download link + processing status
5. Tier: Starter+ only. Counts as 1 video credit.
6. Full spec: `docs/TUTORIAL_STUDIO.md` | Build time: ~10 hours

### Phase 8 — Scale
1. **AppSumo LTD launch** — activate Stripe + Modal first
2. Agency white label — remove LaunchBusiness AI branding
3. API access for agencies
4. Annual pricing (20% off)

---

## Revenue Targets

Month 3:  50 Starter + 20 Pro + 5 Agency  = $2,695/mo
Month 6:  150 Starter + 60 Pro + 15 Agency = $8,235/mo
Month 12: 400 Starter + 150 Pro + 40 Agency = $21,950/mo (~$264k ARR)

---

## Competitors

| Tool | What it does | Price | Our Advantage |
|------|-------------|-------|---------------|
| HeyGen | Talking head videos | $29/mo | Full launch pack, not just video |
| Pictory | URL → video | $23/mo | Talking head + all formats |
| Synthesia | AI presenter | $29/mo | URL-to-everything automation |
| Runway | AI video | $35/mo | Full marketing pack, not just video |

We combine HeyGen + Pictory + Runway in one Magic Button click.
No competitor does Marketing + Legal + Logo in one platform. That's the moat.
That's worth more. Start below market ($19-49), earn the right to raise.

---

## Phase 8 — Brand Profile + Content Creator Replacement (Next Major Feature)

**Decision made June 2026.** Full spec in `docs/BRAND_PROFILE_FEATURE.md`.

### The Problem
All three tools (Video/Logo/Legal) are completely siloed. Users re-enter brand info three times.
The logo never appears in videos. Legal chat doesn't know the business profile already entered elsewhere.

### The Fix — Brand Profile
One MongoDB document per client/brand that all three tools read from:
- brand name, tagline, URL, colors (auto or manual), active logo PNG, audience, tone, jurisdiction, business type, revenue model

### What Changes Per Tool
- **Logo Creator**: auto-filled from profile, "Set as active logo" → logo flows into videos + posters
- **Video Ads**: logo rendered on Hero + CTA slides, 3 hook variants generated, all formats in one job
- **Legal Docs**: intake pre-filled from profile — reduces 8–10 chat exchanges to 2–3

### New UX — 5-Step Wizard (replaces URL-paste)
1. Brand Brief (name, tagline, URL, audience, tone, business type)
2. Brand Identity (logo upload or Logo Creator, color picker or auto-extract)
3. Script Selection (all 3 frameworks generated, user picks + edits before render)
4. Format Selection (9:16 / 16:9 / 1:1 / 4:5, pick 3 hooks → up to 12 videos)
5. Download Pack (all videos + posters + scripts, ZIP export)

### New Feature — Full Launch Pack (one button)
`POST /api/full-launch-pack` → logo + videos + posters + legal starter pack → ZIP

### Agency Pitch After This Is Built
Content creators / editors use Agency ($149/mo) to serve multiple clients.
They replace their entire tool stack (video editor + copywriter + lawyer).
Client pays them $500–$2,000/mo. They pay us $149. Pure arbitrage.

### Build Priority (estimated effort)
| Priority | Feature | Effort |
|---|---|---|
| 1 | Brand Profile model + UI | 6h |
| 2 | Logo → slide/poster rendering | 5h |
| 3 | Manual color picker | 4h |
| 4 | 3 hook variants per run | 4h |
| 5 | Script edit step before render | 3h |
| 6 | 4:5 format (Facebook feed) | 2h |
| 7 | Batch ZIP download | 3h |
| 8 | Legal intake pre-fill from profile | 4h |
| 9 | Full Launch Pack endpoint | 9h |
**Total: ~40 hours / ~1 week**

---

## Competitors
