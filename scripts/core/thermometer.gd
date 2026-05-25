class_name Thermometer
extends Control

## Thermometer with mercury fill drawn within the brass column texture.
## Mercury and bands are clipped to the actual texture render area.

const TARGET_MIN := 50.0
const TARGET_MAX := 70.0
const DANGER_THRESHOLD := 85.0

# Mercury area within the TEXTURE (proportional to texture height)
const TEX_TOP := 0.08
const TEX_BOTTOM := 0.92
const TEX_LEFT := 0.15
const TEX_RIGHT := 0.85

var _current_display_heat: float = 0.0
var _target_heat: float = 0.0
var _pulse_time: float = 0.0
var _in_target: bool = false
var _in_danger: bool = false
var _tex_size: Vector2 = Vector2.ZERO
var _tex_rect: Rect2 = Rect2()


func _ready() -> void:
	var tex := load("res://assets/art/shared/thermometer_v2.png") as Texture2D
	if not tex:
		tex = load("res://assets/art/norse/thermometer_v2.png") as Texture2D
	if tex:
		_tex_size = tex.get_size()
		var tr := TextureRect.new()
		tr.texture = tex
		tr.expand_mode = TextureRect.EXPAND_FIT_HEIGHT
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		tr.modulate = Color(1, 1, 1, 0.92)
		add_child(tr)
		tr.z_index = -1


func set_heat(value: float) -> void:
	_target_heat = clampf(value, 0.0, 100.0)


func _process(delta: float) -> void:
	_current_display_heat = lerpf(_current_display_heat, _target_heat, delta * 3.0)
	_pulse_time += delta
	_in_target = _current_display_heat >= TARGET_MIN and _current_display_heat <= TARGET_MAX
	_in_danger = _current_display_heat >= DANGER_THRESHOLD
	_update_tex_rect()
	queue_redraw()


func _update_tex_rect() -> void:
	# Calculate where the texture actually renders within the control
	if _tex_size.x <= 0 or _tex_size.y <= 0:
		_tex_rect = Rect2(0, 0, size.x, size.y)
		return
	var aspect := _tex_size.x / _tex_size.y
	var ctrl_aspect := size.x / size.y
	var rw: float
	var rh: float
	if aspect < ctrl_aspect:
		# Texture is narrower — fit height, center horizontally
		rh = size.y
		rw = rh * aspect
	else:
		rw = size.x
		rh = rw / aspect
	var rx := (size.x - rw) / 2.0
	var ry := (size.y - rh) / 2.0
	_tex_rect = Rect2(rx, ry, rw, rh)


func _draw() -> void:
	var rx := _tex_rect.position.x
	var ry := _tex_rect.position.y
	var rw := _tex_rect.size.x
	var rh := _tex_rect.size.y

	# Mercury tube area within texture bounds
	var tl := rx + rw * TEX_LEFT
	var tr_x := rx + rw * TEX_RIGHT
	var tw := tr_x - tl
	var dt := ry + rh * TEX_TOP
	var db := ry + rh * TEX_BOTTOM
	var dh := db - dt

	# Target band — always visible golden zone
	var band_top := db - (TARGET_MAX / 100.0) * dh
	var band_bot := db - (TARGET_MIN / 100.0) * dh
	var ba := 0.4
	if _in_target:
		ba = sin(_pulse_time * 4.0) * 0.15 + 0.6
	draw_rect(Rect2(tl, band_top, tw, band_bot - band_top), Color(1, 0.85, 0.3, ba))
	draw_line(Vector2(tl - 2, band_top), Vector2(tr_x + 2, band_top), Color(1, 0.85, 0.3, 0.7), 1.5)
	draw_line(Vector2(tl - 2, band_bot), Vector2(tr_x + 2, band_bot), Color(1, 0.85, 0.3, 0.7), 1.5)

	# Danger zone indicator
	if _current_display_heat > 70:
		var dz_top := dt
		var dz_bot := db - (DANGER_THRESHOLD / 100.0) * dh
		draw_rect(Rect2(tl, dz_top, tw, dz_bot - dz_top), Color(1, 0.08, 0.03, sin(_pulse_time * 6) * 0.08 + 0.12))

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
		# Mercury within tube bounds
		draw_rect(Rect2(tl + 2, fill_top, tw - 4, fill_h), mc)
		# Highlight strip
		draw_rect(Rect2(tl + tw * 0.35, fill_top, tw * 0.2, fill_h), Color(1, 0.9, 0.7, 0.25))
		# Glowing cap
		draw_rect(Rect2(tl, fill_top - 1, tw, 3), Color(mc.r, mc.g, mc.b, 0.45))
	else:
		# Baseline cold-blue sliver
		draw_rect(Rect2(tl + 2, db - 6, tw - 4, 5), Color(0.15, 0.4, 0.9, 0.6))
