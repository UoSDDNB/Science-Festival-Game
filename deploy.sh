#!/bin/bash
# Deploy Playtime to Hetzner VPS
# Usage:
#   ./deploy.sh              # Godot web export from this repo (default)
#   PLAYTIME_TARGET=phaser ./deploy.sh   # Phaser rewrite via jump host (production stack)
#
# Requires SSH access to juri@51.77.146.49 (jump host), which can reach root@204.168.183.57.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="build"
REMOTE="root@204.168.183.57"
JUMP_HOST="${PLAYTIME_JUMP_HOST:-juri@51.77.146.49}"
REMOTE_DIR="/var/www/playtime"
LIVE_URL="https://playtime.204.168.183.57.sslip.io"
VERSION=$(date +%Y%m%d%H%M%S)
STAGING_DIR="playtime-deploy-${VERSION}"
DEPLOY_TARGET="${PLAYTIME_TARGET:-godot}"
PHASER_PROJECT="${PLAYTIME_PHASER_DIR:-${JUMP_HOST}:Projects/AI_for_Biology_Game/web}"

DEPLOY_MODE=""
if ssh -o BatchMode=yes -o ConnectTimeout=5 "${REMOTE}" "echo ok" >/dev/null 2>&1; then
	DEPLOY_MODE="direct"
elif ssh -o BatchMode=yes -o ConnectTimeout=5 "${JUMP_HOST}" "echo ok" >/dev/null 2>&1; then
	DEPLOY_MODE="jump"
else
	echo "ERROR: Cannot SSH to ${REMOTE} or jump host ${JUMP_HOST}."
	echo ""
	echo "Ask whoever manages the VPS to add your public key to ${JUMP_HOST}:"
	echo "  cat ~/.ssh/id_ed25519.pub"
	echo ""
	echo "Or test a local build only: ./scripts/build.sh"
	exit 1
fi

deploy_via_jump() {
	local source_path="$1"
	local use_delete="${2:-false}"

	ssh "${JUMP_HOST}" "mkdir -p ~/${STAGING_DIR}"
	if [[ "${use_delete}" == "true" ]]; then
		scp -q -r "${source_path}" "${JUMP_HOST}:~/${STAGING_DIR}/dist/"
		ssh "${JUMP_HOST}" "rsync -az --delete ~/${STAGING_DIR}/dist/ ${REMOTE}:${REMOTE_DIR}/ && echo '${VERSION}' | ssh ${REMOTE} 'cat > ${REMOTE_DIR}/version.txt' && rm -rf ~/${STAGING_DIR}"
	else
		scp -q "${source_path}"/* "${JUMP_HOST}:~/${STAGING_DIR}/"
		ssh "${JUMP_HOST}" "rsync -az --delete ~/${STAGING_DIR}/ ${REMOTE}:${REMOTE_DIR}/ && echo '${VERSION}' | ssh ${REMOTE} 'cat > ${REMOTE_DIR}/version.txt' && rm -rf ~/${STAGING_DIR}"
	fi
}

if [[ "${DEPLOY_TARGET}" == "phaser" ]]; then
	echo "=== Deploying Phaser production build via ${DEPLOY_MODE} (v${VERSION}) ==="
	if [[ "${DEPLOY_MODE}" == "direct" ]]; then
		ssh "${JUMP_HOST}" "cd ~/Projects/AI_for_Biology_Game/web && rsync -az --delete dist/ ${REMOTE}:${REMOTE_DIR}/"
		ssh "${REMOTE}" "echo '${VERSION}' > ${REMOTE_DIR}/version.txt"
	else
		ssh "${JUMP_HOST}" "cd ~/Projects/AI_for_Biology_Game/web && rsync -az --delete dist/ ${REMOTE}:${REMOTE_DIR}/ && ssh ${REMOTE} \"echo '${VERSION}' > ${REMOTE_DIR}/version.txt\""
	fi
	echo "=== Done! Game live at ${LIVE_URL}/?v=${VERSION} ==="
	exit 0
fi

GODOT="${HOME}/.local/share/godot/Godot_v4.5.2-stable_linux.x86_64"
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

echo "=== Importing project ==="
"${GODOT}" --headless --path "${PROJECT_DIR}" --import 2>&1 | tail -3

echo "=== Building web export ==="
"${GODOT}" --headless --path "${PROJECT_DIR}" --export-release "Web" "${BUILD_DIR}/index.html" 2>&1 | tail -3

echo "=== Deploying Godot build via ${DEPLOY_MODE} (v${VERSION}) ==="
if [[ "${DEPLOY_MODE}" == "direct" ]]; then
	rsync -az --delete "${BUILD_DIR}/" "${REMOTE}:${REMOTE_DIR}/"
	ssh "${REMOTE}" "echo '${VERSION}' > ${REMOTE_DIR}/version.txt"
else
	deploy_via_jump "${BUILD_DIR}" "false"
fi

echo "=== Done! Game live at ${LIVE_URL}/?v=${VERSION} ==="
