class_name Biomarkers
extends Control

## Vertical stack of biological indicator icons that light up at temperature thresholds.
## Heart → Brain → Metabolism → Movement → Danger

const MARKERS := [
	{"label": "♥", "threshold": 20.0, "color_active": Color(1, 0.3, 0.3, 1)},
	{"label": "⚡", "threshold": 40.0, "color_active": Color(0.3, 0.7, 1, 1)},
	{"label": "🔥", "threshold": 50.0, "color_active": Color(1, 0.7, 0.2, 1)},
	{"label": "◆", "threshold": 60.0, "color_active": Color(0.3, 1, 0.5, 1)},
]

const COL_INACTIVE := Color(0.3, 0.35, 0.4, 0.3)
const COL_DANGER := Color(1, 0.15, 0.1, 1)
const DANGER_THRESHOLD := 70.0
const ICON_SIZE := 36.0
const ICON_SPACING := 50.0

var _current_heat: float = 0.0
var _pulse_time: float = 0.0
var _active_markers: Array[bool] = [false, false, false, false]
var _in_danger: bool = false


func set_heat(value: float) -> void:
	_current_heat = value
	_in_danger = value >= DANGER_THRESHOLD
	for i in range(MARKERS.size()):
		_active_markers[i] = value >= MARKERS[i]["threshold"]


func _process(delta: float) -> void:
	_pulse_time += delta
	queue_redraw()


func _draw() -> void:
	var start_y := 60.0
	var center_x := size.x / 2.0

	for i in range(MARKERS.size()):
		var marker: Dictionary = MARKERS[i]
		var y_pos := start_y + i * ICON_SPACING
		var center := Vector2(center_x, y_pos)
		var is_active: bool = _active_markers[i]

		# Circle background
		var bg_col := COL_INACTIVE
		if _in_danger and is_active:
			var flash := sin(_pulse_time * 6.0) * 0.4 + 0.6
			bg_col = COL_DANGER
			bg_col.a = flash
		elif is_active:
			bg_col = marker["color_active"] as Color
			# Gentle pulse when first activated
			var pulse := sin(_pulse_time * 3.0) * 0.1 + 0.9
			bg_col.a = pulse

		draw_circle(center, ICON_SIZE / 2.0, bg_col)

		# Border
		var border_col := Color(0.5, 0.6, 0.7, 0.2)
		if is_active:
			border_col = bg_col
			border_col.a = 0.5
		draw_arc(center, ICON_SIZE / 2.0, 0, TAU, 24, border_col, 1.5)

		# Glow ring when active
		if is_active and not _in_danger:
			var glow_col := bg_col
			glow_col.a = 0.15
			draw_arc(center, ICON_SIZE / 2.0 + 4, 0, TAU, 24, glow_col, 3.0)

	# Labels below biomarkers explaining what they are
	# (drawn as text — these are simple Unicode icons, styled via _draw)
	# The actual label text is handled by child Label nodes created in _ready

func _ready() -> void:
	# Create label nodes for each biomarker
	var start_y := 60.0
	var center_x := size.x / 2.0

	for i in range(MARKERS.size()):
		var marker: Dictionary = MARKERS[i]
		var lbl := Label.new()
		lbl.text = marker["label"] as String
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		lbl.add_theme_font_size_override("font_size", 18)
		lbl.add_theme_color_override("font_color", Color(1, 1, 1, 0.9))
		lbl.position = Vector2(center_x - 12, start_y + i * ICON_SPACING - 12)
		lbl.size = Vector2(24, 24)
		add_child(lbl)
