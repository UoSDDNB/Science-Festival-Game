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
	# Read the viewport size for layout calculations.
	var viewport_size := get_viewport_rect().size

	# Fill the screen with a dark narrative background.
	var background_rect := ColorRect.new()
	background_rect.color = Color(0.015, 0.02, 0.045, 1)
	background_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background_rect)

	# Center the title, body text, and Awaken button vertically.
	var center_container := VBoxContainer.new()
	center_container.alignment = BoxContainer.ALIGNMENT_CENTER
	center_container.add_theme_constant_override("separation", 20)
	center_container.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	center_container.offset_left = -350
	center_container.offset_right = 350
	center_container.offset_top = -180
	center_container.offset_bottom = 180
	add_child(center_container)

	# Display the Norse location title.
	var title_label := Label.new()
	title_label.text = NORSE_TITLE
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.add_theme_font_size_override("font_size", 36)
	title_label.add_theme_color_override("font_color", Color(0.6, 0.8, 1, 0.8))
	center_container.add_child(title_label)

	# Add a subtle divider line beneath the title.
	var divider_rect := ColorRect.new()
	divider_rect.custom_minimum_size = Vector2(200, 1)
	divider_rect.color = Color(0.4, 0.55, 0.7, 0.3)
	var divider_container := CenterContainer.new()
	divider_container.add_child(divider_rect)
	center_container.add_child(divider_container)

	# Display the narrative body text with word wrapping.
	var body_label := Label.new()
	body_label.text = NORSE_TEXT
	body_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body_label.custom_minimum_size = Vector2(600, 0)
	body_label.add_theme_font_size_override("font_size", 18)
	body_label.add_theme_color_override("font_color", Color(0.7, 0.75, 0.85, 0.85))
	center_container.add_child(body_label)

	# Add vertical spacing before the begin button.
	var vertical_spacer := Control.new()
	vertical_spacer.custom_minimum_size = Vector2(0, 15)
	center_container.add_child(vertical_spacer)

	# Create the Awaken button that starts the level.
	var begin_button := Button.new()
	begin_button.text = "Awaken"
	begin_button.custom_minimum_size = Vector2(180, 48)
	begin_button.add_theme_font_size_override("font_size", 20)
	begin_button.add_theme_color_override("font_color", Color(0.9, 0.8, 0.6, 0.95))
	var normal_style_box := StyleBoxFlat.new()
	normal_style_box.bg_color = Color(0.12, 0.1, 0.06, 0.5)
	normal_style_box.border_color = Color(0.5, 0.4, 0.25, 0.6)
	normal_style_box.set_border_width_all(1)
	normal_style_box.set_corner_radius_all(4)
	begin_button.add_theme_stylebox_override("normal", normal_style_box)
	var hover_style_box := StyleBoxFlat.new()
	hover_style_box.bg_color = Color(0.2, 0.16, 0.08, 0.7)
	hover_style_box.border_color = Color(0.7, 0.55, 0.3, 0.8)
	hover_style_box.set_border_width_all(2)
	hover_style_box.set_corner_radius_all(4)
	begin_button.add_theme_stylebox_override("hover", hover_style_box)
	begin_button.add_theme_stylebox_override("pressed", hover_style_box)
	begin_button.pressed.connect(func(): scene_requested.emit(LEVEL_SCENE))
	var button_container := CenterContainer.new()
	button_container.add_child(begin_button)
	center_container.add_child(button_container)

	# Fade the narrative content in from transparent to fully visible.
	center_container.modulate.a = 0
	create_tween().tween_property(center_container, "modulate:a", 1.0, 1.2)
