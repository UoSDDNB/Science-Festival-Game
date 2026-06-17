extends Control

## Level selection — theme cards over the three-alcove background.
## Robust positioning that works on both landscape and portrait viewports.

signal scene_requested(scene_path: String)

const NARRATIVE_SCENE := "res://scenes/narrative/narrative_interlude.tscn"
const MENU_SCENE := "res://scenes/start_menu/start_menu.tscn"

var themes := [
	{"name": "Fire Meets Ice", "scene": NARRATIVE_SCENE, "unlocked": true, "color": Color(1, 0.5, 0.15)},
	{"name": "Ice Age", "scene": "", "unlocked": false, "color": Color(0.4, 0.8, 1)},
	{"name": "Enchanted", "scene": "", "unlocked": false, "color": Color(0.7, 0.4, 1)},
]


func _ready() -> void:
	# Add a back button that returns to the main start menu.
	var back_button := _make_button("< Back", Color(0.6, 0.8, 1, 0.8))
	back_button.position = Vector2(20, 15)
	back_button.custom_minimum_size = Vector2(100, 36)
	back_button.add_theme_font_size_override("font_size", 15)
	back_button.pressed.connect(func(): scene_requested.emit(MENU_SCENE))
	add_child(back_button)

	# Display the level selection title across the top of the screen.
	var title_label := Label.new()
	title_label.text = "SELECT LEVEL"
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.add_theme_font_size_override("font_size", 28)
	title_label.add_theme_color_override("font_color", Color(0.75, 0.88, 1, 0.9))
	title_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	title_label.offset_top = 18
	title_label.offset_bottom = 55
	add_child(title_label)

	# Lay out the theme cards in a centered horizontal row.
	var card_row := HBoxContainer.new()
	card_row.alignment = BoxContainer.ALIGNMENT_CENTER
	card_row.add_theme_constant_override("separation", 30)
	card_row.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	card_row.offset_left = -480
	card_row.offset_right = 480
	card_row.offset_top = -120
	card_row.offset_bottom = 160
	add_child(card_row)

	# Build one card panel for each theme entry.
	for theme_entry in themes:
		var theme_card := _build_card(theme_entry)
		card_row.add_child(theme_card)


func _build_card(theme_entry: Dictionary) -> PanelContainer:
	# Create the outer card panel with a fixed minimum size.
	var card_panel := PanelContainer.new()
	card_panel.custom_minimum_size = Vector2(240, 260)
	var theme_color: Color = theme_entry["color"]

	# Style the card background based on whether the theme is unlocked.
	var panel_style_box := StyleBoxFlat.new()
	if theme_entry["unlocked"]:
		panel_style_box.bg_color = Color(
			theme_color.r * 0.12, theme_color.g * 0.12, theme_color.b * 0.1, 0.55
		)
		panel_style_box.border_color = Color(
			theme_color.r * 0.5, theme_color.g * 0.5, theme_color.b * 0.4, 0.6
		)
	else:
		panel_style_box.bg_color = Color(0.06, 0.06, 0.1, 0.45)
		panel_style_box.border_color = Color(0.25, 0.25, 0.3, 0.3)
	panel_style_box.set_border_width_all(2)
	panel_style_box.set_corner_radius_all(8)
	card_panel.add_theme_stylebox_override("panel", panel_style_box)

	# Stack the icon, name, and action button vertically inside the card.
	var card_content := VBoxContainer.new()
	card_content.add_theme_constant_override("separation", 8)
	card_panel.add_child(card_content)

	# Reserve space at the top of the card for the theme icon label.
	var icon_area := CenterContainer.new()
	icon_area.custom_minimum_size = Vector2(0, 120)
	card_content.add_child(icon_area)

	# Choose a short icon word based on the theme name.
	var icon_label := Label.new()
	if theme_entry["name"] == "Fire Meets Ice":
		icon_label.text = "FIRE"
	elif theme_entry["name"] == "Ice Age":
		icon_label.text = "ICE"
	else:
		icon_label.text = "MAGIC"
	icon_label.add_theme_font_size_override("font_size", 28)
	if theme_entry["unlocked"]:
		icon_label.add_theme_color_override("font_color", theme_color)
	else:
		icon_label.add_theme_color_override("font_color", Color(0.4, 0.4, 0.45, 0.4))
	icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon_area.add_child(icon_label)

	# Display the full theme name beneath the icon.
	var name_label := Label.new()
	name_label.text = theme_entry["name"] as String
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", 19)
	if theme_entry["unlocked"]:
		name_label.add_theme_color_override("font_color", theme_color)
	else:
		name_label.add_theme_color_override("font_color", Color(0.45, 0.45, 0.5, 0.5))
	card_content.add_child(name_label)

	# Show a PLAY button for unlocked themes or a Coming Soon label otherwise.
	if theme_entry["unlocked"]:
		var play_button := _make_button("PLAY", Color(1, 0.95, 0.85))
		play_button.custom_minimum_size = Vector2(0, 42)
		play_button.add_theme_font_size_override("font_size", 18)
		var destination_scene_path: String = theme_entry["scene"]
		play_button.pressed.connect(func(): scene_requested.emit(destination_scene_path))
		card_content.add_child(play_button)
	else:
		var locked_label := Label.new()
		locked_label.text = "Coming Soon"
		locked_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		locked_label.add_theme_font_size_override("font_size", 14)
		locked_label.add_theme_color_override("font_color", Color(0.4, 0.4, 0.45, 0.4))
		locked_label.custom_minimum_size = Vector2(0, 42)
		card_content.add_child(locked_label)

	return card_panel


func _make_button(button_text: String, font_color: Color) -> Button:
	# Create a navigation button with a shared flat style.
	var button_node := Button.new()
	button_node.text = button_text
	button_node.add_theme_color_override("font_color", font_color)
	var normal_style_box := StyleBoxFlat.new()
	normal_style_box.bg_color = Color(0.08, 0.1, 0.2, 0.5)
	normal_style_box.border_color = Color(0.3, 0.45, 0.7, 0.5)
	normal_style_box.set_border_width_all(1)
	normal_style_box.set_corner_radius_all(4)
	button_node.add_theme_stylebox_override("normal", normal_style_box)
	var hover_style_box := StyleBoxFlat.new()
	hover_style_box.bg_color = Color(0.12, 0.18, 0.35, 0.7)
	hover_style_box.border_color = Color(0.4, 0.6, 0.9, 0.8)
	hover_style_box.set_border_width_all(2)
	hover_style_box.set_corner_radius_all(4)
	button_node.add_theme_stylebox_override("hover", hover_style_box)
	button_node.add_theme_stylebox_override("pressed", hover_style_box)
	return button_node
