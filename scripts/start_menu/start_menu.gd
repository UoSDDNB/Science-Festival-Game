extends Control

## Main start menu. "Levels" prominent at top-left aligned with background.

signal scene_requested(scene_path: String)

const LEVEL_SELECT_SCENE := "res://scenes/start_menu/level_select.tscn"


func _ready() -> void:
	# Create the vertical button stack for the main menu.
	var button_container := VBoxContainer.new()
	button_container.position = Vector2(70, 100)
	button_container.add_theme_constant_override("separation", 16)
	add_child(button_container)

	# Add the primary Levels button that opens level selection.
	var levels_button := _make_button("Levels", true)
	levels_button.pressed.connect(func(): scene_requested.emit(LEVEL_SELECT_SCENE))
	button_container.add_child(levels_button)

	# Add disabled placeholder buttons for future menu options.
	for menu_label in ["Multiplayer", "Settings"]:
		var disabled_button := _make_button(menu_label, false)
		disabled_button.disabled = true
		button_container.add_child(disabled_button)


func _make_button(button_text: String, is_active: bool) -> Button:
	# Create a button with shared sizing and font settings.
	var button_node := Button.new()
	button_node.text = button_text
	button_node.custom_minimum_size = Vector2(200, 50)
	button_node.add_theme_font_size_override("font_size", 22)

	if is_active:
		# Style the active Levels button with bright text and borders.
		button_node.add_theme_color_override("font_color", Color(0.7, 0.9, 1.0, 1.0))
		button_node.add_theme_color_override("font_hover_color", Color(1.0, 1.0, 1.0, 1.0))
		var normal_style_box := StyleBoxFlat.new()
		normal_style_box.bg_color = Color(0.08, 0.12, 0.25, 0.4)
		normal_style_box.border_color = Color(0.3, 0.55, 0.85, 0.6)
		normal_style_box.set_border_width_all(1)
		normal_style_box.set_corner_radius_all(3)
		button_node.add_theme_stylebox_override("normal", normal_style_box)
		var hover_style_box := StyleBoxFlat.new()
		hover_style_box.bg_color = Color(0.12, 0.2, 0.4, 0.6)
		hover_style_box.border_color = Color(0.4, 0.65, 0.95, 0.9)
		hover_style_box.set_border_width_all(2)
		hover_style_box.set_corner_radius_all(3)
		button_node.add_theme_stylebox_override("hover", hover_style_box)
		button_node.add_theme_stylebox_override("pressed", hover_style_box)
	else:
		# Style inactive buttons as greyed-out placeholders.
		button_node.add_theme_color_override("font_color", Color(0.4, 0.45, 0.55, 0.5))
		var disabled_style_box := StyleBoxFlat.new()
		disabled_style_box.bg_color = Color(0.05, 0.06, 0.1, 0.2)
		disabled_style_box.border_color = Color(0.2, 0.25, 0.35, 0.2)
		disabled_style_box.set_border_width_all(1)
		disabled_style_box.set_corner_radius_all(3)
		button_node.add_theme_stylebox_override("normal", disabled_style_box)
		button_node.add_theme_stylebox_override("disabled", disabled_style_box)

	return button_node
