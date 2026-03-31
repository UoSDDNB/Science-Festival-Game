#!/bin/bash
# Deploy Playtime to Hetzner VPS
# Usage: ./deploy.sh

set -e

GODOT="/tmp/godot_bin/Godot_v4.5.2-stable_linux.x86_64"
BUILD_DIR="build"
REMOTE="root@204.168.183.57"
REMOTE_DIR="/var/www/playtime"
VERSION=$(date +%Y%m%d%H%M%S)

echo "=== Importing project ==="
$GODOT --headless --import 2>&1 | tail -3

echo "=== Building web export ==="
$GODOT --headless --export-release "Web" "$BUILD_DIR/index.html" 2>&1 | tail -3

echo "=== Deploying to $REMOTE (v$VERSION) ==="
scp -q "$BUILD_DIR"/* "$REMOTE:$REMOTE_DIR/"

# Write version file for cache busting
ssh "$REMOTE" "echo '$VERSION' > $REMOTE_DIR/version.txt"

echo "=== Done! Game live at https://playtime.204.168.183.57.sslip.io/?v=$VERSION ==="
