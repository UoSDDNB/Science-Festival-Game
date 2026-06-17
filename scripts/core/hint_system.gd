class_name HintSystem
extends Control

## Phase-based ghost-hand tutorial system.
## Discovers what the player has not tried yet, shows warm-glowing hand animations.
## Each hint shown only once, auto-dismissed when the player performs the gesture.

signal hint_shown(hint_id: String)

var _hints_already_shown: Dictionary = {}
var _level_elapsed_time: float = 0.0
var _player_has_tapped: bool = false
var _player_has_dragged: bool = false
var _player_has_held: bool = false
var _player_has_pinched: bool = false
var _current_hint_identifier: String = ""
var _hint_is_visible: bool = false
var _maximum_heat_reached: float = 0.0

var _hand_icon_label: Label
var _hand_instruction_label: Label
var _hand_rings: Array[ColorRect] = []
var _hint_container: Control


func _ready() -> void:
	# Create the parent container that holds all hint visuals.
	_hint_container = Control.new()
	_hint_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hint_container.visible = false
	add_child(_hint_container)

	# Create the large ghost-hand icon label.
	_hand_icon_label = Label.new()
	_hand_icon_label.add_theme_font_size_override("font_size", 44)
	_hand_icon_label.add_theme_color_override("font_color", Color(1, 0.7, 0.3, 0.7))
	_hand_icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hand_icon_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hint_container.add_child(_hand_icon_label)

	# Create the smaller instruction text beneath the hand icon.
	_hand_instruction_label = Label.new()
	_hand_instruction_label.add_theme_font_size_override("font_size", 16)
	_hand_instruction_label.add_theme_color_override("font_color", Color(1, 0.85, 0.6, 0.6))
	_hand_instruction_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hand_instruction_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hint_container.add_child(_hand_instruction_label)


func update_max_heat(heat_value: float) -> void:
	# Track the highest target-zone heat reached during this attempt.
	_maximum_heat_reached = maxf(_maximum_heat_reached, heat_value)


func _process(delta_seconds: float) -> void:
	# Advance the level timer used for phased hint scheduling.
	_level_elapsed_time += delta_seconds

	# Do not schedule a new hint while one is already visible.
	if _hint_is_visible:
		return

	# Phase one: suggest tapping the fire if the player has not tapped after four seconds.
	if not _player_has_tapped and _level_elapsed_time > 4.0 and not _hints_already_shown.has("tap"):
		_show_ghost_hand("tap", ".", "Tap the fire", 0.35, 0.78)

	# Phase two: suggest holding near the fire after twelve seconds without a hold.
	elif _player_has_tapped and not _player_has_held and _level_elapsed_time > 12.0 and not _hints_already_shown.has("hold"):
		_show_ghost_hand("hold", ".", "Press and hold near the fire", 0.35, 0.73)

	# Phase three: suggest dragging from fire toward the dragon after twenty-two seconds.
	elif _player_has_tapped and not _player_has_dragged and _level_elapsed_time > 22.0 and not _hints_already_shown.has("drag"):
		_show_ghost_hand("drag", ".", "Drag from fire toward the dragon", 0.35, 0.68)

	# Phase four: suggest pinch spread if heat has not reached thirty after thirty seconds.
	elif (
		_player_has_tapped
		and _maximum_heat_reached < 30.0
		and _level_elapsed_time > 30.0
		and not _hints_already_shown.has("pinch")
	):
		_show_ghost_hand("pinch", ".", "Spread two fingers to intensify fire", 0.35, 0.6)


func notify_tap() -> void:
	# Record that the player has performed a tap gesture.
	_player_has_tapped = true
	# Hide the tap hint immediately if it is currently visible.
	if _current_hint_identifier == "tap":
		_hide_hint()


func notify_drag() -> void:
	# Record that the player has performed a drag gesture.
	_player_has_dragged = true
	# Hide the drag hint immediately if it is currently visible.
	if _current_hint_identifier == "drag":
		_hide_hint()


func notify_hold() -> void:
	# Record that the player has performed a hold gesture.
	_player_has_held = true
	# Hide the hold hint immediately if it is currently visible.
	if _current_hint_identifier == "hold":
		_hide_hint()


func notify_pinch() -> void:
	# Record that the player has performed a pinch or spread gesture.
	_player_has_pinched = true
	# Hide the pinch hint immediately if it is currently visible.
	if _current_hint_identifier == "pinch":
		_hide_hint()


func show_warning(warning_text: String) -> void:
	# Avoid interrupting an unrelated visible hint with a warning.
	if _hint_is_visible and not _current_hint_identifier.begins_with("warn"):
		return
	# Display the warning text in the center of the screen.
	_show_center_text("warn_" + warning_text, warning_text, Color(1, 0.3, 0.2, 0.9))
	await get_tree().create_timer(1.5).timeout
	# Hide the warning if it is still the active hint.
	if _current_hint_identifier.begins_with("warn"):
		_hide_hint()


func show_encouragement(encouragement_text: String) -> void:
	# Do not show encouragement over an existing unrelated hint.
	if _hint_is_visible:
		return
	# Display encouraging text when the player enters the target heat band.
	_show_center_text("encourage", encouragement_text, Color(1, 0.85, 0.4, 0.9))
	await get_tree().create_timer(2.0).timeout
	# Hide the encouragement message if it is still active.
	if _current_hint_identifier == "encourage":
		_hide_hint()


func _show_ghost_hand(
	hint_identifier: String,
	icon_text: String,
	instruction_text: String,
	horizontal_ratio: float,
	vertical_ratio: float
) -> void:
	# Mark this hint as shown so it is not repeated.
	_hints_already_shown[hint_identifier] = true
	_current_hint_identifier = hint_identifier
	_hint_is_visible = true

	# Position the hand icon using viewport-relative ratios.
	var viewport_size := get_viewport_rect().size
	_hand_icon_label.text = icon_text
	_hand_icon_label.position = Vector2(
		viewport_size.x * horizontal_ratio - 30,
		viewport_size.y * vertical_ratio - 30
	)
	_hand_icon_label.size = Vector2(60, 50)

	# Position the instruction text beneath the hand icon.
	_hand_instruction_label.text = instruction_text
	_hand_instruction_label.position = Vector2(
		viewport_size.x * horizontal_ratio - 80,
		viewport_size.y * vertical_ratio + 25
	)
	_hand_instruction_label.size = Vector2(160, 25)

	# Fade the hint container into view.
	_hint_container.visible = true
	_hint_container.modulate.a = 0
	var fade_in_tween := create_tween()
	fade_in_tween.tween_property(_hint_container, "modulate:a", 1.0, 0.5)

	# Auto-dismiss the hint after five seconds if the player does not act.
	await get_tree().create_timer(5.0).timeout
	if _current_hint_identifier == hint_identifier:
		_hide_hint()

	hint_shown.emit(hint_identifier)


func _show_center_text(hint_identifier: String, message_text: String, text_color: Color) -> void:
	# Track the active centered hint identifier.
	_current_hint_identifier = hint_identifier
	_hint_is_visible = true

	# Position a large centered message across the upper portion of the screen.
	var viewport_size := get_viewport_rect().size
	_hand_icon_label.text = ""
	_hand_instruction_label.text = message_text
	_hand_instruction_label.add_theme_color_override("font_color", text_color)
	_hand_instruction_label.add_theme_font_size_override("font_size", 22)
	_hand_instruction_label.position = Vector2(viewport_size.x * 0.2, viewport_size.y * 0.15)
	_hand_instruction_label.size = Vector2(viewport_size.x * 0.6, 35)

	# Fade the centered message into view.
	_hint_container.visible = true
	_hint_container.modulate.a = 0
	create_tween().tween_property(_hint_container, "modulate:a", 1.0, 0.3)


func _hide_hint() -> void:
	# Clear the visible hint state.
	_hint_is_visible = false
	_current_hint_identifier = ""
	# Restore the default instruction label styling.
	_hand_instruction_label.add_theme_font_size_override("font_size", 16)
	_hand_instruction_label.add_theme_color_override("font_color", Color(1, 0.85, 0.6, 0.6))
	# Fade the hint container out and hide it when finished.
	var fade_out_tween := create_tween()
	fade_out_tween.tween_property(_hint_container, "modulate:a", 0.0, 0.3)
	fade_out_tween.tween_callback(func(): _hint_container.visible = false)
