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
	# Back button
	var back_btn := _make_button("< Back", Color(0.6, 0.8, 1, 0.8))
	back_btn.position = Vector2(20, 15)
	back_btn.custom_minimum_size = Vector2(100, 36)
	back_btn.add_theme_font_size_override("font_size", 15)
	back_btn.pressed.connect(func(): scene_requested.emit(MENU_SCENE))
	add_child(back_btn)

	# Title
	var title := Label.new()
	title.text = "SELECT LEVEL"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", Color(0.75, 0.88, 1, 0.9))
	title.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	title.offset_top = 18
	title.offset_bottom = 55
	add_child(title)

	# Cards container — centered, responsive
	var hbox := HBoxContainer.new()
	hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	hbox.add_theme_constant_override("separation", 30)
	hbox.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	hbox.offset_left = -480
	hbox.offset_right = 480
	hbox.offset_top = -120
	hbox.offset_bottom = 160
	add_child(hbox)

	for theme in themes:
		var card := _build_card(theme)
		hbox.add_child(card)


func _build_card(theme: Dictionary) -> PanelContainer:
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(240, 260)
	var theme_color: Color = theme["color"]

	# Card background
	var style := StyleBoxFlat.new()
	if theme["unlocked"]:
		style.bg_color = Color(theme_color.r * 0.12, theme_color.g * 0.12, theme_color.b * 0.1, 0.55)
		style.border_color = Color(theme_color.r * 0.5, theme_color.g * 0.5, theme_color.b * 0.4, 0.6)
	else:
		style.bg_color = Color(0.06, 0.06, 0.1, 0.45)
		style.border_color = Color(0.25, 0.25, 0.3, 0.3)
	style.set_border_width_all(2)
	style.set_corner_radius_all(8)
	card.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	card.add_child(vbox)

	# Spacer / icon area
	var icon_area := CenterContainer.new()
	icon_area.custom_minimum_size = Vector2(0, 120)
	vbox.add_child(icon_area)

	var icon := Label.new()
	if theme["name"] == "Fire Meets Ice":
		icon.text = "FIRE"
	elif theme["name"] == "Ice Age":
		icon.text = "ICE"
	else:
		icon.text = "MAGIC"
	icon.add_theme_font_size_override("font_size", 28)
	icon.add_theme_color_override("font_color", theme_color if theme["unlocked"] else Color(0.4, 0.4, 0.45, 0.4))
	icon.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon_area.add_child(icon)

	# Name
	var name_lbl := Label.new()
	name_lbl.text = theme["name"] as String
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.add_theme_font_size_override("font_size", 19)
	name_lbl.add_theme_color_override("font_color", theme_color if theme["unlocked"] else Color(0.45, 0.45, 0.5, 0.5))
	vbox.add_child(name_lbl)

	# Play button or locked label
	if theme["unlocked"]:
		var play_btn := _make_button("PLAY", Color(1, 0.95, 0.85))
		play_btn.custom_minimum_size = Vector2(0, 42)
		play_btn.add_theme_font_size_override("font_size", 18)
		var scene_path: String = theme["scene"]
		play_btn.pressed.connect(func(): scene_requested.emit(scene_path))
		vbox.add_child(play_btn)
	else:
		var locked := Label.new()
		locked.text = "Coming Soon"
		locked.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		locked.add_theme_font_size_override("font_size", 14)
		locked.add_theme_color_override("font_color", Color(0.4, 0.4, 0.45, 0.4))
		locked.custom_minimum_size = Vector2(0, 42)
		vbox.add_child(locked)

	return card


func _make_button(text: String, font_color: Color) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.add_theme_color_override("font_color", font_color)
	var s := StyleBoxFlat.new()
	s.bg_color = Color(0.08, 0.1, 0.2, 0.5)
	s.border_color = Color(0.3, 0.45, 0.7, 0.5)
	s.set_border_width_all(1)
	s.set_corner_radius_all(4)
	btn.add_theme_stylebox_override("normal", s)
	var h := StyleBoxFlat.new()
	h.bg_color = Color(0.12, 0.18, 0.35, 0.7)
	h.border_color = Color(0.4, 0.6, 0.9, 0.8)
	h.set_border_width_all(2)
	h.set_corner_radius_all(4)
	btn.add_theme_stylebox_override("hover", h)
	btn.add_theme_stylebox_override("pressed", h)
	return btn
