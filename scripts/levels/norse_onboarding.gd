extends Node2D

## Norse onboarding level — "Fire Meets Ice"
## Tap only near fire. Drag from fire around boulder to dragon is the core mechanic.
## Flames visually bounce off the boulder.

signal scene_requested(scene_path: String)

const MENU_SCENE := "res://scenes/start_menu/start_menu.tscn"
const FIRE_POSITION := Vector2(530, 870)
const HOLD_THRESHOLD_SECONDS := 0.4
const HEART_BASE_SCALE := 0.07

const FIRE_TAP_RADIUS := 180.0
const DRAGON_CENTER := Vector2(860, 350)
const DRAGON_NO_INPUT_RADIUS := 280.0
const BOULDER_CENTER := Vector2(725, 550)
const BOULDER_RADIUS := 110.0

var heat_simulation: HeatSimulation
var win_detector: WinDetector
var zone_polygons: Array[Polygon2D] = []

var _thermometer_widget: Thermometer
var _hint_system_widget: HintSystem
var _heads_up_display_layer: CanvasLayer

var _heart_sprite_node: Sprite2D
var _heart_beat_time_seconds: float = 0.0
var _fire_glow_light: PointLight2D
var _fire_intensity_multiplier: float = 1.0
var heat_gradient: Gradient

var _player_is_touching: bool = false
var _touch_start_time_seconds: float = 0.0
var _touch_world_position: Vector2 = Vector2.ZERO
var _hold_zone_identifier: int = -1
var _hold_gesture_is_active: bool = false
var _level_has_been_won: bool = false
var _has_dragged_during_current_touch: bool = false
var _drag_started_near_fire_source: bool = false
var _active_touch_points: Dictionary = {}

var _heat_zones: Array[Zone] = []
var _heat_channels: Array[Channel] = []
var _level_start_time_seconds: float = 0.0
var _damage_tick_count: int = 0
var _last_pinch_distance_pixels: float = 0.0

var _flame_core_trail: Line2D
var _flame_mid_trail: Line2D
var _flame_outer_trail: Line2D
var _flame_drag_points: PackedVector2Array = PackedVector2Array()
var _flame_trail_is_active: bool = false


func _ready() -> void:
	# Cache references to scene nodes used throughout the level.
	heat_simulation = $HeatSimulation as HeatSimulation
	win_detector = $WinDetector as WinDetector
	_heart_sprite_node = $HeartSprite as Sprite2D
	_fire_glow_light = $FireSource/FireGlow as PointLight2D
	heat_gradient = load("res://resources/heat_gradient.tres") as Gradient

	# Collect invisible zone polygons from the ice field for hit testing.
	var ice_field_node := $IceField
	for zone_index in range(8):
		var zone_node := ice_field_node.get_node_or_null("Zone%d" % zone_index)
		if zone_node and zone_node is Polygon2D:
			zone_polygons.append(zone_node)

	# Configure the heart sprite for additive pulsing visibility.
	if _heart_sprite_node:
		_heart_sprite_node.scale = Vector2(HEART_BASE_SCALE, HEART_BASE_SCALE)
		_heart_sprite_node.modulate.a = 0
		var additive_material := CanvasItemMaterial.new()
		additive_material.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		_heart_sprite_node.material = additive_material

	# Create the three layered flame trail line renderers.
	_flame_outer_trail = _make_trail_line(24.0, Color(0.6, 0.1, 0.02, 0.2), 38)
	_flame_mid_trail = _make_trail_line(12.0, Color(1.0, 0.4, 0.05, 0.45), 39)
	_flame_core_trail = _make_trail_line(5.0, Color(1.0, 0.85, 0.4, 0.65), 40)

	# Wire simulation, win detection, and HUD widgets.
	_setup_simulation()
	_setup_win_detection()
	_setup_hud()
	_level_start_time_seconds = Time.get_ticks_msec() / 1000.0
	for zone_polygon in zone_polygons:
		zone_polygon.visible = false


func _make_trail_line(trail_width: float, trail_color: Color, draw_order: int) -> Line2D:
	# Create a single additive flame trail line with rounded caps.
	var trail_line := Line2D.new()
	trail_line.width = trail_width
	trail_line.default_color = trail_color
	trail_line.z_index = draw_order
	trail_line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	trail_line.end_cap_mode = Line2D.LINE_CAP_ROUND
	var additive_material := CanvasItemMaterial.new()
	additive_material.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	trail_line.material = additive_material
	add_child(trail_line)
	return trail_line


func _setup_simulation() -> void:
	# Define the heat zones for the Norse onboarding topology.
	_heat_zones = [
		Zone.new(0, 1.0, true, false),
		Zone.new(1, 1.2, false, false),
		Zone.new(2, 1.0, false, false),
		Zone.new(3, 0.6, false, false),
		Zone.new(4, 1.3, false, false),
		Zone.new(5, 1.0, false, true),
	]
	if zone_polygons.size() > 6:
		_heat_zones.append(Zone.new(6, 0.0, false, false))
	for zone_index in range(mini(_heat_zones.size(), zone_polygons.size())):
		_heat_zones[zone_index].polygon = zone_polygons[zone_index]

	# Define the channels that connect adjacent heat zones.
	_heat_channels = [
		Channel.new(0, 1, 0.8),
		Channel.new(1, 2, 0.7),
		Channel.new(2, 3, 0.5),
		Channel.new(2, 4, 0.8),
		Channel.new(3, 5, 0.6),
		Channel.new(4, 5, 0.7),
	]
	heat_simulation.dissipation_rate = 0.035
	heat_simulation.tap_heat = 20.0
	heat_simulation.hold_base_heat = 5.0
	heat_simulation.hold_accel_rate = 0.8
	heat_simulation.drag_heat = 8.0
	heat_simulation.fire_position = FIRE_POSITION
	heat_simulation.max_fire_distance = 850.0
	if _heat_zones.size() > 6:
		heat_simulation.obstacle_zone_ids = [6]
	heat_simulation.setup(_heat_zones, _heat_channels)
	heat_simulation.heat_updated.connect(func(_zone_states): pass)


func _setup_win_detection() -> void:
	# Configure win sustain duration and connect win and damage handlers.
	win_detector.sustain_duration = 2.5
	win_detector.setup(heat_simulation)
	win_detector.level_won.connect(_on_level_won)
	win_detector.damage_tick.connect(_on_damage_tick)
	win_detector.entered_target_zone.connect(
		func(): _hint_system_widget.show_encouragement("Hold it steady...")
	)


func _setup_hud() -> void:
	# Create a canvas layer that sits above the gameplay view.
	_heads_up_display_layer = CanvasLayer.new()
	_heads_up_display_layer.layer = 10
	add_child(_heads_up_display_layer)
	var viewport_size := get_viewport_rect().size

	# Size and position the thermometer along the right edge of the viewport.
	var thermometer_height := viewport_size.y * 0.72
	var thermometer_width := maxf(viewport_size.x * 0.045, 45.0)
	var thermometer_x_position := viewport_size.x - thermometer_width - 15
	var thermometer_y_position := (viewport_size.y - thermometer_height) / 2.0
	_thermometer_widget = Thermometer.new()
	_thermometer_widget.position = Vector2(thermometer_x_position, thermometer_y_position)
	_thermometer_widget.size = Vector2(thermometer_width, thermometer_height)
	_thermometer_widget.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_heads_up_display_layer.add_child(_thermometer_widget)

	# Add the tutorial hint system across the full viewport.
	_hint_system_widget = HintSystem.new()
	_hint_system_widget.position = Vector2.ZERO
	_hint_system_widget.size = viewport_size
	_hint_system_widget.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_heads_up_display_layer.add_child(_hint_system_widget)


func _is_near_fire(world_position: Vector2) -> bool:
	# Return true when the position is within the fire tap radius.
	return world_position.distance_to(FIRE_POSITION) < FIRE_TAP_RADIUS


func _input(input_event: InputEvent) -> void:
	# Ignore all gameplay input after the level has been won.
	if _level_has_been_won:
		return

	# Track multi-touch points for pinch and spread gestures.
	if input_event is InputEventScreenTouch:
		if input_event.pressed:
			_active_touch_points[input_event.index] = input_event.position
		else:
			_active_touch_points.erase(input_event.index)
		if _active_touch_points.size() >= 2:
			return

	if input_event is InputEventScreenDrag:
		_active_touch_points[input_event.index] = input_event.position
		if _active_touch_points.size() >= 2:
			_handle_pinch_spread()
			return
		if input_event.index > 0:
			return

	# Normalize touch, mouse, and scroll-wheel events into common flags.
	var screen_position := Vector2.ZERO
	var is_press_event := false
	var is_release_event := false
	var is_move_event := false

	if input_event is InputEventScreenTouch and input_event.index == 0:
		screen_position = input_event.position
		is_press_event = input_event.pressed
		is_release_event = not input_event.pressed
	elif input_event is InputEventMouseButton and input_event.button_index == MOUSE_BUTTON_LEFT:
		screen_position = input_event.position
		is_press_event = input_event.pressed
		is_release_event = not input_event.pressed
	elif input_event is InputEventScreenDrag and input_event.index == 0:
		screen_position = input_event.position
		is_move_event = true
	elif input_event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		screen_position = input_event.position
		is_move_event = true
	elif input_event is InputEventMouseButton:
		if input_event.button_index == MOUSE_BUTTON_WHEEL_UP and input_event.pressed:
			_fire_intensity_multiplier = minf(_fire_intensity_multiplier + 0.15, 2.5)
		elif input_event.button_index == MOUSE_BUTTON_WHEEL_DOWN and input_event.pressed:
			_fire_intensity_multiplier = maxf(_fire_intensity_multiplier - 0.15, 0.3)
		return
	else:
		return

	var world_position := _viewport_to_world(screen_position)

	if is_press_event:
		_player_is_touching = true
		_touch_start_time_seconds = Time.get_ticks_msec() / 1000.0
		_touch_world_position = world_position
		_hold_gesture_is_active = false
		_has_dragged_during_current_touch = false
		_flame_drag_points.clear()
		_flame_trail_is_active = false
		_hold_zone_identifier = -1

		if _is_near_fire(world_position):
			_drag_started_near_fire_source = true
			_flame_drag_points.append(world_position)
			_flame_trail_is_active = true
			heat_simulation.apply_tap(0, world_position)
			_spawn_fire_burst()
			_hint_system_widget.notify_tap()
			_hold_zone_identifier = 0
		else:
			_drag_started_near_fire_source = false

	if is_release_event:
		_player_is_touching = false
		_hold_gesture_is_active = false
		_hold_zone_identifier = -1
		_flame_trail_is_active = false
		_drag_started_near_fire_source = false

	if is_move_event and _player_is_touching:
		_touch_world_position = world_position
		_has_dragged_during_current_touch = true

		if not _drag_started_near_fire_source:
			return

		_flame_trail_is_active = true

		if world_position.distance_to(BOULDER_CENTER) < BOULDER_RADIUS:
			_spawn_deflection(world_position)
			return

		if world_position.distance_to(DRAGON_CENTER) < DRAGON_NO_INPUT_RADIUS:
			_flame_drag_points.append(world_position)
			_update_flame_trails()
			return

		_flame_drag_points.append(world_position)
		_update_flame_trails()

		var zone_identifier := _zone_at_world_position(world_position)
		if zone_identifier >= 0 and zone_identifier != 5 and zone_identifier != 6:
			heat_simulation.apply_drag(zone_identifier, world_position)
			_hint_system_widget.notify_drag()


func _update_flame_trails() -> void:
	# Trim the trail history so it does not grow without bound.
	if _flame_drag_points.size() > 150:
		_flame_drag_points = _flame_drag_points.slice(-150)
	_flame_core_trail.clear_points()
	_flame_mid_trail.clear_points()
	_flame_outer_trail.clear_points()
	for drag_point in _flame_drag_points:
		_flame_core_trail.add_point(drag_point)
		_flame_mid_trail.add_point(drag_point)
		_flame_outer_trail.add_point(drag_point)
	if _flame_drag_points.size() > 1:
		var width_taper_curve := Curve.new()
		width_taper_curve.add_point(Vector2(0, 0.15))
		width_taper_curve.add_point(Vector2(0.6, 0.5))
		width_taper_curve.add_point(Vector2(1, 1.0))
		_flame_core_trail.width_curve = width_taper_curve
		_flame_mid_trail.width_curve = width_taper_curve
		_flame_outer_trail.width_curve = width_taper_curve


func _handle_pinch_spread() -> void:
	# Adjust fire intensity based on the distance between two touch points.
	var touch_positions := _active_touch_points.values()
	if touch_positions.size() < 2:
		return
	var current_pinch_distance: float = (touch_positions[0] as Vector2).distance_to(touch_positions[1] as Vector2)
	if _last_pinch_distance_pixels > 0:
		_fire_intensity_multiplier += (current_pinch_distance - _last_pinch_distance_pixels) * 0.003
		_fire_intensity_multiplier = clampf(_fire_intensity_multiplier, 0.3, 2.5)
		_hint_system_widget.notify_pinch()
	_last_pinch_distance_pixels = current_pinch_distance


func _process(delta_seconds: float) -> void:
	# Stop gameplay updates after the level has been won.
	if _level_has_been_won:
		return

	if _active_touch_points.size() < 2:
		_last_pinch_distance_pixels = 0.0

	heat_simulation.tap_heat = 20.0 * _fire_intensity_multiplier
	heat_simulation.hold_base_heat = 5.0 * _fire_intensity_multiplier
	heat_simulation.drag_heat = 8.0 * _fire_intensity_multiplier

	if _fire_glow_light:
		_fire_glow_light.energy = lerpf(
			_fire_glow_light.energy,
			0.5 + _fire_intensity_multiplier * 0.4,
			delta_seconds * 4.0
		)
		_fire_glow_light.texture_scale = 3.5 + _fire_intensity_multiplier * 1.5

	if _player_is_touching and _hold_zone_identifier == 0 and not _has_dragged_during_current_touch:
		var hold_elapsed_seconds := Time.get_ticks_msec() / 1000.0 - _touch_start_time_seconds
		if hold_elapsed_seconds >= HOLD_THRESHOLD_SECONDS:
			if not _hold_gesture_is_active:
				_hold_gesture_is_active = true
				_hint_system_widget.notify_hold()
			heat_simulation.apply_hold(
				0,
				_touch_world_position,
				hold_elapsed_seconds - HOLD_THRESHOLD_SECONDS
			)

	if not _flame_trail_is_active and _flame_drag_points.size() > 0:
		_flame_drag_points = _flame_drag_points.slice(4)
		_update_flame_trails()

	var target_zone := heat_simulation.get_target_zone()
	if target_zone:
		_thermometer_widget.set_heat(target_zone.heat)
		_hint_system_widget.update_max_heat(target_zone.heat)
		_update_heart_sprite(target_zone.heat, delta_seconds)


func _viewport_to_world(screen_position: Vector2) -> Vector2:
	# Convert screen coordinates into world coordinates for zone hit tests.
	return get_viewport().get_canvas_transform().affine_inverse() * screen_position


func _zone_at_world_position(world_position: Vector2) -> int:
	# Check the boulder obstacle zone first when it exists.
	if zone_polygons.size() > 6:
		var obstacle_polygon := zone_polygons[6]
		if Geometry2D.is_point_in_polygon(obstacle_polygon.to_local(world_position), obstacle_polygon.polygon):
			return 6
	for zone_index in range(mini(zone_polygons.size(), 6)):
		var zone_polygon := zone_polygons[zone_index]
		if Geometry2D.is_point_in_polygon(zone_polygon.to_local(world_position), zone_polygon.polygon):
			return zone_index
	return -1


func _update_heart_sprite(target_heat: float, delta_seconds: float) -> void:
	if not _heart_sprite_node:
		return
	_heart_beat_time_seconds += delta_seconds
	var heart_alpha := remap(clampf(target_heat, 10, 40), 10, 40, 0.0, 0.85)
	var beats_per_minute := 0.0
	if target_heat >= 25:
		beats_per_minute = remap(clampf(target_heat, 25, 90), 25, 90, 40, 150)
	var heart_scale := HEART_BASE_SCALE
	if beats_per_minute > 0:
		heart_scale += pow(
			maxf(0, sin(_heart_beat_time_seconds * beats_per_minute / 60.0 * TAU)),
			0.35
		) * 0.008
	_heart_sprite_node.scale = Vector2(heart_scale, heart_scale)
	var warmth_fraction := remap(clampf(target_heat, 10, 70), 10, 70, 0, 1)
	_heart_sprite_node.modulate = Color(
		lerpf(0.7, 1.2, warmth_fraction),
		lerpf(0.9, 0.85, warmth_fraction),
		lerpf(1.1, 0.7, warmth_fraction),
		heart_alpha
	)
	if target_heat >= 70:
		_heart_sprite_node.modulate.a = heart_alpha * (sin(_heart_beat_time_seconds * 8) * 0.3 + 0.7)


func _spawn_fire_burst() -> void:
	# Spawn short-lived sparks radiating from the fire source.
	for spark_index in range(5):
		var spark_angle := randf() * TAU
		var spark_distance := randf_range(30, 80)
		var spark_target_position := FIRE_POSITION + Vector2(cos(spark_angle), sin(spark_angle)) * spark_distance

		var spark_rect := ColorRect.new()
		spark_rect.size = Vector2(8, 8)
		spark_rect.position = FIRE_POSITION - Vector2(4, 4)
		spark_rect.color = Color(1, randf_range(0.4, 0.8), 0.1, 0.9)
		spark_rect.z_index = 45
		add_child(spark_rect)
		var spark_tween := create_tween().set_parallel(true)
		spark_tween.tween_property(spark_rect, "position", spark_target_position - Vector2(4, 4), 0.35)
		spark_tween.tween_property(spark_rect, "color:a", 0.0, 0.4)
		spark_tween.tween_property(spark_rect, "size", Vector2(4, 4), 0.4)
		spark_tween.chain().tween_callback(spark_rect.queue_free)


func _spawn_deflection(world_position: Vector2) -> void:
	# Spawn blue-white sparks when flames hit the boulder obstacle.
	for spark_index in range(3):
		var spark_angle := randf() * TAU
		var spark_offset := Vector2(cos(spark_angle), sin(spark_angle)) * randf_range(15, 35)
		var spark_rect := ColorRect.new()
		spark_rect.size = Vector2(6, 6)
		spark_rect.position = world_position - Vector2(3, 3)
		spark_rect.color = Color(0.5, 0.8, 1, 0.85)
		spark_rect.z_index = 52
		add_child(spark_rect)
		var spark_tween := create_tween().set_parallel(true)
		spark_tween.tween_property(spark_rect, "position", world_position + spark_offset, 0.2)
		spark_tween.tween_property(spark_rect, "color:a", 0.0, 0.25)
		spark_tween.chain().tween_callback(spark_rect.queue_free)


func _on_level_won() -> void:
	# Freeze gameplay and reveal the win overlay.
	_level_has_been_won = true
	heat_simulation.freeze()
	_heads_up_display_layer.visible = false
	_flame_core_trail.visible = false
	_flame_mid_trail.visible = false
	_flame_outer_trail.visible = false
	_show_win_screen()


func _on_damage_tick(_heat_value: float) -> void:
	# Count damage ticks and show a brief red warning flash.
	_damage_tick_count += 1
	_hint_system_widget.show_warning("Careful -- too much heat!")
	var damage_flash_rect := ColorRect.new()
	damage_flash_rect.size = get_viewport_rect().size
	damage_flash_rect.color = Color(1, 0, 0, 0.1)
	damage_flash_rect.z_index = 90
	damage_flash_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(damage_flash_rect)
	create_tween().tween_property(damage_flash_rect, "color:a", 0.0, 0.3).finished.connect(
		damage_flash_rect.queue_free
	)


func _show_win_screen() -> void:
	# Build the post-win overlay with narrative text and navigation buttons.
	var win_layer := CanvasLayer.new()
	win_layer.layer = 20
	add_child(win_layer)

	var overlay_rect := ColorRect.new()
	overlay_rect.color = Color(0, 0, 0, 0)
	overlay_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay_rect.mouse_filter = Control.MOUSE_FILTER_STOP
	win_layer.add_child(overlay_rect)

	var win_card := VBoxContainer.new()
	win_card.alignment = BoxContainer.ALIGNMENT_CENTER
	win_card.add_theme_constant_override("separation", 16)
	win_card.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	win_card.offset_left = -280
	win_card.offset_right = 280
	win_card.offset_top = -140
	win_card.offset_bottom = 140
	win_layer.add_child(win_card)

	var title_label := Label.new()
	title_label.text = "AWAKENED"
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.add_theme_font_size_override("font_size", 32)
	title_label.add_theme_color_override("font_color", Color(1, 0.85, 0.5, 0.95))
	win_card.add_child(title_label)

	var body_label := Label.new()
	body_label.text = (
		"You guided primordial fire through frozen pathways to awaken what lay dormant.\n\n"
		+ "Scientists do something remarkably similar -- they send signals through biological pathways to activate cells."
	)
	body_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body_label.custom_minimum_size = Vector2(500, 0)
	body_label.add_theme_font_size_override("font_size", 15)
	body_label.add_theme_color_override("font_color", Color(0.75, 0.8, 0.9, 0.85))
	win_card.add_child(body_label)

	win_card.add_child(Control.new())

	var button_row := HBoxContainer.new()
	button_row.alignment = BoxContainer.ALIGNMENT_CENTER
	button_row.add_theme_constant_override("separation", 20)
	win_card.add_child(button_row)

	var play_again_button := _make_win_button("Play Again")
	play_again_button.pressed.connect(
		func(): scene_requested.emit("res://scenes/levels/norse_onboarding.tscn")
	)
	button_row.add_child(play_again_button)

	var menu_button := _make_win_button("Menu")
	menu_button.pressed.connect(func(): scene_requested.emit(MENU_SCENE))
	button_row.add_child(menu_button)

	win_card.modulate.a = 0
	var win_tween := create_tween()
	win_tween.tween_property(overlay_rect, "color:a", 0.65, 0.8)
	win_tween.tween_property(win_card, "modulate:a", 1.0, 0.5)


func _make_win_button(button_text: String) -> Button:
	# Create a styled button for the win screen actions.
	var button_node := Button.new()
	button_node.text = button_text
	button_node.custom_minimum_size = Vector2(130, 40)
	button_node.add_theme_font_size_override("font_size", 16)
	button_node.add_theme_color_override("font_color", Color(0.9, 0.85, 0.7))
	var normal_style_box := StyleBoxFlat.new()
	normal_style_box.bg_color = Color(0.1, 0.08, 0.04, 0.5)
	normal_style_box.border_color = Color(0.5, 0.4, 0.25, 0.5)
	normal_style_box.set_border_width_all(1)
	normal_style_box.set_corner_radius_all(4)
	button_node.add_theme_stylebox_override("normal", normal_style_box)
	var hover_style_box := StyleBoxFlat.new()
	hover_style_box.bg_color = Color(0.18, 0.14, 0.06, 0.7)
	hover_style_box.border_color = Color(0.7, 0.55, 0.3, 0.8)
	hover_style_box.set_border_width_all(2)
	hover_style_box.set_corner_radius_all(4)
	button_node.add_theme_stylebox_override("hover", hover_style_box)
	button_node.add_theme_stylebox_override("pressed", hover_style_box)
	return button_node
