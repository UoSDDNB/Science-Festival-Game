#!/usr/bin/env bash
# Deploy Playtime to Hetzner VPS.
# Usage:
#   ./deploy.sh                         # Phaser (default) — build web/ and upload
#   PLAYTIME_TARGET=godot ./deploy.sh   # Optional Godot prototype export
#
# SSH: prefers direct root@204.168.183.57; falls back to jump host juri@51.77.146.49.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE="${PLAYTIME_REMOTE:-root@204.168.183.57}"
JUMP_HOST="${PLAYTIME_JUMP_HOST:-juri@51.77.146.49}"
REMOTE_DIR="${PLAYTIME_REMOTE_DIR:-/var/www/playtime}"
LIVE_URL="https://playtime.204.168.183.57.sslip.io"
VERSION="$(date -u +%Y%m%d%H%M%S)"
STAGING_DIR="playtime-deploy-${VERSION}"
DEPLOY_TARGET="${PLAYTIME_TARGET:-phaser}"

DEPLOY_MODE=""
if ssh -o BatchMode=yes -o ConnectTimeout=5 "${REMOTE}" "echo ok" >/dev/null 2>&1; then
	DEPLOY_MODE="direct"
elif ssh -o BatchMode=yes -o ConnectTimeout=5 "${JUMP_HOST}" "echo ok" >/dev/null 2>&1; then
	DEPLOY_MODE="jump"
else
	echo "ERROR: Cannot SSH to ${REMOTE} or jump host ${JUMP_HOST}."
	echo ""
	echo "Add your public key to the VPS or jump host:"
	echo "  cat ~/.ssh/id_ed25519.pub"
	echo ""
	echo "Or build locally only:"
	echo "  cd web && npm install && npm run build"
	exit 1
fi

upload_dist() {
	local dist_path="$1"
	if [[ "${DEPLOY_MODE}" == "direct" ]]; then
		rsync -az --delete "${dist_path}/" "${REMOTE}:${REMOTE_DIR}/"
		ssh "${REMOTE}" "echo '${VERSION}' > ${REMOTE_DIR}/version.txt"
	else
		ssh "${JUMP_HOST}" "mkdir -p ~/${STAGING_DIR}"
		rsync -az --delete "${dist_path}/" "${JUMP_HOST}:~/${STAGING_DIR}/"
		ssh "${JUMP_HOST}" "rsync -az --delete ~/${STAGING_DIR}/ ${REMOTE}:${REMOTE_DIR}/ && ssh ${REMOTE} \"echo '${VERSION}' > ${REMOTE_DIR}/version.txt\" && rm -rf ~/${STAGING_DIR}"
	fi
}

if [[ "${DEPLOY_TARGET}" == "phaser" ]]; then
	WEB_DIR="${PROJECT_DIR}/web"
	if [[ ! -f "${WEB_DIR}/package.json" ]]; then
		echo "ERROR: ${WEB_DIR}/package.json missing. Phaser sources should live under web/."
		exit 1
	fi
	if ! command -v npm >/dev/null 2>&1; then
		echo "ERROR: npm is required to build the Phaser web game."
		exit 1
	fi

	echo "=== Building Phaser web/ (v${VERSION}) ==="
	cd "${WEB_DIR}"
	npm install --no-audit --no-fund
	npm run build

	echo "=== Deploying Phaser dist via ${DEPLOY_MODE} ==="
	upload_dist "${WEB_DIR}/dist"
	echo "=== Done! Game live at ${LIVE_URL}/?v=${VERSION} ==="
	exit 0
fi

if [[ "${DEPLOY_TARGET}" != "godot" ]]; then
	echo "ERROR: Unknown PLAYTIME_TARGET='${DEPLOY_TARGET}'. Use phaser (default) or godot."
	exit 1
fi

GODOT="${HOME}/.local/share/godot/Godot_v4.5.2-stable_linux.x86_64"
BUILD_DIR="${PROJECT_DIR}/build"

if [[ ! -x "${GODOT}" ]]; then
	echo "Godot not found. Run: ${PROJECT_DIR}/scripts/setup_godot.sh"
	exit 1
fi

if [[ ! -f "${PROJECT_DIR}/export_presets.cfg" ]]; then
	echo "export_presets.cfg missing. Run: ${PROJECT_DIR}/scripts/setup_godot.sh"
	exit 1
fi

mkdir -p "${BUILD_DIR}"
cd "${PROJECT_DIR}"

echo "=== Importing Godot project ==="
"${GODOT}" --headless --path "${PROJECT_DIR}" --import 2>&1 | tail -3

echo "=== Building Godot web export ==="
"${GODOT}" --headless --path "${PROJECT_DIR}" --export-release "Web" "${BUILD_DIR}/index.html" 2>&1 | tail -3

echo "=== Deploying Godot build via ${DEPLOY_MODE} (v${VERSION}) ==="
upload_dist "${BUILD_DIR}"
echo "=== Done! Game live at ${LIVE_URL}/?v=${VERSION} ==="
