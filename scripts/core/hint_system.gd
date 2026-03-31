class_name HintSystem
extends Control

## Phase-based ghost-hand tutorial system.
## Discovers what the player hasn't tried yet, shows warm-glowing hand animations.
## Each hint shown only once, auto-dismissed when the player performs the gesture.

signal hint_shown(hint_id: String)

var _hints_shown: Dictionary = {}
var _level_time: float = 0.0
var _has_tapped: bool = false
var _has_dragged: bool = false
var _has_held: bool = false
var _has_pinched: bool = false
var _current_hint: String = ""
var _hint_visible: bool = false
var _max_heat_reached: float = 0.0

# Visual elements
var _hand_icon: Label
var _hand_sub: Label
var _hand_rings: Array[ColorRect] = []
var _hint_container: Control


func _ready() -> void:
	_hint_container = Control.new()
	_hint_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hint_container.visible = false
	add_child(_hint_container)

	# Ghost hand icon (warm orange, translucent)
	_hand_icon = Label.new()
	_hand_icon.add_theme_font_size_override("font_size", 44)
	_hand_icon.add_theme_color_override("font_color", Color(1, 0.7, 0.3, 0.7))
	_hand_icon.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hand_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hint_container.add_child(_hand_icon)

	# Subtle instruction text below hand
	_hand_sub = Label.new()
	_hand_sub.add_theme_font_size_override("font_size", 16)
	_hand_sub.add_theme_color_override("font_color", Color(1, 0.85, 0.6, 0.6))
	_hand_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hand_sub.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hint_container.add_child(_hand_sub)


func update_max_heat(heat: float) -> void:
	_max_heat_reached = maxf(_max_heat_reached, heat)


func _process(delta: float) -> void:
	_level_time += delta

	if _hint_visible:
		return

	# Phase 1: Tap — if no input after 4s
	if not _has_tapped and _level_time > 4.0 and not _hints_shown.has("tap"):
		_show_ghost_hand("tap", ".", "Tap the fire", 0.35, 0.78)

	# Phase 2: Hold — tapping but not holding after 12s
	elif _has_tapped and not _has_held and _level_time > 12.0 and not _hints_shown.has("hold"):
		_show_ghost_hand("hold", ".", "Press and hold near the fire", 0.35, 0.73)

	# Phase 3: Drag — tapping/holding but not dragging after 22s
	elif _has_tapped and not _has_dragged and _level_time > 22.0 and not _hints_shown.has("drag"):
		_show_ghost_hand("drag", ".", "Drag from fire toward the dragon", 0.35, 0.68)

	# Phase 4: Pinch/spread — struggling after 30s (temp hasn't reached 30)
	elif _has_tapped and _max_heat_reached < 30.0 and _level_time > 30.0 and not _hints_shown.has("pinch"):
		_show_ghost_hand("pinch", ".", "Spread two fingers to intensify fire", 0.35, 0.6)


func notify_tap() -> void:
	_has_tapped = true
	if _current_hint == "tap":
		_hide_hint()


func notify_drag() -> void:
	_has_dragged = true
	if _current_hint == "drag":
		_hide_hint()


func notify_hold() -> void:
	_has_held = true
	if _current_hint == "hold":
		_hide_hint()


func notify_pinch() -> void:
	_has_pinched = true
	if _current_hint == "pinch":
		_hide_hint()


func show_warning(text: String) -> void:
	if _hint_visible and not _current_hint.begins_with("warn"):
		return
	_show_center_text("warn_" + text, text, Color(1, 0.3, 0.2, 0.9))
	await get_tree().create_timer(1.5).timeout
	if _current_hint.begins_with("warn"):
		_hide_hint()


func show_encouragement(text: String) -> void:
	if _hint_visible:
		return
	_show_center_text("encourage", text, Color(1, 0.85, 0.4, 0.9))
	await get_tree().create_timer(2.0).timeout
	if _current_hint == "encourage":
		_hide_hint()


func _show_ghost_hand(hint_id: String, icon: String, text: String, x_ratio: float, y_ratio: float) -> void:
	_hints_shown[hint_id] = true
	_current_hint = hint_id
	_hint_visible = true

	var vp := get_viewport_rect().size
	_hand_icon.text = icon
	_hand_icon.position = Vector2(vp.x * x_ratio - 30, vp.y * y_ratio - 30)
	_hand_icon.size = Vector2(60, 50)

	_hand_sub.text = text
	_hand_sub.position = Vector2(vp.x * x_ratio - 80, vp.y * y_ratio + 25)
	_hand_sub.size = Vector2(160, 25)

	_hint_container.visible = true
	_hint_container.modulate.a = 0
	var tw := create_tween()
	tw.tween_property(_hint_container, "modulate:a", 1.0, 0.5)

	# Auto-dismiss after 5 seconds
	await get_tree().create_timer(5.0).timeout
	if _current_hint == hint_id:
		_hide_hint()

	hint_shown.emit(hint_id)


func _show_center_text(hint_id: String, text: String, color: Color) -> void:
	_current_hint = hint_id
	_hint_visible = true

	var vp := get_viewport_rect().size
	_hand_icon.text = ""
	_hand_sub.text = text
	_hand_sub.add_theme_color_override("font_color", color)
	_hand_sub.add_theme_font_size_override("font_size", 22)
	_hand_sub.position = Vector2(vp.x * 0.2, vp.y * 0.15)
	_hand_sub.size = Vector2(vp.x * 0.6, 35)

	_hint_container.visible = true
	_hint_container.modulate.a = 0
	create_tween().tween_property(_hint_container, "modulate:a", 1.0, 0.3)


func _hide_hint() -> void:
	_hint_visible = false
	_current_hint = ""
	_hand_sub.add_theme_font_size_override("font_size", 16)
	_hand_sub.add_theme_color_override("font_color", Color(1, 0.85, 0.6, 0.6))
	var tw := create_tween()
	tw.tween_property(_hint_container, "modulate:a", 0.0, 0.3)
	tw.tween_callback(func(): _hint_container.visible = false)
