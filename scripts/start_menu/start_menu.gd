extends Control

## Main start menu. "Levels" prominent at top-left aligned with background.
## Layout uses viewport fractions so buttons stay visible on phones and laptops.

signal scene_requested(scene_path: String)

const LEVEL_SELECT_SCENE := "res://scenes/start_menu/level_select.tscn"

var _button_container: VBoxContainer
var _menu_buttons: Array[Button] = []


func _ready() -> void:
	# Rebuild the menu whenever the browser window or phone orientation changes.
	get_viewport().size_changed.connect(_apply_responsive_layout)

	# Create the vertical button stack for the main menu.
	_button_container = VBoxContainer.new()
	_button_container.add_theme_constant_override("separation", 16)
	add_child(_button_container)

	# Add the primary Levels button that opens level selection.
	var levels_button := _make_button("Levels", true)
	levels_button.pressed.connect(func(): scene_requested.emit(LEVEL_SELECT_SCENE))
	_button_container.add_child(levels_button)
	_menu_buttons.append(levels_button)

	# Add disabled placeholder buttons for future menu options.
	for menu_label in ["Multiplayer", "Settings"]:
		var disabled_button := _make_button(menu_label, false)
		disabled_button.disabled = true
		_button_container.add_child(disabled_button)
		_menu_buttons.append(disabled_button)

	# Place and size everything for the current viewport.
	_apply_responsive_layout()


func _apply_responsive_layout() -> void:
	# Read the live viewport size from the shared helper.
	var viewport_size := ResponsiveLayout.get_viewport_size(self)
	# Keep a left margin of about 3.6% of width (matches ~70px at 1920).
	var left_margin := ResponsiveLayout.horizontal_margin(viewport_size, 0.036)
	# Keep a top margin of about 9% of height (matches ~100px at 1080).
	var top_margin := ResponsiveLayout.vertical_margin(viewport_size, 0.093)
	# Position the button stack with those margins.
	_button_container.position = Vector2(left_margin, top_margin)
	# Scale vertical spacing between menu buttons.
	var button_separation := int(
		ResponsiveLayout.scale_dimension(viewport_size, 16.0, 8.0, 24.0)
	)
	_button_container.add_theme_constant_override("separation", button_separation)

	# Scale each button's size and font from the viewport height.
	var button_width := ResponsiveLayout.scale_dimension(viewport_size, 200.0, 140.0, 260.0)
	var button_height := ResponsiveLayout.scale_dimension(viewport_size, 50.0, 40.0, 64.0)
	var button_font_size := ResponsiveLayout.scale_font_size(viewport_size, 22.0, 16.0, 28.0)
	for menu_button in _menu_buttons:
		menu_button.custom_minimum_size = Vector2(button_width, button_height)
		menu_button.add_theme_font_size_override("font_size", button_font_size)


func _make_button(button_text: String, is_active: bool) -> Button:
	# Create a button with shared styling; size is applied later by layout.
	var button_node := Button.new()
	button_node.text = button_text

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
