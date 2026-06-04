#!/usr/bin/env bash
# =============================================================================
# LaunchBusiness AI — Fresh Contabo VPS Setup
# Run once as root on a new Contabo VPS.
# Usage: bash /opt/swiftpack/scripts/server-setup.sh
# Server: Contabo VPS, running as root
# =============================================================================
set -euo pipefail

REPO_URL="https://github.com/jay6294100293/jobhuntpros_marketing.git"
DEPLOY_DIR="/opt/swiftpack"
SECRETS_DIR="/root/secrets"
DOMAIN="launchbusinessai.com"

echo "=========================================="
echo " LaunchBusiness AI — Server Setup"
echo " Server: Contabo VPS (root)"
echo "=========================================="

# ── System update ──────────────────────────────────────────────────────────
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw certbot python3-certbot-nginx

# ── Docker ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    echo "Docker installed."
else
    echo "Docker already installed: $(docker --version)"
fi

# ── Clone repo ─────────────────────────────────────────────────────────────
if [ ! -d "$DEPLOY_DIR" ]; then
    git clone "$REPO_URL" "$DEPLOY_DIR"
    echo "Repo cloned to $DEPLOY_DIR"
else
    echo "Repo already exists at $DEPLOY_DIR"
fi

# ── Secrets dir ─────────────────────────────────────────────────────────────
mkdir -p "$SECRETS_DIR"
if [ ! -f "$SECRETS_DIR/swiftpack.env" ]; then
    echo "# Add your secrets here" > "$SECRETS_DIR/swiftpack.env"
    echo "Created $SECRETS_DIR/swiftpack.env — fill in real values before deploying"
fi

# ── Logs dir ────────────────────────────────────────────────────────────────
mkdir -p /root/logs

# ── Auto-deploy cron ────────────────────────────────────────────────────────
chmod +x "$DEPLOY_DIR/scripts/auto-deploy.sh"
(crontab -l 2>/dev/null | grep -v "swiftpack" || true
 echo "*/5 * * * * $DEPLOY_DIR/scripts/auto-deploy.sh") | crontab -
echo "Cron configured — auto-deploy every 5 minutes."

# ── SSL cert ────────────────────────────────────────────────────────────────
echo ""
echo "Next steps:"
echo "  1. Fill secrets: nano $SECRETS_DIR/swiftpack.env"
echo "  2. SSL cert: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "  3. First deploy: cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml up -d --build"
echo "  4. Check logs: tail -f /root/logs/swiftpack-deploy.log"
