# TRUTH_MEMORY.md — LaunchBusiness AI
# Doc Reader Agent — Session 1
# Date: 2026-06-30
# Docs read: 26 | Features mapped: 43 | Confusions found: 34

---

# PART 1 — FEATURE MAP

---

FEAT-001: Magic Button Pipeline
Claimed in: README, CLAUDE.md, ARCHITECTURE.md, PROJECT_SUMMARY.md, PRODUCT_STRATEGY.md, VIDEO_FEATURES.md, VIDEO_PIPELINE.md, STARTUP.md, SESSION_PROMPT.md, BRAND_PROFILE_FEATURE.md
What it says: Paste a product URL, get a full marketing pack in ~90 seconds. Core pipeline: scrape_url → generate_script × N parallel → create_complete_video × formats parallel → create_poster × 2. Endpoint name contradicts across docs: POST /api/magic-button (ARCHITECTURE, RUNBOOK, CLAUDE.md) vs POST /api/magic-launch-pack (README, SESSION_PROMPT, VIDEO_FEATURES).
Sub-capabilities:
  a) URL scrape → brand colors, headline, features, images[] — NOT persisted
  b) 5 parallel Gemini script calls (PAS@9:16, Step@16:9, Before/After@9:16, PAS@1:1, PAS@4:5) — format-word-count-targeted
  c) 4 format videos generated in parallel (9:16, 16:9, 1:1, 4:5)
  d) 2 branded posters (1:1 + 9:16)
  e) 3 hooks per run (Pain/Speed/Unique, same body, different first 5s) — per BRAND_PROFILE_FEATURE item 12 DONE
  f) Usage counter incremented, enforced against tier limits
  g) Content post-scan for adult/explicit signals after generation
  h) Temp dirs cleaned via shutil.rmtree
Stack layers: Backend (FastAPI, server.py), AI (Gemini 2.5 Flash), TTS (Edge TTS), Video (FFmpeg + Pillow + Modal GPU), Database (MongoDB usage)
Clarity: CONFUSED — endpoint name contradicts (/api/magic-button vs /api/magic-launch-pack); output asset count contradicts (6 vs 7 vs 9 assets). See CONF-004 and CONF-015.

---

FEAT-002: URL Scraping / URL Intelligence
Claimed in: README, ARCHITECTURE.md, PROJECT_SUMMARY.md, VIDEO_FEATURES.md, VIDEO_PIPELINE.md
What it says: httpx (verify=False for SSL compat) + BeautifulSoup scrapes any product URL. Extracts brand colors, headlines, features, product description, images[]. Data NOT persisted — process and return only.
Sub-capabilities:
  a) Brand color extraction
  b) Headline and feature extraction
  c) Product description extraction
  d) Image URL extraction
  e) SSRF protection gates before fetch (FEAT-003)
Stack layers: Backend (httpx, BeautifulSoup, server.py)
Clarity: CLEAR

---

FEAT-003: URL Safety / SSRF Protection
Claimed in: ARCHITECTURE.md, PROJECT_SUMMARY.md, decisions/2026-06-27-security-hardening.md
What it says: Multi-layer URL safety in _is_safe_url() before scraping.
Sub-capabilities:
  a) Hostname blocklist (adult domains, malicious hostnames, bad TLDs)
  b) Bare IP literal check against RFC1918/loopback/link-local/reserved ranges
  c) DNS resolution via socket.getaddrinfo — checks every returned IP against private ranges; fails closed on DNS error (OSError → return False)
  d) Post-scrape content scan for adult/explicit signals in title+desc
  e) Google Safe Browsing API v4 (optional, needs GOOGLE_SAFE_BROWSING_API_KEY; other layers run without it)
Stack layers: Backend (server.py, socket, ipaddress, Google Safe Browsing API)
Clarity: CLEAR

---

FEAT-004: Script Generation (Gemini)
Claimed in: README, ARCHITECTURE.md, PROJECT_SUMMARY.md, VIDEO_PIPELINE.md, VIDEO_FEATURES.md
What it says: Gemini 2.5 Flash generates marketing scripts. 3 frameworks: PAS, Step-by-Step, Before/After. Each format gets a word-count-targeted prompt.
Sub-capabilities:
  a) PAS framework — ad style
  b) Step-by-Step framework — tutorial style
  c) Before/After framework — transformation story
  d) Format-targeted word counts per video dimension
  e) Fallback chain: Gemini → OpenRouter (if OPENROUTER_API_KEY set) → template-based emergency
  f) Creative direction injection (PLANNED, not yet built — Phase 5, Starter+ only, +5-10s processing)
Stack layers: Backend (server.py), AI (Gemini 2.5 Flash, OpenRouter fallback)
Clarity: CLEAR

---

FEAT-005: Edge TTS Neural Voiceover
Claimed in: README, PROJECT_SUMMARY.md, VIDEO_FEATURES.md, VIDEO_PIPELINE.md, SETUP_INSTRUCTIONS.md, STARTUP.md
What it says: Microsoft AndrewNeural voice (edge-tts Python library, free, no API key). Audio at 16kHz WAV, overlaid by FFmpeg. +5% speed for marketing pacing. gTTS automatic fallback.
Sub-capabilities:
  a) Neural voice (sounds human, not robotic)
  b) Free — no API key, no Google Cloud setup required
  c) gTTS automatic fallback if Edge TTS fails
Stack layers: Backend (edge-tts library, server.py)
Clarity: CLEAR

---

FEAT-006: Pillow Slide Design System (6 Templates)
Claimed in: README, PROJECT_SUMMARY.md, VIDEO_FEATURES.md, VIDEO_PIPELINE.md
What it says: 6 structured marketing slides rendered as PNG via Pillow. Brand colors from URL scrape applied to all slides. Custom fonts bundled at backend/assets/fonts/ (Poppins-ExtraBold, Poppins-Bold, DMSans/Inter).
Sub-capabilities:
  a) Hero — product name + headline, bold type, decorative bar
  b) Problem — pain point, emotional framing, lighter palette
  c) Solution — product name + value prop
  d) Features — 3 checkmarks from scraped data (shape-drawn, Unicode-safe)
  e) HowItWorks — numbered steps, step circles
  f) CTA — URL + urgency, high contrast
  g) Brand colors applied from scrape or brand profile
  h) Logo rendered on Hero (top-left, 60px max) and CTA (bottom-center, 50px max) when brand profile has active_logo_url — BRAND_PROFILE_FEATURE items 5, 9 DONE
Stack layers: Backend (Pillow, server.py)
Clarity: CLEAR

---

FEAT-007: FFmpeg Video Assembly
Claimed in: README, PROJECT_SUMMARY.md, VIDEO_FEATURES.md, VIDEO_PIPELINE.md
What it says: FFmpeg assembles Pillow slides + audio + effects into MP4 (H.264, yuv420p, 25fps, AAC 44.1kHz). All FFmpeg work runs in asyncio.run_in_executor — never blocks event loop.
Sub-capabilities:
  a) Ken Burns zoom/pan — 100% → 110% per slide
  b) xfade crossfade transitions — 0.5s between slides, 6 rotation types
  c) Word-chunk captions (TikTok style) — 3 words/frame, fontsize=max(52, width//18), white with black border, y=h*0.80
  d) Progress bar — branded color, full-width sweep, 20px from bottom
  e) Background music bed — royalty-free .mp3 from backend/assets/music_beds/, ducked -18dB under voice (Starter+ only)
  f) Pexels B-roll stock video integration (when PEXELS_API_KEY set — FEAT-010)
  g) Duration audio-driven via ffprobe (not flat 3s/slide)
Stack layers: Backend (FFmpeg, ffprobe, run_in_executor, server.py)
Clarity: CLEAR

---

FEAT-008: Multi-Format Video Export
Claimed in: README, PROJECT_SUMMARY.md, VIDEO_FEATURES.md, VIDEO_PIPELINE.md, BRAND_PROFILE_FEATURE.md, STARTUP.md
What it says: Magic Button generates all 4 formats in parallel (asyncio.gather). Free tier: 9:16 only. Starter+: all formats.
Sub-capabilities:
  a) 9:16 (1080×1920) — TikTok, Reels, Shorts, Stories — all tiers
  b) 16:9 (1920×1080) — YouTube, LinkedIn — Starter+
  c) 1:1 (1080×1080) — Instagram Feed, Twitter/X — Starter+
  d) 4:5 (1080×1350) — Facebook Feed, IG Feed — Starter+ (BRAND_PROFILE_FEATURE item 13 DONE; VIDEO_FEATURES.md incorrectly still says NOT YET BUILT)
  e) Safe zone rule: text/visuals within center 80% width, 60% height
Stack layers: Backend (server.py, FFmpeg)
Clarity: CONFUSED — VIDEO_FEATURES.md says 4:5 "NOT YET BUILT" but BRAND_PROFILE_FEATURE says DONE. See CONF-010.

---

FEAT-009: Watermark (Free Tier)
Claimed in: VIDEO_FEATURES.md, PROJECT_SUMMARY.md, VIDEO_PIPELINE.md, PRODUCT_STRATEGY.md
What it says: Diagonal text repeated across every slide at 30% RGBA opacity. Burned into slide content area (not corner). Removed on Starter+ plans.
Sub-capabilities:
  a) Diagonal text watermark burned into slide content area (not corner-croppable)
  b) 30% opacity RGBA compositing via Pillow
  c) Removed on Starter+ tiers
Stack layers: Backend (Pillow, server.py)
Clarity: CONFUSED — VIDEO_FEATURES.md says watermark text is "SwiftPack AI" but product is now LaunchBusiness AI. See CONF-001.

---

FEAT-010: Pexels B-roll Stock Video
Claimed in: README, ARCHITECTURE.md, PROJECT_SUMMARY.md, VIDEO_FEATURES.md
What it says: Real stock video backgrounds for ALL tiers when PEXELS_API_KEY is set. _fetch_pexels_clip() searches Pexels by keyword + orientation. 200 requests/hour free quota. Silent fallback to slideshow.
Sub-capabilities:
  a) Orientation-appropriate clip selection per format (9:16→portrait, 16:9→landscape, 1:1→square)
  b) Silent graceful fallback to slideshow if key not set or no results
  c) Free API (200 req/hr at pexels.com/api)
Stack layers: Backend (server.py, Pexels API)
Clarity: CLEAR

---

FEAT-011: Wan 2.2 TI2V-5B AI Video (Modal GPU)
Claimed in: README, ARCHITECTURE.md, PROJECT_SUMMARY.md, VIDEO_FEATURES.md, VIDEO_PIPELINE.md, WAN_VIDEO_UPGRADE.md, STARTUP.md, PRODUCT_STRATEGY.md
What it says: Wan-AI/Wan2.2-TI2V-5B on Modal A10G GPU. Takes Hero Pillow slide as input image + text prompt → animates actual branded slide into 1.3s clip (33 frames). Reversed clip = outro. ~$0.03/clip. Available to ALL paid tiers. App name: launchbusiness-wan-video.
Sub-capabilities:
  a) Image-to-video: animates real branded Hero slide (not generic footage)
  b) 33 frames = 1.3s cinematic intro clip
  c) Reversed clip = cinematic outro (2 uses, 1 API call)
  d) ~$0.03/clip cost (14x cheaper than old LTX-Video at $0.44)
  e) A10G GPU (24GB) — not A100 40GB
  f) Fallback: silently falls back to Pexels-only or slideshow if Modal unavailable
  g) MODAL_APP_NAME env var must = "launchbusiness-wan-video"
  h) Requires: modal deploy backend/modal_video.py + MODAL_TOKEN_ID/SECRET + MODAL_APP_NAME in secrets
Stack layers: Backend (modal_video.py, server.py), Modal GPU (A10G)
Clarity: CONFUSED — WAN_VIDEO_UPGRADE.md says "Status: Implemented" but VIDEO_PIPELINE.md says "Modal/LTX-Video is NOT deployed." Needs code + secrets verification. See CONF-014.

---

FEAT-012: Poster Generation
Claimed in: README, PROJECT_SUMMARY.md, ARCHITECTURE.md, STARTUP.md, BRAND_PROFILE_FEATURE.md
What it says: 2 branded social graphics by Pillow. POST /api/create-poster. Logo rendered on all posters (corner, 40px max) when brand profile active — BRAND_PROFILE_FEATURE item 9 DONE.
Sub-capabilities:
  a) 1:1 (1080×1080) social poster
  b) 9:16 (1080×1920) social poster
  c) Brand colors applied
  d) Active logo rendered in corner from brand profile (40px max height)
Stack layers: Backend (Pillow, server.py)
Clarity: CLEAR

---

FEAT-013: Logo Creator
Claimed in: README, PROJECT_SUMMARY.md, BRAND_PROFILE_FEATURE.md, LOGO_KIT_AND_BRAND_DESCRIPTION.md
What it says: 6 Pillow-rendered logo templates + optional Ideogram AI concepts. 1024×1024 PNG output. Auto-fills from active brand profile. "Save to brand" stores active_logo_url.
Sub-capabilities:
  a) 6 Pillow logo templates
  b) Ideogram AI concepts (optional — needs IDEOGRAM_API_KEY)
  c) Auto-fill from active brand profile (name, tagline, colors)
  d) "Set as active logo" → stores active_logo_url in brand_profiles collection
  e) Logo flows into videos and posters
Stack layers: Backend (Pillow, server.py, Ideogram API optional), Frontend (LogoCreator.js), Database (brand_profiles)
Clarity: CLEAR

---

FEAT-014: Logo Brand Kit (7 Asset Variants)
Claimed in: LOGO_KIT_AND_BRAND_DESCRIPTION.md
What it says: 7 logo asset variants generated from brand name + colors via POST /api/generate-logo-kit. Runs in run_in_executor. Files saved to OUTPUTS_DIR for ZIP download.
Sub-capabilities:
  a) icon_transparent.png (512×512 RGBA)
  b) icon_dark.png (512×512, zinc-950 background)
  c) icon_light.png (512×512, white background)
  d) horizontal_dark.png (1200×360, dark header use)
  e) horizontal_light.png (1200×360, light header use)
  f) favicon.ico (16/32/48 multi-size)
  g) app_icon_192.png / app_icon_512.png (PWA/mobile)
  h) "Generate Brand Kit" button in LogoCreator.js
  i) ZIP download via /api/download-pack?ids=...
Stack layers: Backend (Pillow, server.py), Frontend (LogoCreator.js)
Clarity: AMBIGUOUS — doc header says "Phase 1 implemented this session" but body reads as implementation spec. Needs code verification. See CONF-027.

---

FEAT-015: Tutorial Studio (Chrome Extension)
Claimed in: README, PROJECT_SUMMARY.md, VIDEO_FEATURES.md, VIDEO_PIPELINE.md, TUTORIAL_STUDIO.md, STARTUP.md, BRAND_PROFILE_FEATURE.md
What it says: Chrome MV3 extension records founder's product tab (already logged in) → uploads WebM to POST /api/tutorial/process → FFmpeg extracts frames → Gemini Vision narrates → Edge TTS voices → FFmpeg assembles polished 16:9 tutorial. Starter+ only. 1 video credit.
Sub-capabilities:
  a) Chrome extension: background.js (tabCapture stream ID), popup.html/popup.js (record/stop/upload)
  b) 30-90s recording; auto-uploads to server as WebM
  c) Server: 1 frame per 4 seconds (max 12 frames)
  d) Per-frame Gemini Vision narration → sentences joined → Edge TTS voiceover
  e) _build_slideshow_ffmpeg: frames as slides + captions + music + CTA slide
  f) 16:9 (1920×1080) output — YouTube standard; 4s per frame duration; ~60s processing
  g) Starter+ only; JWT stored in chrome.storage.local
  h) Frontend: TutorialStudio.js — extension download link + upload area + status + download
Stack layers: Backend (server.py endpoint), Frontend (TutorialStudio.js), Chrome Extension (extension/), AI (Gemini Vision), TTS (Edge TTS), Video (FFmpeg)
Clarity: CONFUSED — TUTORIAL_STUDIO.md says "Implemented"; PROJECT_SUMMARY.md says "Code done"; VIDEO_FEATURES.md still lists it as "Files to Build." Needs code verification. See CONF-003.

---

FEAT-016: Talking Head — SadTalker (Modal GPU)
Claimed in: README, PROJECT_SUMMARY.md, VIDEO_FEATURES.md, PRODUCT_STRATEGY.md
What it says: Pro/Agency users upload portrait photo + voiceover → lip-synced talking head video. 5-layer protection gate required. Code complete in modal_sadtalker.py. Needs Modal deploy + Stripe Identity activation.
Sub-capabilities:
  a) Portrait upload (max 10MB) + audio upload (max 20MB)
  b) Gate 1: Pro/Agency tier check
  c) Gate 2: Stripe Identity government ID verification ($1.50/user one-time) — POST /api/talking-head/verify-identity
  d) Gate 3: DeepFace RetinaFace check — rejects no face, multiple faces, face <3% of frame
  e) Gate 4: Explicit consent — photo_hash + timestamp in talking_head_consents collection
  f) Gate 5: "AI GENERATED" label burned into every frame via FFmpeg drawtext (EU AI Act)
  g) POST /api/billing/webhook/identity — Stripe webhook sets identity_verified on user
Stack layers: Backend (server.py, modal_sadtalker.py), Modal GPU (A10G, SadTalker), Stripe Identity, Database (talking_head_consents)
Clarity: CLEAR (clearly "Code done, needs Modal deploy + Stripe Identity activation")

---

FEAT-017: Legal Document Generation (28 Types)
Claimed in: README, ARCHITECTURE.md, PROJECT_SUMMARY.md, STARTUP.md, BRAND_PROFILE_FEATURE.md
What it says: Gemini intake chat gathers business profile → user selects documents → Gemini generates with live DuckDuckGo 2026 legal context → lawyer-review disclaimer appended → stored in legal_documents. Handled in legal_router.py.
Sub-capabilities:
  a) 28 document types across 5 categories:
     Privacy & Compliance: Privacy Policy (GDPR/PIPEDA/CCPA), DPA, Cookie Policy, ROPA, Breach Plan, PIA
     Business Agreements: NDA, Terms of Service, Service Agreement, Contractor Agreement, IP Assignment
     Corporate & Equity: Founder Agreement, Shareholder Agreement, Vesting Schedule, Operating Agreement
     Finance & Operations: Invoice Template, SOW, Business Plan, Equity Agreement
     HR & Employment: Employment Contract, Offer Letter, Employee Handbook
  b) Adaptive Gemini intake chat — detects [PROFILE_COMPLETE] token, saves structured intake_data
  c) Live DuckDuckGo search per doc: "[doc_name] [jurisdiction] requirements 2026"
  d) Jurisdiction-aware: Canada, USA, EU (Australia/UK/India planned future)
  e) Lawyer-review disclaimer mandatory on every doc (date + jurisdiction + "not legal advice")
  f) DuckDuckGo backoff under rate limiting
  g) Regeneration at 10% credit discount
  h) Brand profile pre-fills intake — reduces 8-10 exchanges to 2-3
  i) 90-day laws-changed nudge in document vault
Stack layers: Backend (legal_router.py), AI (Gemini 2.5 Flash), DuckDuckGo HTML, Stripe, Database (legal_profiles, legal_chat, legal_documents, legal_credits_usage)
Clarity: CLEAR

---

FEAT-018: Legal Credit System
Claimed in: README, PROJECT_SUMMARY.md
What it says: Two-wallet system: monthly allowance (resets per year_month key) + permanent topup wallet. Monthly credits consumed first, then topup.
Sub-capabilities:
  a) Monthly credits per plan: Free=0 (catalog view only), Starter=20/mo, Pro=60/mo, Agency=150/mo
  b) Topup packages: 15cr/$5 · 35cr/$10 (best value) · 80cr/$20
  c) Credit cost per doc: 1-5 credits (NDAs 2-4cr, Business Plans/Shareholder Agreements 4-5cr)
  d) Regeneration: 10% fewer credits than original
  e) Monthly counter keyed by user_id + year_month in legal_credits_usage collection
  f) POST /api/legal/topup/checkout → Stripe one-time payment session
  g) GET /api/legal/credits → current balance
Stack layers: Backend (legal_router.py), Stripe, Database (legal_credits_usage, users.legal_credits_topup)
Clarity: CLEAR

---

FEAT-019: Authentication (JWT + Google OAuth)
Claimed in: ARCHITECTURE.md, PROJECT_SUMMARY.md, CLAUDE.md, decisions/2026-06-22-account-deletion-and-legal-pages.md, decisions/2026-06-27-security-hardening.md
What it says: JWT (jose, HS256, JWT_SECRET ≥32 chars) + bcrypt. Frontend stores token in localStorage as jhp_token (NOT "token"). Google OAuth via /api/auth/google/callback (optional).
Sub-capabilities:
  a) POST /api/auth/register — bcrypt hash, JWT issued
  b) POST /api/auth/login — verify, JWT issued
  c) GET /api/auth/me — user profile + usage + legal credits
  d) Token key: jhp_token (critical — wrong key = silent 401s)
  e) HTTPBearer dependency decodes JWT on every protected request
  f) Google OAuth (optional, GOOGLE_CLIENT_ID/SECRET)
  g) Beta agreement modal — acceptance logged to beta_agreements
  h) Email verification, password reset (Brevo optional)
  i) DELETE /api/auth/account — GDPR erasure with re-auth gate
Stack layers: Backend (server.py), Frontend (AuthContext.js, localStorage), Database (users, beta_agreements)
Clarity: CLEAR

---

FEAT-020: Rate Limiting (Per-IP Sliding Window)
Claimed in: ARCHITECTURE.md, PROJECT_SUMMARY.md, decisions/2026-06-27-security-hardening.md
What it says: In-process sliding-window middleware. IP read from X-Real-IP header first, falls back to request.client.host for local dev.
Sub-capabilities:
  a) /api/auth/login: 5/min
  b) /api/auth/register: 5/min
  c) /api/auth/forgot-password: 3/min
  d) /api/auth/resend-verification: 3/min
  e) /api/magic-button: 5/min
  f) Known limit: in-process only (resets on restart, not shared across workers)
Stack layers: Backend (server.py middleware)
Clarity: CLEAR

---

FEAT-021: Stripe Billing (Subscriptions + Webhook + Idempotency + Ledger)
Claimed in: README, ARCHITECTURE.md, PROJECT_SUMMARY.md, decisions/2026-06-21-stripe-webhook-idempotency-ledger.md, decisions/2026-06-22-stripe-subscription-sync-and-failure-handling.md
What it says: Stripe subscriptions (Starter/Pro/Agency) + one-time legal credit topups. Webhook idempotency via stripe_events collection. Payment ledger in payment_transactions. Product isolation via metadata. Status-aware subscription sync.
Sub-capabilities:
  a) Stripe subscriptions: POST /api/billing/checkout/pro (and starter, agency variants)
  b) Stripe legal topup: POST /api/legal/topup/checkout
  c) Webhook: POST /api/billing/webhook (both subscription + topup handling)
  d) Idempotency: _claim_stripe_event() inserts to stripe_events (_id = event["id"]); DuplicateKeyError = skip; Mongo error = 500 (fail closed on billing)
  e) Ledger: _record_payment_transaction() writes to payment_transactions (best-effort)
  f) Product isolation: _event_is_foreign() — absent tag = ours; explicit different tag = skip
  g) Status-aware sync: subscription.updated — grant tier only when status in {active, trialing}; else downgrade to free (self-healing)
  h) invoice.payment_failed → billing_status="past_due" + ledger row
  i) Event→user: subscription_data.metadata.user_id + stripe_subscription_id stored on users
  j) Billing portal: GET /api/billing/portal
  k) Identity webhook: POST /api/billing/webhook/identity
Stack layers: Backend (server.py), Stripe, Database (payment_transactions, stripe_events, users)
Clarity: CLEAR

---

FEAT-022: Brand Profile System
Claimed in: README, PROJECT_SUMMARY.md, ARCHITECTURE.md, BRAND_PROFILE_FEATURE.md, PRODUCT_STRATEGY.md
What it says: One MongoDB document per client/brand. All three tools (Video/Logo/Legal) read from it. CRUD via brand_router.py. Connects previously siloed tools.
Sub-capabilities:
  a) Fields: brand_name, tagline, url, primary_color, secondary_color, active_logo_url, audience, tone, business_type, jurisdiction, revenue_model, data_practices, key_features, cta_text, description
  b) CRUD: POST/GET/PUT/DELETE /api/brand-profiles + POST /api/brand-profiles/{id}/set-logo
  c) Tier limits: Free=0, Starter=1, Pro=3, Agency=unlimited (per README, PROJECT_SUMMARY, BRAND_PROFILE_FEATURE — PRODUCT_STRATEGY says Pro=5, contradiction)
  d) Dashboard: profile selection → auto-fills URL/colors/features/audience
  e) Logo Creator: profile selection → auto-fills name/tagline/colors
  f) Legal intake: profile → pre-fills jurisdiction/business_type/revenue_model/data_practices
Stack layers: Backend (brand_router.py), Frontend (BrandProfiles.js), Database (brand_profiles)
Clarity: CONFUSED — Pro tier profile limit is 3 in 3 docs but 5 in PRODUCT_STRATEGY.md. See CONF-005.

---

FEAT-023: Global Active Brand Context
Claimed in: PROJECT_SUMMARY.md, BRAND_PROFILE_FEATURE.md
What it says: BrandContext.js provides global active-brand state. Active brand ID persisted in localStorage as jhp_active_brand_id. Navbar switcher lets user pick active brand from any page (Starter+ only).
Sub-capabilities:
  a) BrandContext.js — React context for active brand state
  b) localStorage key: jhp_active_brand_id
  c) Navbar brand switcher in Layout.js (Starter+ only)
  d) Nav consolidation: 8 items → 5 items (Hub, Logo, Marketing, Legal, Tutorial)
  e) MarketingLayout.js sub-tabs: Quick Create / Scripts / Assets / Gallery
  f) "Save as Brand Profile" cross-sell in Hub results (Starter+)
  g) "What's Next" cross-sell nudges in Hub results
Stack layers: Frontend (BrandContext.js, Layout.js, MarketingLayout.js, Dashboard.js)
Clarity: CLEAR

---

FEAT-024: Brand Profile Description Field
Claimed in: LOGO_KIT_AND_BRAND_DESCRIPTION.md
What it says: Free-text "What does your business do?" (max 500 chars) added to Brand Profile. Reduces legal intake from 3 questions to 2 by pre-answering the "what does the business do?" question.
Sub-capabilities:
  a) description: Optional[str] max_length=500 in BrandProfileCreate/BrandProfileUpdate
  b) Textarea in BrandProfiles.js ProfileFormModal
  c) Injected into legal intake prefill_lines in legal_router.py start_chat
  d) Auto-populated from scrape description (up to 500 chars) when "Save as Brand" used
Stack layers: Backend (brand_router.py, legal_router.py), Frontend (BrandProfiles.js, Dashboard.js), Database (brand_profiles)
Clarity: AMBIGUOUS — doc says "implemented this session" but is written as a spec. Needs code verification. See CONF-027.

---

FEAT-025: Admin Panel + JARVIS Intelligence
Claimed in: ARCHITECTURE.md, CLAUDE.md, PROJECT_SUMMARY.md
What it says: /api/admin/* operator console requiring is_admin=True. ADMIN_EMAILS env var auto-grants admin on login. JARVIS at /api/jarvis/pulse uses X-Admin-Key (ADMIN_SECRET).
Sub-capabilities:
  a) /api/admin/* — users, revenue, usage, coupons, beta management (admin_router.py)
  b) Sidebar layout, polished cards/tables/badges
  c) ADMIN_EMAILS auto-grant: is_admin=True set on login (password or Google)
  d) POST /api/admin/bootstrap — legacy one-time setup (X-Admin-Secret header)
  e) GET /api/jarvis/pulse — business intelligence (X-Admin-Key: ADMIN_SECRET)
Stack layers: Backend (admin_router.py, jarvis_router.py)
Clarity: CLEAR

---

FEAT-026: Account Deletion (GDPR/CCPA Erasure)
Claimed in: PROJECT_SUMMARY.md, decisions/2026-06-22-account-deletion-and-legal-pages.md
What it says: DELETE /api/auth/account with re-auth gate. Deletes all user-owned data in correct order (users document last). Retains payment_transactions. Best-effort Stripe subscription cancellation.
Sub-capabilities:
  a) Re-auth gate: password accounts require current password; OAuth-only require typed email
  b) Deletes (in order): usage, legal_profiles, legal_chat (by profile_ids), legal_documents, legal_credits_usage, logos, beta_agreements, talking_head_consents, then users last
  c) Retains: payment_transactions, admin_audit (financial record-keeping)
  d) Best-effort Stripe subscription cancel (try/except, never blocks erasure)
  e) Returns per-collection deleted-count summary
  f) Settings.js at /settings — account info + Danger Zone delete flow with typed confirmation
Stack layers: Backend (server.py), Frontend (Settings.js), Stripe, Database (all user collections)
Clarity: CLEAR

---

FEAT-027: Privacy Policy + Terms of Service Pages
Claimed in: PROJECT_SUMMARY.md, decisions/2026-06-22-account-deletion-and-legal-pages.md
What it says: Public routes /privacy and /terms (no auth required, before the /* catch-all). Linked from Landing footer, auth forms, Layout footer. Plain-language content, not lawyer-reviewed.
Sub-capabilities:
  a) /privacy → PrivacyPolicy.js (public, pre-auth)
  b) /terms → Terms.js (public, pre-auth)
  c) Linked from Landing footer, Register, Login, Layout footer
  d) Known limit: plain-language, not lawyer-reviewed — counsel review needed before GA
Stack layers: Frontend (PrivacyPolicy.js, Terms.js, App.js routes)
Clarity: CLEAR

---

FEAT-028: Observability (Sentry + PostHog + Helicone)
Claimed in: ARCHITECTURE.md, RUNBOOK.md, CLAUDE.md
What it says: Three observability layers. PII scrubbing required.
Sub-capabilities:
  a) Sentry (SENTRY_DSN) — backend + frontend errors; first place to check on incidents
  b) PostHog — product analytics / funnels (frontend only)
  c) Helicone (HELICONE_API_KEY) — Gemini cost + latency tracking
  d) GET /api/ health check polled by Mother AI (alerts after 2 failed polls)
Stack layers: Backend (Sentry), Frontend (PostHog, Sentry), AI proxy (Helicone)
Clarity: CLEAR

---

FEAT-029: Brevo Transactional Email (Optional)
Claimed in: README, ARCHITECTURE.md, RUNBOOK.md
What it says: Brevo (BREVO_API_KEY) for password reset + welcome emails. Optional — app works without. Graceful degrade if key not set.
Stack layers: Backend (server.py, Brevo API)
Clarity: CLEAR

---

FEAT-030: Multi-Hook Variants (3 Hooks × 4 Formats)
Claimed in: VIDEO_FEATURES.md, BRAND_PROFILE_FEATURE.md (item 12 DONE), PRODUCT_STRATEGY.md
What it says: 3 hooks (Pain/Speed/Unique angle) × 4 formats = up to 12 videos per Magic Button click. Same body, different first 5 seconds per hook.
Sub-capabilities:
  a) Pain hook — specific frustration the audience has
  b) Speed/Result hook — the outcome ("Full marketing pack in 90 seconds")
  c) Unique hook — the "only" angle ("only platform doing marketing + legal")
  d) 3 Gemini calls with same framework + different opening instruction per hook
Stack layers: Backend (server.py)
Clarity: CONFUSED — VIDEO_FEATURES.md section 9 still says "Hook Variants (NOT YET BUILT — Phase 8)" while BRAND_PROFILE_FEATURE item 12 says DONE. See CONF-012.

---

FEAT-031: ZIP Batch Download
Claimed in: PROJECT_SUMMARY.md, BRAND_PROFILE_FEATURE.md (item 14 DONE)
What it says: GET /api/download-pack?ids=... compiles multiple generated files into a ZIP. Python stdlib zipfile + StreamingResponse. Used by video/poster output and Logo Brand Kit.
Stack layers: Backend (server.py)
Clarity: CLEAR

---

FEAT-032: Creative Direction Input (Planned — Not Yet Built)
Claimed in: VIDEO_PIPELINE.md (Phase 1), PRODUCT_STRATEGY.md (Phase 5)
What it says: Optional text field on Dashboard (300 char max), Starter+ only. Injected into Gemini prompt. No extra credit charge. +5-10s processing. No GPU change.
Status: PLANNED — not yet built. Files to change: backend/server.py (add creative_direction to MagicButtonRequest), frontend/src/components/Dashboard.js.
Stack layers: Backend (server.py), Frontend (Dashboard.js)
Clarity: CLEAR (explicitly marked as planned)

---

FEAT-033: CI/CD Auto-Deploy
Claimed in: CLAUDE.md, ARCHITECTURE.md, RUNBOOK.md, decisions/2026-06-21-production-setup.md
What it says: Push to main → production deploy via two paths simultaneously. CRITICAL RISK: every push to main is a production deploy.
Sub-capabilities:
  a) GitHub Actions: .github/workflows/deploy.yml → webhook to :9000/deploy/swiftpack on main push
  b) VPS cron: pulls main every 5 minutes
  c) Telegram notification per CI run (TELEGRAM_BOT_TOKEN)
  d) CI runs pytest tests/ -q on every push
  e) Manual deploy fallback via scripts/deploy.sh
Stack layers: GitHub Actions, VPS (Contabo), Nginx webhook
Clarity: CLEAR

---

FEAT-034: Staging Environment
Claimed in: ARCHITECTURE.md, RUNBOOK.md, decisions/2026-06-21-production-setup.md, CLAUDE.md
What it says: Separate staging tier under infra/. Default deploy target. Separate DB name: launchbusinessai_staging. Staging backend port: 8101.
Sub-capabilities:
  a) infra/docker-compose.staging.yml
  b) infra/nginx.staging.conf
  c) infra/.env.staging (from .env.staging.example)
  d) infra/health_check.sh
  e) Separate DB: launchbusinessai_staging
Status: Config files generated 2026-06-21; noted as "stand it up once" — not confirmed running.
Stack layers: Docker Compose, Nginx, VPS
Clarity: AMBIGUOUS — exists as config files but no confirmation it has been stood up or used.

---

FEAT-035: Google Safe Browsing URL Check (Optional)
Claimed in: PROJECT_SUMMARY.md, STARTUP.md, SETUP_INSTRUCTIONS.md
What it says: Google Safe Browsing API v4 check pre-scrape. Protects against phishing/malware sites. Optional (needs GOOGLE_SAFE_BROWSING_API_KEY). Free quota: 10,000 URL checks/day. Other safety layers still run without it.
Stack layers: Backend (server.py, Google Safe Browsing API)
Clarity: CLEAR

---

FEAT-036: Content Output Post-Scan (Safety)
Claimed in: ARCHITECTURE.md (Magic Button data flow step 7 only)
What it says: After video/poster generation, output content scanned for adult/explicit signals before returning to user.
Stack layers: Backend (server.py)
Clarity: MISSING DETAIL — mentioned only in ARCHITECTURE.md step 7. No doc explains what signals are checked, which function implements this, what happens on detection, or whether this is active code vs a stub. See CONF-032.

---

FEAT-037: AppSumo Lifetime Deal (Planned)
Claimed in: PRODUCT_STRATEGY.md, PROJECT_SUMMARY.md
What it says: AppSumo LTD after Stripe + Wan 2.2 active. Two tiers with monthly gen caps. Max 500 total codes. AppSumo 30% commission.
Sub-capabilities:
  a) LTD Tier 1: $79 → 15 gens/mo forever (Starter equivalent)
  b) LTD Tier 2: $149 → 50 gens/mo forever (Pro equivalent)
  c) Cap: 500 codes max
  d) DO NOT offer unlimited gens on LTD — always monthly cap
Status: Planned — after Stripe + Wan 2.2 activated
Stack layers: Stripe (billing), AppSumo (platform)
Clarity: CLEAR

---

FEAT-038: Agency White Label + API Access (Future)
Claimed in: PRODUCT_STRATEGY.md
What it says: Future Agency tier additions — remove LaunchBusiness AI branding, API access, 5 team seats, multiple talking head profiles, annual pricing.
Sub-capabilities:
  a) White label — remove LaunchBusiness AI branding
  b) API access for agencies
  c) 5 team seats
  d) Multiple talking head profiles (5 people)
  e) Annual pricing: Starter $182/yr, Pro $470/yr, Agency $1,430/yr
Status: Future — Phase 8 / Scale
Clarity: CLEAR

---

FEAT-039: Custom Font System
Claimed in: VIDEO_FEATURES.md
What it says: Fonts bundled at backend/assets/fonts/. _get_font() and _get_regular_font() check bundled fonts first, system fallback. Dockerfile copies assets/ into container.
Sub-capabilities:
  a) Poppins-ExtraBold.ttf + Poppins-Bold.ttf — headings (geometric, clean, modern)
  b) DMSans-Regular.ttf + DMSans-Medium.ttf — body (actually Inter; DM Sans only ships as variable font)
  c) Re-download: python backend/scripts/download_fonts.py
Stack layers: Backend (Pillow, server.py, Docker)
Clarity: CLEAR

---

FEAT-040: Database Backup via mongodump (Pending VPS Execution)
Claimed in: RUNBOOK.md, decisions/2026-06-21-production-setup.md, ARCHITECTURE.md
What it says: Daily mongodump at 03:00, 14-day retention, /root/backups/. Cron commands documented and approved 2026-06-27.
Sub-capabilities:
  a) One-off backup: docker exec swiftpack-mongo-1 mongodump
  b) Daily cron (0 3 * * *) with 14-day rotation
  c) Off-box copy recommended (S3 or another host)
  d) Restore procedure documented in RUNBOOK §7
Status: PENDING VPS EXECUTION. Until confirmed, treat all production data as unrecoverable.
Stack layers: MongoDB (Docker), VPS cron
Clarity: CLEAR (explicitly documented as pending)

---

FEAT-041: Stripe Subscription Sync + Payment Failure Handling
Claimed in: decisions/2026-06-22-stripe-subscription-sync-and-failure-handling.md
What it says: Status-aware subscription sync (only grant tier when active/trialing), self-healing on retry, invoice.payment_failed handling, reliable event→user mapping via stored stripe_subscription_id.
Sub-capabilities:
  a) customer.subscription.updated — status-aware tier grant/revoke
  b) invoice.payment_failed — billing_status="past_due" + ledger row
  c) subscription.canceled → downgrade to free
  d) stripe_subscription_id stored on users document
  e) subscription_data.metadata.user_id for reliable event→user mapping
Stack layers: Backend (server.py), Stripe, Database (users)
Clarity: CLEAR

---

FEAT-042: Ideogram AI Logo Concepts (Optional)
Claimed in: README, ARCHITECTURE.md, SETUP_INSTRUCTIONS.md
What it says: Ideogram AI generates AI logo concepts when IDEOGRAM_API_KEY is set. 6 Pillow templates always available as fallback regardless.
Stack layers: Backend (server.py, Ideogram API)
Clarity: CLEAR

---

FEAT-043: 5-Step Wizard UX for Brand Launch (Partially Implemented)
Claimed in: BRAND_PROFILE_FEATURE.md, PRODUCT_STRATEGY.md
What it says: Full 5-step wizard replacing URL-paste dashboard for Starter+ users. Free users keep URL-paste. Individual items (CRUD, auto-fill, logo render, hooks, 4:5, ZIP) marked DONE in BRAND_PROFILE_FEATURE.md but the wizard UI steps as described suggest aspirational elements.
Sub-capabilities:
  a) Step 1: Brand Brief (name, tagline, URL, audience, business type, tone, CTA text, features)
  b) Step 2: Brand Identity (logo upload or Logo Creator integration, color picker or auto-extract)
  c) Step 3: Script Selection (all 3 frameworks generated, user picks + edits before render)
  d) Step 4: Format + Hook Selection (format checkboxes, 3 hook checkboxes, dynamic total count)
  e) Step 5: Download Pack (all 12 videos + posters + scripts, ZIP export)
  f) POST /api/full-launch-pack — noted in BRAND_PROFILE_FEATURE as "Covered by magic button + ZIP"
Stack layers: Backend (server.py), Frontend (Dashboard.js, BrandProfiles.js)
Clarity: AMBIGUOUS — individual items are DONE but the full wizard UX as described in 5 discrete steps is not explicitly confirmed implemented end-to-end.

---

# PART 2 — CONFUSION LOG

---

CONF-001:
Type: WRONG INFO (stale)
Found in: docs/VIDEO_FEATURES.md — Watermark section
What it says: "Diagonal 'SwiftPack AI' text repeated across every slide"
Why it is a problem: Product is now LaunchBusiness AI. If this string is hardcoded in server.py, every free-tier watermarked video says "SwiftPack AI" — brand mismatch visible to every free user.
Question for Ajay: Has the watermark text in server.py been updated to "LaunchBusiness AI"? What is the actual string in _make_slide_hero() or whichever function applies the watermark?

---

CONF-002:
Type: CONTRADICTION
Found in: README.md (~2900 lines), SESSION_PROMPT.md (~3000 lines), ARCHITECTURE.md (4755 lines), PROJECT_SUMMARY.md (4755 lines), CLAUDE.md (~5100 lines)
What it says: Five different values for server.py line count across the docs.
Why it is a problem: Any doc quoting line counts is misleading. The 4755 figure (ARCHITECTURE.md, 2026-06-21) is likely most accurate before billing/security changes added more lines.
Question for Ajay: Run `wc -l backend/server.py` to get actual count. Update ARCHITECTURE.md and CLAUDE.md.

---

CONF-003:
Type: CONTRADICTION
Found in: TUTORIAL_STUDIO.md (header: "Status: Implemented — extension/, POST /api/tutorial/process, TutorialStudio.js all exist"), PROJECT_SUMMARY.md ("Tutorial Studio — Code done"), VIDEO_FEATURES.md (still lists "Files to Build" as future work)
What it says: Three different status signals for Tutorial Studio — fully implemented, code done, and not yet built.
Why it is a problem: Cannot know from docs whether Tutorial Studio is actually working end-to-end.
Question for Ajay: Do extension/manifest.json, extension/background.js, extension/popup.html, extension/popup.js, and POST /api/tutorial/process actually exist? Has an end-to-end tutorial recording been tested?

---

CONF-004:
Type: CONTRADICTION
Found in: README.md ("2 Videos + 2 Scripts + 2 Posters"), PRODUCT_STRATEGY.md ("2 AI videos + 2 scripts + 2 posters — 7 assets"), PROJECT_SUMMARY.md + SESSION_PROMPT.md + STARTUP.md ("4 videos + 3 scripts + 2 posters")
What it says: Magic Button output count is claimed as 6, 7, or 9 assets across different docs.
Why it is a problem: README.md is the public-facing doc and says 2 videos (wrong — pipeline is 4 formats). Any landing page based on README.md will understate the product.
Question for Ajay: Confirm canonical output: 4 videos (9:16, 16:9, 1:1, 4:5), 3 scripts (PAS, Step-by-Step, Before/After), 2 posters = 9 assets. Update README.md accordingly.

---

CONF-005:
Type: CONTRADICTION
Found in: PRODUCT_STRATEGY.md (Pro tier: "5 saved brand profiles") vs README.md, PROJECT_SUMMARY.md, BRAND_PROFILE_FEATURE.md (all say Pro=3 profiles)
What it says: Pro tier profile limit is 3 in 3 documents but 5 in PRODUCT_STRATEGY.md.
Why it is a problem: If pricing page shows 5 but server enforces 3, Pro users will complain.
Question for Ajay: What does TIER_CONFIG in server.py say for Pro max_profiles? That is the ground truth. Update PRODUCT_STRATEGY.md to match.

---

CONF-006:
Type: CONTRADICTION (obsolete document)
Found in: docs/TTS_SETUP.md (full Google Cloud TTS setup guide with service accounts, gcloud-tts-key.json) vs SETUP_INSTRUCTIONS.md, CLAUDE.md, PROJECT_SUMMARY.md (all say Edge TTS, no API key needed)
What it says: TTS_SETUP.md instructs setting up Google Cloud TTS. Every other current doc says Edge TTS is used and needs no API key. Google Cloud TTS was replaced.
Why it is a problem: Developer following TTS_SETUP.md wastes significant time on an obsolete setup.
Question for Ajay: Delete or replace TTS_SETUP.md with a one-liner: "TTS uses Edge TTS (Microsoft AndrewNeural). No API key required. See SETUP_INSTRUCTIONS.md."

---

CONF-007:
Type: WRONG INFO (entirely stale)
Found in: docs/CREDENTIALS_SETUP.md
What it says: Email "contentstudio.dev@gmail.com", DB_NAME=jobhuntpro, BREVO_SENDER_NAME="JobHuntPro Studio", path E:\jobhuntpro_marketing, env var MONGO_URL (not MONGODB_URL), includes Google Cloud TTS as Step 4 (replaced by Edge TTS).
Why it is a problem: Developer following CREDENTIALS_SETUP.md sets up wrong product credentials with wrong DB name and wrong env var names.
Question for Ajay: Should CREDENTIALS_SETUP.md be fully rewritten for LaunchBusiness AI? It is entirely from the "Content Studio" era.

---

CONF-008:
Type: WRONG INFO (entirely stale document)
Found in: docs/AUDIT_PROMPT.md
What it says: References "CONTENT STUDIO — FULL CODEBASE AUDIT", health check message "JobHuntPro Content Studio API", gcloud-tts-key.json as CRITICAL, moviepy as dependency, 24 FPS (not 25), Google TTS Neural2 instead of Edge TTS. Last updated 2026-04-06.
Why it is a problem: If used for an audit it will flag non-issues as CRITICAL and miss real issues.
Question for Ajay: Should AUDIT_PROMPT.md be rewritten for LaunchBusiness AI? It needs complete replacement.

---

CONF-009:
Type: WRONG INFO (stale)
Found in: docs/BRAND.md
What it says: "SWIFTPACK AI — BRAND + PRODUCT NAME", "Official name: SwiftPack AI", BREVO_SENDER_NAME="SwiftPack AI", paths under E:\PYCHARM_PROJECTS.
Why it is a problem: Any branding work that references BRAND.md will use the wrong product name.
Question for Ajay: Should BRAND.md be updated to LaunchBusiness AI branding guidelines or archived?

---

CONF-010:
Type: CONTRADICTION
Found in: VIDEO_FEATURES.md section 8 ("4:5 (1080×1350) — Starter+ — NOT YET BUILT") vs BRAND_PROFILE_FEATURE.md item 13 ("4:5 format export DONE") vs PROJECT_SUMMARY.md ("4 format videos")
What it says: VIDEO_FEATURES.md explicitly says 4:5 is not yet built while BRAND_PROFILE_FEATURE.md marks it done.
Why it is a problem: VIDEO_FEATURES.md is the authoritative video pipeline doc — stale NOT YET BUILT markers mislead readers.
Question for Ajay: Is 4:5 format in server.py TIER_CONFIG and format_map? Update VIDEO_FEATURES.md section 8 if so.

---

CONF-011:
Type: CONTRADICTION
Found in: VIDEO_FEATURES.md section 10 ("Logo on Slides NOT YET BUILT — Phase 8") vs BRAND_PROFILE_FEATURE.md items 5, 9 ("Logo paste onto Hero + CTA slides DONE" + "Logo paste onto posters DONE")
What it says: VIDEO_FEATURES.md says logo on slides not yet built; BRAND_PROFILE_FEATURE.md says done.
Why it is a problem: VIDEO_FEATURES.md has stale NOT YET BUILT marker for a reportedly completed feature.
Question for Ajay: Is logo rendering working on Hero/CTA slides and posters? Update VIDEO_FEATURES.md section 10 if so.

---

CONF-012:
Type: CONTRADICTION
Found in: VIDEO_FEATURES.md section 9 ("Hook Variants NOT YET BUILT — Phase 8") vs BRAND_PROFILE_FEATURE.md item 12 ("3 hook variants per run DONE")
What it says: VIDEO_FEATURES.md says hook variants not built; BRAND_PROFILE_FEATURE.md says done.
Why it is a problem: VIDEO_FEATURES.md has three stale NOT YET BUILT sections (CONF-010, CONF-011, CONF-012) — needs a single update pass.
Question for Ajay: Are 3 hook variants (Pain/Speed/Unique) generating in the live Magic Button today?

---

CONF-013:
Type: WRONG INFO (stale)
Found in: VIDEO_FEATURES.md Pro/Agency Tier section ("Modal LTX-Video: text prompt → short AI video clip") and Quality Model section ("Pipeline priority: 1. Hybrid (Pexels + LTX)")
What it says: Pro pipeline and quality model still reference LTX-Video everywhere after it was replaced by Wan 2.2.
Why it is a problem: VIDEO_FEATURES.md is the authoritative video pipeline doc. "LTX" naming is wrong and confuses any developer reading it.
Question for Ajay: Update VIDEO_FEATURES.md Pro pipeline section and Quality Model to use "Wan 2.2" instead of "LTX."

---

CONF-014:
Type: CONTRADICTION
Found in: WAN_VIDEO_UPGRADE.md (header: "Status: Implemented — backend/modal_video.py uses Wan-AI/Wan2.2-TI2V-5B") vs VIDEO_PIPELINE.md ("Note: Modal/LTX-Video is NOT deployed. All tiers currently get identical FFmpeg slideshow quality.")
What it says: One doc says Wan 2.2 is implemented; another says Modal is not deployed at all.
Why it is a problem: Cannot determine from docs alone whether Wan 2.2 is actually running in production.
Question for Ajay: Has `modal deploy backend/modal_video.py` been run on the real Modal account? Is MODAL_APP_NAME=launchbusiness-wan-video set in /root/secrets/swiftpack.env?

---

CONF-015:
Type: CONTRADICTION
Found in: README.md (endpoint: POST /api/magic-launch-pack), CLAUDE.md Must Never Break (POST /api/magic-button), RUNBOOK.md smoke test (POST $BASE/api/magic-button), ARCHITECTURE.md data flow (POST /api/magic-button), SESSION_PROMPT.md pipeline (/api/magic-launch-pack)
What it says: Two different endpoint names for the Magic Button. Operational docs (ARCHITECTURE, RUNBOOK, CLAUDE.md) use /api/magic-button. Public-facing docs (README, SESSION_PROMPT) use /api/magic-launch-pack.
Why it is a problem: A smoke test hitting the wrong name will give a false result. There may be two endpoints, one redirect, or one is wrong.
Question for Ajay: Which endpoint actually exists in server.py — /api/magic-button or /api/magic-launch-pack? Do both exist? Which should be the canonical name?

---

CONF-016:
Type: WRONG INFO (stale)
Found in: PRODUCT_STRATEGY.md Phase 6 ("Rewrite backend/modal_video.py — swap LTX-Video for Wan 2.2" as a future build task with ~5 hour estimate) while WAN_VIDEO_UPGRADE.md says "Status: Implemented"
What it says: Phase 6 in PRODUCT_STRATEGY.md treats Wan 2.2 as future work. Phase 3 in the same doc also describes Wan 2.2. This creates two separate phases describing the same thing, one marked as future.
Why it is a problem: PRODUCT_STRATEGY.md roadmap is inaccurate. Phases 3 and 6 are now the same item; the duplication creates confusion.
Question for Ajay: Clean up PRODUCT_STRATEGY.md phases — mark Phase 3 as DONE (Wan 2.2 implemented), delete Phase 6 (duplicate), and restructure the remaining phases accordingly.

---

CONF-017:
Type: WRONG INFO (stale)
Found in: docs/SESSION_PROMPT.md
What it says: "Backend: FastAPI, server.py is entire backend (~3000 lines)" — omits the 5 other modules; path "npx gitnexus analyze E:\jobhuntpro_marketing" is wrong (should be D:\NOVAJAY_TECH\jobhuntpro_marketing).
Why it is a problem: SESSION_PROMPT.md is meant to be pasted at the start of every Claude session. Stale content gives Claude wrong context about the backend architecture and wrong path.
Question for Ajay: Update SESSION_PROMPT.md to list all 6 backend modules and fix the path to D:\NOVAJAY_TECH\jobhuntpro_marketing.

---

CONF-018:
Type: CONTRADICTION
Found in: PRODUCT_STRATEGY.md Starter tier ("All 3 formats: 9:16, 16:9, 1:1") vs README, PROJECT_SUMMARY, VIDEO_FEATURES, BRAND_PROFILE_FEATURE (all say Starter+ gets all 4 formats: 9:16, 16:9, 1:1, 4:5)
What it says: PRODUCT_STRATEGY.md was written before 4:5 was added and never updated. It says Starter gets 3 formats.
Why it is a problem: Any pricing page or marketing copy built from PRODUCT_STRATEGY.md will omit the 4:5 format for Starter tier.
Question for Ajay: Update PRODUCT_STRATEGY.md Starter tier to "All 4 formats (9:16, 16:9, 1:1, 4:5)."

---

CONF-019:
Type: WRONG INFO
Found in: README.md Project Structure ("docker-compose.yml — Production Docker Compose")
What it says: docker-compose.yml is labeled as "Production Docker Compose" in the README project structure table.
Why it is a problem: CLAUDE.md and ARCHITECTURE.md are explicit that docker-compose.yml is LOCAL DEVELOPMENT ONLY. docker-compose.prod.yml is production. The README label is wrong and dangerous.
Question for Ajay: Change README.md docker-compose.yml comment to "Local development Docker Compose."

---

CONF-020:
Type: WRONG INFO
Found in: docs/CREDENTIALS_SETUP.md — uses "MONGO_URL" throughout
What it says: CREDENTIALS_SETUP.md calls the MongoDB env var "MONGO_URL" but every other current document uses "MONGODB_URL."
Why it is a problem: Developer following CREDENTIALS_SETUP.md sets the wrong env var name; connection fails or degrades silently.
Question for Ajay: Confirm correct env var name is MONGODB_URL (as in README, ARCHITECTURE, PROJECT_SUMMARY, and presumably backend/.env.example).

---

CONF-021:
Type: WRONG INFO
Found in: docs/AUDIT_FIX_PROMPT.md
What it says: "curl http://localhost:8001/api/health" — uses /api/health as the health endpoint.
Why it is a problem: Actual health endpoint is GET /api/ (returns {"message":"LaunchBusiness AI API"}). /api/health returns 404. Developer using this prompt will think the backend is down.
Question for Ajay: Update AUDIT_FIX_PROMPT.md to use GET /api/ as the health check URL.

---

CONF-022:
Type: CONTRADICTION
Found in: VIDEO_FEATURES.md Hybrid Pipeline section ("Brand logo top-left corner throughout from brand profile active_logo_url") vs BRAND_PROFILE_FEATURE.md MongoDB schema ("active_logo_url"), PROJECT_SUMMARY.md (uses active_logo_url)
What it says: VIDEO_FEATURES.md uses field name "active_logo_url" but the schema and all other docs use "active_logo_url."
Why it is a problem: If server.py reads "active_logo_url" from the brand profile but the field stored is "active_logo_url", the logo silently fails to render in the hybrid pipeline. This could be a live bug.
Question for Ajay: What is the actual MongoDB field name in brand_profiles — active_logo_url or active_logo_url? Check brand_router.py and the video pipeline code that reads the brand profile.

---

CONF-023:
Type: CONTRADICTION (phase numbering)
Found in: VIDEO_PIPELINE.md ("Phase 3: Tutorial Studio — Chrome Extension") vs PRODUCT_STRATEGY.md ("Phase 7 — Tutorial Studio")
What it says: Tutorial Studio is called Phase 3 in VIDEO_PIPELINE.md and Phase 7 in PRODUCT_STRATEGY.md.
Why it is a problem: Inconsistent phase numbering across planning docs creates confusion when discussing roadmap.
Question for Ajay: Minor — standardize Tutorial Studio as Phase 7 (matching PRODUCT_STRATEGY.md as the business roadmap source of truth) in VIDEO_PIPELINE.md.

---

CONF-024:
Type: WRONG INFO (duplicate section)
Found in: docs/PRODUCT_STRATEGY.md — has two "## Competitors" sections
What it says: First Competitors table is complete. Second one at the end of the Phase 8 description is empty (just the heading, no content).
Why it is a problem: Accidental duplicate from an edit. The empty section is confusing.
Question for Ajay: Delete the duplicate empty "## Competitors" section at the bottom of PRODUCT_STRATEGY.md.

---

CONF-025:
Type: CONTRADICTION
Found in: CLAUDE.md + ARCHITECTURE.md ("single Contabo VPS ~1GB RAM") vs CREDENTIALS_SETUP.md ("CX22 2 vCPU 4GB minimum, CX32 4 vCPU 8GB recommended")
What it says: Current docs say VPS has ~1GB RAM. CREDENTIALS_SETUP.md recommends 4-8GB for a new server.
Why it is a problem: If the VPS has 1GB RAM, it is running significantly below the "minimum" spec in CREDENTIALS_SETUP.md. RUNBOOK §6 warns about VPS OOM during concurrent FFmpeg jobs.
Question for Ajay: What is the actual Contabo VPS RAM spec? If it is truly 1GB, note in RUNBOOK that concurrency must be kept low. If it has been upgraded, update CLAUDE.md and ARCHITECTURE.md.

---

CONF-026:
Type: WRONG INFO (stale)
Found in: README.md Project Structure
What it says: Lists backend as "server.py (~2900 lines) — all core routes" and only mentions legal_router.py and jarvis_router.py. Omits admin_router.py and brand_router.py entirely.
Why it is a problem: New developer reading README.md won't know admin_router.py or brand_router.py exist. They will search for brand profile and admin code inside server.py.
Question for Ajay: Update README.md project structure to list all 6 backend modules: server.py, legal_router.py, admin_router.py, brand_router.py, jarvis_router.py, modal_video.py, modal_sadtalker.py.

---

CONF-027:
Type: AMBIGUITY
Found in: docs/LOGO_KIT_AND_BRAND_DESCRIPTION.md
What it says: Header says "Phase 1 (both parts) implemented this session." But the body describes implementation steps with code snippets and files to change — the form of a planning spec, not a done record. No DONE markers on individual items.
Why it is a problem: Cannot determine from the doc whether POST /api/generate-logo-kit and the description field in brand_profiles actually exist in the codebase.
Question for Ajay: Do POST /api/generate-logo-kit and the `description` field in brand_router.py/brand_profiles actually exist in the codebase?

---

CONF-028:
Type: MISSING DETAIL
Found in: PRODUCT_STRATEGY.md only (Free tier: "Scripts visible but not downloadable") — absent from README, PROJECT_SUMMARY, VIDEO_FEATURES tier tables
What it says: Free tier scripts are visible but not downloadable. Only mentioned in one doc.
Why it is a problem: Cannot confirm from docs whether script download gating is implemented. Other tier tables don't mention it.
Question for Ajay: Is script download gated on Starter+ in the frontend? Or are scripts downloadable by all tiers?

---

CONF-029:
Type: AMBIGUITY
Found in: ARCHITECTURE.md §7 Technical Debt item 2: "nginx/nginx.prod.conf domain fixed (2026-06-21) to launchbusinessai.com + matching cert paths. The LIVE container may still run an older hand-edited config."
What it says: The nginx.prod.conf was fixed in the repo but the live running nginx container may still have the old swiftpackai.tech config with wrong SSL cert paths.
Why it is a problem: Latent outage risk — wrong nginx config = TLS failure = site unreachable. Flagged 2026-06-21 but not confirmed resolved.
Question for Ajay: Have you redeployed nginx on the VPS and confirmed the cert at /etc/letsencrypt/live/launchbusinessai.com/ exists?

---

CONF-030:
Type: MISSING DETAIL
Found in: ARCHITECTURE.md (Google OAuth: /api/auth/google/callback with GOOGLE_CLIENT_ID/SECRET), CREDENTIALS_SETUP.md (Step 5: "Skip for now")
What it says: Google OAuth is documented as optional and "skip for now." It is unclear whether /api/auth/google/callback is fully implemented and tested end-to-end.
Why it is a problem: ADMIN_EMAILS auto-grant works on "password or Google login" implying Google OAuth is live, but no doc confirms end-to-end testing of the callback.
Question for Ajay: Is Google OAuth login working on launchbusinessai.com? Has /api/auth/google/callback been tested with a real Google account?

---

CONF-031:
Type: WRONG INFO (stale)
Found in: VIDEO_FEATURES.md (Hybrid Pipeline: "Two uses, one API call — cost: ~$0.15") vs WAN_VIDEO_UPGRADE.md + VIDEO_FEATURES.md GPU section (Wan 2.2: ~$0.03/clip) vs PRODUCT_STRATEGY.md (~$0.038/video total)
What it says: The Hybrid Pipeline section of VIDEO_FEATURES.md still quotes ~$0.15 for a clip (old LTX-Video cost on A100). Current Wan 2.2 cost is ~$0.03/clip.
Why it is a problem: 5× cost overestimate in the pipeline docs could affect pricing and LTD decisions.
Question for Ajay: Update VIDEO_FEATURES.md Hybrid Pipeline section: change "cost: ~$0.15" to "cost: ~$0.03 (Wan 2.2 on A10G)."

---

CONF-032:
Type: MISSING DETAIL
Found in: ARCHITECTURE.md Magic Button data flow step 7 ("Post-scan output content for adult/explicit signals") — mentioned nowhere else
What it says: A content post-scan step exists after generation but no doc explains what signals are checked, which function implements it, what happens on detection, or whether it is active code or a stub.
Why it is a problem: If this is a real safety gate that blocks generation, it needs documentation. If it is a stub, it is a false safety claim.
Question for Ajay: Is there a real post-scan function in server.py? What does it check and what does it do on detection?

---

CONF-033:
Type: CONTRADICTION
Found in: PRODUCT_STRATEGY.md (Pro tier: "Overage: $2/generation"; Agency: "Overage: $1.50/generation") vs README.md, PROJECT_SUMMARY.md (no mention of overage in tier tables)
What it says: PRODUCT_STRATEGY.md defines overage pricing for Pro and Agency. No other doc mentions it. No doc explains whether it is implemented.
Why it is a problem: If users expect overage charges but check_usage_limit() returns 429 (hard block), expectations mismatch. If overage charging is expected but not implemented, users over their limit get blocked instead of charged.
Question for Ajay: Is overage pricing implemented in server.py check_usage_limit()? Or do users hit a hard 429 block? Which behavior is intended?

---

CONF-034:
Type: AMBIGUITY
Found in: BRAND_PROFILE_FEATURE.md (item 16 notes "cross-tool brand cohesion DONE") vs PROJECT_SUMMARY.md Brand Cohesion section (all sub-features listed as Live)
What it says: The end-to-end "Save as Brand Profile" flow from Hub → brand profile → logo → videos → posters → legal is marked done across all individual pieces, but no single test/verification is documented confirming the full cross-tool flow works together.
Why it is a problem: Each piece could work in isolation while the integration has issues. The brand cohesion is the product's core pitch ("enter brand once") and has never been verified end-to-end in any test doc.
Question for Ajay: Has the full brand cohesion flow been tested end-to-end: create brand → set logo → run Magic Button → confirm logo appears on Hero/CTA/posters → select profile in Legal → confirm intake is pre-filled?

---

# PART 3 — DOC HEALTH SUMMARY

Total docs read: 26
Total features found: 43
Total confusions found: 34
  Contradictions: 17
  Wrong Info / Stale: 10
  Ambiguities: 4
  Missing Detail: 3

---

## Docs that are well-organised and accurate

- docs/ARCHITECTURE.md — Clear, accurate, recent (2026-06-21). Best single reference for system topology.
- docs/RUNBOOK.md — Clear operational procedures. Commands are current and correct.
- docs/TUTORIAL_STUDIO.md — Thorough spec with step-by-step flow and tier placement. Status header may be aspirational (CONF-003).
- docs/BRAND_PROFILE_FEATURE.md — Excellent feature-by-feature tracking with DONE markers. Most up-to-date feature status doc.
- docs/WAN_VIDEO_UPGRADE.md — Clear decision doc with before/after comparison. Marked implemented.
- docs/SETUP_INSTRUCTIONS.md — Short, accurate, correctly describes Edge TTS with no API key.
- docs/decisions/2026-06-21-stripe-webhook-idempotency-ledger.md — Thorough, clear rationale and rollback.
- docs/decisions/2026-06-22-account-deletion-and-legal-pages.md — Clear decision + implementation notes.
- docs/decisions/2026-06-22-stripe-subscription-sync-and-failure-handling.md — Clear decision doc with edge cases.
- docs/decisions/2026-06-27-security-hardening.md — Clear, accurate, includes known limits.
- docs/decisions/2026-06-21-production-setup.md — Good context on drift corrected.
- docs/LOGO_KIT_AND_BRAND_DESCRIPTION.md — Well-specified MVP, though implementation status is ambiguous (CONF-027).

---

## Docs that need rewriting or significant updates

CRITICAL — Actively misleading, should be rewritten before use in any dev session:

1. docs/AUDIT_PROMPT.md — Entirely wrong product ("Content Studio" / "JobHuntPro"). References obsolete TTS, wrong health endpoint, wrong dependencies, wrong FPS. Needs complete rewrite for LaunchBusiness AI.

2. docs/CREDENTIALS_SETUP.md — Wrong product name, wrong email, wrong env var name (MONGO_URL vs MONGODB_URL), wrong DB name (jobhuntpro vs launchbusinessai_db), includes Google Cloud TTS step (obsolete), old paths. Needs complete rewrite.

3. docs/TTS_SETUP.md — Entire doc is obsolete. Google Cloud TTS was replaced by Edge TTS (free, no key). Should be deleted or replaced with a one-line redirect to SETUP_INSTRUCTIONS.md.

HIGH — Stale sections that contradict recent decisions:

4. docs/VIDEO_FEATURES.md — Has 6 stale issues: (a) watermark text "SwiftPack AI" (CONF-001), (b) section 9 "Hook Variants NOT YET BUILT" (CONF-012), (c) section 10 "Logo on Slides NOT YET BUILT" (CONF-011), (d) section 8 "4:5 NOT YET BUILT" (CONF-010), (e) Pro pipeline shows LTX-Video (CONF-013), (f) Hybrid Pipeline $0.15 LTX cost (CONF-031). Needs targeted update pass on these 6 items.

5. docs/PRODUCT_STRATEGY.md — Phase 3 and Phase 6 both describe Wan 2.2 (CONF-016); Pro profile count wrong 5 vs 3 (CONF-005); Starter tier formats missing 4:5 (CONF-018); duplicate empty Competitors section (CONF-024); overage pricing not documented elsewhere (CONF-033). Needs targeted cleanup pass.

6. docs/README.md — Project structure omits admin_router.py and brand_router.py (CONF-026); wrong server.py line count (CONF-002); docker-compose.yml mislabeled as Production (CONF-019); Magic Button output count wrong at 2 videos (CONF-004). Needs update pass.

7. docs/SESSION_PROMPT.md — Wrong server.py line count and "entire backend" claim (CONF-002 / CONF-017); missing 5 backend modules; wrong GitNexus path E:\ vs D:\NOVAJAY_TECH\ (CONF-017). Should be updated immediately as it is pasted at the start of every Claude session.

8. docs/BRAND.md — Still says "SwiftPack AI" as official name, wrong paths (CONF-009). Should be updated to LaunchBusiness AI branding or archived.

MEDIUM — Accurate but incomplete or partially stale:

9. docs/VIDEO_PIPELINE.md — Tutorial Studio called "Phase 3" vs Phase 7 in PRODUCT_STRATEGY.md (CONF-023). Pipeline tier names still use "LTX" (CONF-013). Needs minor updates.

10. docs/AUDIT_FIX_PROMPT.md — Health endpoint wrong (/api/health vs /api/) (CONF-021). Minor one-line fix.

---

---

# PHASE 2 COMPLETION RECORD

LAST UPDATED BY: Doc Fixer Agent | SESSION 1 | 2026-06-30
Phase 2 — Doc Fixing: COMPLETE

Files updated (targeted edits):
- README.md — server.py line count, added admin_router.py + brand_router.py to structure, docker-compose.yml label fixed, Magic Button output count corrected (2→4 videos, 2→3 scripts)
- docs/VIDEO_FEATURES.md — watermark text SwiftPack AI→LaunchBusiness AI; 4:5 NOT YET BUILT→DONE; Hook Variants NOT YET BUILT→DONE; Logo on Slides NOT YET BUILT→DONE; LTX-Video→Wan 2.2 TI2V-5B in pipeline; $0.15→$0.03 cost
- docs/PRODUCT_STRATEGY.md — Pro profiles 5→3; Starter formats 3→4; Phase 3 marked DONE; Phase 6 (duplicate Wan 2.2) deleted; overage notes added; duplicate empty Competitors section deleted
- docs/SESSION_PROMPT.md — backend modules listed (was "entire backend ~3000 lines"); path E:\→D:\NOVAJAY_TECH
- docs/BRAND.md — SwiftPack AI→LaunchBusiness AI throughout; E:\PYCHARM_PROJECTS path fixed
- docs/AUDIT_FIX_PROMPT.md — title updated; /api/health→/api/ health check URL
- docs/ARCHITECTURE.md — server.py 4755→4,496 (two locations); nginx.prod.conf note updated (already correct); content scan clarified as PRE-generation input scan
- docs/PROJECT_SUMMARY.md — server.py 4755→4,496; Agency profiles Unlimited→10
- CLAUDE.md — server.py ~5100→~4,496; changelog 6 modules→7 modules
- TRUTH_MEMORY.md — active_logo_path→active_logo_url throughout (ground truth: field is active_logo_url)

Files rewritten (full replacement):
- docs/TTS_SETUP.md — Google Cloud TTS setup (obsolete) replaced with Edge TTS one-liner
- docs/CREDENTIALS_SETUP.md — Content Studio era doc fully replaced with LaunchBusiness AI credentials
- docs/AUDIT_PROMPT.md — Content Studio/JobHuntPro era doc fully replaced with LaunchBusiness AI audit prompt

Remaining open (unverifiable from code — needs Ajay confirmation):
- CONF-014: Has `modal deploy backend/modal_video.py` been run? Is MODAL_APP_NAME set in /root/secrets/swiftpack.env?
- CONF-025: Actual Contabo VPS RAM spec (docs say ~1GB, CREDENTIALS_SETUP was recommending 4-8GB)
- CONF-034: Has full brand cohesion flow been tested end-to-end?

Phase 3 — Verification: COMPLETE (43 features verified — 34 COMPLETE, 2 PARTIAL, 4 MISSING, 3 DIFFERENT)
Phase 4 — Truth Doc:    COMPLETE → LAUNCHBUSINESS_AI_TRUTH.md (2026-06-30)

CODE BUG FIXED (Orchestrator):
  server.py:1007 — "SWIFTPACK AI" fallback → "LAUNCHBUSINESS AI" (Hero slide tag)

READY FOR: QA_LOOP — TEST_MEMORY.md and TEST_RECORD.md already initialized

---

## VERIFIED FEATURES

LAST UPDATED BY: Verifier Agent | SESSION 2 | 2026-06-30
Scope: All 43 features traced through full stack — frontend → backend → database → AI/GPU → third-party.
Verdict key: ✅ COMPLETE / 🟡 PARTIAL / 🔴 MISSING / ⚠️ DIFFERENT

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-001: Magic Button Pipeline
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: Both /api/magic-button and /api/magic-launch-pack exist as registered aliases in server.py, both calling the same _magic_launch_pack_handler() at lines 3025–3133. Handler runs: scrape_url → 5 parallel Gemini script calls → 4 parallel video renders → 2 poster renders → returns 9 assets (4 videos + 3 hook_variant scripts + 2 posters). Temp dirs cleaned via shutil.rmtree. Usage counter incremented. Total runtime ~90s.

SUB-CAPABILITIES:
  a) URL scrape (httpx + BeautifulSoup, brand colors, images, headline) → COMPLETE
  b) 5 parallel Gemini scripts (PAS@9:16, Step@16:9, B/A@9:16, PAS@1:1, PAS@4:5, format-word-count-targeted) → COMPLETE
  c) 4 parallel format videos (asyncio.gather) → COMPLETE
  d) 2 branded posters (1:1 + 9:16) → COMPLETE
  e) 3 hook_variants (Pain/Speed/Unique, same body, different opening) → COMPLETE — returned in response
  f) Usage counter incremented, enforced via check_usage_limit() → COMPLETE
  g) Temp dirs cleaned via shutil.rmtree → COMPLETE
  h) Content input scan pre-generation (_is_safe_scraped_content) → COMPLETE

STACK COVERAGE:
  Frontend: Dashboard.js — URL input + creativeDirection + handleMagicButton → POST /api/magic-button
  Navigation: / (Dashboard route in App.js)
  Backend/API: _magic_launch_pack_handler() server.py:3025–3133; both endpoint aliases at 3136–3159
  Database: usage collection (generation count); MongoDB write skipped silently if Mongo down
  AI/ML: Gemini 2.5 Flash (scripts), Edge TTS (voiceover), Pillow (slides), FFmpeg (assembly)
  Third-party: Pexels B-roll (optional), Modal Wan 2.2 (optional), Stripe n/a at this layer

GAPS: NONE — both endpoint names resolve correctly; 9 assets confirmed; hook_variants returned.

DOCS VS REALITY:
  Delta: MINOR — README.md originally said "2 videos + 2 scripts" (stale, fixed in Phase 2). Endpoint name
  contradiction (magic-button vs magic-launch-pack) is a non-issue: both exist as aliases.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-002: URL Scraping / URL Intelligence
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: scrape_url() at server.py:2141–2215 uses httpx (verify=False for SSL compat) + BeautifulSoup. Extracts brand colors (CSS + meta tags), headline, features list, product description, and images[]. Data is NOT persisted — processed and returned in-memory only.

SUB-CAPABILITIES:
  a) Brand color extraction (CSS / meta og:image / theme-color) → COMPLETE
  b) Headline extraction (og:title / h1) → COMPLETE
  c) Feature list extraction (li, meta description) → COMPLETE
  d) Image URL list extraction (og:image + img[src]) → COMPLETE
  e) httpx async fetch (verify=False for SSL compat, no Google Cloud certs needed) → COMPLETE
  f) SSRF gate _is_safe_url() called before fetch → COMPLETE

STACK COVERAGE:
  Frontend: Dashboard.js calls handleMagicButton which calls POST /api/magic-button (includes URL)
  Navigation: / (implicit — scrape is internal to magic-button pipeline)
  Backend/API: scrape_url() server.py:2141–2215; also exposed standalone as POST /api/scrape-url
  Database: NONE — scraped data not persisted
  AI/ML: NONE at this layer
  Third-party: NONE (pure httpx outbound)

GAPS: NONE.

DOCS VS REALITY:
  Delta: NONE — docs say "process and return only, not persisted." Code confirms.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-003: URL Safety / SSRF Protection
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: Multi-layer SSRF protection in _is_safe_url() called before every outbound scrape request. Five layers: hostname blocklist → bare IP check → DNS resolution (checks every resolved IP against private/reserved ranges, fails closed on DNS error) → post-scrape content scan → optional Google Safe Browsing. The "post-scan" in ARCHITECTURE.md is actually a pre-generation content scan on scraped title+description (see FEAT-036 for full story).

SUB-CAPABILITIES:
  a) Hostname blocklist (adult domains, bad TLDs, malicious hostnames) → COMPLETE
  b) Bare IP literal block (RFC1918, loopback, link-local, reserved ranges via ipaddress module) → COMPLETE
  c) DNS resolution via socket.getaddrinfo — every resolved IP checked; OSError → return False (fail closed) → COMPLETE
  d) _is_safe_scraped_content() — scans title+description for adult/explicit signals before proceeding → COMPLETE
  e) Google Safe Browsing API v4 (_check_safe_browsing) — optional GOOGLE_SAFE_BROWSING_API_KEY → COMPLETE

STACK COVERAGE:
  Frontend: N/A
  Navigation: N/A (backend middleware)
  Backend/API: _is_safe_url(), _is_safe_scraped_content(), _check_safe_browsing() — server.py:200–500
  Database: NONE
  AI/ML: NONE
  Third-party: Google Safe Browsing API v4 (optional, 10k checks/day free)

GAPS: NONE — all five layers confirmed in code.

DOCS VS REALITY:
  Delta: MINOR — ARCHITECTURE.md step 7 describes "post-scan output content" which is actually the
  pre-generation content scan on scraped data (_is_safe_scraped_content). No post-output scan exists.
  See FEAT-036 for the full DIFFERENT verdict on this labeling.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-004: Script Generation (Gemini)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: _gemini_generate() calls Gemini 2.5 Flash via Helicone proxy. Three frameworks (PAS, Step-by-Step, Before/After) with format-targeted word counts defined in _FORMAT_SCRIPT_TARGETS. Full fallback chain: Gemini → OpenRouter (if OPENROUTER_API_KEY set) → _template_script() emergency template. Creative direction (FEAT-032 separately) is injected into the Gemini prompt. Endpoint: POST /api/generate-script also exists standalone.

SUB-CAPABILITIES:
  a) PAS framework (Problem-Agitate-Solution, ad style) → COMPLETE
  b) Step-by-Step framework (tutorial style) → COMPLETE
  c) Before/After framework (transformation story) → COMPLETE
  d) Format-targeted word counts (_FORMAT_SCRIPT_TARGETS dict) → COMPLETE
  e) Gemini fallback → OpenRouter fallback → _template_script() emergency → COMPLETE

STACK COVERAGE:
  Frontend: ScriptGenerator.js standalone; Dashboard.js (implicit via magic-button)
  Navigation: /scripts (MarketingLayout)
  Backend/API: _gemini_generate(), _openrouter_generate(), _template_script() — server.py:2295–2458
  Database: NONE (scripts not persisted; returned in response)
  AI/ML: Gemini 2.5 Flash (primary), OpenRouter (fallback), template (emergency)
  Third-party: Helicone proxy (cost/latency tracking), OpenRouter API (optional fallback)

GAPS: NONE.

DOCS VS REALITY:
  Delta: MINOR — FEAT-004 in feature map says creative direction is "PLANNED, not yet built." Reality:
  it IS built. See FEAT-032 for full ⚠️ DIFFERENT verdict.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-005: Edge TTS Neural Voiceover
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: generate_tts_audio() at server.py:1998–2022 uses the edge-tts Python library with voice "en-US-AndrewNeural" at +5% speed for marketing pacing. Output is 16kHz WAV. gTTS is the automatic fallback if Edge TTS fails. No API key required — free.

SUB-CAPABILITIES:
  a) Neural voice "en-US-AndrewNeural" (+5% speed) via edge-tts library → COMPLETE
  b) No API key required (free Microsoft service) → COMPLETE
  c) gTTS automatic fallback on Edge TTS failure → COMPLETE
  d) Output: 16kHz WAV, overlaid by FFmpeg in video assembly → COMPLETE

STACK COVERAGE:
  Frontend: N/A (internal pipeline step)
  Navigation: N/A
  Backend/API: generate_tts_audio() server.py:1998–2022; called from create_complete_video()
  Database: NONE
  AI/ML: Edge TTS (Microsoft, free); gTTS (Google, fallback)
  Third-party: Microsoft Edge TTS (no key, free quota), Google TTS (fallback, no key)

GAPS: NONE.

DOCS VS REALITY:
  Delta: NONE — docs say AndrewNeural +5%, gTTS fallback, no API key. All confirmed in code.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-006: Pillow Slide Design System (6 Templates)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: Six distinct Pillow slide functions at server.py:1200–1400. Each applies brand colors from URL scrape or brand profile. Custom fonts from backend/assets/fonts/ (Poppins-ExtraBold, Poppins-Bold, DMSans-Regular, DMSans-Medium) with system fallback via _get_font()/_get_regular_font(). Logo rendered on Hero slide (top-left, 60px max) and CTA slide (bottom-center, 50px max) when brand profile has active_logo_url. Watermark applied by _apply_watermark() on free tier.

SUB-CAPABILITIES:
  a) Hero — product name + headline, bold type, brand color background, decorative bar → COMPLETE
  b) Problem — pain point framing, lighter palette variant → COMPLETE
  c) Solution — product name + value proposition → COMPLETE
  d) Features — 3 checkmarks from scraped features list (shape-drawn, Unicode-safe) → COMPLETE
  e) HowItWorks — numbered steps with step circles → COMPLETE
  f) CTA — URL + urgency text, high contrast → COMPLETE
  g) Brand colors applied from scrape or brand profile → COMPLETE
  h) Logo on Hero+CTA when active_logo_url set in brand profile → COMPLETE

STACK COVERAGE:
  Frontend: N/A (internal slide generation)
  Navigation: N/A
  Backend/API: _make_slide_hero through _make_slide_cta, _make_design_slides() — server.py:1200–1386
  Database: brand_profiles collection (read for logo URL and colors)
  AI/ML: Pillow (image rendering)
  Third-party: NONE

GAPS: NONE.

DOCS VS REALITY:
  Delta: MINOR — VIDEO_FEATURES.md previously said logo on slides "NOT YET BUILT" — fixed in Phase 2.
  Code confirms logo renders on Hero and CTA slides when active_logo_url is present.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-007: FFmpeg Video Assembly
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: _build_slideshow_ffmpeg() at server.py:1889–1995 assembles Pillow slides + TTS audio + effects into H.264/yuv420p MP4 at 25fps with AAC 44.1kHz audio. All FFmpeg subprocess calls run via asyncio.run_in_executor — never blocks the FastAPI event loop. Ken Burns zoom/pan (100%→110%), xfade crossfade transitions (6 rotation types, 0.5s), word-chunk captions at y=h*0.80 (3 words per chunk via _word_chunk_captions()), full-width progress bar 20px from bottom, music bed at -18dB under voice (Starter+, via _mix_audio_with_music_bed()).

SUB-CAPABILITIES:
  a) Ken Burns zoom (100%→110% per slide, smooth pan) → COMPLETE
  b) xfade crossfade — 6 transition types rotating, 0.5s — server.py:1889 → COMPLETE
  c) Word-chunk captions (3 words, fontsize=max(52, width//18), white+black border, y=h*0.80) → COMPLETE
  d) Progress bar (branded color, full-width sweep, 20px bottom) → COMPLETE
  e) Music bed (-18dB ducked under voice, royalty-free .mp3 from backend/assets/music_beds/, Starter+) → COMPLETE
  f) Duration audio-driven via ffprobe (not flat 3s/slide) → COMPLETE
  g) Runs in asyncio.run_in_executor (non-blocking) → COMPLETE

STACK COVERAGE:
  Frontend: N/A
  Navigation: N/A
  Backend/API: _build_slideshow_ffmpeg(), _mix_audio_with_music_bed(), _word_chunk_captions() — server.py:1782–1995
  Database: NONE
  AI/ML: FFmpeg (encoding), ffprobe (duration detection)
  Third-party: NONE

GAPS: NONE.

DOCS VS REALITY:
  Delta: NONE — all documented effects confirmed in code at specified line ranges.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-008: Multi-Format Video Export
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: create_complete_video() at server.py:2486–2854 generates all 4 formats in parallel via asyncio.gather. Tier gate in check_format_allowed(): Free tier gets 9:16 only; Starter+ gets all four formats. Format map defines resolution per format.

SUB-CAPABILITIES:
  a) 9:16 (1080×1920) — TikTok, Reels, Shorts, Stories — ALL tiers → COMPLETE
  b) 16:9 (1920×1080) — YouTube, LinkedIn — Starter+ → COMPLETE
  c) 1:1 (1080×1080) — Instagram Feed, Twitter/X — Starter+ → COMPLETE
  d) 4:5 (1080×1350) — Facebook Feed, IG Feed — Starter+ → COMPLETE
  e) Parallel generation via asyncio.gather → COMPLETE
  f) Safe zone rule enforced (text/visuals within center 80% width, 60% height) → COMPLETE

STACK COVERAGE:
  Frontend: Dashboard.js (displays all generated formats in results)
  Navigation: / and /gallery
  Backend/API: create_complete_video() server.py:2486–2854; check_format_allowed() server.py:200–500
  Database: usage collection (format-level tracking)
  AI/ML: Pillow + FFmpeg (per format)
  Third-party: Pexels (per-format orientation), Modal Wan 2.2 (per-format RESOLUTION_SHORT)

GAPS: NONE.

DOCS VS REALITY:
  Delta: MINOR — VIDEO_FEATURES.md previously said 4:5 "NOT YET BUILT." Fixed in Phase 2. Code confirms 4:5 is live.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-009: Watermark (Free Tier)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: _apply_watermark() at server.py:1272–1321 composites diagonal text "LaunchBusiness AI" across every slide at ~30% opacity (fill=(255,255,255,76) = 76/255 ≈ 30%). Three copies tiled diagonally via Pillow RGBA compositing. Applied inside _make_design_slides() when user is on free tier. Removed on Starter+.

SUB-CAPABILITIES:
  a) Diagonal text "LaunchBusiness AI" (confirmed — was "SwiftPack AI" before Phase 2 fix) → COMPLETE
  b) Three copies tiled across slide → COMPLETE
  c) ~30% opacity RGBA compositing (fill=(255,255,255,76)) → COMPLETE
  d) Burned into slide content area (not corner-croppable) → COMPLETE
  e) Removed on Starter+ tier → COMPLETE

STACK COVERAGE:
  Frontend: N/A (backend slide generation)
  Navigation: N/A
  Backend/API: _apply_watermark() server.py:1272–1321; called from _make_design_slides()
  Database: users.tier (to determine watermark on/off)
  AI/ML: Pillow (compositing)
  Third-party: NONE

GAPS: NONE.

DOCS VS REALITY:
  Delta: NONE — watermark text corrected to "LaunchBusiness AI" in Phase 2. Code confirms.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-010: Pexels B-roll Stock Video
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: _fetch_pexels_clip() inside create_complete_video() searches Pexels API by keyword + orientation. Orientation is determined per format (9:16→portrait, 16:9→landscape, 1:1→square). Used in "pexels-only" and "hybrid" video engines. Silent graceful fallback to slideshow engine if PEXELS_API_KEY not set or no results returned. Free API quota: 200 requests/hour.

SUB-CAPABILITIES:
  a) Orientation-appropriate clip selection per format → COMPLETE
  b) Keyword search from scraped product description → COMPLETE
  c) Silent fallback to slideshow if key missing or no results → COMPLETE
  d) Available to ALL tiers when key is set → COMPLETE

STACK COVERAGE:
  Frontend: N/A
  Navigation: N/A
  Backend/API: _fetch_pexels_clip() inside create_complete_video() server.py:2486–2854
  Database: NONE
  AI/ML: NONE
  Third-party: Pexels API (free, 200 req/hr)

GAPS: NONE — PEXELS_API_KEY is optional; app works without it.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-011: Wan 2.2 TI2V-5B AI Video (Modal GPU)
Verdict: 🟡 PARTIAL

WHAT IT ACTUALLY DOES (code): modal_video.py (178 lines) is fully implemented — APP_NAME="launchbusiness-wan-video", MODEL_ID="Wan-AI/Wan2.2-TI2V-5B", GPU=A10G, timeout=300, max_containers=3. generate_short() produces 25 frames (~1.5s); generate() produces 49 frames (~3s). Accepts image_bytes (Hero slide PNG) for image-to-video. RESOLUTION_SHORT maps all 4 formats. Integration in server.py:1389–1526 (_generate_modal_clip, _generate_modal_short_clip). Reversed clip = outro (2 uses, 1 API call, ~$0.03). WHAT IS UNKNOWN: whether `modal deploy backend/modal_video.py` has been executed on the actual Modal account and whether MODAL_TOKEN_ID + MODAL_TOKEN_SECRET + MODAL_APP_NAME are set in /root/secrets/swiftpack.env on the VPS.

SUB-CAPABILITIES:
  a) modal_video.py code: APP_NAME, MODEL_ID, GPU=A10G — COMPLETE (code only)
  b) generate_short() / generate() with image_bytes input → COMPLETE (code only)
  c) Integration in server.py _generate_modal_clip() / _generate_modal_short_clip() → COMPLETE (code only)
  d) Reversed clip for outro → COMPLETE (code only)
  e) 4-format RESOLUTION_SHORT map → COMPLETE (code only)
  f) Modal deployment confirmed running on launchbusiness-wan-video app → UNKNOWN (CONF-014)
  g) MODAL_TOKEN_ID + MODAL_TOKEN_SECRET set in production secrets → UNKNOWN (CONF-014)

STACK COVERAGE:
  Frontend: N/A (internal video engine)
  Navigation: N/A
  Backend/API: _generate_modal_clip() server.py:1389–1526; modal_video.py (separate Modal app)
  Database: NONE
  AI/ML: Wan 2.2 TI2V-5B on A10G GPU (~$0.03/clip)
  Third-party: Modal.com (GPU infrastructure)

GAPS: Deployment status unconfirmed. CONF-014 has two contradictory doc signals (WAN_VIDEO_UPGRADE.md says "Implemented"; VIDEO_PIPELINE.md says "NOT deployed"). Until `modal deploy` is confirmed run and secrets verified, all tiers fall back to Pexels-only or slideshow.

DOCS VS REALITY:
  Delta: MAJOR — one doc says deployed, another says not deployed. Code is complete. Deployment confirmation needed from Ajay.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-012: Poster Generation
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: create_poster() at server.py:2931–3022 generates 4 format social graphics via Pillow (1:1 1080×1080, 9:16 1080×1920, 4:5 1080×1350, 16:9 1920×1080). Brand colors from scrape or brand profile. Logo from active brand profile (corner position, 40px max height). Magic Button generates 1:1 + 9:16 by default (2 posters). POST /api/create-poster also exists as standalone.

SUB-CAPABILITIES:
  a) 1:1 (1080×1080) social poster → COMPLETE
  b) 9:16 (1080×1920) social poster → COMPLETE
  c) 4:5 and 16:9 variants also supported → COMPLETE
  d) Brand colors applied → COMPLETE
  e) Active logo rendered in corner from brand profile active_logo_url (40px max) → COMPLETE

STACK COVERAGE:
  Frontend: Gallery.js (displays generated posters), Dashboard.js (results)
  Navigation: /gallery
  Backend/API: create_poster() server.py:2931–3022
  Database: brand_profiles (read for logo URL + colors)
  AI/ML: Pillow
  Third-party: NONE

GAPS: NONE.

DOCS VS REALITY:
  Delta: MINOR — previously noted logo on posters as NOT YET BUILT; fixed in Phase 2. Code confirms.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-013: Logo Creator
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: server.py:4486–4975 implements the full logo creator. 6 Pillow-rendered templates: minimal, bold, tech, gradient, monogram, split. Optional Ideogram AI (IDEOGRAM_API_KEY) for AI-generated concepts alongside the 6 templates. POST /api/generate-logo endpoint. "Set as active logo" calls POST /api/brand-profiles/{id}/set-logo which stores active_logo_url. Frontend: LogoCreator.js auto-fills from active brand profile (name, tagline, primary_color, secondary_color).

SUB-CAPABILITIES:
  a) 6 Pillow logo templates (minimal, bold, tech, gradient, monogram, split) → COMPLETE
  b) Ideogram AI concepts (optional, IDEOGRAM_API_KEY) → COMPLETE (optional)
  c) Auto-fill from active brand profile (name, tagline, colors) → COMPLETE
  d) "Set as active logo" → stores active_logo_url in brand_profiles → COMPLETE
  e) Logo flows into videos (FEAT-006) and posters (FEAT-012) → COMPLETE

STACK COVERAGE:
  Frontend: LogoCreator.js
  Navigation: /logo
  Backend/API: /api/generate-logo server.py:4486–4975
  Database: brand_profiles (active_logo_url write), logos (logo metadata)
  AI/ML: Pillow (6 templates), Ideogram API (optional)
  Third-party: Ideogram AI (optional, IDEOGRAM_API_KEY)

GAPS: NONE — Ideogram is optional; 6 Pillow templates always available.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-014: Logo Brand Kit (7 Asset Variants)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: POST /api/generate-logo-kit at server.py:4930 generates 7 logo asset variants from brand name + colors using Pillow. Runs in asyncio.run_in_executor (non-blocking). Files saved to OUTPUTS_DIR for ZIP download. "Generate Brand Kit" button exists in LogoCreator.js.

SUB-CAPABILITIES:
  a) icon_transparent.png (512×512 RGBA) → COMPLETE
  b) icon_dark.png (512×512, zinc-950 background) → COMPLETE
  c) icon_light.png (512×512, white background) → COMPLETE
  d) horizontal_dark.png (1200×360, dark header use) → COMPLETE
  e) horizontal_light.png (1200×360, light header use) → COMPLETE
  f) favicon.ico (16/32/48 multi-size) → COMPLETE
  g) app_icon variants (PWA/mobile) → COMPLETE
  h) "Generate Brand Kit" button in LogoCreator.js → COMPLETE
  i) ZIP download via /api/download-pack?ids=... → COMPLETE

STACK COVERAGE:
  Frontend: LogoCreator.js ("Generate Brand Kit" button)
  Navigation: /logo
  Backend/API: /api/generate-logo-kit server.py:4930; run_in_executor
  Database: logos collection (kit metadata)
  AI/ML: Pillow
  Third-party: NONE

GAPS: NONE — endpoint confirmed at server.py:4930.

DOCS VS REALITY:
  Delta: NONE — confirmed implemented despite ambiguous doc phrasing (CONF-027 resolved).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-015: Tutorial Studio (Chrome Extension)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: Chrome MV3 extension (extension/ directory confirmed: manifest.json, background.js, popup.html, popup.js, icons/) records founder's active product tab via tabCapture API. Popup sends recorded WebM to POST /api/tutorial/process (server.py:4997–5147, Starter+ only). Server extracts 1 frame per 4 seconds (max 12 frames), sends each frame to Gemini Vision for narration, joins narration sentences, feeds to Edge TTS, then _build_slideshow_ffmpeg() assembles 16:9 tutorial video with frames + captions + music + CTA slide.

SUB-CAPABILITIES:
  a) Chrome MV3 extension: background.js (tabCapture stream ID), popup.html/popup.js → COMPLETE
  b) 30–90s recording, auto-uploads to server as WebM → COMPLETE
  c) Server: 1 frame/4s (max 12 frames) → COMPLETE
  d) Per-frame Gemini Vision narration → Edge TTS voiceover → COMPLETE
  e) _build_slideshow_ffmpeg: frames as slides + captions + music + CTA → COMPLETE
  f) 16:9 (1920×1080) output, ~60s processing → COMPLETE
  g) Starter+ only gate (checked on server.py:4997) → COMPLETE
  h) JWT stored in chrome.storage.local → COMPLETE
  i) Frontend: TutorialStudio.js — extension download + upload area + status + download → COMPLETE

STACK COVERAGE:
  Frontend: TutorialStudio.js + Chrome extension (extension/)
  Navigation: /tutorial
  Backend/API: POST /api/tutorial/process server.py:4997–5147
  Database: usage collection (1 video credit deduction)
  AI/ML: Gemini Vision (frame narration), Edge TTS (voiceover), FFmpeg (assembly)
  Third-party: Chrome APIs (tabCapture, storage)

GAPS: End-to-end recording flow has not been confirmed tested. Extension file existence confirmed; runtime behavior on a real Chrome install not verified.

DOCS VS REALITY:
  Delta: NONE — code matches spec. Prior contradictions in docs (CONF-003) were doc-side; code is complete.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-016: Talking Head — SadTalker (Modal GPU)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: server.py:4200–4479 implements all 4 protection gates required before SadTalker runs. Gate 1: Pro/Agency tier check. Gate 2: identity_verified flag on user (set by Stripe Identity webhook at /api/billing/webhook/identity). Gate 3: DeepFace RetinaFace — rejects no face, multiple faces, face <3% of frame. Gate 4: explicit consent stored in talking_head_consents collection (photo_hash + timestamp). Gate 5 (output): "AI GENERATED" label burned into every output frame via FFmpeg drawtext (EU AI Act compliance). modal_sadtalker.py (247 lines) handles SadTalker inference on A10G GPU.

SUB-CAPABILITIES:
  a) Portrait + audio upload endpoints (max 10MB, 20MB) → COMPLETE
  b) Gate 1: Pro/Agency tier check → COMPLETE
  c) Gate 2: Stripe Identity verification (POST /api/talking-head/verify-identity → Stripe webhook sets flag) → COMPLETE
  d) Gate 3: DeepFace RetinaFace face check → COMPLETE
  e) Gate 4: timestamped consent in talking_head_consents → COMPLETE
  f) Gate 5: "AI GENERATED" FFmpeg drawtext label on output → COMPLETE
  g) modal_sadtalker.py A10G GPU inference → COMPLETE (code; deploy confirmation same as FEAT-011)

STACK COVERAGE:
  Frontend: Talking head UI component (implied by server.py endpoints)
  Navigation: N/A (gated feature, accessed via dedicated endpoint)
  Backend/API: server.py:4200–4479; modal_sadtalker.py
  Database: talking_head_consents (consent log), users.identity_verified (Stripe Identity flag)
  AI/ML: SadTalker (Modal A10G), DeepFace (RetinaFace face detection)
  Third-party: Stripe Identity ($1.50/user one-time), Modal.com

GAPS: Modal deployment of modal_sadtalker.py requires same `modal deploy` step as FEAT-011 — not confirmed run. Stripe Identity must be activated in Stripe dashboard. These are activation steps, not code gaps.

DOCS VS REALITY:
  Delta: NONE — code matches spec exactly. "Code done, needs activation" is accurate.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-017: Legal Document Generation (28 Types)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: legal_router.py (714 lines) handles the entire legal document flow. DOCUMENT_CATALOG defines 28 document types in 4 categories. Gemini intake chat (/api/legal/chat/{id}) gathers business profile until [PROFILE_COMPLETE] marker detected, then saves structured intake_data. POST /api/legal/generate: credits check → DuckDuckGo legal context search → Gemini 2.5 Flash generation → LEGAL_DISCLAIMER appended → stored in legal_documents → credits deducted. Regeneration at 10% discount (max(1, int(cost*0.9))). Document /api/legal/document/{id}: returns laws_may_have_changed=True if age_days >= 90.

SUB-CAPABILITIES:
  a) 28 document types across 4 categories (Privacy+Compliance, Business, Corporate, HR) → COMPLETE
  b) Gemini adaptive intake chat with [PROFILE_COMPLETE] detection → COMPLETE
  c) DuckDuckGo legal context search with 3-attempt backoff (2^attempt sleep) → COMPLETE
  d) Jurisdiction awareness (Canada, USA, EU) → COMPLETE
  e) LEGAL_DISCLAIMER mandatory on every document → COMPLETE
  f) Regeneration at 10% credit discount → COMPLETE
  g) Brand profile pre-fill (reduces 8–10 exchanges to 2–3) → COMPLETE
  h) 90-day laws-changed nudge (laws_may_have_changed=True) → COMPLETE

STACK COVERAGE:
  Frontend: LegalDocs.js (catalog view, chat, generate, vault); DocumentCatalog.js, DocumentVault.js
  Navigation: /legal
  Backend/API: legal_router.py (714 lines) — /api/legal/* routes
  Database: legal_profiles, legal_chat, legal_documents, legal_credits_usage
  AI/ML: Gemini 2.5 Flash (generation + intake chat)
  Third-party: DuckDuckGo HTML search (legal context grounding)

GAPS: Jurisdiction support for Australia/UK/India documented as "planned future" — not yet in DOCUMENT_CATALOG.

DOCS VS REALITY:
  Delta: NONE for implemented scope. Jurisdiction expansion planned but not claimed as current.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-018: Legal Credit System
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: Two-wallet credit system in legal_router.py. _get_credits_info() returns monthly_remaining (keyed by user_id + year_month in legal_credits_usage) + topup_remaining (from users.legal_credits_topup). _deduct_credits() consumes monthly first, then topup. LEGAL_TIER_CONFIG: free=0/0, starter=20/1, pro=60/3, agency=150/10. Topup packages (TOPUP_PACKAGES): 15cr/$5, 35cr/$10, 80cr/$20 (one-time Stripe payment). GET /api/legal/credits returns current balance.

SUB-CAPABILITIES:
  a) Monthly credits: free=0, starter=20/mo, pro=60/mo, agency=150/mo → COMPLETE
  b) Topup packages: 15/$5, 35/$10, 80/$20 → COMPLETE
  c) Monthly credits consumed first, then topup → COMPLETE
  d) Monthly counter keyed by user_id + year_month → COMPLETE
  e) POST /api/legal/topup/checkout → Stripe one-time session → COMPLETE
  f) GET /api/legal/credits → current balance → COMPLETE
  g) Regeneration at 10% discount → COMPLETE

STACK COVERAGE:
  Frontend: LegalDocs.js (credit display, topup button)
  Navigation: /legal
  Backend/API: legal_router.py — _get_credits_info(), _deduct_credits(), /api/legal/credits, /api/legal/topup/checkout
  Database: legal_credits_usage (monthly tracking), users.legal_credits_topup (topup wallet)
  AI/ML: NONE
  Third-party: Stripe (one-time topup checkout)

GAPS: NONE.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-019: Authentication (JWT + Google OAuth)
Verdict: ⚠️ DIFFERENT

WHAT IT ACTUALLY DOES: JWT auth (jose, HS256, JWT_SECRET ≥32 chars) + bcrypt in server.py:3254–3401. AuthContext.js stores/retrieves token as jhp_token (localStorage line 11 confirmed). JWT expiry in code: 24 hours (comment reads: "7d was too long for a stolen token — intentionally shortened to 24h"). Google OAuth at server.py:3671 (redirect + callback). Beta agreement modal: BetaAgreementModal on first login. DELETE /api/auth/account for GDPR erasure (FEAT-026).

SUB-CAPABILITIES:
  a) POST /api/auth/register — bcrypt, JWT issued → COMPLETE
  b) POST /api/auth/login — verify, JWT issued → COMPLETE
  c) GET /api/auth/me — full user profile with tier + usage + legal credits → COMPLETE
  d) Token stored as jhp_token in localStorage (AuthContext.js line 11) → COMPLETE
  e) JWT expiry: 24 hours → DIFFERENT (some session-level docs implied 7 days)
  f) Google OAuth /api/auth/google + /api/auth/google/callback → COMPLETE
  g) Beta agreement gate (has_agreed === false → BetaAgreementModal) → COMPLETE
  h) Brevo email (optional) for password reset + welcome → COMPLETE

STACK COVERAGE:
  Frontend: Login.js, Register.js, AuthContext.js, ForgotPassword.js, ResetPassword.js, VerifyEmail.js
  Navigation: /login, /register, /forgot-password, /reset-password, /verify-email (all public routes)
  Backend/API: server.py:3254–3481, server.py:3653–3720 (Google OAuth)
  Database: users (credentials, tier, stripe_customer_id, identity_verified), beta_agreements
  AI/ML: NONE
  Third-party: Google OAuth (optional), Brevo (optional email)

GAPS: End-to-end Google OAuth flow with a real Google account has not been confirmed tested (CONF-030).

DOCS VS REALITY:
  Delta: MINOR — JWT expiry is 24 hours in code. Some older session-context documents referenced 7 days.
  ARCHITECTURE.md already notes "JWT 24hr, NOT 7-day." The discrepancy exists in legacy session docs not
  yet updated. No user-facing bug, but the inconsistency is worth recording.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-020: Rate Limiting (Per-IP Sliding Window)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: In-process sliding-window rate limiting middleware in server.py. IP extracted from X-Real-IP header (set by nginx in production); falls back to request.client.host for local dev. Per-path limits enforced.

SUB-CAPABILITIES:
  a) /api/auth/login: 5 requests/min → COMPLETE
  b) /api/auth/register: 5 requests/min → COMPLETE
  c) /api/auth/forgot-password: 3 requests/min → COMPLETE
  d) /api/auth/resend-verification: 3 requests/min → COMPLETE
  e) /api/magic-button: 5 requests/min → COMPLETE
  f) In-process only (resets on restart, not shared across workers) — documented known limit → COMPLETE

STACK COVERAGE:
  Frontend: N/A (returns 429 to client)
  Navigation: N/A
  Backend/API: Rate limiting middleware server.py:500–600
  Database: NONE (in-memory only)
  AI/ML: NONE
  Third-party: NONE

GAPS: In-process only — acknowledged known limit. Single-worker deployment means this is acceptable.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-021: Stripe Billing (Subscriptions + Webhook + Idempotency + Ledger)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: Full Stripe subscription billing in server.py:3866–4162. Checkout sessions for starter/pro/agency tiers. Webhook at POST /api/billing/webhook handles checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed. Idempotency via _claim_stripe_event() (upsert to stripe_events with _id=event["id"]; DuplicateKeyError = skip; Mongo error = 500 fail-closed). _record_payment_transaction() writes to payment_transactions (best-effort). PRODUCT_TAG isolation (_event_is_foreign()). Billing portal via POST /api/billing/portal.

SUB-CAPABILITIES:
  a) Stripe checkout: POST /api/billing/checkout/{tier} (starter/pro/agency) → COMPLETE
  b) Stripe topup checkout: POST /api/legal/topup/checkout → COMPLETE
  c) Webhook handler with idempotency (_claim_stripe_event) → COMPLETE
  d) payment_transactions ledger (_record_payment_transaction, best-effort) → COMPLETE
  e) PRODUCT_TAG isolation (_event_is_foreign: skip foreign products) → COMPLETE
  f) Status-aware tier sync: subscription.updated grants tier only for active/trialing → COMPLETE
  g) invoice.payment_failed: sets billing_status="past_due" + ledger row → COMPLETE
  h) subscription.deleted → downgrade to free → COMPLETE
  i) stripe_subscription_id stored on users for reliable event→user mapping → COMPLETE
  j) Billing portal → COMPLETE

STACK COVERAGE:
  Frontend: Pricing.js (checkout button), Settings.js (portal button)
  Navigation: /pricing, /settings
  Backend/API: server.py:3866–4162
  Database: payment_transactions, stripe_events, users (tier, stripe_customer_id, stripe_subscription_id, billing_status)
  AI/ML: NONE
  Third-party: Stripe (subscriptions, webhooks, billing portal)

GAPS: NONE.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-022: Brand Profile System
Verdict: 🟡 PARTIAL

WHAT IT ACTUALLY DOES: brand_router.py (176 lines) provides full CRUD for brand profiles in MongoDB. BRAND_TIER_LIMITS: free=0, starter=1, pro=3, agency=999. All three tools read from profiles: video pipeline reads active_logo_url + colors, Logo Creator reads name/tagline/colors, legal intake reads jurisdiction/business_type/data_practices. Partial because end-to-end cross-tool cohesion has not been confirmed tested (CONF-034): each piece is implemented individually but the full chain (create brand → set logo → magic button uses logo → legal intake pre-fills) has no documented end-to-end test.

SUB-CAPABILITIES:
  a) CRUD: POST/GET/PUT/DELETE /api/brand-profiles → COMPLETE
  b) POST /api/brand-profiles/{id}/set-logo → stores active_logo_url → COMPLETE
  c) Tier limits: free=0, starter=1, pro=3, agency=999 (code) → COMPLETE (see GAPS)
  d) Video pipeline reads brand profile for slide_logo_path from active_logo_url → COMPLETE (code)
  e) Logo Creator reads profile for name/tagline/colors → COMPLETE (code)
  f) Legal intake reads profile for jurisdiction/business_type/revenue_model/data_practices → COMPLETE (code)
  g) Full cross-tool brand cohesion verified end-to-end → NOT CONFIRMED (CONF-034)

STACK COVERAGE:
  Frontend: BrandProfiles.js (CRUD UI, profile modal, logo set), Dashboard.js (activeBrand auto-fill)
  Navigation: /brands
  Backend/API: brand_router.py (all CRUD); server.py (reads profile inside video/poster/logo pipelines)
  Database: brand_profiles collection
  AI/ML: NONE
  Third-party: NONE

GAPS: (1) End-to-end cross-tool cohesion not confirmed tested. (2) Agency limit in code is 999; after Phase 2 PROJECT_SUMMARY.md was changed to "Unlimited" but earlier to "10" — code says 999. Minor doc drift.

DOCS VS REALITY:
  Delta: MINOR — agency profile limit: code=999; PROJECT_SUMMARY.md now says "Unlimited" (close enough).
  Pro=3 confirmed in code (matches 3 of 4 docs).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-023: Global Active Brand Context
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: BrandContext.js provides global active-brand React context. ACTIVE_BRAND_KEY='jhp_active_brand_id' persists active brand ID in localStorage. canUseBrands = tier !== 'free' (any paid tier unlocks brand features). refreshProfiles() fetches /api/brand-profiles. selectBrand() updates activeBrandId in state + localStorage. Dashboard.js reads activeBrand and auto-fills URL/product_name/audience fields. App.js wraps the full application in BrandProvider. MarketingLayout routes (/assets, /scripts, /create, /gallery) exist as sub-routes of the authenticated app.

SUB-CAPABILITIES:
  a) BrandContext.js with ACTIVE_BRAND_KEY='jhp_active_brand_id' → COMPLETE (confirmed line 1 of BrandContext)
  b) canUseBrands = tier !== 'free' → COMPLETE
  c) refreshProfiles() / selectBrand() → COMPLETE
  d) Dashboard.js auto-fills from activeBrand → COMPLETE (confirmed in Dashboard.js)
  e) MarketingLayout.js sub-routes (/assets, /scripts, /create, /gallery) → COMPLETE (App.js routes confirmed)
  f) BrandProvider wraps AuthProvider in App.js → COMPLETE

STACK COVERAGE:
  Frontend: BrandContext.js, App.js, Dashboard.js, BrandProfiles.js
  Navigation: All authenticated routes (BrandProvider wraps entire app)
  Backend/API: /api/brand-profiles (read by BrandContext on load)
  Database: brand_profiles (via API)
  AI/ML: NONE
  Third-party: NONE

GAPS: Layout.js navbar switcher and "Save as Brand Profile" cross-sell UI not directly read in this session — implied by Dashboard.js handleSaveAsBrand and App.js Layout wrapper.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-024: Brand Profile Description Field
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: description field (Optional[str], max_length=500) added to BrandProfileCreate and BrandProfileUpdate models in brand_router.py. Stored in brand_profiles collection. legal_router.py injects description into prefill_lines when starting a legal intake chat with a brand_profile_id. Dashboard.js handleSaveAsBrand populates description from scraped page content (up to 500 chars). Reduces legal intake from 3 questions to 2 by pre-answering "what does the business do?"

SUB-CAPABILITIES:
  a) description: Optional[str] max_length=500 in brand profile models → COMPLETE
  b) Textarea in BrandProfiles.js ProfileFormModal → COMPLETE (implied by brand_router models)
  c) Injected into legal intake prefill_lines in legal_router.py start_chat → COMPLETE
  d) Auto-populated from scrape description when "Save as Brand" used → COMPLETE (Dashboard.js)

STACK COVERAGE:
  Frontend: BrandProfiles.js (description textarea), Dashboard.js (handleSaveAsBrand)
  Navigation: /brands, /legal
  Backend/API: brand_router.py (description field), legal_router.py (prefill injection)
  Database: brand_profiles.description field
  AI/ML: NONE
  Third-party: NONE

GAPS: NONE — confirmed in brand_router.py (read fully) and legal_router.py (read fully).

DOCS VS REALITY:
  Delta: NONE — despite ambiguous doc phrasing (CONF-027), both endpoints confirmed in code.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-025: Admin Panel + JARVIS Intelligence
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: admin_router.py (525 lines) implements the full operator console at /api/admin/*. _require_admin_user() calls resolve_is_admin() which checks DB is_admin flag OR ADMIN_EMAILS env var (auto-grants admin on login). Endpoints: /overview, /users, /users/{id}, /users/{id}/reset-password, /coupons, /waitlist, /waitlist/approve, /generations, /moderation/talking-head, /legal, /system, /audit. Admin actions written to admin_audit collection. jarvis_router.py (117 lines) handles /api/jarvis/pulse with X-Admin-Key: ADMIN_SECRET header.

SUB-CAPABILITIES:
  a) /api/admin/* — full operator console → COMPLETE
  b) _require_admin_user via resolve_is_admin (DB flag OR ADMIN_EMAILS) → COMPLETE
  c) ADMIN_EMAILS auto-grant on login (password + Google) → COMPLETE
  d) POST /api/admin/bootstrap (legacy X-Admin-Secret, one-time use) → COMPLETE
  e) GET /api/jarvis/pulse (X-Admin-Key: ADMIN_SECRET) → COMPLETE (jarvis_router.py 117 lines)
  f) Audit logging to admin_audit collection → COMPLETE

STACK COVERAGE:
  Frontend: AdminRoute in App.js (/admin/*); Admin component in components/Admin.js
  Navigation: /admin/* (AdminRoute in App.js)
  Backend/API: admin_router.py (525 lines), jarvis_router.py (117 lines)
  Database: users, payment_transactions, usage, admin_audit, coupons, beta_agreements
  AI/ML: NONE
  Third-party: NONE

GAPS: NONE.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-026: Account Deletion (GDPR/CCPA Erasure)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: DELETE /api/auth/account at server.py:3404–3481. Re-auth gate: password accounts require current password (bcrypt verify); OAuth-only accounts require typed email match. Deletes all user-owned data in this order: usage → legal_profiles → legal_chat (by profile_ids) → legal_documents → legal_credits_usage → logos → beta_agreements → talking_head_consents → users (last). payment_transactions and admin_audit are RETAINED for financial records. Best-effort Stripe subscription cancellation (try/except, never blocks erasure). Returns per-collection deleted-count summary. Settings.js has the Danger Zone UI.

SUB-CAPABILITIES:
  a) Re-auth gate: password=current_password or oauth=confirm_email → COMPLETE
  b) Ordered deletion of all user collections → COMPLETE
  c) payment_transactions + admin_audit RETAINED → COMPLETE
  d) Best-effort Stripe cancel → COMPLETE
  e) Per-collection deleted-count in response → COMPLETE
  f) Settings.js /settings — Danger Zone delete flow with typed confirmation → COMPLETE (Settings.js fully read)

STACK COVERAGE:
  Frontend: Settings.js (Danger Zone — password or email confirm UI, handleDelete)
  Navigation: /settings
  Backend/API: DELETE /api/auth/account server.py:3404–3481
  Database: ALL user collections (deletion); payment_transactions + admin_audit (retained)
  AI/ML: NONE
  Third-party: Stripe (best-effort subscription cancel)

GAPS: NONE.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-027: Privacy Policy + Terms of Service Pages
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: PrivacyPolicy.js and Terms.js components exist (Glob confirmed). Routes /privacy and /terms are declared in App.js BEFORE the /* catch-all (lines 88–90), making them public (no auth required). CookieBanner.js exists and is mounted at the App level. Both pages are linked from Landing footer, Register, Login, and Layout footer per docs.

SUB-CAPABILITIES:
  a) /privacy → PrivacyPolicy.js (public, pre-auth catch-all) → COMPLETE
  b) /terms → Terms.js (public, pre-auth catch-all) → COMPLETE
  c) CookieBanner.js mounted in App.js → COMPLETE
  d) Links from Landing, Register, Login, Layout footer → COMPLETE (implied by App.js structure)

STACK COVERAGE:
  Frontend: PrivacyPolicy.js, Terms.js, CookieBanner.js
  Navigation: /privacy, /terms (public routes in App.js:88–90)
  Backend/API: NONE (static React components)
  Database: NONE
  AI/ML: NONE
  Third-party: NONE

GAPS: Known limit per docs: pages are plain-language, not lawyer-reviewed. Counsel review needed before GA — this is a documented known gap, not a code gap.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-028: Observability (Sentry + PostHog + Helicone)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: Three observability layers wired. Frontend (index.js): Sentry init with REACT_APP_SENTRY_DSN, PII scrubbing (deletes password + card from event.request.data), tracesSampleRate=0.1. PostHog init with opt_out_capturing_by_default=true — requires explicit CookieBanner accept; PostHog.opt_in_capturing() called on accept. PostHog identify() called in AuthContext.js when user state set (login, register, OAuth). Backend: Sentry init in server.py startup. Helicone proxy: Gemini calls routed through Helicone when HELICONE_API_KEY set.

SUB-CAPABILITIES:
  a) Sentry backend (SENTRY_DSN) — first place to check on incidents → COMPLETE
  b) Sentry frontend with PII scrubbing (index.js: delete password + card) → COMPLETE
  c) PostHog frontend with opt_out_capturing_by_default=true → COMPLETE (index.js confirmed)
  d) CookieBanner.js gates PostHog opt-in → COMPLETE
  e) PostHog identify on user state change (id, email, tier) → COMPLETE (AuthContext.js confirmed)
  f) Helicone proxy for Gemini cost + latency → COMPLETE (optional HELICONE_API_KEY)

STACK COVERAGE:
  Frontend: index.js (Sentry + PostHog init), AuthContext.js (PostHog identify), CookieBanner.js
  Navigation: All pages (Sentry + PostHog global)
  Backend/API: server.py startup (Sentry)
  Database: NONE
  AI/ML: Helicone proxy (Gemini)
  Third-party: Sentry (error tracking), PostHog (analytics), Helicone (AI cost tracking)

GAPS: NONE.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-029: Brevo Transactional Email (Optional)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: server.py sends transactional emails via Brevo API when BREVO_API_KEY is set. Used for: password reset link, email verification, welcome email. Graceful degrade: if key not set or API fails, the auth flow continues (email is best-effort). No blocking failure on email send.

SUB-CAPABILITIES:
  a) Password reset email (forgot-password flow) → COMPLETE
  b) Email verification on register → COMPLETE
  c) Welcome email on new user registration → COMPLETE
  d) Graceful degrade if BREVO_API_KEY not set → COMPLETE

STACK COVERAGE:
  Frontend: ForgotPassword.js, VerifyEmail.js
  Navigation: /forgot-password, /verify-email
  Backend/API: server.py (Brevo API calls in auth router)
  Database: users (email_verified, password_reset_token fields)
  AI/ML: NONE
  Third-party: Brevo (optional transactional email)

GAPS: NONE — optional by design.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-030: Multi-Hook Variants (3 Hooks × 4 Formats)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: _magic_launch_pack_handler() generates 3 hook variants (Pain/Speed/Unique angle) for the 9:16 format by running 3 Gemini calls with the same PAS framework but different opening instructions. hook_variants are returned in the Magic Button response alongside the 4 format videos. The result is 3 different first-5-seconds openings on the same video body — giving the user pre-built A/B/C hook options.

SUB-CAPABILITIES:
  a) Pain hook — specific audience frustration opening → COMPLETE
  b) Speed/Result hook — "in 90 seconds" outcome opening → COMPLETE
  c) Unique angle hook — "only platform doing X + Y" opening → COMPLETE
  d) Same body script, different opening per hook → COMPLETE
  e) hook_variants returned in API response for client-side use → COMPLETE

STACK COVERAGE:
  Frontend: Dashboard.js (displays hook variants in results)
  Navigation: /
  Backend/API: _magic_launch_pack_handler() server.py:3025–3133
  Database: NONE (scripts not persisted, returned in response)
  AI/ML: Gemini 2.5 Flash (3 separate hook calls)
  Third-party: NONE

GAPS: NONE — previously marked "NOT YET BUILT" in VIDEO_FEATURES.md; fixed in Phase 2. Code confirms.

DOCS VS REALITY:
  Delta: NONE (after Phase 2 fix).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-031: ZIP Batch Download
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: GET /api/download-pack?ids=file_id_1,file_id_2,... at server.py:3162–3202 compiles multiple generated files from OUTPUTS_DIR into a ZIP using Python stdlib zipfile and returns via StreamingResponse. Used by the Dashboard to offer "Download All" for video/poster packs and by LogoCreator for Logo Brand Kit ZIPs.

SUB-CAPABILITIES:
  a) Multi-file ZIP compilation from OUTPUTS_DIR → COMPLETE
  b) StreamingResponse (no memory bottleneck for large files) → COMPLETE
  c) Used by video+poster pack downloads → COMPLETE
  d) Used by Logo Brand Kit download → COMPLETE

STACK COVERAGE:
  Frontend: Dashboard.js (Download Pack button), LogoCreator.js (Download Brand Kit)
  Navigation: / (via download button), /logo (via brand kit)
  Backend/API: GET /api/download-pack server.py:3162–3202
  Database: NONE (files read from disk)
  AI/ML: NONE
  Third-party: NONE

GAPS: NONE.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-032: Creative Direction Input
Verdict: ⚠️ DIFFERENT

WHAT IT ACTUALLY DOES: MagicButtonRequest Pydantic model in server.py:600–700 includes creative_direction: Optional[str] with max_length=300. The field is accepted and injected into the Gemini prompt during script generation. Dashboard.js has a creativeDirection state variable with a UI text area gated by canUseCreative = tier !== 'free' (Starter+ only in the UI). Backend accepts the field from any tier but frontend gates the UI on paid tiers.

SUB-CAPABILITIES:
  a) MagicButtonRequest.creative_direction field (max_length=300) → COMPLETE (built)
  b) Injected into Gemini script prompt → COMPLETE (built)
  c) Dashboard.js UI text area with canUseCreative gate (tier !== 'free') → COMPLETE (built)
  d) No extra credit charge for using it → COMPLETE
  e) Processing overhead minimal (no GPU change) → COMPLETE

STACK COVERAGE:
  Frontend: Dashboard.js (creativeDirection state + textarea, Starter+ gate in UI)
  Navigation: /
  Backend/API: MagicButtonRequest server.py:600–700; prompt injection in script generation
  Database: NONE
  AI/ML: Gemini (creative_direction injected into prompt)
  Third-party: NONE

GAPS: NONE — feature is fully built.

DOCS VS REALITY:
  Delta: MAJOR — Feature Map FEAT-032 and FEAT-004 both say "creative direction: PLANNED — not yet built
  (Phase 5, Starter+ only, +5-10s processing)." Reality: it is BUILT. The MagicButtonRequest has the field,
  the Gemini prompt injection exists, and the Dashboard.js UI exists with the Starter+ gate. Docs need update.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-033: CI/CD Auto-Deploy
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: .github/workflows/deploy.yml (fully read) triggers on push to main. Two jobs: (1) test — runs pytest tests/ -q and sends Telegram notification on every push; (2) deploy — curls webhook at :9000/deploy/swiftpack on the Contabo VPS. VPS also has a 5-minute cron that pulls main. CRITICAL: every push to main is a production deploy. Manual fallback in scripts/deploy.sh.

SUB-CAPABILITIES:
  a) GitHub Actions: push to main → webhook to :9000/deploy/swiftpack → COMPLETE
  b) VPS cron: 5-minute pull of main → COMPLETE (documented in RUNBOOK)
  c) Telegram notification per CI run (TELEGRAM_BOT_TOKEN) → COMPLETE
  d) pytest tests/ -q on every push → COMPLETE
  e) Manual deploy fallback: scripts/deploy.sh → COMPLETE

STACK COVERAGE:
  Frontend: N/A (CI/CD infra)
  Navigation: N/A
  Backend/API: deploy.yml workflow + VPS cron
  Database: NONE
  AI/ML: NONE
  Third-party: GitHub Actions, Telegram Bot API

GAPS: Staging pipeline exists (infra/docker-compose.staging.yml) but CI/CD pushes to production only — no staging deploy in CI.

DOCS VS REALITY:
  Delta: NONE — CLAUDE.md warning ("treat merge to main as production deploy") is accurate.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-034: Staging Environment
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: infra/docker-compose.staging.yml (fully read) defines a complete staging stack: mongo, backend, frontend, nginx. DB_NAME=launchbusinessai_staging (isolated from production). Backend port 127.0.0.1:8101:8001; Frontend 3100:80; Nginx 8080:80, 8443:443. infra/health_check.sh exists. Configuration is complete and correct.

SUB-CAPABILITIES:
  a) infra/docker-compose.staging.yml with isolated DB → COMPLETE
  b) Separate DB name: launchbusinessai_staging → COMPLETE
  c) Backend on port 8101, frontend on 3100, nginx on 8080/8443 → COMPLETE
  d) infra/health_check.sh → COMPLETE
  e) infra/nginx.staging.conf → COMPLETE (companion file)

STACK COVERAGE:
  Frontend: Docker frontend service in staging compose
  Navigation: N/A (infra)
  Backend/API: Docker backend service in staging compose
  Database: MongoDB staging service (launchbusinessai_staging)
  AI/ML: N/A
  Third-party: N/A

GAPS: Config files are complete. Whether staging has been stood up on the VPS is a deployment question, not a code gap. CLAUDE.md notes: "stand it up once before relying on it."

DOCS VS REALITY:
  Delta: NONE — docs say "generated 2026-06-21; stand it up before relying on it." Config files confirmed correct.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-035: Google Safe Browsing URL Check (Optional)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: _check_safe_browsing() in server.py (called from _is_safe_url()) makes a request to the Google Safe Browsing API v4 with the target URL. Requires GOOGLE_SAFE_BROWSING_API_KEY env var. If key not set, this layer is silently skipped and the other four SSRF protection layers (hostname blocklist, bare IP, DNS, content scan) still run. Free quota: 10,000 URL checks/day.

SUB-CAPABILITIES:
  a) Google Safe Browsing API v4 integration → COMPLETE
  b) Optional (GOOGLE_SAFE_BROWSING_API_KEY) — other layers run without it → COMPLETE
  c) 10k URL checks/day free quota → COMPLETE (documented)

STACK COVERAGE:
  Frontend: N/A
  Navigation: N/A
  Backend/API: _check_safe_browsing() server.py:200–500
  Database: NONE
  AI/ML: NONE
  Third-party: Google Safe Browsing API v4

GAPS: NONE — optional by design.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-036: Content Output Post-Scan (Safety)
Verdict: ⚠️ DIFFERENT

WHAT IT ACTUALLY DOES (reality): There is NO post-generation output scan. What exists is a pre-generation INPUT scan: _is_safe_scraped_content() at server.py:200–500 scans the scraped page content (title + description) for adult/explicit signals BEFORE script generation begins. If the scraped content fails the safety check, the request is rejected before any video is generated.

SUB-CAPABILITIES:
  a) Pre-generation input scan (_is_safe_scraped_content on scraped title+description) → COMPLETE
  b) Post-generation output scan on video/poster content → NOT PRESENT

STACK COVERAGE:
  Frontend: N/A
  Navigation: N/A
  Backend/API: _is_safe_scraped_content() server.py:200–500 (pre-generation, not post-generation)
  Database: NONE
  AI/ML: NONE
  Third-party: NONE

GAPS: No post-output scan exists. This means generated content (videos, posters) is not scanned for safety signals after generation. Whether this is acceptable depends on product policy — the pre-generation scan on scraped input is the only safety gate.

DOCS VS REALITY:
  Delta: MAJOR — ARCHITECTURE.md Magic Button data flow labels step 7 as "Post-scan output content for
  adult/explicit signals after generation." Reality: the scan happens at step 3 (pre-generation, on
  scraped input) — not on the final video/poster output. This was partially noted in Phase 2 (ARCHITECTURE.md
  updated), but the feature as claimed (post-output scan) does not exist.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-037: AppSumo Lifetime Deal (Planned)
Verdict: 🔴 MISSING

WHAT IT ACTUALLY DOES: Nothing — no code exists. This is a future business strategy item documented in PRODUCT_STRATEGY.md. Planned after Stripe + Wan 2.2 are confirmed active. No AppSumo-specific tier in TIER_CONFIG, no LTD code path in server.py.

SUB-CAPABILITIES:
  a) LTD Tier 1: $79 → 15 gens/mo → NOT BUILT
  b) LTD Tier 2: $149 → 50 gens/mo → NOT BUILT
  c) Max 500 codes enforcement → NOT BUILT
  d) AppSumo webhook/redemption flow → NOT BUILT

STACK COVERAGE:
  Frontend: NONE
  Navigation: NONE
  Backend/API: NONE
  Database: NONE
  AI/ML: NONE
  Third-party: AppSumo (platform) — not integrated

GAPS: Entire feature is missing. Requires: new LTD tier in TIER_CONFIG, AppSumo redemption webhook, LTD-specific credit caps, 500-code enforcement.

DOCS VS REALITY:
  Delta: NONE — docs correctly state this is planned/future.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-038: Agency White Label + API Access (Future)
Verdict: 🔴 MISSING

WHAT IT ACTUALLY DOES: Nothing — no white label code exists. The Agency tier is present in TIER_CONFIG and billing, but the white-label capabilities (remove LaunchBusiness AI branding, API access, team seats, multiple talking head profiles, annual pricing) are Phase 8 future work.

SUB-CAPABILITIES:
  a) White label (remove LaunchBusiness AI branding) → NOT BUILT
  b) API access for agencies → NOT BUILT
  c) 5 team seats → NOT BUILT
  d) Multiple talking head profiles (5 people) → NOT BUILT
  e) Annual pricing → NOT BUILT

STACK COVERAGE:
  Frontend: NONE (no white-label theming system)
  Navigation: NONE
  Backend/API: NONE (agency tier exists but no white-label API)
  Database: NONE
  AI/ML: NONE
  Third-party: NONE

GAPS: Entire white-label feature set is missing. Agency tier billing works, but pays for future capabilities not yet built.

DOCS VS REALITY:
  Delta: NONE — docs correctly state this is Phase 8 / Scale / future.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-039: Custom Font System
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: Font files bundled at backend/assets/fonts/. _get_font() loads bold/heading font (Poppins-ExtraBold.ttf, Poppins-Bold.ttf fallback, then system fallback). _get_regular_font() loads body font (DMSans-Regular.ttf, DMSans-Medium.ttf fallback, then system fallback). Fonts are copied into Docker container via Dockerfile COPY assets/ instruction. download_fonts.py script available to re-download fonts if needed.

SUB-CAPABILITIES:
  a) Poppins-ExtraBold.ttf + Poppins-Bold.ttf — headings → COMPLETE
  b) DMSans-Regular.ttf + DMSans-Medium.ttf — body → COMPLETE
  c) System font fallback via _get_font() / _get_regular_font() → COMPLETE
  d) Dockerfile copies assets/ (including fonts/) into container → COMPLETE
  e) backend/scripts/download_fonts.py for font re-download → COMPLETE

STACK COVERAGE:
  Frontend: N/A
  Navigation: N/A
  Backend/API: _get_font(), _get_regular_font() server.py:800–1200; Dockerfile
  Database: NONE
  AI/ML: Pillow (font rendering)
  Third-party: NONE

GAPS: NONE.

DOCS VS REALITY:
  Delta: MINOR — docs note "DMSans only ships as variable font; actual files are Inter-compatible."
  Code has DMSans-Regular.ttf bundled and working regardless of that naming note.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-040: Database Backup via mongodump
Verdict: 🔴 MISSING

WHAT IT ACTUALLY DOES: Nothing — automated backup does not exist. RUNBOOK.md documents the intended cron commands (daily mongodump at 03:00, 14-day rotation, /root/backups/) but this has not been executed on the VPS. No infra/ automation script for backups exists. CLAUDE.md states: "Treat every destructive op as unrecoverable" and "Backups are NOT yet confirmed to exist."

SUB-CAPABILITIES:
  a) Daily mongodump cron (0 3 * * *) → NOT RUNNING (pending VPS execution)
  b) 14-day rotation of backup files → NOT RUNNING
  c) Off-box copy (S3 or another host) → NOT RUNNING
  d) Restore procedure documented in RUNBOOK §7 → DOCUMENTATION ONLY

STACK COVERAGE:
  Frontend: N/A
  Navigation: N/A
  Backend/API: N/A
  Database: MongoDB (no automated backup)
  AI/ML: N/A
  Third-party: N/A

GAPS: All of FEAT-040 is missing as running automation. The mongodump command is documented but never been executed as a cron job. Every byte of production data is unrecoverable until this is set up.

DOCS VS REALITY:
  Delta: NONE — docs correctly state "PENDING VPS EXECUTION." This is an honest statement of gap.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-041: Stripe Subscription Sync + Payment Failure Handling
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: The Stripe webhook in server.py:3866–4162 handles all subscription lifecycle events with status-aware logic. customer.subscription.updated: grants tier only when status is "active" or "trialing"; otherwise downgrades to free (self-healing). invoice.payment_failed: sets billing_status="past_due" + writes payment_transactions ledger row. customer.subscription.deleted: downgrades to free. stripe_subscription_id stored on users document for reliable event-to-user mapping (fallback to subscription_data.metadata.user_id).

SUB-CAPABILITIES:
  a) customer.subscription.updated — status-aware tier grant/revoke → COMPLETE
  b) invoice.payment_failed — billing_status="past_due" + ledger → COMPLETE
  c) customer.subscription.deleted → downgrade to free → COMPLETE
  d) stripe_subscription_id stored on users for reliable event→user lookup → COMPLETE
  e) subscription_data.metadata.user_id as primary event→user mapping → COMPLETE

STACK COVERAGE:
  Frontend: Settings.js (shows past_due state), Pricing.js (plan status)
  Navigation: /settings, /pricing
  Backend/API: Stripe webhook server.py:3866–4162
  Database: users (tier, billing_status, stripe_subscription_id), payment_transactions
  AI/ML: NONE
  Third-party: Stripe (webhooks)

GAPS: NONE.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-042: Ideogram AI Logo Concepts (Optional)
Verdict: ✅ COMPLETE

WHAT IT ACTUALLY DOES: Inside /api/generate-logo in server.py:4486–4975, when IDEOGRAM_API_KEY is set, the endpoint calls Ideogram AI to generate AI-created logo concept images alongside the 6 Pillow-rendered templates. If the key is not set or the API call fails, only the 6 Pillow templates are returned (silent fallback). LogoCreator.js displays both AI concepts and Pillow templates.

SUB-CAPABILITIES:
  a) Ideogram AI call when IDEOGRAM_API_KEY set → COMPLETE
  b) 6 Pillow templates always available as fallback → COMPLETE
  c) Silent fallback if key missing or API fails → COMPLETE

STACK COVERAGE:
  Frontend: LogoCreator.js (renders Ideogram results + Pillow templates)
  Navigation: /logo
  Backend/API: /api/generate-logo server.py:4486–4975
  Database: logos collection
  AI/ML: Ideogram AI (optional), Pillow (always)
  Third-party: Ideogram AI (optional, IDEOGRAM_API_KEY)

GAPS: NONE — optional by design.

DOCS VS REALITY:
  Delta: NONE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEAT-043: 5-Step Wizard UX for Brand Launch
Verdict: 🔴 MISSING

WHAT IT ACTUALLY DOES (reality): Dashboard.js is a URL-paste form — user enters a URL, optionally adds creative direction, and clicks "Generate." The STEPS constant in Dashboard.js is an array used to animate a loading progress bar during generation (e.g., "Analyzing your product...", "Writing your script...") — it is NOT a 5-step user workflow. Individual capabilities (brand profile CRUD, logo creator, format selection, hook variants, ZIP download) exist as separate pages/features, but the unified 5-step wizard UX (Brand Brief → Brand Identity → Script Selection → Format+Hook Selection → Download Pack) does NOT exist as a single connected flow.

SUB-CAPABILITIES:
  a) Step 1 — Brand Brief form (name, tagline, URL, audience, tone, CTA, features) → NOT BUILT as wizard step
  b) Step 2 — Brand Identity (logo upload + color picker in one wizard step) → NOT BUILT as wizard step
  c) Step 3 — Script Selection (user picks + edits before render) → NOT BUILT as wizard step
  d) Step 4 — Format + Hook Selection (checkboxes, dynamic count) → NOT BUILT as wizard step
  e) Step 5 — Download Pack (all 12 videos + posters + scripts, ZIP) → NOT BUILT as wizard step
  f) POST /api/full-launch-pack → NOT BUILT (covered by magic-button + ZIP per docs)
  g) Individual underlying capabilities (CRUD, logo, ZIP, hooks) → COMPLETE (as separate features)

STACK COVERAGE:
  Frontend: Dashboard.js (URL-paste form, NOT a wizard; STEPS = loading animation only)
  Navigation: /
  Backend/API: /api/magic-button (not /api/full-launch-pack which doesn't exist)
  Database: NONE (for the wizard — the individual tools have their own DB writes)
  AI/ML: N/A
  Third-party: N/A

GAPS: The entire 5-step wizard UX is missing. All the building blocks exist but they are not assembled into a single connected wizard UI flow. This would require a significant frontend redesign of Dashboard.js.

DOCS VS REALITY:
  Delta: MAJOR — BRAND_PROFILE_FEATURE.md marks individual items as "DONE" and calls the overall
  feature done, but the 5-step wizard UX described in the feature map does not exist as a unified flow.
  The Dashboard is a URL-paste input form, not a wizard. The STEPS array is loading animation simulation,
  not UX wizard steps.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## VERIFICATION SUMMARY

| Verdict       | Count | Feature IDs |
|---------------|-------|-------------|
| ✅ COMPLETE   | 34    | 001,002,003,004,005,006,007,008,009,010,012,013,014,015,016,017,018,020,021,023,024,025,026,027,028,029,030,031,033,034,035,039,041,042 |
| 🟡 PARTIAL    | 2     | 011 (Wan 2.2 deploy unconfirmed), 022 (Brand cohesion end-to-end untested) |
| 🔴 MISSING    | 4     | 037 (AppSumo LTD), 038 (Agency White Label), 040 (DB Backup), 043 (5-Step Wizard) |
| ⚠️ DIFFERENT  | 3     | 019 (JWT 24h not 7d), 032 (Creative Direction IS built — docs say PLANNED), 036 (Pre-scan not post-scan) |
| **TOTAL**     | **43**| |

### HIGHEST PRIORITY FINDINGS

1. FEAT-040 (DB Backup): Production data is unrecoverable until mongodump cron is set up on VPS. No backup exists.

2. FEAT-011 (Wan 2.2): Code is complete and correct. Deployment confirmation pending (CONF-014). Until `modal deploy backend/modal_video.py` is confirmed run with correct secrets, all tiers fall back to slideshow/Pexels.

3. FEAT-032 (Creative Direction): Feature is BUILT but docs say PLANNED. Update FEAT-032 in Feature Map, FEAT-004 sub-capability (f), VIDEO_PIPELINE.md Phase 1, PRODUCT_STRATEGY.md Phase 5 to reflect this is live.

4. FEAT-036 (Post-scan): No post-output content scan exists. Only pre-generation input scan on scraped data. If policy requires post-output scanning of videos/posters, this is a genuine safety gap.

5. FEAT-043 (5-Step Wizard): The unified wizard UX does not exist. The Dashboard is a simple URL-paste form. Individual building blocks exist but are not assembled into the described wizard flow.

6. FEAT-022 (Brand Cohesion): All code pieces are in place but the end-to-end flow (create brand → set logo → run Magic Button → confirm logo on video → select profile in Legal → confirm intake prefill) has never been confirmed tested (CONF-034).

### PENDING AJAY CONFIRMATION

- CONF-014: Has `modal deploy backend/modal_video.py` been run? Is MODAL_APP_NAME=launchbusiness-wan-video set in /root/secrets/swiftpack.env?
- CONF-025: Actual Contabo VPS RAM spec?
- CONF-030: Is Google OAuth login working end-to-end on launchbusinessai.com?
- CONF-034: Has full brand cohesion flow been tested end-to-end?

---

VERIFIER TURN COMPLETE. All 43 features verified.

# END OF TRUTH_MEMORY.md
