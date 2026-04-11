# CONTENT STUDIO — AUDIT FIX PROMPT
# Use this AFTER running AUDIT_PROMPT.md and getting a report.

---

## FIX PROMPT (paste into Claude Code)

```
I have a completed audit report at AUDIT_REPORT_[date].md

Read the following files before touching any code:
1. AUDIT_REPORT_[date].md               ← the audit findings
2. PROJECT_SUMMARY.md                   ← feature spec
3. VIDEO_FEATURES.md                    ← video pipeline spec

Use GitNexus before editing any file:
- gitnexus_impact() before modifying any function in server.py
- gitnexus_context() before editing any endpoint

YOUR TASK: Fix all [PRIORITY] items from the audit report.

RULES:
- Fix items ONE AT A TIME
- After each backend fix, test the endpoint:
  curl http://localhost:8001/api/health
  OR the specific endpoint that was fixed
- NEVER block the FastAPI event loop — all video/poster generation
  must run in asyncio.run_in_executor(), never synchronously
- NEVER hardcode API keys — always read from environment variables
- NEVER break the Magic Button pipeline — test it after any server.py change:
  curl -X POST http://localhost:8001/api/magic-launch-pack \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}'
- If a fix requires a missing credential or JSON file → mark as BLOCKED
- Do NOT fix [OTHER PRIORITY] items
- After ALL [PRIORITY] items: run python backend_test.py
- Update AUDIT_REPORT_[date].md — mark each item ✅ FIXED

MAGIC BUTTON PIPELINE — never break these connections:
  /api/scrape → /api/generate-script → /api/create-complete-video + /api/create-poster
  All must be async. All must save to backend/outputs/. All must clean up temp files.

When all [PRIORITY] fixes are done, summarise:
- How many items fixed
- How many BLOCKED
- Magic Button test result: success/fail
- Any new issues discovered
```

---

## SPECIAL CASES

### If fix involves gcloud-tts-key.json missing:
```
Mark as BLOCKED — requires Google Cloud TTS setup
Note: videos will generate without voice until this is fixed
```

### If fix involves MONGO_URL still localhost:
```
Mark as BLOCKED — requires MongoDB Atlas credentials
App works locally, needs this for production deployment
```

### If fix involves missing fallback chain:
```
Implement in server.py:
  Primary:   Gemini 2.5 Flash
  Fallback:  OpenRouter (if OPENROUTER_API_KEY is set)
  Emergency: Template-based script (always works, no AI needed)
Wrap in try/except, test each failure case
```
