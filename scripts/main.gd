extends Node

## Main scene manager. Handles transitions between menu, narrative, and game level.

@onready var current_scene_container: Node = $CurrentScene
@onready var fade_overlay: CanvasLayer = $FadeLayer
@onready var fade_rect: ColorRect = $FadeLayer/FadeRect

var _current_scene: Node = null

const FADE_DURATION := 0.4


func _ready() -> void:
	# Start with a fully opaque black fade overlay.
	fade_rect.color = Color(0, 0, 0, 1)
	# Load the start menu as the first visible scene.
	_load_scene("res://scenes/start_menu/start_menu.tscn")
	# Fade the overlay out after the first scene is ready.
	var fade_in_tween := create_tween()
	fade_in_tween.tween_property(fade_rect, "color:a", 0.0, FADE_DURATION)


func transition_to(scene_path: String) -> void:
	# Fade the screen to black before swapping scenes.
	var fade_out_tween := create_tween()
	fade_out_tween.tween_property(fade_rect, "color:a", 1.0, FADE_DURATION)
	await fade_out_tween.finished
	# Replace the current child scene with the requested scene.
	_load_scene(scene_path)
	# Fade back in after the new scene is loaded.
	var fade_in_tween := create_tween()
	fade_in_tween.tween_property(fade_rect, "color:a", 0.0, FADE_DURATION)


func _load_scene(scene_path: String) -> void:
	# Remove the previous scene if one is still loaded.
	if _current_scene:
		_current_scene.queue_free()
		_current_scene = null

	# Load the packed scene resource from disk.
	var scene_resource := load(scene_path) as PackedScene
	if not scene_resource:
		push_error("Failed to load scene: %s" % scene_path)
		return

	# Instantiate the scene and attach it under the scene container.
	_current_scene = scene_resource.instantiate()
	current_scene_container.add_child(_current_scene)

	# Connect navigation signals from child scenes that support scene changes.
	if _current_scene.has_signal("scene_requested"):
		_current_scene.scene_requested.connect(_on_scene_requested)


func _on_scene_requested(scene_path: String) -> void:
	# Forward child scene navigation requests through the fade transition.
	transition_to(scene_path)
