# RUNBOOK — LaunchBusiness AI
# Generated: 2026-06-21. How to operate this project without asking Claude.
# Pairs with CLAUDE.md (rules) and docs/ARCHITECTURE.md (system map).

---

## 1. Local setup (zero → running)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/Scripts/activate   # Git Bash on Windows
pip install -r requirements.txt
cp .env.example .env          # fill in at least GEMINI_API_KEY, JWT_SECRET, DB_NAME
# FFmpeg must be installed (server.py auto-detects common Windows paths or PATH)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (separate terminal)
cd frontend
yarn install
cp .env.example .env          # REACT_APP_BACKEND_URL=http://localhost:8001
yarn start                    # http://localhost:3000

# MongoDB: run locally (mongodb://localhost:27017) or `docker compose up -d mongo`

# Verify
curl http://localhost:8001/api/    # → {"message":"LaunchBusiness AI API"}
```

---

## 2. Staging deploy (DEFAULT target)

A staging tier was generated under `infra/` on 2026-06-21. Stand it up once:

```bash
cp infra/.env.staging.example infra/.env.staging   # fill in real staging values
docker compose -f infra/docker-compose.staging.yml --env-file infra/.env.staging up -d --build
bash infra/health_check.sh http://localhost:8101    # staging backend port
```

Use staging to validate any change before it reaches `main`/production. Because pushing to
`main` auto-deploys to prod (see §3 warning), do all "does it work?" testing here first.

---

## 3. Production deploy (explicit permission only)

> ⚠ Pushing/merging to `main` ALREADY triggers a production deploy via
> `.github/workflows/deploy.yml` (webhook to `:9000/deploy/swiftpack`) AND a 5-min VPS
> cron. The manual steps below are for hotfixes or when CI is bypassed.

```bash
ssh -i ~/Downloads/novajaytechserver_testing-key.pem root@<SERVER_IP>
cd /opt/swiftpack
git pull
# confirm secrets present
test -f /root/secrets/swiftpack.env || echo "MISSING SECRETS — STOP"
docker compose -f docker-compose.prod.yml up -d --build backend
docker restart swiftpack-nginx-1        # ALWAYS — nginx loses upstream after backend restart
docker compose -f docker-compose.prod.yml up -d --build frontend   # if frontend changed
docker image prune -f
```

Pre-deploy checklist:
- [ ] Validated on staging
- [ ] `python -c "import ast; ast.parse(open('backend/server.py').read())"` passes
- [ ] No secrets in diff: `git grep -nE 'sk_live|whsec_|AIza|price_[0-9A-Za-z]{14}'`
- [ ] Rollback SHA noted

---

## 4. Smoke test checklist (after every deploy)

```bash
BASE=https://launchbusinessai.com   # or staging URL
curl -s $BASE/api/ | grep -q "LaunchBusiness AI API" && echo OK            # health
curl -s -X POST $BASE/api/magic-button -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' | head -c 300                          # core pipeline
```
Manual: load the site, register a throwaway account, run one Magic Button, open Legal
catalog, confirm logo renders in navbar. Check Sentry for new errors.

---

## 5. Rollback procedure

```bash
ssh -i ~/Downloads/novajaytechserver_testing-key.pem root@<SERVER_IP>
cd /opt/swiftpack
git log --oneline -5                 # find last-good SHA
git revert --no-edit <bad_sha>       # preferred (keeps history) — or: git checkout <good_sha>
docker compose -f docker-compose.prod.yml up -d --build backend frontend
docker restart swiftpack-nginx-1
bash infra/health_check.sh https://launchbusinessai.com
```
Avoid `git reset --hard` on the server. Prefer `git revert`.

---

## 6. Common failures (top 5)

1. **502 / API unreachable after backend restart** → nginx lost upstream.
   Fix: `docker restart swiftpack-nginx-1`.
2. **TLS / wrong-domain error** → `nginx/nginx.prod.conf` now targets `launchbusinessai.com`
   (server_name + `/etc/letsencrypt/live/launchbusinessai.com/` certs). If the LIVE server
   was running a hand-edited config, redeploy nginx so it picks up the repo version:
   `docker compose -f docker-compose.prod.yml up -d nginx && docker restart swiftpack-nginx-1`.
   Confirm the cert exists: `ls /etc/letsencrypt/live/launchbusinessai.com/` (else run
   `certbot --nginx -d launchbusinessai.com -d www.launchbusinessai.com`).
3. **Generation works but nothing saves** → Mongo down/unreachable (writes silently
   skipped). Fix: `docker compose -f docker-compose.prod.yml up -d mongo`; check
   `docker logs swiftpack-mongo-1`.
4. **Silent 401s in UI** → frontend reading wrong localStorage key. Must be `jhp_token`.
5. **VPS high CPU during video** → too many concurrent FFmpeg jobs (VPS is 12GB RAM, CPU is the bottleneck not memory). Never install Chromium/Playwright on the VPS.

Logs: `docker logs swiftpack-backend-1 --tail=100` · `…-frontend-1` · `…-nginx-1` ·
`…-mongo-1`. Auto-deploy log: `tail -f /root/logs/swiftpack-deploy.log`.

---

## 7. Database backup & restore  ⚠ PROCEDURE DOCUMENTED — PENDING VPS EXECUTION

Cron commands were reviewed and approved 2026-06-27. Run the steps below on the VPS if
not yet done. Until you confirm the cron is active and a backup file exists in /root/backups/,
treat all production data as unrecoverable.

```bash
# One-off backup (run on the VPS)
docker exec swiftpack-mongo-1 mongodump --db launchbusinessai_db \
  --archive=/data/db/backup-$(date +%F).gz --gzip
docker cp swiftpack-mongo-1:/data/db/backup-$(date +%F).gz /root/backups/

# Automate: add to root crontab (daily 03:00, keep 14 days)
# 0 3 * * * docker exec swiftpack-mongo-1 mongodump --db launchbusinessai_db \
#   --archive=/root/backups/db-$(date +\%F).gz --gzip && \
#   find /root/backups -name 'db-*.gz' -mtime +14 -delete

# Restore
docker cp /root/backups/db-YYYY-MM-DD.gz swiftpack-mongo-1:/tmp/restore.gz
docker exec swiftpack-mongo-1 mongorestore --db launchbusinessai_db \
  --archive=/tmp/restore.gz --gzip --drop

# Verify a backup exists & is non-trivial in size
ls -lh /root/backups/ | tail -5
```
Also copy backups off-box periodically (S3/another host) — a single-VPS backup dies with
the VPS.

---

## 8. Monitoring

- **Sentry** — backend + frontend errors (`SENTRY_DSN`). First place to look on incidents.
- **PostHog** — product analytics / funnels (frontend).
- **Helicone** — Gemini cost + latency (`HELICONE_API_KEY`).
- **Health:** `GET /api/` (Mother AI also polls this; alerts after 2 failed polls).
- **CI:** GitHub Actions sends a Telegram message per run (`TELEGRAM_BOT_TOKEN`).

---

## 9. Secrets rotation

All secrets live in `/root/secrets/swiftpack.env` (prod). To rotate one without downtime:
```bash
# 1. Update the value in the provider (Stripe/Gemini/etc.) and in the env file
nano /root/secrets/swiftpack.env
# 2. Recreate only the backend (frontend bakes REACT_APP_BACKEND_URL at build time)
docker compose -f docker-compose.prod.yml up -d --build backend
docker restart swiftpack-nginx-1
```
- `JWT_SECRET` rotation invalidates all existing sessions (users must re-login) — schedule it.
- `STRIPE_WEBHOOK_SECRET` must match the Stripe dashboard endpoint signing secret.
- Never commit the rotated value; `.env*` and `*.pem` are gitignored.

---

## 10. Incident response (first 15 minutes)

1. Confirm scope: `curl https://launchbusinessai.com/api/` — up or down?
2. Check Sentry for the error spike + the triggering release.
3. `docker ps` + `docker logs swiftpack-<svc>-1 --tail=100` for the failing container.
4. If a recent deploy caused it → roll back (§5). Pushing to `main` auto-deploys, so a
   bad merge is the most likely cause.
5. If nginx 502 → `docker restart swiftpack-nginx-1`.
6. If data risk → take an immediate `mongodump` (§7) before any further changes.
7. Communicate status; write a short post-incident note in `docs/decisions/`.
