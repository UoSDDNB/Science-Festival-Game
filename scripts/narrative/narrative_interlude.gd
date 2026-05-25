extends Control

## Data-driven narrative interlude before each level.
## Set `level_scene`, `title_text`, `body_text`, and `button_text` before adding to tree,
## or use the defaults (Norse).

signal scene_requested(scene_path: String)

var level_scene: String = "res://scenes/levels/norse_level.tscn"
var title_text: String = "NIFLHEIM"
var body_text: String = """In the frozen heart of Niflheim, something stirs beneath the ice.

The primordial fire of Muspelheim answers your call.
Guide it carefully — too little and the ice reclaims its prize.
Too much and you may destroy what you seek to save."""
var button_text: String = "Awaken"
var title_color: Color = Color(0.6, 0.8, 1, 0.8)


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color(0.015, 0.02, 0.045, 1)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var center := VBoxContainer.new()
	center.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_theme_constant_override("separation", 20)
	center.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	center.offset_left = -350
	center.offset_right = 350
	center.offset_top = -180
	center.offset_bottom = 180
	add_child(center)

	var title := Label.new()
	title.text = title_text
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 36)
	title.add_theme_color_override("font_color", title_color)
	center.add_child(title)

	var divider := ColorRect.new()
	divider.custom_minimum_size = Vector2(200, 1)
	divider.color = Color(0.4, 0.55, 0.7, 0.3)
	var div_container := CenterContainer.new()
	div_container.add_child(divider)
	center.add_child(div_container)

	var body := Label.new()
	body.text = body_text
	body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.custom_minimum_size = Vector2(600, 0)
	body.add_theme_font_size_override("font_size", 18)
	body.add_theme_color_override("font_color", Color(0.7, 0.75, 0.85, 0.85))
	center.add_child(body)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 15)
	center.add_child(spacer)

	var btn := Button.new()
	btn.text = button_text
	btn.custom_minimum_size = Vector2(180, 48)
	btn.add_theme_font_size_override("font_size", 20)
	btn.add_theme_color_override("font_color", Color(0.9, 0.8, 0.6, 0.95))
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.12, 0.1, 0.06, 0.5)
	style.border_color = Color(0.5, 0.4, 0.25, 0.6)
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	btn.add_theme_stylebox_override("normal", style)
	var hover := StyleBoxFlat.new()
	hover.bg_color = Color(0.2, 0.16, 0.08, 0.7)
	hover.border_color = Color(0.7, 0.55, 0.3, 0.8)
	hover.set_border_width_all(2)
	hover.set_corner_radius_all(4)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", hover)
	btn.pressed.connect(func(): scene_requested.emit(level_scene))
	var btn_container := CenterContainer.new()
	btn_container.add_child(btn)
	center.add_child(btn_container)

	center.modulate.a = 0
	create_tween().tween_property(center, "modulate:a", 1.0, 1.2)
