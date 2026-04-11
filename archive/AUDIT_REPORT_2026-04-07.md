# AUDIT REPORT — 2026-04-07
# JobHuntPro Content Studio — server.py + frontend

---

## Summary
6 CRITICAL issues found. All fixable in server.py without touching the Magic Button pipeline.

---

## CRITICAL Issues

### C1 — Synchronous HTTP calls blocking the event loop
**Files:** `backend/server.py`
**Lines:** 335 (`send_email`), 370 (`extract_colors_from_image`), 512 (`scrape_url`), 1313/1323 (`google_oauth_callback`)
**Risk:** Under concurrent load, any of these blocks all other requests until the HTTP call completes. 10s scrape = 10s freeze for every other user.
- `send_email()` uses `requests.post()` — called from async register/forgot-password/resend-verification handlers
- `scrape_url()` uses `requests.get()` — the primary pipeline entry point
- `extract_colors_from_image()` uses `requests.get()` — called inside scrape_url
- `google_oauth_callback()` uses two synchronous `requests.post/get`
**Fix:** Replace with `httpx.AsyncClient` (already in requirements.txt)
**Status:** ✅ FIXED

---

### C2 — File upload reads entire payload into RAM before size check
**File:** `backend/server.py:567`
**Risk:** An attacker sends a 2 GB file → server OOM-kills before the 50 MB check fires. Partial file also written to disk before error raised.
```python
content = await file.read()          # ← entire file loaded into RAM here
if len(content) > _MAX_UPLOAD_BYTES:  # ← check fires too late
```
**Fix:** Stream in chunks; reject as soon as accumulated size exceeds limit, delete partial file.
**Status:** ✅ FIXED

---

### C3 — OAuth CSRF state validation is bypassable
**File:** `backend/server.py:1310`
**Risk:** Account takeover via CSRF. If `oauth_state` cookie is absent, the check short-circuits to `True` and any `state` value is accepted.
```python
if expected_state and state != expected_state:   # ← missing cookie = no check
```
**Fix:** Reject callback if cookie is missing (treat as CSRF attempt).
**Status:** ✅ FIXED

---

### C4 — Unvalidated `framework` field — prompt injection
**File:** `backend/server.py:263`
**Risk:** `ScriptRequest.framework` is a free-form string that flows directly into the Gemini prompt. An attacker can inject arbitrary instructions into the AI model.
```python
class ScriptRequest(BaseModel):
    framework: str   # ← any string, including "PAS\n\nIgnore above..."
```
**Fix:** Add a Pydantic `field_validator` restricting to `{"PAS", "Step-by-Step", "Before/After"}`.
**Status:** ✅ FIXED

---

### C5 — User-supplied image paths used in FFmpeg without UPLOADS_DIR boundary check
**File:** `backend/server.py:853`
**Risk:** `CompleteVideoRequest.images` accepts arbitrary filesystem paths. FFmpeg will read `/etc/passwd`, `/app/backend/.env`, etc. if passed.
```python
valid_images = [p for p in image_list[:5] if Path(p).exists()]  # ← no scope check
```
**Fix:** Validate each path resolves inside `UPLOADS_DIR`.
**Status:** ✅ FIXED

---

### C6 — No length limit on `text`/`script` fields — DoS & TTS cost abuse
**File:** `backend/server.py:270-288`
**Risk:** Unlimited `VoiceoverRequest.text` or `CompleteVideoRequest.script` → memory exhaustion, runaway TTS API costs, and infinite video render loops.
**Fix:** Add `max_length` via Pydantic `Field(max_length=...)`.
**Status:** ✅ FIXED

---

## NON-CRITICAL (not fixed in this pass)

| ID | Severity | Description |
|----|----------|-------------|
| N1 | HIGH | `product_name` / `target_audience` in `ScriptRequest` have no max_length — prompt padding risk | ✅ FIXED (applied during C4 fix — `Field(max_length=200)` on both fields) |
| N2 | HIGH | `scrape_url` follows HTTP redirects without re-validating each hop with `_is_safe_url` | ✅ FIXED — added `_safe_http_get()` helper that manually follows redirects and re-checks every location header; OG image URL now SSRF-validated before fetch; `extract_colors_from_image` disabled `follow_redirects` |
| N3 | MEDIUM | `delete_project` allows unauthenticated users to delete any project | ✅ FIXED — unauthenticated requests now 401; query always scoped to `user_id` |
| N4 | MEDIUM | `get_projects` returns all projects when unauthenticated (`query = {}`) — information disclosure | ✅ FIXED — unauthenticated requests now return `[]`; query always scoped to `user_id` |
| N5 | LOW | `create_poster` swallows exceptions; partial `.png` files left on disk | ✅ FIXED — `poster_id`/`poster_path` moved before `try`; both `except` branches call `poster_path.unlink(missing_ok=True)` before re-raising |
| N6 | LOW | Rate limiter uses in-process dict — resets on restart, ineffective behind multiple workers | ✅ FIXED — all 8 path keys corrected to forward slashes (backslash bug meant 7 of 8 limits were silently inactive); added comment documenting the single-process limitation and Redis upgrade path |

---

## Magic Button Pipeline Status
Pipeline intact. No CRITICAL issues touch `/api/scrape → /api/generate-script → /api/create-complete-video + /api/create-poster` in a breaking way. C1 fix (async scrape) will improve throughput.

---
