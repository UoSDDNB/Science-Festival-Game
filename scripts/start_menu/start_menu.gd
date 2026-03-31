extends Control

## Main start menu. "Levels" prominent at top-left aligned with background.

signal scene_requested(scene_path: String)

const LEVEL_SELECT_SCENE := "res://scenes/start_menu/level_select.tscn"


func _ready() -> void:
	var vbox := VBoxContainer.new()
	vbox.position = Vector2(70, 100)
	vbox.add_theme_constant_override("separation", 16)
	add_child(vbox)

	# Primary action
	var levels_btn := _make_button("Levels", true)
	levels_btn.pressed.connect(func(): scene_requested.emit(LEVEL_SELECT_SCENE))
	vbox.add_child(levels_btn)

	# Secondary options (greyed out)
	for label in ["Multiplayer", "Settings"]:
		var btn := _make_button(label, false)
		btn.disabled = true
		vbox.add_child(btn)


func _make_button(text: String, active: bool) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(200, 50)
	btn.add_theme_font_size_override("font_size", 22)

	if active:
		btn.add_theme_color_override("font_color", Color(0.7, 0.9, 1.0, 1.0))
		btn.add_theme_color_override("font_hover_color", Color(1.0, 1.0, 1.0, 1.0))
		var style := StyleBoxFlat.new()
		style.bg_color = Color(0.08, 0.12, 0.25, 0.4)
		style.border_color = Color(0.3, 0.55, 0.85, 0.6)
		style.set_border_width_all(1)
		style.set_corner_radius_all(3)
		btn.add_theme_stylebox_override("normal", style)
		var hover := StyleBoxFlat.new()
		hover.bg_color = Color(0.12, 0.2, 0.4, 0.6)
		hover.border_color = Color(0.4, 0.65, 0.95, 0.9)
		hover.set_border_width_all(2)
		hover.set_corner_radius_all(3)
		btn.add_theme_stylebox_override("hover", hover)
		btn.add_theme_stylebox_override("pressed", hover)
	else:
		btn.add_theme_color_override("font_color", Color(0.4, 0.45, 0.55, 0.5))
		var style := StyleBoxFlat.new()
		style.bg_color = Color(0.05, 0.06, 0.1, 0.2)
		style.border_color = Color(0.2, 0.25, 0.35, 0.2)
		style.set_border_width_all(1)
		style.set_corner_radius_all(3)
		btn.add_theme_stylebox_override("normal", style)
		btn.add_theme_stylebox_override("disabled", style)

	return btn
