#!/bin/bash

REPO_DIR="/home/ubuntu/swiftpack"
BRANCH="main"
LOG_FILE="/home/ubuntu/logs/swiftpack-deploy.log"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE="/home/ubuntu/secrets/swiftpack.env"

mkdir -p /home/ubuntu/logs

cd $REPO_DIR || exit 1

git fetch origin $BRANCH >> $LOG_FILE 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$BRANCH)

if [ "$LOCAL" = "$REMOTE" ]; then
    exit 0
fi

echo "$(date) — New commit detected. Deploying SwiftPack AI..." >> $LOG_FILE

git pull origin $BRANCH >> $LOG_FILE 2>&1

ENV_FILE=$ENV_FILE docker-compose -f $COMPOSE_FILE down >> $LOG_FILE 2>&1
ENV_FILE=$ENV_FILE docker-compose -f $COMPOSE_FILE up -d --build >> $LOG_FILE 2>&1
docker system prune -f >> $LOG_FILE 2>&1

echo "$(date) — SwiftPack AI deploy complete." >> $LOG_FILE
