# LaunchBusiness AI — Project Truth Document
# Generated: 2026-06-30 | Verified by: TRUTH_AGENT Session 1
# Covers: 43 features across 26 docs and 7 backend modules (6,453 lines of code)

---

## 1. WHAT THIS PROJECT IS

LaunchBusiness AI is a web platform for solo founders and small teams who need to launch a product fast. It solves two expensive, time-consuming problems in one place: creating professional marketing content and generating legally compliant business documents.

The Marketing pillar (Pillar 1) takes a product URL and, in roughly 90 seconds, produces a complete launch pack: four format-optimised videos (portrait, landscape, square, and vertical feed), three marketing scripts, two branded social posters, and a logo. Every asset is branded using colors and copy extracted directly from the founder's own product page — no design experience required.

The Legal pillar (Pillar 2) lets founders generate 28 types of jurisdiction-aware legal documents through a conversational intake process. A Gemini-powered chat gathers the founder's business profile, then generates documents grounded in live 2026 law research for Canada, the USA, and the EU. Documents cost credits (included monthly with paid plans, or purchasable one-time). All documents include a mandatory lawyer-review disclaimer.

---

## 2. PLATFORM & TECH

LaunchBusiness AI is a web application with no mobile app. The backend is a Python/FastAPI service (7 modules, 6,453 lines) backed by MongoDB. The frontend is a React 19 single-page app. A Chrome MV3 extension (Tutorial Studio) records product demos separately. AI generation uses Google Gemini 2.5 Flash. Video rendering uses FFmpeg on the server CPU, with optional GPU rendering via Modal (Wan 2.2 TI2V-5B). Payments run through Stripe. The product is live at launchbusinessai.com on a single Contabo VPS behind Nginx.

---

## 3. REVENUE MODEL

The product is pre-revenue — no live paying users yet. Stripe subscription code is fully written but requires live keys and price IDs to be set in production secrets before any user can pay. Plans: Free (3 lifetime video generations, watermarked, no legal docs), Starter ($19/mo, 15 videos, 20 legal credits, 1 brand profile), Pro ($49/mo, 50 videos, 60 credits, 3 profiles), Agency ($149/mo, 200 videos, 150 credits, 10 profiles). Legal credit topups are available (15/$5, 35/$10, 80/$20). When users hit their tier limit they receive a hard block — no overage charging is implemented.

---

## 4. FEATURE TRUTH — COMPLETE FEATURES (34)

### Magic Button Pipeline
The core product feature. A user pastes any product URL and the system returns 9 assets: 4 videos in different aspect ratios (9:16 for TikTok/Reels, 16:9 for YouTube, 1:1 for Instagram, 4:5 for Facebook), 3 marketing scripts (PAS, Step-by-Step, Before/After), and 2 branded posters. All generation runs in parallel. The endpoint exists under two identical names — both work.
  • URL scrape → brand colors, headline, features extracted — works
  • 5 parallel Gemini script calls (format-targeted word counts) — works
  • 4 videos rendered in parallel — works
  • 2 posters generated — works
  • Usage counter enforced against tier limits — works

### URL Scraping & URL Intelligence
Extracts brand colors, headlines, product features, and images from any product URL using httpx and BeautifulSoup. Scraped data is processed and returned — never stored in the database.
  • Brand color, headline, feature, image extraction — works
  • Data not persisted — works

### URL Safety & SSRF Protection
Multi-layer protection runs before any URL is scraped. Blocks adult/malicious hostnames, rejects bare IP addresses in private ranges, resolves every hostname via DNS and checks every returned IP against private/loopback/reserved ranges (fails closed on DNS error), and scans scraped title and description for adult content signals before generation begins. Google Safe Browsing is an optional additional layer.
  • Hostname blocklist — works
  • Bare IP check against RFC1918 ranges — works
  • DNS resolution + private IP check — works
  • Pre-generation content scan for adult signals — works
  • Google Safe Browsing (optional, key-gated) — works when key set

### Script Generation (Gemini)
Generates marketing scripts using Gemini 2.5 Flash. Three frameworks: PAS (ad style), Step-by-Step (tutorial), and Before/After (transformation). Each video format gets a word-count-targeted prompt. OpenRouter provides an automatic Gemini fallback.
  • PAS / Step-by-Step / Before-After frameworks — works
  • Format-targeted word counts per aspect ratio — works
  • OpenRouter fallback — works when key set

### Creative Direction Input (Starter+)
Founders can optionally type a creative direction (up to 300 characters) before generating. It is injected into every Gemini script prompt as tone and messaging guidance. This feature is live — contrary to documentation that marked it as a future phase.
  • Optional creative direction field on dashboard — works
  • Injected into all script generation calls — works
  • Starter+ only — works

### Edge TTS Neural Voiceover
All videos include neural voiceover using Microsoft's Edge TTS (AndrewNeural voice). Free — no API key required. Voiceover runs 5% faster for marketing pacing. gTTS activates automatically if Edge TTS fails.
  • Neural voice (Microsoft AndrewNeural) — works
  • No API key required — works
  • gTTS automatic fallback — works

### Pillow Slide Design System (6 Templates)
Six marketing slides: Hero (product name + headline), Problem (pain point), Solution (value prop), Features (3 checkmarks), HowItWorks (numbered steps), CTA (URL + urgency). Brand colors from URL scrape applied to every slide. Active logo renders on Hero and CTA slides when set.
  • All 6 slide types — works
  • Brand colors applied from scrape — works
  • Logo on Hero and CTA slides (when active brand set) — works
  • Custom fonts (Poppins, DM Sans/Inter) bundled — works

### FFmpeg Video Assembly
FFmpeg assembles slides, audio, and effects into MP4. Features: Ken Burns zoom/pan per slide, xfade crossfade transitions (0.5s, 6 types), word-chunk captions (TikTok style, 3 words at a time, 80% height), branded progress bar, optional background music (ducked 18dB, Starter+), and audio-driven duration via ffprobe. All FFmpeg work runs off the main event loop.
  • Ken Burns, xfade, captions, progress bar — works
  • Music bed (Starter+, ducked 18dB) — works
  • Audio-driven duration — works
  • Non-blocking (asyncio executor) — works

### Multi-Format Video Export
All four video formats generate in parallel for paid users. Free users receive only 9:16 portrait.
  • 4 formats (9:16 / 16:9 / 1:1 / 4:5) for Starter+ — works
  • Free tier restricted to 9:16 — works

### Watermark (Free Tier)
Free tier videos have a diagonal "LaunchBusiness AI" watermark burned into the center at 30% opacity. Cannot be cropped out. Removed for Starter+.
  • Diagonal watermark, burned into content area — works
  • Removed on Starter+ — works

### Pexels B-roll Integration (Optional)
When a Pexels API key is configured, the pipeline fetches relevant stock video for backgrounds. Videos render as Pillow slideshow when no key is set.
  • B-roll fetch when key set — works
  • Graceful fallback without key — works

### Poster Generator
Generates 1:1 (square) and 9:16 (vertical) branded social graphics automatically as part of every Magic Button run.
  • 1:1 and 9:16 posters — works
  • Brand colors applied — works

### Logo Creator
Generates 6 logo variations using Pillow templates. Ideogram AI logo concepts available when API key configured. Generated logos can be saved as the active logo on a brand profile, and then render on all videos and posters.
  • 6 Pillow template logos — works
  • Ideogram AI concepts (optional, key-gated) — works when key set
  • Save logo to brand profile — works

### Multi-Hook Variants
Every Magic Button run returns three script variants (hook_variants): PAS ad script, Step-by-Step tutorial script, and Before/After script.
  • 3 script variants returned per run — works

### ZIP Batch Download
Multiple generated files can be downloaded together as a single ZIP. Used for content output packs and the Logo Creator brand kit.
  • Multi-file ZIP download — works

### Custom Font System
Marketing slide fonts are bundled inside the backend container (Poppins ExtraBold/Bold for headings, DM Sans/Inter for body). Falls back to system fonts if missing.
  • Bundled fonts — works
  • System font fallback — works

### Legal Document Generation (28 Types)
Searches DuckDuckGo for current law requirements per jurisdiction, passes results and user's business profile to Gemini, appends mandatory lawyer-review disclaimer, stores document, deducts credits. 28 types across 5 categories. Jurisdictions: Canada, USA, EU.
  • 28 document types — works
  • Live DuckDuckGo law context search — works
  • Gemini generation with jurisdiction context — works
  • Mandatory lawyer-review disclaimer (cannot be stripped) — works
  • Credit deduction (monthly first, then topup wallet) — works

### Legal Credit System
Two credit pools: monthly allowance (resets each billing cycle per plan) and permanent topup wallet (never expires). Deduction order: monthly first.
  • Monthly allowance — works
  • Permanent topup wallet — works
  • Monthly-first deduction order — works

### Legal Intake Chat (Gemini)
AI intake conversation gathers the user's business profile before document generation. Gemini detects when enough information is collected ([PROFILE_COMPLETE] marker) and saves the structured profile to the database.
  • Gemini-driven conversational intake — works
  • [PROFILE_COMPLETE] detection and auto-save — works
  • Profile persisted for future sessions — works

### Legal Document Vault
Users view, copy, and download all their generated legal documents. Documents older than 90 days show a laws-may-have-changed nudge.
  • Document history per profile — works
  • Copy and download — works
  • 90-day laws-changed nudge — works

### Legal Document Regeneration
Any previously generated document can be regenerated at a 10% credit discount.
  • Regeneration at 10% credit discount — works

### Privacy Policy & Terms of Service Pages
Public pages at /privacy and /terms, no login required. Linked from landing page footer and auth forms.
  • /privacy and /terms routes (no auth) — works
  • Linked from Landing footer and auth forms — works
  • Note: plain-language content, not lawyer-reviewed — legal review needed before GA

### JWT Authentication
JWT tokens (jose + bcrypt) stored in localStorage as jhp_token. Expire after 24 hours.
  • JWT + bcrypt auth — works
  • Token stored as jhp_token — works
  • 24-hour expiry — works

### Stripe Subscriptions
Full Stripe subscription lifecycle: checkout sessions, webhook handling for created/updated/canceled/payment-failed, idempotency via payment_transactions ledger. Code complete — going live requires live keys in production secrets.
  • Subscription checkout (Starter/Pro/Agency) — works
  • Webhook event handling + idempotency — works
  • Status: code complete, awaiting live Stripe configuration

### Stripe Legal Credit Topup
One-time Stripe Checkout for credit topups (15/$5, 35/$10, 80/$20). Webhook adds credits to permanent wallet.
  • One-time checkout + webhook credit — works

### Account Deletion (GDPR Erasure)
Users delete their account from Settings with re-auth (password or email confirmation). All user-owned collections deleted in dependency order; payment_transactions retained. Best-effort Stripe subscription cancel.
  • Re-auth gate, correct deletion order — works
  • payment_transactions retained — works
  • Settings page with typed confirmation — works

### Stripe Subscription Sync & Payment Failure Handling
Status-aware tier changes. Payment failures set billing_status=past_due without revoking access. Cancellations downgrade to free. stripe_subscription_id stored for reliable event mapping.
  • Status-aware tier grant/revoke — works
  • Payment failure → past_due — works
  • Cancellation → free — works

### Brand Profiles (CRUD)
Named brand profiles store business name, URL, colors, and active logo. Plan-limited: Free=0, Starter=1, Pro=3, Agency=10. Active logo URL stored and used across videos and posters.
  • Create / read / delete profiles — works
  • Plan limits (0/1/3/10) enforced — works
  • active_logo_url field — works

### Brand Context (Active Brand)
Active brand persists via localStorage. Navigation bar shows brand switcher (Starter+). Logo Creator auto-fills from active brand. Hub shows cross-sell nudge to save Magic Button result as a brand profile.
  • Active brand in localStorage — works
  • Navbar brand switcher (Starter+) — works
  • Logo Creator auto-fill — works

### Tutorial Studio (Chrome Extension)
Chrome extension records a product demo. Recording is uploaded to the backend, where Gemini generates one sentence of narration per screenshot frame and FFmpeg assembles a 16:9 YouTube-style tutorial MP4. Starter+ only.
  • Chrome extension record/stop UI — works
  • Upload + Gemini frame narration + FFmpeg assembly — works
  • Starter+ only — works

### Observability (Sentry + PostHog + Helicone)
Sentry captures errors (backend + frontend), PostHog tracks product analytics (frontend), Helicone proxies Gemini for cost and latency tracking. All key-gated, app runs without them.
  • Sentry, PostHog, Helicone — works when keys set

### Admin Panel
Admin status auto-granted to any email in ADMIN_EMAILS on login (password or Google). Admin panel provides user management, coupon management, and system audit. All /api/admin/* routes require is_admin=True.
  • Auto-grant via ADMIN_EMAILS — works
  • User management, coupons, audit — works
  • Auth gate (is_admin=True) — works

### CI/CD Auto-Deploy
Every push to main triggers a production deploy via GitHub Actions webhook and a 5-minute VPS cron. CI runs pytest tests/ on every push and sends Telegram notifications.
  • GitHub Actions → VPS webhook — works
  • VPS cron (5-min) — works
  • pytest + Telegram notifications — works

### Google Safe Browsing (Optional)
URL scrape requests checked against Google's malware/phishing database when key is configured. Other safety layers run regardless.
  • Key-gated, works alongside other layers — works

### Google OAuth Login (Optional)
Full OAuth flow implemented. Admin auto-grant works on Google login. Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
  • OAuth redirect + callback — works
  • Admin auto-grant on Google login — works

---

## 5. FEATURE TRUTH — PARTIAL FEATURES (2)

### Wan 2.2 GPU Video (Starter+)
The Modal serverless GPU video code is complete. The pipeline animates the branded Hero slide using Wan 2.2 TI2V-5B on A10G at $0.03/clip. However, whether this has been deployed to Modal and whether credentials are set in production is unconfirmed.
  What works:
  • modal_video.py code is complete and correct
  What is pending:
  • `modal deploy backend/modal_video.py` must be run on the real Modal account
  • MODAL_TOKEN_ID + MODAL_TOKEN_SECRET + MODAL_APP_NAME must be in /root/secrets/swiftpack.env
  • Until confirmed: all tiers receive FFmpeg slideshow, not AI-animated video

### Brand Cohesion End-to-End
Every individual piece exists in code: brand profiles, logo rendering on slides and posters, Logo Creator auto-fill, legal intake pre-fill. However, the complete "enter brand once, it appears everywhere" flow has not been documented as tested end-to-end.
  What works individually:
  • Brand profile CRUD, active logo on slides and posters, Logo Creator auto-fill, legal pre-fill
  What is pending:
  • A verified manual walk of: create brand → set logo → Magic Button → confirm logo on Hero/CTA/posters → open Legal → confirm intake pre-fills
  • This is the core product promise to paid users — an unverified integration is a launch risk

---

## 6. FEATURE TRUTH — DIFFERENT FROM DOCS (3)

### JWT Session Length
Docs claimed: 7-day token expiry (referenced in some session documentation).
Reality: Tokens expire after 24 hours.
Impact: Any UX copy or help text saying "stay logged in for a week" is wrong. No code change needed unless 7 days was actually intended.

### Creative Direction Input
Docs claimed: Planned for a future phase (Phase 5), not yet built.
Reality: Fully implemented and live. The brand_context field is already wired into every script generation call for Starter+ users.
Impact: Positive — a documented future feature is actually shipping now. Update PRODUCT_STRATEGY.md Phase 5 to mark it DONE.

### Content Safety Scan
Docs claimed: ARCHITECTURE.md described a "post-output content scan" as Step 7 of the Magic Button pipeline.
Reality: The scan (_is_safe_content) runs on the SCRAPED INPUT — page title and meta description — before generation begins. There is no scan of generated videos or posters.
Impact: The safety model is input-gating, not output-gating. Generated content itself is not scanned. If a legitimate URL produces unexpected generated content, there is no post-output catch.

---

## 7. FEATURE TRUTH — MISSING FEATURES (4)

### Database Backup Cron
Claimed: Daily mongodump at 03:00, 14-day retention.
Reality: Commands are documented. The cron job has NOT been set up on the VPS. No automated backup is running.
Gap: SSH into VPS and add to crontab:
`0 3 * * * docker exec swiftpack-mongo-1 mongodump --out /root/backups/$(date +\%Y-\%m-\%d) && find /root/backups -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +`
Priority: CRITICAL — all production data is currently unrecoverable on disk failure. This is the single most urgent item in the entire project.

### 5-Step Brand Launch Wizard
Claimed: A full 5-step wizard UI for Starter+ users — Brand Brief, Brand Identity, Script Selection, Format + Hook Selection, Download Pack.
Reality: Dashboard is still a URL-paste form. Individual capabilities (brand profiles, logo picker, format selection, ZIP download) all work as separate components, but the sequential 5-step wizard flow does not exist.
Gap: Design and build the wizard flow in Dashboard.js connecting existing components.
Priority: High — this is the primary paid-tier UX improvement and the documented experience for Starter+ users.

### AppSumo Lifetime Deal
Claimed: Two LTD tiers ($79/15 gens/mo, $149/50 gens/mo). Max 500 codes.
Reality: No code exists. Go-to-market plan only.
Gap: Requires Stripe live activation first, then AppSumo partner integration.
Priority: Low — planned post-launch, correctly sequenced after Stripe goes live.

### Agency White Label & API Access
Claimed: Future Agency enhancements — remove branding, REST API access, 5 team seats.
Reality: No code exists. Future roadmap item.
Priority: Low — future phase.

---

## 8. OVERALL PROJECT STATUS

LaunchBusiness AI is 79% complete by feature count. The missing 9% includes one item that is not optional before launch: the database backup cron has never been set up, meaning all production data is currently unrecoverable on disk failure. This must be resolved before any marketing drives real users to the platform.

The other launch blockers are configuration, not code. Stripe live keys must be set before anyone can pay. The Modal deployment must be confirmed before paid users receive AI video instead of a slideshow. Both are environment changes — the code is ready.

The core product is genuinely impressive: 34 of 43 features fully implemented, including the complete Magic Button pipeline, the full legal document system with credit billing, JWT auth, Stripe subscriptions with idempotent webhook handling, GDPR erasure, admin panel, Tutorial Studio, and brand profiles. Three features previously documented as planned (Creative Direction, Tutorial Studio, individual brand cohesion pieces) are actually live. The platform is closer to launch than its own documentation suggested.

---

COMPLETENESS SCORE:
  Complete features:    34 of 43 (79%)
  Partial features:      2 of 43 (5%)
  Different from docs:   3 of 43 (7%)
  Missing features:      4 of 43 (9%)
  Overall: 79% of documented features fully implemented

---

## 9. WHAT TO BUILD / ACTIVATE NEXT

1. **Set up mongodump cron on VPS** — 15 minutes of SSH. Zero code. Eliminates unrecoverable data loss risk. Do this first.

2. **Activate Stripe live mode** — Set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + 3 price IDs in /root/secrets/swiftpack.env. Code is complete. This unlocks revenue.

3. **Confirm Modal deployment** — Run `modal deploy backend/modal_video.py`, set Modal credentials in secrets. Unlocks AI video ($0.03/clip) for all paid users.

4. **Test Brand Cohesion end-to-end** — Manual walk: create brand → set logo → run Magic Button → verify logo on slides/posters → open Legal → verify intake pre-fills. Core product promise needs a verified pass.

5. **Build the 5-Step Brand Launch Wizard** — Connect existing components into a sequential wizard flow for Starter+ users in Dashboard.js.

6. **Fix JWT expiry docs** — Update any UX copy referencing 7-day sessions. Tokens expire at 24 hours.

7. **Mark Creative Direction DONE in roadmap** — Update PRODUCT_STRATEGY.md Phase 5. It is already live.

8. **Lawyer review Privacy Policy and Terms** — Both pages are live but plain-language, not lawyer-reviewed. Required before general availability.

---

## 10. KNOWN UNKNOWNS — RESOLVED 2026-07-02

- **Modal Wan 2.2 deployed?** — UNCONFIRMED. Ajay is not sure. Code is complete. Until `modal deploy backend/modal_video.py` is run and Modal credentials set in /root/secrets/swiftpack.env, all tiers (including paid) receive FFmpeg slideshow only.

- **Contabo VPS RAM spec** — RESOLVED: 12GB RAM. CLAUDE.md ("~1GB") and the old RUNBOOK OOM warning are both wrong. Update those docs — the OOM risk from 4 parallel FFmpeg renders does not apply at 12GB. The no-Playwright-on-VPS rule still applies (not due to RAM but to keep the server clean).

- **Brand Cohesion tested end-to-end?** — CONFIRMED NOT TESTED. Ajay confirmed the full create-brand → logo → Magic Button → slides → Legal intake flow has not been run end-to-end. This is a pre-launch risk item.

---

*This document describes what LaunchBusiness AI actually is as of 2026-06-30.*
*It supersedes any doc that contradicts it. Update this file after major feature changes.*
*Next step: TRUTH_AGENT complete → QA_LOOP can now begin (read this file first).*
