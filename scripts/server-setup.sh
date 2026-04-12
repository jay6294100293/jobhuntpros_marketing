#!/usr/bin/env bash
# scripts/server-setup.sh — Fresh Ubuntu server setup for SwiftPack AI
#
# Run once on a new EC2 instance as the ubuntu user:
#   bash server-setup.sh
#
# After this script completes:
#   1. Edit /home/ubuntu/secrets/swiftpack.env with real values
#   2. Obtain SSL cert: sudo certbot certonly --standalone -d swiftpackai.tech
#   3. cd /home/ubuntu/swiftpack && docker-compose -f docker-compose.prod.yml up -d --build

set -euo pipefail

REPO_URL="https://github.com/jay6294100293/jobhuntpros_marketing.git"
DEPLOY_DIR="/home/ubuntu/swiftpack"
SECRETS_DIR="/home/ubuntu/secrets"

echo "=========================================="
echo " SwiftPack AI — Server Setup"
echo "=========================================="

# ── System update ──────────────────────────────────────────────────────────────
echo ""
echo "--> Updating system packages"
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw

# ── Docker ─────────────────────────────────────────────────────────────────────
echo ""
echo "--> Installing Docker"
if command -v docker &>/dev/null; then
  echo "    Docker already installed: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker ubuntu
  echo "    Docker installed. You may need to log out and back in for group membership."
fi

# ── Docker Compose ─────────────────────────────────────────────────────────────
echo ""
echo "--> Installing Docker Compose"
if docker compose version &>/dev/null 2>&1; then
  echo "    Docker Compose already installed: $(docker compose version)"
else
  sudo apt-get install -y docker-compose-plugin
  echo "    Docker Compose installed: $(docker compose version)"
fi

# ── Git ────────────────────────────────────────────────────────────────────────
echo ""
echo "--> Verifying git"
git --version

# ── Secrets directory ──────────────────────────────────────────────────────────
echo ""
echo "--> Creating secrets directory at $SECRETS_DIR"
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

if [ ! -f "$SECRETS_DIR/swiftpack.env" ]; then
  cat > "$SECRETS_DIR/swiftpack.env" << 'ENVEOF'
# SwiftPack AI production secrets — fill ALL values before starting containers
MONGO_URL=mongodb://mongo:27017
DB_NAME=swiftpackai_db
JWT_SECRET=REPLACE_WITH_STRONG_RANDOM_SECRET_MIN_32_CHARS
ADMIN_SECRET=REPLACE_WITH_STRONG_ADMIN_SECRET
CORS_ORIGINS=https://swiftpackai.tech
BACKEND_URL=https://swiftpackai.tech
FRONTEND_URL=https://swiftpackai.tech
GOOGLE_CLIENT_ID=REPLACE_WITH_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=REPLACE_WITH_GOOGLE_CLIENT_SECRET
GEMINI_API_KEY=REPLACE_WITH_GEMINI_API_KEY
GOOGLE_APPLICATION_CREDENTIALS=/app/backend/gcloud-tts-key.json
OPENROUTER_API_KEY=
BREVO_API_KEY=REPLACE_WITH_BREVO_API_KEY
BREVO_SENDER_EMAIL=noreply@swiftpackai.tech
BREVO_SENDER_NAME=SwiftPack AI
ENVEOF
  chmod 600 "$SECRETS_DIR/swiftpack.env"
  echo "    Placeholder secrets file created at $SECRETS_DIR/swiftpack.env"
  echo "    ** IMPORTANT: edit this file and fill in all real values before deploying **"
else
  echo "    Secrets file already exists — not overwriting"
fi

# ── Deploy directory ───────────────────────────────────────────────────────────
echo ""
echo "--> Setting up deploy directory at $DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

if [ ! -d "$DEPLOY_DIR/.git" ]; then
  git clone "$REPO_URL" "$DEPLOY_DIR"
  echo "    Repository cloned"
else
  echo "    Repository already cloned"
fi

# ── Firewall ───────────────────────────────────────────────────────────────────
echo ""
echo "--> Configuring firewall"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status

# ── Certbot ────────────────────────────────────────────────────────────────────
echo ""
echo "--> Installing Certbot"
if command -v certbot &>/dev/null; then
  echo "    Certbot already installed"
else
  sudo apt-get install -y certbot
  echo "    Certbot installed"
fi

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo " Server setup complete."
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Edit $SECRETS_DIR/swiftpack.env — fill in all real values"
echo "  2. sudo certbot certonly --standalone -d swiftpackai.tech -d www.swiftpackai.tech"
echo "  3. cd $DEPLOY_DIR"
echo "  4. docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
