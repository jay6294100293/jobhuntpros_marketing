#!/bin/bash
# =============================================================================
# SwiftPack AI — Auto-Deploy
# Runs every 5 minutes via cron on the EC2 server.
# Checks for new commits on main; deploys if found.
# =============================================================================
set -euo pipefail

REPO_DIR="/home/ubuntu/swiftpackai"
BRANCH="main"
LOG_FILE="/home/ubuntu/logs/swiftpack-deploy.log"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE="/home/ubuntu/secrets/swiftpack.env"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

mkdir -p /home/ubuntu/logs

cd "$REPO_DIR" || exit 1

git fetch origin "$BRANCH" >> "$LOG_FILE" 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
    exit 0  # Nothing new — stay quiet
fi

log "New commit detected: $LOCAL → $REMOTE"
log "Deploying SwiftPack AI..."

git reset --hard "origin/$BRANCH" >> "$LOG_FILE" 2>&1
log "Now at commit: $(git rev-parse --short HEAD)"

# Zero-downtime: build then swap (no down)
ENV_FILE="$ENV_FILE" docker compose -f "$COMPOSE_FILE" build backend >> "$LOG_FILE" 2>&1
ENV_FILE="$ENV_FILE" docker compose -f "$COMPOSE_FILE" up -d --no-deps backend >> "$LOG_FILE" 2>&1

sleep 5

# Health check
if curl -sf --max-time 10 http://localhost:8001/api/ > /dev/null 2>&1; then
    log "Health check passed. Deploy complete."
else
    log "WARNING: Health check failed after deploy. Check container logs."
fi

docker image prune -f >> "$LOG_FILE" 2>&1
