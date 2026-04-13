#!/bin/bash
cp /home/ubuntu/swiftpack/scripts/auto-deploy.sh /home/ubuntu/auto-deploy-swiftpack.sh
chmod +x /home/ubuntu/auto-deploy-swiftpack.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/ubuntu/auto-deploy-swiftpack.sh") | crontab -
echo "SwiftPack AI auto-deploy cron configured."
echo "Logs at: /home/ubuntu/logs/swiftpack-deploy.log"
