extends Node2D

## Generic onboarding level with continuous 2D heat grid.
## Heat spreads as a visible gradient — no invisible zone boundaries.
## Gestures: tap, swirl (stoke), drag (channel), spread/+/- (boost).

signal scene_requested(scene_path: String)

const MENU_SCENE := "res://scenes/start_menu/start_menu.tscn"
const CELL_SIZE := 40.0
const GRID_W := 48  # 1920 / 40
const GRID_H := 27  # 1080 / 40

@export var layout: LevelLayout

var grid_sim: GridHeatSimulation
var _thermometer: Thermometer
var _hint_system: HintSystem
var _hud_layer: CanvasLayer
var _heat_overlay: Node2D
var _debug_overlay: Node2D

var _heart_sprite: Sprite2D
var _heart_beat_time: float = 0.0
var _fire_glow: PointLight2D
var _fire_intensity: float = 1.0
var heat_gradient: Gradient

var _background: Sprite2D
var _creature_sprite: Sprite2D
var _fire_source: Node2D
var _fire_particles: GPUParticles2D
var _ember_particles: GPUParticles2D

var _is_touching: bool = false
var _touch_start_time: float = 0.0
var _touch_world_pos: Vector2 = Vector2.ZERO
var _won: bool = false
var _has_dragged_this_touch: bool = false
var _drag_started_near_fire: bool = false
var _touch_points: Dictionary = {}

var _start_time: float = 0.0
var _damage_count: int = 0
var _last_pinch_distance: float = 0.0

var _flame_core: Line2D
var _flame_mid: Line2D
var _flame_outer: Line2D
var _drag_points: PackedVector2Array = PackedVector2Array()
var _is_trail_active: bool = false

var _debug_visible: bool = false

# Swirl detection
var _swirl_angle_accum: float = 0.0
var _is_swirling: bool = false
var _swirl_prev_pos: Vector2 = Vector2.ZERO

# Spread
var _is_spreading: bool = false

# Win detection
var _in_target: bool = false
var _time_in_target: float = 0.0
var _target_heat: float = 0.0

# Direct heat tracking (bypass grid sim for thermometer)
var _manual_heat: float = 0.0

# Debug readout
var _heat_label: Label


func _ready() -> void:
	if not layout:
		push_error("OnboardingLevel: no LevelLayout resource assigned!")
		return

	heat_gradient = load("res://resources/heat_gradient.tres") as Gradient

	_build_scene()
	_setup_grid_sim()
	_setup_hud()

	_flame_outer = _make_trail(24.0, Color(0.6, 0.1, 0.02, 0.2), 38)
	_flame_mid = _make_trail(12.0, Color(1.0, 0.4, 0.05, 0.45), 39)
	_flame_core = _make_trail(5.0, Color(1.0, 0.85, 0.4, 0.65), 40)

	_start_time = Time.get_ticks_msec() / 1000.0

	# Grid sim test injection removed — using manual heat for thermometer


func _build_scene() -> void:
	var cam := Camera2D.new()
	cam.position = Vector2(960, 540)
	add_child(cam)

	if layout.background_texture:
		_background = Sprite2D.new()
		_background.texture = layout.background_texture
		_background.position = Vector2(960, 540)
		# Scale background to fill entire viewport (no grey bars)
		var tex_size := layout.background_texture.get_size()
		var scale_factor := maxf(1920.0 / tex_size.x, 1080.0 / tex_size.y)
		_background.scale = Vector2(scale_factor, scale_factor)
		add_child(_background)

	# Heat overlay (renders the gradient)
	_heat_overlay = _HeatOverlay.new()
	_heat_overlay.level = self
	_heat_overlay.z_index = 1
	add_child(_heat_overlay)

	# Creature sprite
	if layout.creature_texture and layout.creature_scale > 0.0:
		_creature_sprite = Sprite2D.new()
		_creature_sprite.texture = layout.creature_texture
		_creature_sprite.position = layout.creature_position
		_creature_sprite.scale = Vector2(layout.creature_scale, layout.creature_scale)
		_creature_sprite.z_index = 3
		add_child(_creature_sprite)

	# Heart sprite (pulsing overlay)
	if layout.creature_texture:
		_heart_sprite = Sprite2D.new()
		_heart_sprite.texture = layout.creature_texture
		_heart_sprite.position = layout.heart_position
		_heart_sprite.scale = Vector2(layout.heart_base_scale, layout.heart_base_scale)
		_heart_sprite.modulate.a = 0
		_heart_sprite.z_index = 5
		var mat := CanvasItemMaterial.new()
		mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		_heart_sprite.material = mat
		add_child(_heart_sprite)

	# Fire source
	_fire_source = Node2D.new()
	_fire_source.position = layout.fire_position
	_fire_source.z_index = 4
	add_child(_fire_source)

	if layout.fire_sprite_texture and layout.fire_sprite_scale > 0.0:
		var fire_sprite := Sprite2D.new()
		fire_sprite.texture = layout.fire_sprite_texture
		fire_sprite.scale = Vector2(layout.fire_sprite_scale, layout.fire_sprite_scale)
		_fire_source.add_child(fire_sprite)

	_setup_fire_particles()


func _setup_fire_particles() -> void:
	var fire_mat := ParticleProcessMaterial.new()
	fire_mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	fire_mat.emission_sphere_radius = 10.0
	fire_mat.direction = Vector3(0, -1, 0)
	fire_mat.spread = 14.0
	fire_mat.initial_velocity_min = 18.0
	fire_mat.initial_velocity_max = 40.0
	fire_mat.gravity = Vector3(0, -30, 0)
	fire_mat.scale_min = 1.2
	fire_mat.scale_max = 2.5
	fire_mat.color = Color(1, 0.45, 0.08, 0.75)

	_fire_particles = GPUParticles2D.new()
	_fire_particles.amount = 18
	_fire_particles.process_material = fire_mat
	_fire_particles.lifetime = 0.5
	_fire_particles.visibility_rect = Rect2(-35, -70, 70, 80)
	_fire_source.add_child(_fire_particles)

	var ember_mat := ParticleProcessMaterial.new()
	ember_mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	ember_mat.emission_sphere_radius = 18.0
	ember_mat.direction = Vector3(0, -1, 0)
	ember_mat.spread = 28.0
	ember_mat.initial_velocity_min = 10.0
	ember_mat.initial_velocity_max = 30.0
	ember_mat.gravity = Vector3(0, -12, 0)
	ember_mat.scale_min = 0.8
	ember_mat.scale_max = 2.0
	ember_mat.color = Color(1, 0.6, 0.2, 0.5)

	_ember_particles = GPUParticles2D.new()
	_ember_particles.amount = 8
	_ember_particles.process_material = ember_mat
	_ember_particles.lifetime = 1.6
	_ember_particles.visibility_rect = Rect2(-50, -200, 100, 220)
	_fire_source.add_child(_ember_particles)

	_fire_glow = PointLight2D.new()
	_fire_glow.color = Color(1, 0.45, 0.12, 1)
	_fire_glow.energy = 0.6
	_fire_glow.texture_scale = 4.0
	_fire_source.add_child(_fire_glow)


func _setup_grid_sim() -> void:
	grid_sim = GridHeatSimulation.new()
	grid_sim.name = "GridHeatSimulation"
	add_child(grid_sim)
	grid_sim.setup(GRID_W, GRID_H, CELL_SIZE)
	grid_sim.diffusion_rate = layout.grid_diffusion_rate
	grid_sim.dissipation_rate = layout.grid_dissipation_rate
	grid_sim.source_heat_rate = layout.grid_source_heat
	grid_sim.target_radius = layout.grid_target_radius

	# Set fire source cells (3x3 around fire position)
	var fire_gc := grid_sim.world_to_grid(layout.fire_position)
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			var c := Vector2i(fire_gc.x + dx, fire_gc.y + dy)
			if c.x >= 0 and c.x < GRID_W and c.y >= 0 and c.y < GRID_H:
				grid_sim.source_cells.append(c)

	# Set target center
	grid_sim.target_center = grid_sim.world_to_grid(layout.creature_position)

	# Set obstacle if present
	if layout.has_obstacle():
		var obs_gc := grid_sim.world_to_grid(layout.obstacle_position)
		var obs_r := ceili(layout.obstacle_radius / CELL_SIZE)
		grid_sim.set_obstacle_circle(obs_gc, obs_r)

	# Seed initial warmth around fire so player sees something immediately
	grid_sim.inject_heat(layout.fire_position, 15.0, 4.0)


func _setup_hud() -> void:
	_hud_layer = CanvasLayer.new()
	_hud_layer.layer = 10
	add_child(_hud_layer)
	var vp := get_viewport_rect().size

	# Thermometer — right side, well inside viewport
	var therm_w := 50.0
	var therm_h := vp.y * 0.65
	var therm_x := 1920.0 - therm_w - 40.0  # x=1830, well inside 1920 viewport
	var therm_y := (1080.0 - therm_h) / 2.0
	_thermometer = Thermometer.new()
	_thermometer.position = Vector2(therm_x, therm_y)
	_thermometer.size = Vector2(therm_w, therm_h)
	_thermometer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud_layer.add_child(_thermometer)

	_hint_system = HintSystem.new()
	_hint_system.position = Vector2.ZERO
	_hint_system.size = vp
	_hint_system.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if layout.hint_drag_text != "":
		_hint_system.drag_hint_text = layout.hint_drag_text
	_hud_layer.add_child(_hint_system)

	# Always-visible heat readout for diagnostics
	_heat_label = Label.new()
	_heat_label.position = Vector2(1700, 20)
	_heat_label.add_theme_font_size_override("font_size", 18)
	_heat_label.add_theme_color_override("font_color", Color(1, 1, 0.5, 0.9))
	_heat_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud_layer.add_child(_heat_label)


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


# --- INPUT ---

func _is_near_fire(world_pos: Vector2) -> bool:
	return world_pos.distance_to(layout.fire_position) < layout.fire_tap_radius


func _input(event: InputEvent) -> void:
	if _won:
		return

	# Keyboard shortcuts
	if event is InputEventKey and event.pressed:
		if event.keycode == KEY_F3:
			_toggle_debug_overlay()
			return
		if event.keycode == KEY_EQUAL or event.keycode == KEY_KP_ADD:
			_fire_intensity = minf(_fire_intensity + 0.2, 2.5)
			_hint_system.notify_pinch()
			return
		if event.keycode == KEY_MINUS or event.keycode == KEY_KP_SUBTRACT:
			_fire_intensity = maxf(_fire_intensity - 0.2, 0.3)
			return

	# Multi-touch: spread/pinch anywhere
	if event is InputEventScreenTouch:
		if event.pressed:
			_touch_points[event.index] = event.position
		else:
			_touch_points.erase(event.index)
		_is_spreading = _touch_points.size() >= 2
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
			_hint_system.notify_pinch()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_fire_intensity = maxf(_fire_intensity - 0.15, 0.3)
		return
	else:
		return

	var world_pos := _viewport_to_world(pos)

	if is_press:
		_is_touching = true
		_touch_start_time = Time.get_ticks_msec() / 1000.0
		_touch_world_pos = world_pos
		_has_dragged_this_touch = false
		_drag_points.clear()
		_is_trail_active = false
		_swirl_angle_accum = 0.0
		_is_swirling = false

		if _is_near_fire(world_pos):
			_drag_started_near_fire = true
			_drag_points.append(world_pos)
			_is_trail_active = true
			grid_sim.inject_heat(world_pos, layout.tap_heat * _fire_intensity, 3.5)
			_manual_heat = minf(_manual_heat + 2.0, 100.0)
			_spawn_fire_burst()
			_hint_system.notify_tap()
			_swirl_prev_pos = world_pos
		else:
			_drag_started_near_fire = false

	if is_release:
		_is_touching = false
		_is_trail_active = false
		_drag_started_near_fire = false
		_is_swirling = false

	if is_move and _is_touching:
		_touch_world_pos = world_pos
		_has_dragged_this_touch = true

		if not _drag_started_near_fire:
			return

		_is_trail_active = true

		# Swirl near fire
		if _is_near_fire(world_pos):
			_handle_swirl(world_pos)
			_drag_points.append(world_pos)
			_update_trails()
			grid_sim.inject_heat(world_pos, layout.drag_heat * _fire_intensity * 0.5, 3.0)
			return

		_is_swirling = false

		# Boulder collision
		if layout.has_obstacle() and world_pos.distance_to(layout.obstacle_position) < layout.obstacle_radius:
			_spawn_deflection(world_pos)
			return

		# Drag anywhere — inject heat at finger position
		_drag_points.append(world_pos)
		_update_trails()

		# Full heat wherever you drag — you carried the fire there
		grid_sim.inject_heat(world_pos, layout.drag_heat * _fire_intensity, 3.5)

		# Track heat manually based on distance to creature
		var dist_to_creature := world_pos.distance_to(layout.creature_position)
		if dist_to_creature < 300.0:
			_manual_heat = minf(_manual_heat + 0.4 * _fire_intensity, 100.0)
		_hint_system.notify_drag()


func _handle_swirl(world_pos: Vector2) -> void:
	var fire := layout.fire_position
	var prev_angle := (_swirl_prev_pos - fire).angle()
	var curr_angle := (world_pos - fire).angle()
	var delta_angle := curr_angle - prev_angle
	while delta_angle > PI:
		delta_angle -= TAU
	while delta_angle < -PI:
		delta_angle += TAU

	_swirl_angle_accum += absf(delta_angle)
	_swirl_prev_pos = world_pos

	if _swirl_angle_accum >= TAU:
		_swirl_angle_accum -= TAU
		_fire_intensity = minf(_fire_intensity + 0.3, 2.5)
		_spawn_fire_burst()

	if not _is_swirling and _swirl_angle_accum > PI * 0.5:
		_is_swirling = true
		_hint_system.notify_hold()


func _handle_pinch_spread() -> void:
	var points := _touch_points.values()
	if points.size() < 2:
		return
	var dist: float = (points[0] as Vector2).distance_to(points[1] as Vector2)
	if _last_pinch_distance > 0:
		var delta := (dist - _last_pinch_distance) * 0.004
		_fire_intensity += delta
		_fire_intensity = clampf(_fire_intensity, 0.3, 2.5)
		if delta > 0:
			_hint_system.notify_pinch()
	_last_pinch_distance = dist
	_is_spreading = true


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
	if _drag_points.size() > 1:
		var c := Curve.new()
		c.add_point(Vector2(0, 0.15))
		c.add_point(Vector2(0.6, 0.5))
		c.add_point(Vector2(1, 1.0))
		_flame_core.width_curve = c
		_flame_mid.width_curve = c
		_flame_outer.width_curve = c


func _process(delta: float) -> void:
	if _won:
		return

	if _touch_points.size() < 2:
		_last_pinch_distance = 0.0
		_is_spreading = false

	# Intensity decays toward 1.0
	if not _is_swirling and not _is_spreading:
		_fire_intensity = move_toward(_fire_intensity, 1.0, delta * 0.15)

	# Scale fire source heat injection with intensity
	grid_sim.source_heat_rate = layout.grid_source_heat * _fire_intensity

	# Fire glow
	if _fire_glow:
		_fire_glow.energy = lerpf(_fire_glow.energy, 0.4 + _fire_intensity * 0.8, delta * 4.0)
		_fire_glow.texture_scale = 3.0 + _fire_intensity * 3.0

	# Particle scaling
	if _fire_particles:
		_fire_particles.amount = clampi(int(6 + _fire_intensity * 16), 6, 45)
		var fm := _fire_particles.process_material as ParticleProcessMaterial
		if fm:
			fm.initial_velocity_min = 10.0 + _fire_intensity * 12.0
			fm.initial_velocity_max = 20.0 + _fire_intensity * 30.0
			fm.spread = 10.0 + _fire_intensity * 12.0
			fm.scale_min = 1.0 + _fire_intensity * 0.6
			fm.scale_max = 2.0 + _fire_intensity * 1.5
			var white_mix := clampf((_fire_intensity - 1.0) / 1.5, 0.0, 1.0)
			fm.color = Color(1, lerpf(0.45, 0.85, white_mix), lerpf(0.08, 0.4, white_mix), 0.75)
	if _ember_particles:
		_ember_particles.amount = clampi(int(3 + _fire_intensity * 10), 3, 25)
		var em := _ember_particles.process_material as ParticleProcessMaterial
		if em:
			em.initial_velocity_max = 15.0 + _fire_intensity * 25.0
			em.scale_max = 1.5 + _fire_intensity * 1.0

	# Fade trail
	if not _is_trail_active and _drag_points.size() > 0:
		_drag_points = _drag_points.slice(4)
		_update_trails()

	# Manual heat decays over time (tendency to cool)
	_manual_heat = maxf(_manual_heat - delta * 5.0, 0.0)

	# Use manual heat for thermometer (bypasses grid sim)
	_target_heat = _manual_heat
	_thermometer.set_heat(_target_heat)
	_hint_system.update_max_heat(_target_heat)
	_update_heart_sprite(_target_heat, delta)
	_check_win(delta)

	# Debug readout (visible when F3 is off too, for tuning)
	if _heat_label:
		_heat_label.text = "%.0f°" % _manual_heat

	# Redraw heat overlay
	_heat_overlay.queue_redraw()
	if _debug_overlay:
		_debug_overlay.queue_redraw()


func _check_win(delta: float) -> void:
	# Damage
	if _target_heat >= layout.damage_threshold:
		_damage_count += 1
		_hint_system.show_warning("Careful -- too much heat!")
		var f := ColorRect.new()
		f.size = get_viewport_rect().size
		f.color = Color(1, 0, 0, 0.1)
		f.z_index = 90
		f.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(f)
		create_tween().tween_property(f, "color:a", 0.0, 0.3).finished.connect(f.queue_free)

	var in_zone := _target_heat >= layout.target_heat_min and _target_heat <= layout.target_heat_max
	if in_zone and not _in_target:
		_in_target = true
		_time_in_target = 0.0
		_hint_system.show_encouragement("Hold it steady...")
	elif not in_zone and _in_target:
		_in_target = false
		_time_in_target = 0.0

	if _in_target:
		_time_in_target += delta
		if _time_in_target >= layout.win_sustain_duration:
			_on_level_won()


func _viewport_to_world(pos: Vector2) -> Vector2:
	return get_viewport().get_canvas_transform().affine_inverse() * pos


# --- Heart ---

func _update_heart_sprite(heat: float, delta: float) -> void:
	if not _heart_sprite:
		return
	_heart_beat_time += delta
	var alpha := remap(clampf(heat, 10, 40), 10, 40, 0.0, 0.85)
	var bpm := 0.0
	if heat >= 25:
		bpm = remap(clampf(heat, 25, 90), 25, 90, 40, 150)
	var s := layout.heart_base_scale
	if bpm > 0:
		s += pow(maxf(0, sin(_heart_beat_time * bpm / 60.0 * TAU)), 0.35) * 0.008
	_heart_sprite.scale = Vector2(s, s)
	var w := remap(clampf(heat, 10, 70), 10, 70, 0, 1)
	_heart_sprite.modulate = Color(lerpf(0.7, 1.2, w), lerpf(0.9, 0.85, w), lerpf(1.1, 0.7, w), alpha)
	if heat >= 70:
		_heart_sprite.modulate.a = alpha * (sin(_heart_beat_time * 8) * 0.3 + 0.7)


# --- Visual Effects ---

func _spawn_fire_burst() -> void:
	for i in range(5):
		var angle := randf() * TAU
		var dist := randf_range(30, 80)
		var target_pos := layout.fire_position + Vector2(cos(angle), sin(angle)) * dist
		var spark := ColorRect.new()
		spark.size = Vector2(8, 8)
		spark.position = layout.fire_position - Vector2(4, 4)
		spark.color = Color(1, randf_range(0.4, 0.8), 0.1, 0.9)
		spark.z_index = 45
		add_child(spark)
		var tw := create_tween().set_parallel(true)
		tw.tween_property(spark, "position", target_pos - Vector2(4, 4), 0.35)
		tw.tween_property(spark, "color:a", 0.0, 0.4)
		tw.tween_property(spark, "size", Vector2(4, 4), 0.4)
		tw.chain().tween_callback(spark.queue_free)


func _spawn_deflection(world_pos: Vector2) -> void:
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


# --- Heat Overlay (visible gradient) ---

class _HeatOverlay extends Node2D:
	var level: Node2D

	func _draw() -> void:
		var sim: GridHeatSimulation = level.grid_sim
		if not sim:
			return
		var cs: float = sim.cell_size
		for y in range(sim.grid_h):
			for x in range(sim.grid_w):
				var h: float = sim.heat[y * sim.grid_w + x]
				if h < 0.5:
					continue
				var norm := clampf(h / 100.0, 0.0, 1.0)
				var col: Color = level.heat_gradient.sample(norm)
				col.a = clampf(norm * 0.55, 0.02, 0.45)
				draw_rect(Rect2(x * cs, y * cs, cs, cs), col)


# --- Debug Overlay ---

func _toggle_debug_overlay() -> void:
	_debug_visible = not _debug_visible
	if _debug_visible and not _debug_overlay:
		_debug_overlay = _DebugDraw.new()
		_debug_overlay.level = self
		_debug_overlay.z_index = 100
		add_child(_debug_overlay)
	if _debug_overlay:
		_debug_overlay.visible = _debug_visible


class _DebugDraw extends Node2D:
	var level: Node2D

	func _draw() -> void:
		var lyt: LevelLayout = level.layout
		var sim: GridHeatSimulation = level.grid_sim
		var font := ThemeDB.fallback_font

		# Grid lines (light)
		for x in range(0, sim.grid_w + 1):
			draw_line(Vector2(x * sim.cell_size, 0), Vector2(x * sim.cell_size, sim.grid_h * sim.cell_size), Color(1, 1, 1, 0.04), 1.0)
		for y in range(0, sim.grid_h + 1):
			draw_line(Vector2(0, y * sim.cell_size), Vector2(sim.grid_w * sim.cell_size, y * sim.cell_size), Color(1, 1, 1, 0.04), 1.0)

		# Obstacle cells
		for y in range(sim.grid_h):
			for x in range(sim.grid_w):
				if sim.obstacles[y * sim.grid_w + x] == 1:
					draw_rect(Rect2(x * sim.cell_size, y * sim.cell_size, sim.cell_size, sim.cell_size), Color(0.5, 0.5, 0.5, 0.4))

		# Fire
		draw_circle(lyt.fire_position, 8, Color(1, 0.5, 0, 0.9))
		draw_arc(lyt.fire_position, lyt.fire_tap_radius, 0, TAU, 64, Color(1, 0.5, 0, 0.4), 2.0)
		draw_string(font, lyt.fire_position + Vector2(12, -12), "FIRE", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color(1, 0.6, 0))
		draw_string(font, lyt.fire_position + Vector2(12, 4), "int=%.1f" % level._fire_intensity, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(1, 0.8, 0, 0.7))

		# Creature + target radius
		draw_circle(lyt.creature_position, 8, Color(0.4, 0.8, 1, 0.9))
		var tr := sim.target_radius * sim.cell_size
		draw_arc(lyt.creature_position, tr, 0, TAU, 64, Color(0.4, 0.8, 1, 0.3), 2.0)
		draw_string(font, lyt.creature_position + Vector2(12, -12), "TARGET heat=%.0f" % level._target_heat, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color(0.4, 0.8, 1))

		# Obstacle
		if lyt.has_obstacle():
			draw_circle(lyt.obstacle_position, 8, Color(1, 0.2, 0.2, 0.9))
			draw_arc(lyt.obstacle_position, lyt.obstacle_radius, 0, TAU, 64, Color(1, 0.2, 0.2, 0.4), 2.0)

		# X-axis coordinates along top
		for x in range(0, 1921, 200):
			draw_line(Vector2(x, 0), Vector2(x, 1080), Color(1, 1, 1, 0.15), 1.0)
			draw_string(font, Vector2(x + 3, 16), str(x), HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(1, 1, 0.3, 0.85))
		# Y-axis coordinates along left side
		for y in range(0, 1081, 100):
			draw_line(Vector2(0, y), Vector2(1920, y), Color(1, 1, 1, 0.1), 1.0)
			# White background box for readability
			draw_rect(Rect2(0, y + 2, 40, 16), Color(0, 0, 0, 0.5))
			draw_string(font, Vector2(3, y + 15), str(y), HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.3, 1, 1, 0.95))


# --- Win/Lose ---

func _on_level_won() -> void:
	_won = true
	grid_sim.freeze()
	_hud_layer.visible = false
	_flame_core.visible = false
	_flame_mid.visible = false
	_flame_outer.visible = false
	_show_win_screen()


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
	t.text = layout.win_title
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.add_theme_font_size_override("font_size", 32)
	t.add_theme_color_override("font_color", Color(1, 0.85, 0.5, 0.95))
	card.add_child(t)

	var body_text := layout.win_body
	if layout.win_biology_line != "":
		body_text += "\n\n" + layout.win_biology_line

	var b := Label.new()
	b.text = body_text
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
	var self_scene := scene_file_path
	pa.pressed.connect(func(): scene_requested.emit(self_scene))
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
