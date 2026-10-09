#!/usr/bin/env bash
# Reinicia (rebuild + recria) os serviços api e web do docker-compose.
# Uso (Git Bash / WSL): ./restart-api-web.sh
set -e

cd "$(dirname "$0")"

echo "==> Recriando os serviços api e web com rebuild..."
docker compose up -d --build api web

echo ""
echo "==> Status dos containers:"
docker compose ps
