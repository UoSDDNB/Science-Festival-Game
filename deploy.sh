#!/bin/bash
# Deploy Playtime to Hetzner VPS
# Usage: ./deploy.sh

set -e

GODOT="${HOME}/.local/share/godot/Godot_v4.5.2-stable_linux.x86_64"
BUILD_DIR="build"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ ! -x "${GODOT}" ]]; then
	echo "Godot not found. Run: ${PROJECT_DIR}/scripts/setup_godot.sh"
	exit 1
fi

if [[ ! -f "${PROJECT_DIR}/export_presets.cfg" ]]; then
	echo "export_presets.cfg missing. Run: ${PROJECT_DIR}/scripts/setup_godot.sh"
	exit 1
fi

cd "${PROJECT_DIR}"
mkdir -p "${BUILD_DIR}"

REMOTE="root@204.168.183.57"
REMOTE_DIR="/var/www/playtime"
VERSION=$(date +%Y%m%d%H%M%S)

if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "${REMOTE}" "echo ok" >/dev/null 2>&1; then
	echo "ERROR: Cannot SSH to ${REMOTE} (passwordless login required)."
	echo ""
	echo "Ask whoever manages the VPS to add your public key:"
	echo "  cat ~/.ssh/id_ed25519.pub"
	echo ""
	echo "Or test a local build only: ./scripts/build.sh"
	exit 1
fi

echo "=== Importing project ==="
"${GODOT}" --headless --path "${PROJECT_DIR}" --import 2>&1 | tail -3

echo "=== Building web export ==="
"${GODOT}" --headless --path "${PROJECT_DIR}" --export-release "Web" "${BUILD_DIR}/index.html" 2>&1 | tail -3

echo "=== Deploying to $REMOTE (v$VERSION) ==="
scp -q "$BUILD_DIR"/* "$REMOTE:$REMOTE_DIR/"

# Write version file for cache busting
ssh "$REMOTE" "echo '$VERSION' > $REMOTE_DIR/version.txt"

echo "=== Done! Game live at https://playtime.204.168.183.57.sslip.io/?v=$VERSION ==="
