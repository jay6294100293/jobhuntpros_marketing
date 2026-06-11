# LaunchBusiness AI — Brand Profile + Content Creator Replacement
# Feature spec decided: June 2026
# Status: Items 1–15 DONE. Item 16 (cross-tool brand cohesion) DONE — see bottom of Build Priority Order.

---

## The Vision

Replace the human content creator, video editor, and lawyer — entirely.

A user (founder, agency, freelance editor) inputs a client's brand brief once.
LaunchBusiness AI acts as their full launch team:
- Logo designer (Logo Creator)
- Video editor + copywriter (Magic Button pipeline)
- Social media manager (multi-format + multi-hook export)
- Legal consultant (Legal Documents)

**The pitch:** "Give us your brand. Get back your logo, your ads, your legal documents — in 3 minutes.
What used to require a designer, a video editor, a copywriter, and a lawyer."

**No competitor does Marketing + Legal + Logo in one platform.** That is the moat.

---

## The Core Problem (Why This Must Be Built)

All three tools are 100% siloed today:

| Tool | Problem |
|------|---------|
| Logo Creator | Generates logos, but logo NEVER appears in videos or posters |
| Magic Button | Asks for URL every time, ignores any logo already created |
| Legal Docs | AI chat asks all business questions from scratch every session |

Users re-enter brand info three times. The logo they spent time generating disappears.
The output looks like three separate tools, not one unified platform.

---

## The Fix — Brand Profile

One MongoDB document per client/brand. All three tools read from it.
User enters brand info once. Everything else is auto-filled.

### MongoDB Schema

```python
{
  "id": "uuid",
  "user_id": "uuid",                        # owner
  "created_at": "datetime",
  "updated_at": "datetime",

  # Brand identity
  "brand_name": "FitnessGuru AI",
  "tagline": "Your AI personal trainer",
  "url": "https://fitnessguruai.com",        # optional
  "primary_color": "#10B981",
  "secondary_color": "#059669",
  "active_logo_path": "/outputs/logos/abc.png",  # set from Logo Creator

  # Audience + tone
  "audience": "fitness enthusiasts 25–45",
  "tone": "energetic",                       # professional / casual / bold / energetic

  # Business context (feeds Legal intake)
  "business_type": "mobile_app",             # saas / ecom / service / app / agency
  "jurisdiction": "Canada",                  # Canada / USA / EU / UK / Australia
  "revenue_model": "subscription",           # subscription / one-time / ads / freemium
  "data_practices": "stores user workout data, no third-party sharing",

  # Features (used in video scripts + posters)
  "key_features": ["AI workouts", "Progress tracking", "Nutrition plans"],
  "cta_text": "Download free"                # Try free / Buy now / Learn more / Download free
}
```

### Tier Limits on Profiles

| Tier | Max Profiles |
|------|-------------|
| Free | 0 (no profiles — URL-paste only) |
| Starter | 1 |
| Pro | 3 |
| Agency | Unlimited |

---

## What Changes in Each Tool

### 1. Logo Creator
**Before:** User re-enters brand name + tagline + colors manually every time.
**After:**
- Profile selector at top — pick a saved brand profile → all fields auto-fill
- "Set as active logo" button on any generated logo → stores `active_logo_path` in profile
- Active logo immediately flows into all future videos and posters for that profile

**New UI element:** Profile selector dropdown at top of Logo Creator page.

### 2. Video Pipeline (Magic Button)
**Before:** User pastes URL → scrape → generate → 2 videos + 2 scripts + 2 posters.
**After:**
- Profile selected → colors + features + audience pre-filled, URL optional
- Active logo rendered on Hero slide (top-left, max 60px height, alpha-composited)
- Active logo rendered on CTA slide (bottom-center, max 50px height)
- Active logo rendered on all posters (corner, max 40px height)
- 3 hook variants generated (different opening 5 seconds, same body + CTA)
- All 4 formats exported in one job: 9:16, 16:9, 1:1, 4:5
- Result: up to 12 videos from one run (3 hooks × 4 formats)

**Logo rendering in Pillow (Hero slide example):**
```python
if logo_path and Path(logo_path).exists():
    logo = Image.open(logo_path).convert("RGBA")
    max_h = 60
    ratio = max_h / logo.height
    logo = logo.resize((int(logo.width * ratio), max_h), Image.LANCZOS)
    img.paste(logo, (20, 20), logo)  # top-left, 20px margin, use alpha mask
```

### 3. Legal Documents
**Before:** AI intake chat asks 8–10 questions from scratch every session.
**After:**
- Profile selected → system message pre-fills: jurisdiction, business_type, revenue_model, data_practices
- Chat skips already-known fields
- Reduces intake from 8–10 exchanges to 2–3
- "Using profile: FitnessGuru AI" indicator shown in chat header

**Pre-fill system message injection (legal_router.py):**
```python
if profile and profile.get("intake_complete") is False:
    prefill = f"""The user's brand profile contains:
    - Business type: {profile['business_type']}
    - Jurisdiction: {profile['jurisdiction']}
    - Revenue model: {profile['revenue_model']}
    - Data practices: {profile['data_practices']}
    Skip questions about these — ask only what's missing for {doc_name}."""
```

---

## New UX Flow — 5-Step Wizard

Replaces the current URL-paste single-screen Dashboard for users on Starter+.
Free users keep the URL-paste flow (no profiles).

### Step 1 — Brand Brief
```
Brand name        [________________________]
Tagline           [________________________]  (optional)
Website URL       [________________________]  (optional — auto-fills colors/features)
Target audience   [________________________]
Business type     [SaaS] [App] [Ecom] [Service] [Agency]
Tone              [Professional] [Bold] [Casual] [Energetic]
CTA text          [Try free] [Buy now] [Learn more] [Download free]
Key features      [__________] [__________] [__________]
```

### Step 2 — Brand Identity
```
Logo:    [Upload PNG/SVG]  OR  [Open Logo Creator]  OR  [Skip]
         If "Open Logo Creator" → Logo Creator pre-filled, user picks logo,
         clicks "Use this logo" → returns to wizard with logo set

Colors:  [Extract from URL]  OR  [Pick manually]
         Primary ■ [color picker]    Secondary ■ [color picker]

Preview: [Card showing brand colors + logo side by side]
```

### Step 3 — Script Selection
```
All 3 frameworks generated automatically. User reads and picks one (or edits).

○ PAS — Problem / Agitate / Solution
  [editable textarea — user can refine before rendering]

○ Before/After — Transformation story
  [editable textarea]

○ Step-by-Step — Tutorial style
  [editable textarea]
```

### Step 4 — Format + Hook Selection
```
Formats:
  ☑ 9:16  (TikTok, Reels, Shorts, Stories)    — all tiers
  ☑ 16:9  (YouTube, LinkedIn)                  — Starter+
  ☑ 1:1   (Instagram Feed, Twitter/X)          — Starter+
  ☑ 4:5   (Facebook Feed, IG Feed)             — Starter+

Hooks (3 auto-generated — user can deselect):
  ☑ Hook A — Pain angle      "Starting a business shouldn't cost $6,900..."
  ☑ Hook B — Speed angle     "We just got a full marketing pack in 90 seconds..."
  ☑ Hook C — Unique angle    "Marketing + legal. One platform. 90 seconds."

Total videos: [3 hooks × 4 formats = 12 videos]   (shown dynamically)
```

### Step 5 — Download Pack
```
[Progress: Generating 12 videos...]

When complete:
  Hook A — 9:16   [▶ Preview] [↓ Download]
  Hook A — 16:9   [▶ Preview] [↓ Download]
  Hook A — 1:1    [▶ Preview] [↓ Download]
  Hook A — 4:5    [▶ Preview] [↓ Download]
  Hook B — 9:16   ...
  ... (all 12)

  Posters (8):    [↓ Download All]
  Scripts (3):    [Copy] [↓ Download]

  [↓ Download Everything as ZIP]
```

---

## New API Endpoints

### Brand Profile CRUD
```
POST   /api/brand-profiles          Create profile
GET    /api/brand-profiles          List user's profiles
GET    /api/brand-profiles/{id}     Get single profile
PUT    /api/brand-profiles/{id}     Update profile
DELETE /api/brand-profiles/{id}     Delete profile
POST   /api/brand-profiles/{id}/set-logo   Set active_logo_path from an existing logo output
```

### Full Launch Pack
```
POST /api/full-launch-pack
Body: { "profile_id": "uuid", "hooks": ["pain", "speed", "unique"], "formats": ["9:16","16:9","1:1","4:5"] }
Returns: ZIP of all videos + posters + scripts
```

---

## Social Media Video Ad Specs (for all format exports)

Decided in June 2026 discussion. Use these specs for all video output:

| Format | Resolution | Ideal Duration | Platforms |
|--------|-----------|---------------|-----------|
| 9:16 | 1080×1920 | 21–34 sec | TikTok, Reels, Shorts, Stories |
| 4:5 | 1080×1350 | 15–30 sec | Facebook Feed, Instagram Feed |
| 1:1 | 1080×1080 | 30–60 sec | LinkedIn, Twitter/X |
| 16:9 | 1920×1080 | 60–90 sec | YouTube pre-roll, LinkedIn video ads |

**Safe zone rule:** Keep text + critical visuals within center 80% width, 60% height.
Never place important content in bottom 25% or right 15% of 9:16 (platform icons stack there).

### Hook Formula (first 5 seconds = everything)
Three hook angles to generate per run:
- **Pain:** Specific frustration the audience has. "Still Googling how to register a business?"
- **Speed/Result:** The outcome. "Full marketing pack in 90 seconds. No agency needed."
- **Unique:** The "only" angle. "The only platform that does marketing AND legal documents."

---

## What This Replaces (ROI Story for Users)

| Human Role | Market Rate | Replaced By |
|---|---|---|
| Brand designer (logo) | $500–$5,000 | Logo Creator |
| Video editor (ad pack) | $800–$2,500/pack | Video pipeline |
| Copywriter (scripts) | $100–$300/script | Script generation |
| Social media manager | $2,000–$5,000/mo | Poster + multi-format |
| Business lawyer (docs) | $1,000–$5,000/package | Legal Documents |

**Agency tier ($149/mo) ROI for a content creator:**
- Manage 5 clients × $500/mo = $2,500/mo revenue
- Pay us $149/mo
- Net: $2,351/mo from our platform alone

---

## Build Priority Order

| # | Feature | File(s) | Status |
|---|---------|---------|--------|
| 1 | Brand Profile MongoDB model + CRUD endpoints | brand_router.py (new) | ✅ DONE |
| 2 | Profile selector UI + create/edit modal | BrandProfiles.js (new) | ✅ DONE |
| 3 | Profile selector in Dashboard + auto-fill fields | Dashboard.js | ✅ DONE |
| 4 | profile_id wired through Magic Button → video pipeline | server.py | ✅ DONE |
| 5 | Logo paste onto Hero + CTA slides | server.py `_make_slide_hero`, `_make_slide_cta` | ✅ DONE |
| 6 | /brands route + nav link | App.js, Layout.js | ✅ DONE |
| 7 | "Set as active logo" button + save to profile | LogoCreator.js + brand_router.py | ✅ DONE |
| 8 | Auto-fill Logo Creator from selected profile | LogoCreator.js | ✅ DONE |
| 9 | Logo paste onto posters (via profile_id) | server.py create_poster | ✅ DONE |
| 10 | Legal intake pre-fill from brand profile | legal_router.py start_chat | ✅ DONE |
| 11 | Manual color pickers in Dashboard | Dashboard.js BrandProfiles form | ✅ DONE |
| 12 | 3 hook variants per run (PAS+Step+Before/After) | server.py magic button handler | ✅ DONE |
| 13 | 4:5 format export | server.py TIER_CONFIG + format_map | ✅ DONE |
| 14 | Batch ZIP download | server.py /download-pack + Dashboard.js | ✅ DONE |
| 15 | Full Launch Pack endpoint | Covered by magic button + ZIP | ✅ DONE |
| 16 | Global active-brand context, navbar switcher, nav consolidation (8→5), "Save as Brand" + "What's Next" cross-sells, real logo everywhere | BrandContext.js (new), MarketingLayout.js (new), Layout.js, Dashboard.js, LogoCreator.js, Landing.js, auth/* | ✅ DONE (June 2026) |

---

## What NOT to Build Yet
- Font customization (nice-to-have, low impact)
- Slide layout choice (current 6-template system already professional)
- Background textures (gradient system works well)
- True AR video ads (high dev time, low ROI for B2B SaaS)

---

## Notes for Implementation
- Brand profiles live in a new `brand_profiles` MongoDB collection
- active_logo_path must be a path inside `backend/outputs/` — validate before use
- Logo paste is pure Pillow — Image.open + resize + paste with alpha mask — no new deps
- 4:5 format: add `"4:5": {"width": 1080, "height": 1350}` to format config in server.py
- Hook generation: call Gemini 3× with same framework but different opening instruction per hook
- ZIP export: use Python `zipfile` stdlib, stream response via `StreamingResponse`
- Profile tier enforcement: check `user["tier"]` + count existing profiles before creating new
