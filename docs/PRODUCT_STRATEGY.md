# SwiftPack AI — Product Strategy & Business Model
# Last updated: April 2026 (source of truth for all sessions)

---

## Product Vision

URL → complete AI marketing launch pack in 90 seconds.
The free tier shows our ceiling. Users judge quality once, then decide to pay.
"Free = our best work, limited to 3 runs. Paid = unlimited."

---

## Core Output (Magic Button)

One click on any product URL produces:
- 2 AI videos (9:16 TikTok ad + 16:9 YouTube tutorial)
- 2 scripts (PAS ad script + Step-by-Step tutorial)
- 2 social posters (1:1 + 9:16)

---

## Quality Tiers

### Current (FFmpeg-based, no GPU)
- Gradient slide backgrounds with Ken Burns zoom/pan
- gTTS voice (robotic — needs replacing)
- Scraped website images when available

### Near-term target (free tier quality)
- Edge TTS neural voice (sounds human, free, no API key)
- Proper Pillow-designed slide system (6 structured slides, not random captions)
- Crossfade transitions between slides (FFmpeg xfade)
- Watermark burned into slide design (not corner — can't be cropped)
- Background music bed (royalty-free tracks bundled in repo)

### Pro tier target (GPU-powered via Modal.com)
- LTX-Video (Lightricks, Apache 2.0) — real AI video backgrounds
- SadTalker — user photo → lip-synced talking head presenter
- Pre-made animated 2D characters (fallback when no photo)
- Priority queue (2x faster processing)

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

## Unit Economics (with Modal + LTX-Video + SadTalker)

GPU cost per generation: ~$0.65
(LTX-Video ~$0.44 + SadTalker ~$0.10 + Edge TTS $0 + overhead)

Real-world usage is ~50% of monthly allocation (users don't max out).

| Plan | Revenue | Actual GPU Cost | Gross Margin |
|------|---------|----------------|--------------|
| Starter (15 gens, ~7 used) | $19 | $4.55 | ~76% |
| Pro (50 gens, ~25 used) | $49 | $16.25 | ~67% |
| Agency (200 gens, ~100 used) | $149 | $65 | ~56% |

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

### Phase 1 — Free Tier Quality (implement first, no GPU needed)
1. Edge TTS neural voice — 2 hours, biggest perceived quality jump, $0 cost
2. Proper Pillow slide design system — 1 day, 6 structured templates
3. Crossfade transitions (FFmpeg xfade) — 2 hours
4. Background music bed — 1 day (bundle royalty-free tracks)
5. Watermark in design (not corner) — 2 hours

### Phase 2 — Monetization
1. Stripe subscription integration (already partially in code)
2. Generation limits enforcement per tier
3. 3-lifetime-gen limit for free users
4. Upgrade prompts at generation limit

### Phase 3 — Pro Tier GPU
1. Modal.com account + deployment
2. LTX-Video endpoint on Modal (Apache 2.0)
3. Route pro users to Modal for video backgrounds
4. Keep FFmpeg slideshow for free tier

### Phase 4 — Talking Head
1. Stripe Identity ID verification gate
2. SadTalker endpoint on Modal
3. DeepFace check on photo upload
4. AI Generated label on all talking head videos
5. Pre-made animated characters for free/starter

### Phase 5 — Scale
1. AppSumo LTD launch (after Phase 1-2 complete, product looks good)
2. Agency tier + white label
3. API access for agencies
4. Consider annual deals with agencies

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
That's worth more. Start below market ($19-49), earn the right to raise.
