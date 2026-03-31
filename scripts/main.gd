extends Node

## Main scene manager. Handles transitions between menu, narrative, and game level.

@onready var current_scene_container: Node = $CurrentScene
@onready var fade_overlay: CanvasLayer = $FadeLayer
@onready var fade_rect: ColorRect = $FadeLayer/FadeRect

var _current_scene: Node = null

const FADE_DURATION := 0.4


func _ready() -> void:
	fade_rect.color = Color(0, 0, 0, 1)
	_load_scene("res://scenes/start_menu/start_menu.tscn")
	# Fade in after first scene loads
	var tween := create_tween()
	tween.tween_property(fade_rect, "color:a", 0.0, FADE_DURATION)


func transition_to(scene_path: String) -> void:
	var tween := create_tween()
	tween.tween_property(fade_rect, "color:a", 1.0, FADE_DURATION)
	await tween.finished
	_load_scene(scene_path)
	var tween_in := create_tween()
	tween_in.tween_property(fade_rect, "color:a", 0.0, FADE_DURATION)


func _load_scene(scene_path: String) -> void:
	if _current_scene:
		_current_scene.queue_free()
		_current_scene = null

	var scene_resource := load(scene_path) as PackedScene
	if not scene_resource:
		push_error("Failed to load scene: %s" % scene_path)
		return

	_current_scene = scene_resource.instantiate()
	current_scene_container.add_child(_current_scene)

	# Connect scene signals for navigation
	if _current_scene.has_signal("scene_requested"):
		_current_scene.scene_requested.connect(_on_scene_requested)


func _on_scene_requested(scene_path: String) -> void:
	transition_to(scene_path)
