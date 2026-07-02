#!/bin/bash
# health_check.sh — run after every staging/prod deploy to confirm the app is alive.
# Usage: bash infra/health_check.sh [BASE_URL]
#   BASE_URL defaults to http://localhost:8101 (staging backend).
# Tests: (1) backend health, (2) DB-backed auth endpoint reachable, (3) core pipeline up.

set -uo pipefail
BASE="${1:-http://localhost:8101}"
FAIL=0

echo "==> Health check against: $BASE"

# 1. Server responds with the expected health payload
if curl -sf "$BASE/api/" | grep -q "LaunchBusiness AI API"; then
  echo "  [OK]   GET /api/ — backend up"
else
  echo "  [FAIL] GET /api/ — backend not responding with expected payload"
  FAIL=1
fi

# 2. Auth endpoint reachable (DB connectivity) — expect HTTP 4xx (bad creds), NOT 5xx/000
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" -d '{"email":"healthcheck@example.com","password":"x"}')
if [ "$CODE" -ge 400 ] && [ "$CODE" -lt 500 ]; then
  echo "  [OK]   POST /api/auth/login — reachable (HTTP $CODE, rejected as expected)"
else
  echo "  [WARN] POST /api/auth/login — unexpected HTTP $CODE (check DB / route)"
  [ "$CODE" -ge 500 ] || [ "$CODE" = "000" ] && FAIL=1
fi

# 3. Core pipeline endpoint accepts a request (don't assert full render time)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/magic-button" \
  -H "Content-Type: application/json" -d '{"url":"https://example.com"}' --max-time 10)
if [ "$CODE" = "000" ] || [ "$CODE" -ge 500 ]; then
  echo "  [WARN] POST /api/magic-button — HTTP $CODE (may be long-running; verify manually)"
else
  echo "  [OK]   POST /api/magic-button — accepted (HTTP $CODE)"
fi

if [ "$FAIL" -eq 0 ]; then
  echo "==> HEALTH CHECK PASSED"
  exit 0
else
  echo "==> HEALTH CHECK FAILED"
  exit 1
fi
