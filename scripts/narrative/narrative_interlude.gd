extends Control

## Clean, centered narrative interlude before the level.
## Panel width and fonts scale with the viewport so phones do not clip text.

signal scene_requested(scene_path: String)

const LEVEL_SCENE := "res://scenes/levels/norse_onboarding.tscn"

const NORSE_TITLE := "NIFLHEIM"
const NORSE_TEXT := """In the frozen heart of Niflheim, something stirs beneath the ice.

The primordial fire of Muspelheim answers your call.
Guide it carefully — too little and the ice reclaims its prize.
Too much and you may destroy what you seek to save."""

var _center_container: VBoxContainer
var _title_label: Label
var _divider_rect: ColorRect
var _body_label: Label
var _vertical_spacer: Control
var _begin_button: Button


func _ready() -> void:
	# Rebuild layout when the browser window or phone orientation changes.
	get_viewport().size_changed.connect(_apply_responsive_layout)

	# Fill the screen with a dark narrative background.
	var background_rect := ColorRect.new()
	background_rect.color = Color(0.015, 0.02, 0.045, 1)
	background_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background_rect)

	# Center the title, body text, and Awaken button vertically.
	_center_container = VBoxContainer.new()
	_center_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_center_container.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	add_child(_center_container)

	# Display the Norse location title.
	_title_label = Label.new()
	_title_label.text = NORSE_TITLE
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.add_theme_color_override("font_color", Color(0.6, 0.8, 1, 0.8))
	_center_container.add_child(_title_label)

	# Add a subtle divider line beneath the title.
	_divider_rect = ColorRect.new()
	_divider_rect.color = Color(0.4, 0.55, 0.7, 0.3)
	var divider_container := CenterContainer.new()
	divider_container.add_child(_divider_rect)
	_center_container.add_child(divider_container)

	# Display the narrative body text with word wrapping.
	_body_label = Label.new()
	_body_label.text = NORSE_TEXT
	_body_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_body_label.add_theme_color_override("font_color", Color(0.7, 0.75, 0.85, 0.85))
	_center_container.add_child(_body_label)

	# Add vertical spacing before the begin button.
	_vertical_spacer = Control.new()
	_center_container.add_child(_vertical_spacer)

	# Create the Awaken button that starts the level.
	_begin_button = Button.new()
	_begin_button.text = "Awaken"
	_begin_button.add_theme_color_override("font_color", Color(0.9, 0.8, 0.6, 0.95))
	var normal_style_box := StyleBoxFlat.new()
	normal_style_box.bg_color = Color(0.12, 0.1, 0.06, 0.5)
	normal_style_box.border_color = Color(0.5, 0.4, 0.25, 0.6)
	normal_style_box.set_border_width_all(1)
	normal_style_box.set_corner_radius_all(4)
	_begin_button.add_theme_stylebox_override("normal", normal_style_box)
	var hover_style_box := StyleBoxFlat.new()
	hover_style_box.bg_color = Color(0.2, 0.16, 0.08, 0.7)
	hover_style_box.border_color = Color(0.7, 0.55, 0.3, 0.8)
	hover_style_box.set_border_width_all(2)
	hover_style_box.set_corner_radius_all(4)
	_begin_button.add_theme_stylebox_override("hover", hover_style_box)
	_begin_button.add_theme_stylebox_override("pressed", hover_style_box)
	_begin_button.pressed.connect(func(): scene_requested.emit(LEVEL_SCENE))
	var button_container := CenterContainer.new()
	button_container.add_child(_begin_button)
	_center_container.add_child(button_container)

	# Apply sizes for the current viewport before fading in.
	_apply_responsive_layout()

	# Fade the narrative content in from transparent to fully visible.
	_center_container.modulate.a = 0
	create_tween().tween_property(_center_container, "modulate:a", 1.0, 1.2)


func _apply_responsive_layout() -> void:
	# Read the live viewport size.
	var viewport_size := ResponsiveLayout.get_viewport_size(self)
	# Panel width stays under 700px on large screens and 85% on phones.
	var panel_width := ResponsiveLayout.content_width(viewport_size, 0.85, 700.0)
	var panel_half_width := panel_width * 0.5
	# Panel half-height grows enough for wrapped text on tall phones.
	var panel_half_height := ResponsiveLayout.vertical_margin(viewport_size, 0.22)
	ResponsiveLayout.apply_centered_panel_offsets(
		_center_container,
		panel_half_width,
		panel_half_height
	)

	# Scale spacing, fonts, and button sizes from viewport height.
	var content_separation := int(
		ResponsiveLayout.scale_dimension(viewport_size, 20.0, 12.0, 28.0)
	)
	_center_container.add_theme_constant_override("separation", content_separation)
	_title_label.add_theme_font_size_override(
		"font_size",
		ResponsiveLayout.scale_font_size(viewport_size, 36.0, 22.0, 40.0)
	)
	_divider_rect.custom_minimum_size = Vector2(
		ResponsiveLayout.scale_dimension(viewport_size, 200.0, 120.0, 240.0),
		1
	)
	_body_label.custom_minimum_size = Vector2(panel_width * 0.92, 0)
	_body_label.add_theme_font_size_override(
		"font_size",
		ResponsiveLayout.scale_font_size(viewport_size, 18.0, 13.0, 22.0)
	)
	_vertical_spacer.custom_minimum_size = Vector2(
		0,
		ResponsiveLayout.scale_dimension(viewport_size, 15.0, 8.0, 20.0)
	)
	_begin_button.custom_minimum_size = Vector2(
		ResponsiveLayout.scale_dimension(viewport_size, 180.0, 140.0, 220.0),
		ResponsiveLayout.scale_dimension(viewport_size, 48.0, 40.0, 56.0)
	)
	_begin_button.add_theme_font_size_override(
		"font_size",
		ResponsiveLayout.scale_font_size(viewport_size, 20.0, 15.0, 24.0)
	)
