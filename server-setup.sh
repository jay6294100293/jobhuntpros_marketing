#!/usr/bin/env bash
# server-setup.sh — Fresh Ubuntu server setup for SwiftPack AI
# Run once on a new server as root or with sudo.
# Usage: sudo bash server-setup.sh

set -euo pipefail

REPO_URL="https://github.com/YOUR_ORG/swiftpackai.git"
DEPLOY_DIR="/home/ubuntu/swiftpackai"
SECRETS_DIR="/home/ubuntu/secrets"

echo "==> SwiftPack AI server setup"

# ── System packages ────────────────────────────────────────────────────────────
echo "--- Updating system packages ---"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw

# ── Docker ─────────────────────────────────────────────────────────────────────
echo "--- Installing Docker ---"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker ubuntu
  echo "Docker installed. NOTE: log out and back in for group to take effect."
else
  echo "Docker already installed: $(docker --version)"
fi

# ── Docker Compose ─────────────────────────────────────────────────────────────
echo "--- Installing Docker Compose plugin ---"
if ! docker compose version &>/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin
fi
echo "Docker Compose: $(docker compose version)"

# ── Secrets directory ──────────────────────────────────────────────────────────
echo "--- Creating secrets directory ---"
mkdir -p "$SECRETS_DIR"
chown ubuntu:ubuntu "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

if [ ! -f "$SECRETS_DIR/swiftpack.env" ]; then
  echo "--- Creating placeholder secrets file ---"
  cat > "$SECRETS_DIR/swiftpack.env" <<'ENVEOF'
# Populate all values before running docker-compose.prod.yml
MONGO_URL=mongodb://mongo:27017
DB_NAME=swiftpackai_db
JWT_SECRET=REPLACE_ME
ADMIN_SECRET=REPLACE_ME
CORS_ORIGINS=https://swiftpackai.tech
BACKEND_URL=https://swiftpackai.tech
FRONTEND_URL=https://swiftpackai.tech
GOOGLE_CLIENT_ID=REPLACE_ME
GOOGLE_CLIENT_SECRET=REPLACE_ME
GEMINI_API_KEY=REPLACE_ME
BREVO_API_KEY=REPLACE_ME
BREVO_SENDER_EMAIL=noreply@swiftpackai.tech
BREVO_SENDER_NAME=SwiftPack AI
ENVEOF
  chown ubuntu:ubuntu "$SECRETS_DIR/swiftpack.env"
  chmod 600 "$SECRETS_DIR/swiftpack.env"
  echo "IMPORTANT: Edit $SECRETS_DIR/swiftpack.env and fill in all real values before deploying."
else
  echo "Secrets file already exists — not overwriting."
fi

# ── Clone repo ─────────────────────────────────────────────────────────────────
echo "--- Cloning repository ---"
if [ ! -d "$DEPLOY_DIR/.git" ]; then
  git clone "$REPO_URL" "$DEPLOY_DIR"
  chown -R ubuntu:ubuntu "$DEPLOY_DIR"
else
  echo "Repo already cloned at $DEPLOY_DIR"
fi

# ── Firewall ───────────────────────────────────────────────────────────────────
echo "--- Configuring firewall ---"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status

# ── SSL (Certbot) ──────────────────────────────────────────────────────────────
echo "--- Installing Certbot ---"
if ! command -v certbot &>/dev/null; then
  apt-get install -y certbot
fi
echo "To obtain SSL certificate run:"
echo "  certbot certonly --standalone -d swiftpackai.tech -d www.swiftpackai.tech"

echo ""
echo "==> Server setup complete"
echo ""
echo "Next steps:"
echo "  1. Edit $SECRETS_DIR/swiftpack.env with real values"
echo "  2. Run certbot to get SSL cert"
echo "  3. cd $DEPLOY_DIR && docker-compose -f docker-compose.prod.yml up -d --build"
