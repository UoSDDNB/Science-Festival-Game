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

@export var hold_threshold: float = 0.4  # seconds before tap becomes hold
@export var drag_threshold: float = 20.0  # pixels before touch becomes drag

enum GestureState { IDLE, TOUCH_DOWN, DRAGGING, HOLDING }

var _state: GestureState = GestureState.IDLE
var _touch_start_pos: Vector2 = Vector2.ZERO
var _touch_start_time: float = 0.0
var _current_pos: Vector2 = Vector2.ZERO
var _touch_index: int = -1

# Zone detection callback — set by the level
var zone_at_position: Callable = Callable()


func _unhandled_input(event: InputEvent) -> void:
	# Handle touch events
	if event is InputEventScreenTouch:
		_handle_touch(event as InputEventScreenTouch)
	elif event is InputEventScreenDrag:
		_handle_drag(event as InputEventScreenDrag)
	# Handle mouse events (desktop browser fallback)
	elif event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT:
			_handle_mouse_button(mb)
	elif event is InputEventMouseMotion:
		if _state != GestureState.IDLE:
			_handle_mouse_motion(event as InputEventMouseMotion)


func _process(_delta: float) -> void:
	if _state == GestureState.TOUCH_DOWN:
		var elapsed := Time.get_ticks_msec() / 1000.0 - _touch_start_time
		if elapsed >= hold_threshold:
			_state = GestureState.HOLDING
			var zone_id := _detect_zone(_current_pos)
			hold_started.emit(_current_pos, zone_id)

	elif _state == GestureState.HOLDING:
		var zone_id := _detect_zone(_current_pos)
		hold_tick.emit(_current_pos, zone_id)


func _handle_touch(event: InputEventScreenTouch) -> void:
	if event.pressed:
		if _state != GestureState.IDLE:
			return
		_touch_index = event.index
		_touch_start_pos = event.position
		_touch_start_time = Time.get_ticks_msec() / 1000.0
		_current_pos = event.position
		_state = GestureState.TOUCH_DOWN
	else:
		if event.index != _touch_index:
			return
		_release()


func _handle_drag(event: InputEventScreenDrag) -> void:
	if event.index != _touch_index:
		return
	_current_pos = event.position
	_check_drag(event.position)


func _handle_mouse_button(event: InputEventMouseButton) -> void:
	if event.pressed:
		if _state != GestureState.IDLE:
			return
		_touch_index = 0
		_touch_start_pos = event.position
		_touch_start_time = Time.get_ticks_msec() / 1000.0
		_current_pos = event.position
		_state = GestureState.TOUCH_DOWN
	else:
		_release()


func _handle_mouse_motion(event: InputEventMouseMotion) -> void:
	_current_pos = event.position
	_check_drag(event.position)


func _check_drag(pos: Vector2) -> void:
	if _state == GestureState.TOUCH_DOWN:
		var distance := _touch_start_pos.distance_to(pos)
		if distance > drag_threshold:
			_state = GestureState.DRAGGING
			drag_started.emit(_touch_start_pos)

	if _state == GestureState.DRAGGING:
		var zone_id := _detect_zone(pos)
		drag_moved.emit(pos, zone_id)


func _release() -> void:
	match _state:
		GestureState.TOUCH_DOWN:
			var zone_id := _detect_zone(_touch_start_pos)
			tap_detected.emit(_touch_start_pos, zone_id)
		GestureState.HOLDING:
			hold_ended.emit(_current_pos)
		GestureState.DRAGGING:
			drag_ended.emit(_current_pos)
	_reset()


func _detect_zone(pos: Vector2) -> int:
	if zone_at_position.is_valid():
		return zone_at_position.call(pos)
	return -1


func _reset() -> void:
	_state = GestureState.IDLE
	_touch_index = -1
	_touch_start_pos = Vector2.ZERO
	_current_pos = Vector2.ZERO
