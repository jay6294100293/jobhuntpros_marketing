#!/usr/bin/env bash
# deploy.sh — Deploy SwiftPack AI to production server
# Usage: ./deploy.sh [user@server] [branch]
#
# Examples:
#   ./deploy.sh ubuntu@swiftpackai.tech
#   ./deploy.sh ubuntu@swiftpackai.tech main

set -euo pipefail

SERVER="${1:-ubuntu@swiftpackai.tech}"
BRANCH="${2:-main}"
REMOTE_DIR="/home/ubuntu/swiftpackai"

echo "==> Deploying branch '$BRANCH' to $SERVER"

ssh "$SERVER" bash <<EOF
set -euo pipefail

echo "--- Pulling latest code ---"
cd "$REMOTE_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "--- Verifying secrets file exists ---"
if [ ! -f /home/ubuntu/secrets/swiftpack.env ]; then
  echo "ERROR: /home/ubuntu/secrets/swiftpack.env not found."
  echo "Run server-setup.sh first and populate the secrets file."
  exit 1
fi

echo "--- Building and restarting containers ---"
docker-compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo "--- Waiting for backend health check ---"
sleep 5
curl -sf http://localhost:8001/api/ | grep -q "SwiftPack AI" && echo "Backend OK" || echo "WARNING: Backend health check failed"

echo "--- Cleaning up old images ---"
docker image prune -f

echo "==> Deploy complete"
EOF
