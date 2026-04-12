#!/usr/bin/env bash
# scripts/deploy.sh — Manual deploy to production server
#
# Usage: bash scripts/deploy.sh [user@host]
# Example: bash scripts/deploy.sh ubuntu@54.123.45.67
#
# Requires SSH access to the server. For automated deploys, GitHub Actions
# handles this — use this script only for emergency manual deploys.

set -euo pipefail

SERVER="${1:-ubuntu@swiftpackai.tech}"
REMOTE_DIR="/home/ubuntu/swiftpack"

echo "==> Manual deploy to $SERVER"
echo "    Remote dir: $REMOTE_DIR"
echo ""

ssh "$SERVER" bash << ENDSSH
  set -euo pipefail

  echo "--> Pulling latest code from main"
  cd "$REMOTE_DIR"
  git pull origin main

  echo "--> Verifying secrets file exists"
  if [ ! -f /home/ubuntu/secrets/swiftpack.env ]; then
    echo "ERROR: /home/ubuntu/secrets/swiftpack.env not found."
    echo "Run scripts/server-setup.sh first."
    exit 1
  fi

  echo "--> Restarting containers"
  docker-compose -f docker-compose.prod.yml down
  docker-compose -f docker-compose.prod.yml up -d --build

  echo "--> Cleaning up old images"
  docker system prune -f

  echo "--> Checking backend health"
  sleep 5
  curl -sf http://localhost:8001/api/ | grep -q "SwiftPack AI" \
    && echo "Backend health: OK" \
    || echo "WARNING: Backend health check returned unexpected response"

  echo ""
  echo "==> Deploy complete"
ENDSSH
