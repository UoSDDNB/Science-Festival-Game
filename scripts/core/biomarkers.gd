class_name Biomarkers
extends Control

## Vertical stack of biological indicator icons that light up at temperature thresholds.
## Heart, brain, metabolism, and movement markers with a danger state.

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
var _pulse_time_seconds: float = 0.0
var _active_marker_flags: Array[bool] = [false, false, false, false]
var _is_in_danger_zone: bool = false


func set_heat(heat_value: float) -> void:
	# Store the latest heat value used to activate markers.
	_current_heat = heat_value
	# Track whether the creature has entered the danger temperature range.
	_is_in_danger_zone = heat_value >= DANGER_THRESHOLD
	# Update which markers should appear active at this heat level.
	for marker_index in range(MARKERS.size()):
		_active_marker_flags[marker_index] = heat_value >= MARKERS[marker_index]["threshold"]


func _process(delta_seconds: float) -> void:
	# Advance the pulse timer used for marker glow animations.
	_pulse_time_seconds += delta_seconds
	queue_redraw()


func _draw() -> void:
	# Start drawing markers below the top edge of the control.
	var first_marker_y := 60.0
	var marker_center_x := size.x / 2.0

	for marker_index in range(MARKERS.size()):
		var marker_definition: Dictionary = MARKERS[marker_index]
		var marker_y_position := first_marker_y + marker_index * ICON_SPACING
		var marker_center := Vector2(marker_center_x, marker_y_position)
		var marker_is_active: bool = _active_marker_flags[marker_index]

		# Choose the background color for the marker circle.
		var background_color := COL_INACTIVE
		if _is_in_danger_zone and marker_is_active:
			var danger_flash_alpha := sin(_pulse_time_seconds * 6.0) * 0.4 + 0.6
			background_color = COL_DANGER
			background_color.a = danger_flash_alpha
		elif marker_is_active:
			background_color = marker_definition["color_active"] as Color
			var gentle_pulse_alpha := sin(_pulse_time_seconds * 3.0) * 0.1 + 0.9
			background_color.a = gentle_pulse_alpha

		# Draw the filled marker circle.
		draw_circle(marker_center, ICON_SIZE / 2.0, background_color)

		# Draw the marker border ring.
		var border_color := Color(0.5, 0.6, 0.7, 0.2)
		if marker_is_active:
			border_color = background_color
			border_color.a = 0.5
		draw_arc(marker_center, ICON_SIZE / 2.0, 0, TAU, 24, border_color, 1.5)

		# Draw an outer glow ring for active non-danger markers.
		if marker_is_active and not _is_in_danger_zone:
			var glow_color := background_color
			glow_color.a = 0.15
			draw_arc(marker_center, ICON_SIZE / 2.0 + 4, 0, TAU, 24, glow_color, 3.0)


func _ready() -> void:
	# Create a text label for each biomarker icon.
	var first_marker_y := 60.0
	var marker_center_x := size.x / 2.0

	for marker_index in range(MARKERS.size()):
		var marker_definition: Dictionary = MARKERS[marker_index]
		var icon_label := Label.new()
		icon_label.text = marker_definition["label"] as String
		icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		icon_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		icon_label.add_theme_font_size_override("font_size", 18)
		icon_label.add_theme_color_override("font_color", Color(1, 1, 1, 0.9))
		icon_label.position = Vector2(marker_center_x - 12, first_marker_y + marker_index * ICON_SPACING - 12)
		icon_label.size = Vector2(24, 24)
		add_child(icon_label)
