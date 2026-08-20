#!/usr/bin/env bash
# Publish the static toy to the shared Hetzner Caddy proxy.
# Usage: ./deploy/deploy.sh
set -euo pipefail

SERVER="root@46.62.166.228"
REMOTE_DIR="/opt/spielzeuge"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Building"
(cd "${LOCAL_DIR}" && npm run build)

echo "==> Syncing to ${SERVER}:${REMOTE_DIR}"
rsync -avz --delete \
  --exclude='.DS_Store' \
  "${LOCAL_DIR}/dist/" "${SERVER}:${REMOTE_DIR}/"

echo "==> Verifying"
sleep 2
curl -fsS -o /dev/null -w "spielzeuge.kapitonov.su -> HTTP %{http_code}\n" \
  https://spielzeuge.kapitonov.su/ || \
  echo "WARN: verification failed (TLS/DNS may still be provisioning)"

echo "==> Done."
