#!/bin/bash
# Build the web export locally (no deploy). Run from project root or scripts/.
set -euo pipefail

GODOT_VERSION="4.5.2"
GODOT_BIN="${HOME}/.local/share/godot/Godot_v${GODOT_VERSION}-stable_linux.x86_64"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="${PROJECT_DIR}/build"

if [[ ! -x "${GODOT_BIN}" ]]; then
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
"${GODOT_BIN}" --headless --path "${PROJECT_DIR}" --import

echo "=== Building web export ==="
"${GODOT_BIN}" --headless --path "${PROJECT_DIR}" --export-release "Web" "${BUILD_DIR}/index.html"

echo "=== Build complete ==="
echo "Output: ${BUILD_DIR}/"
ls -lh "${BUILD_DIR}/"
