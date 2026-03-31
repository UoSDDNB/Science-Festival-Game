class_name Thermometer
extends Control

## Thermometer using the brass column texture v2.
## Mercury fills between the two bronze ornamental caps.
## The image is stretched to fit the control, mercury drawn over it.

const TARGET_MIN := 50.0
const TARGET_MAX := 70.0
const DANGER_THRESHOLD := 85.0

# Display area — between the bronze caps (proportional to image height)
const DISPLAY_TOP := 0.10    # Below top bronze cap
const DISPLAY_BOTTOM := 0.90 # Above bottom bronze cap
const TUBE_LEFT := 0.20
const TUBE_RIGHT := 0.80

var _current_display_heat: float = 0.0
var _target_heat: float = 0.0
var _pulse_time: float = 0.0
var _in_target: bool = false
var _in_danger: bool = false


func _ready() -> void:
	var tex := load("res://assets/art/norse/thermometer_v2.png") as Texture2D
	if tex:
		var tr := TextureRect.new()
		tr.texture = tex
		tr.expand_mode = TextureRect.EXPAND_FIT_HEIGHT
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		tr.modulate = Color(1, 1, 1, 0.92)
		add_child(tr)
		# Move draw calls on top of texture
		tr.z_index = -1


func set_heat(value: float) -> void:
	_target_heat = clampf(value, 0.0, 100.0)


func _process(delta: float) -> void:
	_current_display_heat = lerpf(_current_display_heat, _target_heat, delta * 3.0)
	_pulse_time += delta
	_in_target = _current_display_heat >= TARGET_MIN and _current_display_heat <= TARGET_MAX
	_in_danger = _current_display_heat >= DANGER_THRESHOLD
	queue_redraw()


func _draw() -> void:
	var w := size.x
	var h := size.y

	var tl := w * TUBE_LEFT
	var tr := w * TUBE_RIGHT
	var tw := tr - tl
	var dt := h * DISPLAY_TOP
	var db := h * DISPLAY_BOTTOM
	var dh := db - dt

	# Target band
	var band_top := db - (TARGET_MAX / 100.0) * dh
	var band_bot := db - (TARGET_MIN / 100.0) * dh
	var ba := 0.18
	if _in_target:
		ba = sin(_pulse_time * 4.0) * 0.12 + 0.35
	draw_rect(Rect2(tl - 2, band_top, tw + 4, band_bot - band_top), Color(1, 0.85, 0.3, ba))
	draw_line(Vector2(tl - 4, band_top), Vector2(tr + 4, band_top), Color(1, 0.85, 0.3, 0.45), 1.0)
	draw_line(Vector2(tl - 4, band_bot), Vector2(tr + 4, band_bot), Color(1, 0.85, 0.3, 0.45), 1.0)

	# Danger zone
	if _current_display_heat > 70:
		var dz_top := dt
		var dz_bot := db - (DANGER_THRESHOLD / 100.0) * dh
		draw_rect(Rect2(tl, dz_top, tw, dz_bot - dz_top), Color(1, 0.08, 0.03, sin(_pulse_time * 6) * 0.08 + 0.1))

	# Mercury fill
	var fill_h := (_current_display_heat / 100.0) * dh
	var fill_top := db - fill_h

	var mc: Color
	if _current_display_heat < 30:
		mc = Color(0.15, 0.4, 0.9, 0.85).lerp(Color(1, 0.55, 0.15, 0.9), _current_display_heat / 30.0)
	elif _current_display_heat < 75:
		mc = Color(1, 0.55, 0.15, 0.9)
	else:
		mc = Color(1, 0.55, 0.15, 0.9).lerp(Color(1, 0.1, 0.05, 0.95), (_current_display_heat - 75) / 25.0)

	if _in_danger:
		mc.a = sin(_pulse_time * 8) * 0.1 + 0.85

	if fill_h > 1:
		draw_rect(Rect2(tl + 2, fill_top, tw - 4, fill_h), mc)
		# Highlight
		draw_rect(Rect2(tl + tw * 0.35, fill_top, tw * 0.2, fill_h), Color(1, 0.9, 0.7, 0.25))
		# Glowing cap
		draw_rect(Rect2(tl, fill_top - 2, tw, 4), Color(mc.r, mc.g, mc.b, 0.45))
