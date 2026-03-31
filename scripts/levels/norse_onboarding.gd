extends Node2D

## Norse onboarding level — "Fire Meets Ice"
## Tap only near fire. Drag from fire around boulder to dragon is the core mechanic.
## Flames visually bounce off the boulder.

signal scene_requested(scene_path: String)

const MENU_SCENE := "res://scenes/start_menu/start_menu.tscn"
const FIRE_POS := Vector2(530, 870)
const HOLD_THRESHOLD := 0.4
const HEART_BASE_SCALE := 0.07

# Interaction zones
const FIRE_TAP_RADIUS := 180.0       # Only taps within this radius of fire work
const DRAGON_CENTER := Vector2(860, 350)
const DRAGON_NO_INPUT_RADIUS := 280.0
const BOULDER_CENTER := Vector2(725, 550)
const BOULDER_RADIUS := 110.0

var heat_sim: HeatSimulation
var win_detector: WinDetector
var zone_polygons: Array[Polygon2D] = []

var _thermometer: Thermometer
var _hint_system: HintSystem
var _hud_layer: CanvasLayer

var _heart_sprite: Sprite2D
var _heart_beat_time: float = 0.0
var _fire_glow: PointLight2D
var _fire_intensity: float = 1.0
var heat_gradient: Gradient

var _is_touching: bool = false
var _touch_start_time: float = 0.0
var _touch_world_pos: Vector2 = Vector2.ZERO
var _hold_zone_id: int = -1
var _hold_active: bool = false
var _won: bool = false
var _has_dragged_this_touch: bool = false
var _drag_started_near_fire: bool = false  # Drag only works if started near fire
var _touch_points: Dictionary = {}

var _zones: Array[Zone] = []
var _channels: Array[Channel] = []
var _start_time: float = 0.0
var _damage_count: int = 0
var _last_pinch_distance: float = 0.0

# Flame trail layers
var _flame_core: Line2D
var _flame_mid: Line2D
var _flame_outer: Line2D
var _drag_points: PackedVector2Array = PackedVector2Array()
var _is_trail_active: bool = false


func _ready() -> void:
	heat_sim = $HeatSimulation as HeatSimulation
	win_detector = $WinDetector as WinDetector
	_heart_sprite = $HeartSprite as Sprite2D
	_fire_glow = $FireSource/FireGlow as PointLight2D
	heat_gradient = load("res://resources/heat_gradient.tres") as Gradient

	var ice_field := $IceField
	for i in range(8):
		var node := ice_field.get_node_or_null("Zone%d" % i)
		if node and node is Polygon2D:
			zone_polygons.append(node)

	if _heart_sprite:
		_heart_sprite.scale = Vector2(HEART_BASE_SCALE, HEART_BASE_SCALE)
		_heart_sprite.modulate.a = 0
		var mat := CanvasItemMaterial.new()
		mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		_heart_sprite.material = mat

	_flame_outer = _make_trail(24.0, Color(0.6, 0.1, 0.02, 0.2), 38)
	_flame_mid = _make_trail(12.0, Color(1.0, 0.4, 0.05, 0.45), 39)
	_flame_core = _make_trail(5.0, Color(1.0, 0.85, 0.4, 0.65), 40)

	_setup_simulation()
	_setup_win_detection()
	_setup_hud()
	_start_time = Time.get_ticks_msec() / 1000.0
	for poly in zone_polygons:
		poly.visible = false


func _make_trail(w: float, c: Color, z: int) -> Line2D:
	var l := Line2D.new()
	l.width = w
	l.default_color = c
	l.z_index = z
	l.begin_cap_mode = Line2D.LINE_CAP_ROUND
	l.end_cap_mode = Line2D.LINE_CAP_ROUND
	var m := CanvasItemMaterial.new()
	m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	l.material = m
	add_child(l)
	return l


func _setup_simulation() -> void:
	_zones = [
		Zone.new(0, 1.0, true, false),
		Zone.new(1, 1.2, false, false),
		Zone.new(2, 1.0, false, false),
		Zone.new(3, 0.6, false, false),
		Zone.new(4, 1.3, false, false),
		Zone.new(5, 1.0, false, true),
	]
	if zone_polygons.size() > 6:
		_zones.append(Zone.new(6, 0.0, false, false))
	for i in range(mini(_zones.size(), zone_polygons.size())):
		_zones[i].polygon = zone_polygons[i]

	_channels = [
		Channel.new(0, 1, 0.8),
		Channel.new(1, 2, 0.7),
		Channel.new(2, 3, 0.5),
		Channel.new(2, 4, 0.8),
		Channel.new(3, 5, 0.6),
		Channel.new(4, 5, 0.7),
	]
	heat_sim.dissipation_rate = 0.035
	heat_sim.tap_heat = 20.0
	heat_sim.hold_base_heat = 5.0
	heat_sim.hold_accel_rate = 0.8
	heat_sim.drag_heat = 8.0
	heat_sim.fire_position = FIRE_POS
	heat_sim.max_fire_distance = 850.0
	if _zones.size() > 6:
		heat_sim.obstacle_zone_ids = [6]
	heat_sim.setup(_zones, _channels)
	heat_sim.heat_updated.connect(func(_zs): pass)


func _setup_win_detection() -> void:
	win_detector.sustain_duration = 2.5
	win_detector.setup(heat_sim)
	win_detector.level_won.connect(_on_level_won)
	win_detector.damage_tick.connect(_on_damage_tick)
	win_detector.entered_target_zone.connect(func(): _hint_system.show_encouragement("Hold it steady..."))


func _setup_hud() -> void:
	_hud_layer = CanvasLayer.new()
	_hud_layer.layer = 10
	add_child(_hud_layer)
	var vp := get_viewport_rect().size

	# Thermometer — inside the game viewport, right side
	var therm_h := vp.y * 0.72
	var therm_w := maxf(vp.x * 0.045, 45.0)
	var therm_x := vp.x - therm_w - 15  # 15px padding from right edge of viewport
	var therm_y := (vp.y - therm_h) / 2.0
	_thermometer = Thermometer.new()
	_thermometer.position = Vector2(therm_x, therm_y)
	_thermometer.size = Vector2(therm_w, therm_h)
	_thermometer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud_layer.add_child(_thermometer)

	_hint_system = HintSystem.new()
	_hint_system.position = Vector2.ZERO
	_hint_system.size = vp
	_hint_system.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud_layer.add_child(_hint_system)


# --- INPUT ---

func _is_near_fire(world_pos: Vector2) -> bool:
	return world_pos.distance_to(FIRE_POS) < FIRE_TAP_RADIUS


func _input(event: InputEvent) -> void:
	if _won:
		return

	# Pinch/spread tracking
	if event is InputEventScreenTouch:
		if event.pressed:
			_touch_points[event.index] = event.position
		else:
			_touch_points.erase(event.index)
		if _touch_points.size() >= 2:
			return

	if event is InputEventScreenDrag:
		_touch_points[event.index] = event.position
		if _touch_points.size() >= 2:
			_handle_pinch_spread()
			return
		if event.index > 0:
			return

	var pos := Vector2.ZERO
	var is_press := false
	var is_release := false
	var is_move := false

	if event is InputEventScreenTouch and event.index == 0:
		pos = event.position
		is_press = event.pressed
		is_release = not event.pressed
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		pos = event.position
		is_press = event.pressed
		is_release = not event.pressed
	elif event is InputEventScreenDrag and event.index == 0:
		pos = event.position
		is_move = true
	elif event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		pos = event.position
		is_move = true
	elif event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			_fire_intensity = minf(_fire_intensity + 0.15, 2.5)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_fire_intensity = maxf(_fire_intensity - 0.15, 0.3)
		return
	else:
		return

	var world_pos := _viewport_to_world(pos)

	# === PRESS ===
	if is_press:
		_is_touching = true
		_touch_start_time = Time.get_ticks_msec() / 1000.0
		_touch_world_pos = world_pos
		_hold_active = false
		_has_dragged_this_touch = false
		_drag_points.clear()
		_is_trail_active = false
		_hold_zone_id = -1

		# TAP — only works near the fire
		if _is_near_fire(world_pos):
			_drag_started_near_fire = true
			_drag_points.append(world_pos)
			_is_trail_active = true

			# Tap on fire: burst of heat in fire zone + visual flame burst
			heat_sim.apply_tap(0, world_pos)
			_spawn_fire_burst()
			_hint_system.notify_tap()
			_hold_zone_id = 0
		else:
			_drag_started_near_fire = false
			# Tapping anywhere else = nothing

	# === RELEASE ===
	if is_release:
		_is_touching = false
		_hold_active = false
		_hold_zone_id = -1
		_is_trail_active = false
		_drag_started_near_fire = false

	# === MOVE (DRAG) ===
	if is_move and _is_touching:
		_touch_world_pos = world_pos
		_has_dragged_this_touch = true

		# Only process drag if it started near the fire
		if not _drag_started_near_fire:
			return

		_is_trail_active = true

		# Check boulder collision — flames STOP here
		if world_pos.distance_to(BOULDER_CENTER) < BOULDER_RADIUS:
			_spawn_deflection(world_pos)
			# Don't add point or apply heat — flames bounce off
			return

		# Check dragon zone — no direct heating
		if world_pos.distance_to(DRAGON_CENTER) < DRAGON_NO_INPUT_RADIUS:
			# Still add to trail (visual reaches dragon area) but no heat applied
			_drag_points.append(world_pos)
			_update_trails()
			return

		# Normal drag — apply heat to the zone under the finger
		_drag_points.append(world_pos)
		_update_trails()

		var zone_id := _zone_at_world_pos(world_pos)
		if zone_id >= 0 and zone_id != 5 and zone_id != 6:
			heat_sim.apply_drag(zone_id, world_pos)
			_hint_system.notify_drag()


func _update_trails() -> void:
	if _drag_points.size() > 150:
		_drag_points = _drag_points.slice(-150)
	_flame_core.clear_points()
	_flame_mid.clear_points()
	_flame_outer.clear_points()
	for pt in _drag_points:
		_flame_core.add_point(pt)
		_flame_mid.add_point(pt)
		_flame_outer.add_point(pt)
	# Width taper: thin at tail, full at head
	if _drag_points.size() > 1:
		var c := Curve.new()
		c.add_point(Vector2(0, 0.15))
		c.add_point(Vector2(0.6, 0.5))
		c.add_point(Vector2(1, 1.0))
		_flame_core.width_curve = c
		_flame_mid.width_curve = c
		_flame_outer.width_curve = c


func _handle_pinch_spread() -> void:
	var points := _touch_points.values()
	if points.size() < 2:
		return
	var dist: float = (points[0] as Vector2).distance_to(points[1] as Vector2)
	if _last_pinch_distance > 0:
		_fire_intensity += (dist - _last_pinch_distance) * 0.003
		_fire_intensity = clampf(_fire_intensity, 0.3, 2.5)
		_hint_system.notify_pinch()
	_last_pinch_distance = dist


func _process(delta: float) -> void:
	if _won:
		return

	if _touch_points.size() < 2:
		_last_pinch_distance = 0.0

	heat_sim.tap_heat = 20.0 * _fire_intensity
	heat_sim.hold_base_heat = 5.0 * _fire_intensity
	heat_sim.drag_heat = 8.0 * _fire_intensity

	if _fire_glow:
		_fire_glow.energy = lerpf(_fire_glow.energy, 0.5 + _fire_intensity * 0.4, delta * 4.0)
		_fire_glow.texture_scale = 3.5 + _fire_intensity * 1.5

	# Hold — only works near fire
	if _is_touching and _hold_zone_id == 0 and not _has_dragged_this_touch:
		var elapsed := Time.get_ticks_msec() / 1000.0 - _touch_start_time
		if elapsed >= HOLD_THRESHOLD:
			if not _hold_active:
				_hold_active = true
				_hint_system.notify_hold()
			heat_sim.apply_hold(0, _touch_world_pos, elapsed - HOLD_THRESHOLD)

	# Fade trail when not active
	if not _is_trail_active and _drag_points.size() > 0:
		# Remove points from tail
		_drag_points = _drag_points.slice(4)
		_update_trails()

	var target := heat_sim.get_target_zone()
	if target:
		_thermometer.set_heat(target.heat)
		_hint_system.update_max_heat(target.heat)
		_update_heart_sprite(target.heat, delta)


func _viewport_to_world(pos: Vector2) -> Vector2:
	return get_viewport().get_canvas_transform().affine_inverse() * pos


func _zone_at_world_pos(world_pos: Vector2) -> int:
	if zone_polygons.size() > 6:
		var obs := zone_polygons[6]
		if Geometry2D.is_point_in_polygon(obs.to_local(world_pos), obs.polygon):
			return 6
	for i in range(mini(zone_polygons.size(), 6)):
		if Geometry2D.is_point_in_polygon(zone_polygons[i].to_local(world_pos), zone_polygons[i].polygon):
			return i
	return -1


# --- Heart ---

func _update_heart_sprite(heat: float, delta: float) -> void:
	if not _heart_sprite:
		return
	_heart_beat_time += delta
	var alpha := remap(clampf(heat, 10, 40), 10, 40, 0.0, 0.85)
	var bpm := 0.0
	if heat >= 25:
		bpm = remap(clampf(heat, 25, 90), 25, 90, 40, 150)
	var s := HEART_BASE_SCALE
	if bpm > 0:
		s += pow(maxf(0, sin(_heart_beat_time * bpm / 60.0 * TAU)), 0.35) * 0.008
	_heart_sprite.scale = Vector2(s, s)
	var w := remap(clampf(heat, 10, 70), 10, 70, 0, 1)
	_heart_sprite.modulate = Color(lerpf(0.7, 1.2, w), lerpf(0.9, 0.85, w), lerpf(1.1, 0.7, w), alpha)
	if heat >= 70:
		_heart_sprite.modulate.a = alpha * (sin(_heart_beat_time * 8) * 0.3 + 0.7)


# --- Visual Effects ---

func _spawn_fire_burst() -> void:
	# Flames burst from fire in multiple directions
	for i in range(5):
		var angle := randf() * TAU
		var dist := randf_range(30, 80)
		var target_pos := FIRE_POS + Vector2(cos(angle), sin(angle)) * dist

		var spark := ColorRect.new()
		spark.size = Vector2(8, 8)
		spark.position = FIRE_POS - Vector2(4, 4)
		spark.color = Color(1, randf_range(0.4, 0.8), 0.1, 0.9)
		spark.z_index = 45
		add_child(spark)
		var tw := create_tween().set_parallel(true)
		tw.tween_property(spark, "position", target_pos - Vector2(4, 4), 0.35)
		tw.tween_property(spark, "color:a", 0.0, 0.4)
		tw.tween_property(spark, "size", Vector2(4, 4), 0.4)
		tw.chain().tween_callback(spark.queue_free)


func _spawn_deflection(world_pos: Vector2) -> void:
	# Blue-white sparks bouncing off boulder
	for i in range(3):
		var angle := randf() * TAU
		var offset := Vector2(cos(angle), sin(angle)) * randf_range(15, 35)
		var spark := ColorRect.new()
		spark.size = Vector2(6, 6)
		spark.position = world_pos - Vector2(3, 3)
		spark.color = Color(0.5, 0.8, 1, 0.85)
		spark.z_index = 52
		add_child(spark)
		var tw := create_tween().set_parallel(true)
		tw.tween_property(spark, "position", world_pos + offset, 0.2)
		tw.tween_property(spark, "color:a", 0.0, 0.25)
		tw.chain().tween_callback(spark.queue_free)


# --- Win/Lose ---

func _on_level_won() -> void:
	_won = true
	heat_sim.freeze()
	_hud_layer.visible = false
	_flame_core.visible = false
	_flame_mid.visible = false
	_flame_outer.visible = false
	_show_win_screen()


func _on_damage_tick(_h: float) -> void:
	_damage_count += 1
	_hint_system.show_warning("Careful -- too much heat!")
	var f := ColorRect.new()
	f.size = get_viewport_rect().size
	f.color = Color(1, 0, 0, 0.1)
	f.z_index = 90
	f.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(f)
	create_tween().tween_property(f, "color:a", 0.0, 0.3).finished.connect(f.queue_free)


func _show_win_screen() -> void:
	var wl := CanvasLayer.new()
	wl.layer = 20
	add_child(wl)
	var ov := ColorRect.new()
	ov.color = Color(0, 0, 0, 0)
	ov.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ov.mouse_filter = Control.MOUSE_FILTER_STOP
	wl.add_child(ov)
	var card := VBoxContainer.new()
	card.alignment = BoxContainer.ALIGNMENT_CENTER
	card.add_theme_constant_override("separation", 16)
	card.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	card.offset_left = -280; card.offset_right = 280
	card.offset_top = -140; card.offset_bottom = 140
	wl.add_child(card)
	var t := Label.new()
	t.text = "AWAKENED"
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.add_theme_font_size_override("font_size", 32)
	t.add_theme_color_override("font_color", Color(1, 0.85, 0.5, 0.95))
	card.add_child(t)
	var b := Label.new()
	b.text = "You guided primordial fire through frozen pathways to awaken what lay dormant.\n\nScientists do something remarkably similar -- they send signals through biological pathways to activate cells."
	b.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	b.custom_minimum_size = Vector2(500, 0)
	b.add_theme_font_size_override("font_size", 15)
	b.add_theme_color_override("font_color", Color(0.75, 0.8, 0.9, 0.85))
	card.add_child(b)
	card.add_child(Control.new())
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 20)
	card.add_child(row)
	var pa := _btn("Play Again")
	pa.pressed.connect(func(): scene_requested.emit("res://scenes/levels/norse_onboarding.tscn"))
	row.add_child(pa)
	var mb := _btn("Menu")
	mb.pressed.connect(func(): scene_requested.emit(MENU_SCENE))
	row.add_child(mb)
	card.modulate.a = 0
	var tw := create_tween()
	tw.tween_property(ov, "color:a", 0.65, 0.8)
	tw.tween_property(card, "modulate:a", 1.0, 0.5)


func _btn(text: String) -> Button:
	var bt := Button.new()
	bt.text = text
	bt.custom_minimum_size = Vector2(130, 40)
	bt.add_theme_font_size_override("font_size", 16)
	bt.add_theme_color_override("font_color", Color(0.9, 0.85, 0.7))
	var s := StyleBoxFlat.new()
	s.bg_color = Color(0.1, 0.08, 0.04, 0.5)
	s.border_color = Color(0.5, 0.4, 0.25, 0.5)
	s.set_border_width_all(1); s.set_corner_radius_all(4)
	bt.add_theme_stylebox_override("normal", s)
	var h := StyleBoxFlat.new()
	h.bg_color = Color(0.18, 0.14, 0.06, 0.7)
	h.border_color = Color(0.7, 0.55, 0.3, 0.8)
	h.set_border_width_all(2); h.set_corner_radius_all(4)
	bt.add_theme_stylebox_override("hover", h)
	bt.add_theme_stylebox_override("pressed", h)
	return bt
