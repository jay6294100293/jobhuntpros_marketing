#!/bin/bash
# =============================================================================
# LaunchBusiness AI (SwiftPack) — Auto-Deploy
# Runs every 5 minutes via cron on the Contabo VPS.
# Server: root@vmi3336991 (Contabo VPS, running as root)
# Repo: /opt/swiftpack
# =============================================================================
set -euo pipefail

REPO_DIR="/opt/swiftpack"
BRANCH="main"
LOG_FILE="/root/logs/swiftpack-deploy.log"
COMPOSE_FILE="docker-compose.prod.yml"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

mkdir -p /root/logs

cd "$REPO_DIR" || exit 1

git fetch origin "$BRANCH" >> "$LOG_FILE" 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
    exit 0  # Nothing new — stay quiet
fi

log "New commit: $LOCAL → $REMOTE"
log "Deploying LaunchBusiness AI..."

git reset --hard "origin/$BRANCH" >> "$LOG_FILE" 2>&1
log "At commit: $(git rev-parse --short HEAD)"

docker compose -f "$COMPOSE_FILE" up -d --build >> "$LOG_FILE" 2>&1

sleep 5

if curl -sf --max-time 10 http://localhost:8001/api/ > /dev/null 2>&1; then
    log "Health check passed. Deploy complete."
else
    log "WARNING: Health check failed. Check: docker logs swiftpack-backend"
fi

docker image prune -f >> "$LOG_FILE" 2>&1
