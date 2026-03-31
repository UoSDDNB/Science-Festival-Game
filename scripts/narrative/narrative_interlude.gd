extends Control

## Clean, centered narrative interlude before the level.

signal scene_requested(scene_path: String)

const LEVEL_SCENE := "res://scenes/levels/norse_onboarding.tscn"

const NORSE_TITLE := "NIFLHEIM"
const NORSE_TEXT := """In the frozen heart of Niflheim, something stirs beneath the ice.

The primordial fire of Muspelheim answers your call.
Guide it carefully — too little and the ice reclaims its prize.
Too much and you may destroy what you seek to save."""


func _ready() -> void:
	var vp := get_viewport_rect().size

	# Dark background
	var bg := ColorRect.new()
	bg.color = Color(0.015, 0.02, 0.045, 1)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	# Centered container
	var center := VBoxContainer.new()
	center.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_theme_constant_override("separation", 20)
	center.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	center.offset_left = -350
	center.offset_right = 350
	center.offset_top = -180
	center.offset_bottom = 180
	add_child(center)

	# Title
	var title := Label.new()
	title.text = NORSE_TITLE
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 36)
	title.add_theme_color_override("font_color", Color(0.6, 0.8, 1, 0.8))
	center.add_child(title)

	# Divider line
	var divider := ColorRect.new()
	divider.custom_minimum_size = Vector2(200, 1)
	divider.color = Color(0.4, 0.55, 0.7, 0.3)
	var div_container := CenterContainer.new()
	div_container.add_child(divider)
	center.add_child(div_container)

	# Body text
	var body := Label.new()
	body.text = NORSE_TEXT
	body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.custom_minimum_size = Vector2(600, 0)
	body.add_theme_font_size_override("font_size", 18)
	body.add_theme_color_override("font_color", Color(0.7, 0.75, 0.85, 0.85))
	center.add_child(body)

	# Spacer
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 15)
	center.add_child(spacer)

	# Begin button
	var btn := Button.new()
	btn.text = "Awaken"
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
	btn.pressed.connect(func(): scene_requested.emit(LEVEL_SCENE))
	var btn_container := CenterContainer.new()
	btn_container.add_child(btn)
	center.add_child(btn_container)

	# Fade in
	center.modulate.a = 0
	create_tween().tween_property(center, "modulate:a", 1.0, 1.2)
