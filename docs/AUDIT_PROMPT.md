# LaunchBusiness AI — Full Codebase Audit Prompt
# Use this to start a full audit session

---

## Project Identity
- **Product:** LaunchBusiness AI — Marketing Launch Pack + AI Legal Documents
- **Live at:** https://launchbusinessai.com
- **Repo:** D:\NOVAJAY_TECH\jobhuntpro_marketing
- **Backend:** FastAPI (Python 3.11), 7 modules: server.py (~4,496 lines) + legal_router.py + admin_router.py + brand_router.py + jarvis_router.py + modal_video.py + modal_sadtalker.py
- **Frontend:** React 19, Tailwind CSS 3.4, Shadcn/UI
- **Database:** MongoDB 7 (Motor async), DB name: launchbusinessai_db
- **Auth:** JWT (jose) + bcrypt. Frontend token key: `jhp_token` in localStorage
- **TTS:** Edge TTS (Microsoft AndrewNeural) — free, no API key required
- **Video:** FFmpeg + Pillow (CPU) → Modal Wan 2.2 TI2V-5B (A10G, $0.03/clip) for paid tiers
- **Payments:** Stripe subscriptions + legal credit one-time topups
- **FPS:** 25 (not 24)

## Must Never Break
1. Magic Button pipeline: POST /api/magic-button (alias: /api/magic-launch-pack)
2. Auth + JWT validation (token stored as `jhp_token` in localStorage)
3. Legal document generation flow

## Health Check
```bash
curl http://localhost:8001/api/
# Expected: {"message": "LaunchBusiness AI API"}
```

## Audit Checklist

### Security
- All endpoints that should require auth: verified?
- User A cannot access User B's legal_documents / legal_profiles?
- JWT: algorithm, expiry, signature validated correctly?
- Stripe webhooks: STRIPE_WEBHOOK_SECRET validated?
- URL scraping: SSRF protection via _is_safe_url() active?
- Admin routes: require is_admin=True? (not just X-Admin-Secret)
- Rate limits: login/register/forgot-password all rate-limited?

### Data Integrity
- All user-owned queries filtered by user_id?
- payment_transactions never deleted?
- MongoDB writes: silent skip if Mongo down (intentional — don't "fix" to hard failure)

### Performance
- All FFmpeg/Pillow work in asyncio.run_in_executor (never blocks event loop)?
- asyncio.gather used for parallel script + video generation?

### Legal Compliance
- Every generated legal document has lawyer-review disclaimer?
- Legal disclaimer never stripped?

### Frontend
- All authenticated fetches read localStorage.getItem('jhp_token') (not 'token')?
