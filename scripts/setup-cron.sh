#!/bin/bash
# =============================================================================
# LaunchBusiness AI — Cron Setup
# Run once on Contabo VPS as root to enable auto-deploy.
# Usage: bash /opt/swiftpack/scripts/setup-cron.sh
# =============================================================================
set -euo pipefail

DEPLOY_SCRIPT="/opt/swiftpack/scripts/auto-deploy.sh"
LOG_DIR="/root/logs"

mkdir -p "$LOG_DIR"
chmod +x "$DEPLOY_SCRIPT"

# Remove any old ubuntu-path entries, add new root-path entry
(crontab -l 2>/dev/null | grep -v "swiftpack\|launchbusiness" || true
 echo "*/5 * * * * $DEPLOY_SCRIPT") | crontab -

echo "Cron configured. LaunchBusiness AI auto-deploys every 5 minutes."
echo "Logs: $LOG_DIR/swiftpack-deploy.log"
echo ""
crontab -l
