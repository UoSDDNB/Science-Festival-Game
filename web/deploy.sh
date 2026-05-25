#!/usr/bin/env bash
# Deploy Playtime (Phaser/TS rewrite) to Hetzner VPS.
# Usage: ./deploy.sh
set -euo pipefail

REMOTE="${PLAYTIME_REMOTE:-root@204.168.183.57}"
REMOTE_DIR="${PLAYTIME_REMOTE_DIR:-/var/www/playtime}"
VERSION="$(date -u +%Y%m%d%H%M%S)"

cd "$(dirname "$0")"

echo "=== Installing deps ==="
npm install --no-audit --no-fund

echo "=== Building static bundle (vite) ==="
npm run build

echo "=== Deploying to $REMOTE:$REMOTE_DIR (v$VERSION) ==="
ssh "$REMOTE" "mkdir -p '$REMOTE_DIR'"
# Push everything under dist/ into the remote dir.
rsync -az --delete dist/ "$REMOTE:$REMOTE_DIR/"
ssh "$REMOTE" "echo '$VERSION' > '$REMOTE_DIR/version.txt'"

echo "=== Done.  https://playtime.204.168.183.57.sslip.io/?v=$VERSION ==="
