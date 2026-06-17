#!/bin/bash
# One-time setup: download Godot 4.5.2 + web export templates for headless builds on IridisX.
set -euo pipefail

GODOT_VERSION="4.5.2"
GODOT_DIR="${HOME}/.local/share/godot"
GODOT_BIN="${GODOT_DIR}/Godot_v${GODOT_VERSION}-stable_linux.x86_64"
TEMPLATES_DIR="${GODOT_DIR}/export_templates/${GODOT_VERSION}.stable"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "${GODOT_DIR}" "${TEMPLATES_DIR}"

if [[ ! -x "${GODOT_BIN}" ]]; then
	echo "=== Downloading Godot ${GODOT_VERSION} ==="
	tmp_zip="$(mktemp /tmp/godot.XXXXXX.zip)"
	curl -fsSL \
		"https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}-stable/Godot_v${GODOT_VERSION}-stable_linux.x86_64.zip" \
		-o "${tmp_zip}"
	unzip -qo "${tmp_zip}" -d "${GODOT_DIR}"
	chmod +x "${GODOT_BIN}"
	rm -f "${tmp_zip}"
	echo "Installed: ${GODOT_BIN}"
else
	echo "Godot already installed: ${GODOT_BIN}"
fi

if [[ ! -f "${TEMPLATES_DIR}/web_nothreads_release.zip" ]]; then
	echo "=== Downloading web export templates ==="
	tmp_tpz="$(mktemp /tmp/godot_templates.XXXXXX.tpz)"
	curl -fsSL \
		"https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}-stable/Godot_v${GODOT_VERSION}-stable_export_templates.tpz" \
		-o "${tmp_tpz}"
	unzip -qo "${tmp_tpz}" -d "${TEMPLATES_DIR}"
	# .tpz unpacks into a nested templates/ folder; Godot expects files at the top level.
	if [[ -d "${TEMPLATES_DIR}/templates" ]]; then
		mv "${TEMPLATES_DIR}/templates"/* "${TEMPLATES_DIR}/"
		rmdir "${TEMPLATES_DIR}/templates"
	fi
	rm -f "${tmp_tpz}"
	echo "Templates installed: ${TEMPLATES_DIR}"
else
	echo "Export templates already installed: ${TEMPLATES_DIR}"
fi

if [[ ! -f "${PROJECT_DIR}/export_presets.cfg" ]]; then
	echo "=== Creating export_presets.cfg ==="
	cat > "${PROJECT_DIR}/export_presets.cfg" <<'EOF'
[preset.0]

name="Web"
platform="Web"
runnable=true
dedicated_server=false
custom_features=""
export_filter="all_resources"
include_filter=""
exclude_filter=""
export_path="build/index.html"
encryption_include_filters=""
encryption_exclude_filters=""
encrypt_pck=false
encrypt_directory=false

[preset.0.options]

custom_template/debug=""
custom_template/release=""
variant/extensions_support=false
variant/thread_support=false
vram_texture_compression/for_desktop=true
vram_texture_compression/for_mobile=false
html/export_icon=true
html/custom_html_shell=""
html/head_include=""
html/canvas_resize_policy=2
html/focus_canvas_on_start=true
html/experimental_virtual_keyboard=false
progressive_web_app/enabled=false
progressive_web_app/offline_page=""
progressive_web_app/display=1
progressive_web_app/orientation=0
progressive_web_app/icon_144x144=""
progressive_web_app/icon_180x180=""
progressive_web_app/icon_512x512=""
progressive_web_app/background_color=Color(0, 0, 0, 1)
EOF
	echo "Created: ${PROJECT_DIR}/export_presets.cfg"
else
	echo "export_presets.cfg already exists"
fi

echo ""
echo "Setup complete. Test with:"
echo "  cd ${PROJECT_DIR} && ./scripts/build.sh"
