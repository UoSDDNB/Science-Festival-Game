class_name InputHandler
extends Node

## Touch gesture recognition for the game.
## Handles both touch events (phone/tablet) and mouse events (desktop/laptop browser).
## Recognizes tap, hold, and drag gestures. Multi-touch ready for future pinch/spread.

signal tap_detected(position: Vector2, zone_id: int)
signal hold_started(position: Vector2, zone_id: int)
signal hold_tick(position: Vector2, zone_id: int)
signal hold_ended(position: Vector2)
signal drag_started(position: Vector2)
signal drag_moved(position: Vector2, zone_id: int)
signal drag_ended(position: Vector2)

@export var hold_threshold: float = 0.4
@export var drag_threshold: float = 20.0

enum GestureState { IDLE, TOUCH_DOWN, DRAGGING, HOLDING }

var _gesture_state: GestureState = GestureState.IDLE
var _touch_start_position: Vector2 = Vector2.ZERO
var _touch_start_time_seconds: float = 0.0
var _current_touch_position: Vector2 = Vector2.ZERO
var _active_touch_index: int = -1

# Zone detection callback — set by the level script.
var zone_at_position: Callable = Callable()


func _unhandled_input(input_event: InputEvent) -> void:
	# Route screen touch events through the touch handler.
	if input_event is InputEventScreenTouch:
		_handle_touch(input_event as InputEventScreenTouch)
	# Route screen drag events through the drag handler.
	elif input_event is InputEventScreenDrag:
		_handle_drag(input_event as InputEventScreenDrag)
	# Route left mouse button events through the mouse button handler.
	elif input_event is InputEventMouseButton:
		var mouse_button_event := input_event as InputEventMouseButton
		if mouse_button_event.button_index == MOUSE_BUTTON_LEFT:
			_handle_mouse_button(mouse_button_event)
	# Route mouse motion while a gesture is active.
	elif input_event is InputEventMouseMotion:
		if _gesture_state != GestureState.IDLE:
			_handle_mouse_motion(input_event as InputEventMouseMotion)


func _process(_delta_seconds: float) -> void:
	# Promote a touch-down into a hold after the hold threshold elapses.
	if _gesture_state == GestureState.TOUCH_DOWN:
		var elapsed_seconds := Time.get_ticks_msec() / 1000.0 - _touch_start_time_seconds
		if elapsed_seconds >= hold_threshold:
			_gesture_state = GestureState.HOLDING
			var zone_identifier := _detect_zone(_current_touch_position)
			hold_started.emit(_current_touch_position, zone_identifier)

	# Emit hold tick events every frame while holding.
	elif _gesture_state == GestureState.HOLDING:
		var zone_identifier := _detect_zone(_current_touch_position)
		hold_tick.emit(_current_touch_position, zone_identifier)


func _handle_touch(touch_event: InputEventScreenTouch) -> void:
	if touch_event.pressed:
		# Ignore additional touches while a gesture is already active.
		if _gesture_state != GestureState.IDLE:
			return
		_active_touch_index = touch_event.index
		_touch_start_position = touch_event.position
		_touch_start_time_seconds = Time.get_ticks_msec() / 1000.0
		_current_touch_position = touch_event.position
		_gesture_state = GestureState.TOUCH_DOWN
	else:
		# Ignore release events from other touch indices.
		if touch_event.index != _active_touch_index:
			return
		_release()


func _handle_drag(drag_event: InputEventScreenDrag) -> void:
	# Ignore drags from other touch indices.
	if drag_event.index != _active_touch_index:
		return
	_current_touch_position = drag_event.position
	_check_drag(drag_event.position)


func _handle_mouse_button(mouse_button_event: InputEventMouseButton) -> void:
	if mouse_button_event.pressed:
		# Ignore additional presses while a gesture is already active.
		if _gesture_state != GestureState.IDLE:
			return
		_active_touch_index = 0
		_touch_start_position = mouse_button_event.position
		_touch_start_time_seconds = Time.get_ticks_msec() / 1000.0
		_current_touch_position = mouse_button_event.position
		_gesture_state = GestureState.TOUCH_DOWN
	else:
		_release()


func _handle_mouse_motion(mouse_motion_event: InputEventMouseMotion) -> void:
	_current_touch_position = mouse_motion_event.position
	_check_drag(mouse_motion_event.position)


func _check_drag(current_position: Vector2) -> void:
	# Promote touch-down to dragging once movement exceeds the drag threshold.
	if _gesture_state == GestureState.TOUCH_DOWN:
		var movement_distance := _touch_start_position.distance_to(current_position)
		if movement_distance > drag_threshold:
			_gesture_state = GestureState.DRAGGING
			drag_started.emit(_touch_start_position)

	# Emit drag movement events while dragging.
	if _gesture_state == GestureState.DRAGGING:
		var zone_identifier := _detect_zone(current_position)
		drag_moved.emit(current_position, zone_identifier)


func _release() -> void:
	# Emit the gesture that completed when the touch or mouse button was released.
	match _gesture_state:
		GestureState.TOUCH_DOWN:
			var zone_identifier := _detect_zone(_touch_start_position)
			tap_detected.emit(_touch_start_position, zone_identifier)
		GestureState.HOLDING:
			hold_ended.emit(_current_touch_position)
		GestureState.DRAGGING:
			drag_ended.emit(_current_touch_position)
	_reset()


func _detect_zone(screen_position: Vector2) -> int:
	# Ask the level-provided callable which zone contains the position.
	if zone_at_position.is_valid():
		return zone_at_position.call(screen_position)
	return -1


func _reset() -> void:
	# Return the gesture state machine to its idle starting state.
	_gesture_state = GestureState.IDLE
	_active_touch_index = -1
	_touch_start_position = Vector2.ZERO
	_current_touch_position = Vector2.ZERO
