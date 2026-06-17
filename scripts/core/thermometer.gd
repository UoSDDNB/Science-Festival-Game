class_name Thermometer
extends Control

## Thermometer using the brass column texture v2.
## Mercury fills between the two bronze ornamental caps.
## The image is stretched to fit the control, mercury drawn over it.

const TARGET_MIN := 50.0
const TARGET_MAX := 70.0
const DANGER_THRESHOLD := 85.0

# Display area — between the bronze caps (proportional to image height)
const DISPLAY_TOP := 0.10
const DISPLAY_BOTTOM := 0.90
const TUBE_LEFT := 0.20
const TUBE_RIGHT := 0.80

var _current_display_heat: float = 0.0
var _target_heat: float = 0.0
var _pulse_time: float = 0.0
var _is_in_target_band: bool = false
var _is_in_danger_zone: bool = false


func _ready() -> void:
	# Load the brass thermometer artwork from the Norse asset folder.
	var thermometer_texture := load("res://assets/art/norse/thermometer_v2.png") as Texture2D
	if thermometer_texture:
		# Display the texture behind the drawn mercury fill.
		var texture_rect := TextureRect.new()
		texture_rect.texture = thermometer_texture
		texture_rect.expand_mode = TextureRect.EXPAND_FIT_HEIGHT
		texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		texture_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		texture_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		texture_rect.modulate = Color(1, 1, 1, 0.92)
		add_child(texture_rect)
		# Draw mercury and overlays above the background texture.
		texture_rect.z_index = -1


func set_heat(heat_value: float) -> void:
	# Store the latest target heat for smooth display interpolation.
	_target_heat = clampf(heat_value, 0.0, 100.0)


func _process(delta_seconds: float) -> void:
	# Smoothly move the displayed heat toward the latest target value.
	_current_display_heat = lerpf(_current_display_heat, _target_heat, delta_seconds * 3.0)
	# Advance the pulse timer used for target and danger animations.
	_pulse_time += delta_seconds
	# Track whether the displayed heat is inside the winning band.
	_is_in_target_band = (
		_current_display_heat >= TARGET_MIN and _current_display_heat <= TARGET_MAX
	)
	# Track whether the displayed heat has entered the danger zone.
	_is_in_danger_zone = _current_display_heat >= DANGER_THRESHOLD
	# Request a redraw so mercury and overlays update.
	queue_redraw()


func _draw() -> void:
	# Read the control width and height for proportional drawing.
	var control_width := size.x
	var control_height := size.y

	# Compute the left and right edges of the mercury tube.
	var tube_left := control_width * TUBE_LEFT
	var tube_right := control_width * TUBE_RIGHT
	var tube_width := tube_right - tube_left
	# Compute the top and bottom of the visible mercury column.
	var display_top := control_height * DISPLAY_TOP
	var display_bottom := control_height * DISPLAY_BOTTOM
	var display_height := display_bottom - display_top

	# Draw the highlighted winning temperature band inside the tube.
	var band_top := display_bottom - (TARGET_MAX / 100.0) * display_height
	var band_bottom := display_bottom - (TARGET_MIN / 100.0) * display_height
	var band_alpha := 0.18
	if _is_in_target_band:
		band_alpha = sin(_pulse_time * 4.0) * 0.12 + 0.35
	draw_rect(
		Rect2(tube_left - 2, band_top, tube_width + 4, band_bottom - band_top),
		Color(1, 0.85, 0.3, band_alpha)
	)
	draw_line(
		Vector2(tube_left - 4, band_top),
		Vector2(tube_right + 4, band_top),
		Color(1, 0.85, 0.3, 0.45),
		1.0
	)
	draw_line(
		Vector2(tube_left - 4, band_bottom),
		Vector2(tube_right + 4, band_bottom),
		Color(1, 0.85, 0.3, 0.45),
		1.0
	)

	# Draw the red danger zone when heat rises above seventy.
	if _current_display_heat > 70:
		var danger_zone_top := display_top
		var danger_zone_bottom := display_bottom - (DANGER_THRESHOLD / 100.0) * display_height
		draw_rect(
			Rect2(tube_left, danger_zone_top, tube_width, danger_zone_bottom - danger_zone_top),
			Color(1, 0.08, 0.03, sin(_pulse_time * 6) * 0.08 + 0.1)
		)

	# Compute how high the mercury fill should rise inside the tube.
	var fill_height := (_current_display_heat / 100.0) * display_height
	var fill_top := display_bottom - fill_height

	# Choose mercury color based on the current temperature range.
	var mercury_color: Color
	if _current_display_heat < 30:
		mercury_color = Color(0.15, 0.4, 0.9, 0.85).lerp(
			Color(1, 0.55, 0.15, 0.9),
			_current_display_heat / 30.0
		)
	elif _current_display_heat < 75:
		mercury_color = Color(1, 0.55, 0.15, 0.9)
	else:
		mercury_color = Color(1, 0.55, 0.15, 0.9).lerp(
			Color(1, 0.1, 0.05, 0.95),
			(_current_display_heat - 75) / 25.0
		)

	# Pulse mercury opacity when heat is in the danger zone.
	if _is_in_danger_zone:
		mercury_color.a = sin(_pulse_time * 8) * 0.1 + 0.85

	# Draw the main mercury column when there is visible fill height.
	if fill_height > 1:
		draw_rect(Rect2(tube_left + 2, fill_top, tube_width - 4, fill_height), mercury_color)
		# Add a subtle highlight stripe down the center of the mercury.
		draw_rect(
			Rect2(tube_left + tube_width * 0.35, fill_top, tube_width * 0.2, fill_height),
			Color(1, 0.9, 0.7, 0.25)
		)
		# Add a glowing cap at the top of the mercury column.
		draw_rect(
			Rect2(tube_left, fill_top - 2, tube_width, 4),
			Color(mercury_color.r, mercury_color.g, mercury_color.b, 0.45)
		)
