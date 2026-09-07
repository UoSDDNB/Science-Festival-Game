extends Control

## Level selection — theme cards over the three-alcove background.
## Cards sit in a row on wide screens and stack vertically on narrow phones.

signal scene_requested(scene_path: String)

const NARRATIVE_SCENE := "res://scenes/narrative/narrative_interlude.tscn"
const MENU_SCENE := "res://scenes/start_menu/start_menu.tscn"

var themes := [
	{"name": "Fire Meets Ice", "scene": NARRATIVE_SCENE, "unlocked": true, "color": Color(1, 0.5, 0.15)},
	{"name": "Ice Age", "scene": "", "unlocked": false, "color": Color(0.4, 0.8, 1)},
	{"name": "Enchanted", "scene": "", "unlocked": false, "color": Color(0.7, 0.4, 1)},
]

var _back_button: Button
var _title_label: Label
var _card_container: BoxContainer
var _theme_cards: Array[PanelContainer] = []
var _using_vertical_stack: bool = false


func _ready() -> void:
	# Re-layout when the window size or device orientation changes.
	get_viewport().size_changed.connect(_apply_responsive_layout)

	# Add a back button that returns to the main start menu.
	_back_button = _make_button("< Back", Color(0.6, 0.8, 1, 0.8))
	_back_button.pressed.connect(func(): scene_requested.emit(MENU_SCENE))
	add_child(_back_button)

	# Display the level selection title across the top of the screen.
	_title_label = Label.new()
	_title_label.text = "SELECT LEVEL"
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.add_theme_color_override("font_color", Color(0.75, 0.88, 1, 0.9))
	_title_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	add_child(_title_label)

	# Start with a horizontal row; narrow screens swap to a vertical stack.
	_card_container = HBoxContainer.new()
	_card_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_card_container.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	add_child(_card_container)

	# Build one card panel for each theme entry.
	for theme_entry in themes:
		var theme_card := _build_card(theme_entry)
		_card_container.add_child(theme_card)
		_theme_cards.append(theme_card)

	# Apply sizes and stacking for the current viewport.
	_apply_responsive_layout()


func _apply_responsive_layout() -> void:
	# Read the live viewport size.
	var viewport_size := ResponsiveLayout.get_viewport_size(self)
	# Decide whether cards should stack for narrow screens.
	var should_stack_vertically := ResponsiveLayout.is_narrow_viewport(viewport_size)
	# Rebuild the container orientation if the orientation mode changed.
	if should_stack_vertically != _using_vertical_stack:
		_rebuild_card_container(should_stack_vertically)

	# Position the back button with percentage-based margins.
	var back_left := ResponsiveLayout.horizontal_margin(viewport_size, 0.01)
	var back_top := ResponsiveLayout.vertical_margin(viewport_size, 0.014)
	_back_button.position = Vector2(back_left, back_top)
	_back_button.custom_minimum_size = Vector2(
		ResponsiveLayout.scale_dimension(viewport_size, 100.0, 80.0, 140.0),
		ResponsiveLayout.scale_dimension(viewport_size, 36.0, 30.0, 48.0)
	)
	_back_button.add_theme_font_size_override(
		"font_size",
		ResponsiveLayout.scale_font_size(viewport_size, 15.0, 12.0, 20.0)
	)

	# Size the title band along the top.
	_title_label.add_theme_font_size_override(
		"font_size",
		ResponsiveLayout.scale_font_size(viewport_size, 28.0, 18.0, 34.0)
	)
	_title_label.offset_top = ResponsiveLayout.vertical_margin(viewport_size, 0.017)
	_title_label.offset_bottom = ResponsiveLayout.vertical_margin(viewport_size, 0.051)

	# Size the centered card area to about 90% of the viewport, capped at design width.
	var panel_half_width := ResponsiveLayout.content_width(viewport_size, 0.9, 960.0) * 0.5
	# Vertical half-height uses about 26% of viewport height (~280px at 1080).
	var panel_half_height := ResponsiveLayout.vertical_margin(viewport_size, 0.26)
	if should_stack_vertically:
		# Give stacked cards more vertical room on narrow phones.
		panel_half_height = viewport_size.y * 0.38
	ResponsiveLayout.apply_centered_panel_offsets(
		_card_container,
		panel_half_width,
		panel_half_height
	)

	# Scale card separation and individual card sizes.
	var card_separation := int(
		ResponsiveLayout.scale_dimension(viewport_size, 30.0, 12.0, 36.0)
	)
	_card_container.add_theme_constant_override("separation", card_separation)

	var card_width := ResponsiveLayout.scale_dimension(viewport_size, 240.0, 160.0, 260.0)
	var card_height := ResponsiveLayout.scale_dimension(viewport_size, 260.0, 180.0, 280.0)
	if should_stack_vertically:
		# Use most of the available width when cards are stacked.
		card_width = minf(viewport_size.x * 0.8, 320.0)
		card_height = ResponsiveLayout.scale_dimension(viewport_size, 200.0, 150.0, 240.0)

	var icon_font_size := ResponsiveLayout.scale_font_size(viewport_size, 28.0, 18.0, 32.0)
	var name_font_size := ResponsiveLayout.scale_font_size(viewport_size, 19.0, 14.0, 22.0)
	var action_font_size := ResponsiveLayout.scale_font_size(viewport_size, 18.0, 13.0, 20.0)
	var icon_area_height := ResponsiveLayout.scale_dimension(viewport_size, 120.0, 70.0, 130.0)
	var action_height := ResponsiveLayout.scale_dimension(viewport_size, 42.0, 32.0, 48.0)

	for theme_card in _theme_cards:
		theme_card.custom_minimum_size = Vector2(card_width, card_height)
		# Reach into card children that we tagged with metadata during build.
		var icon_area: CenterContainer = theme_card.get_meta("icon_area")
		var icon_label: Label = theme_card.get_meta("icon_label")
		var name_label: Label = theme_card.get_meta("name_label")
		var action_control: Control = theme_card.get_meta("action_control")
		icon_area.custom_minimum_size = Vector2(0, icon_area_height)
		icon_label.add_theme_font_size_override("font_size", icon_font_size)
		name_label.add_theme_font_size_override("font_size", name_font_size)
		action_control.custom_minimum_size = Vector2(0, action_height)
		if action_control is Button:
			(action_control as Button).add_theme_font_size_override("font_size", action_font_size)
		elif action_control is Label:
			(action_control as Label).add_theme_font_size_override("font_size", action_font_size - 4)


func _rebuild_card_container(use_vertical_stack: bool) -> void:
	# Remember the new orientation for the next resize event.
	_using_vertical_stack = use_vertical_stack
	# Detach cards before freeing the old container.
	for theme_card in _theme_cards:
		_card_container.remove_child(theme_card)
	_card_container.queue_free()

	# Create either a vertical stack or a horizontal row.
	if use_vertical_stack:
		_card_container = VBoxContainer.new()
	else:
		_card_container = HBoxContainer.new()
	_card_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_card_container.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	add_child(_card_container)

	# Re-attach the existing cards in theme order.
	for theme_card in _theme_cards:
		_card_container.add_child(theme_card)


func _build_card(theme_entry: Dictionary) -> PanelContainer:
	# Create the outer card panel; minimum size is applied during layout.
	var card_panel := PanelContainer.new()
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
	card_content.add_child(icon_area)

	# Choose a short icon word based on the theme name.
	var icon_label := Label.new()
	if theme_entry["name"] == "Fire Meets Ice":
		icon_label.text = "FIRE"
	elif theme_entry["name"] == "Ice Age":
		icon_label.text = "ICE"
	else:
		icon_label.text = "MAGIC"
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
	if theme_entry["unlocked"]:
		name_label.add_theme_color_override("font_color", theme_color)
	else:
		name_label.add_theme_color_override("font_color", Color(0.45, 0.45, 0.5, 0.5))
	card_content.add_child(name_label)

	# Show a PLAY button for unlocked themes or a Coming Soon label otherwise.
	var action_control: Control
	if theme_entry["unlocked"]:
		var play_button := _make_button("PLAY", Color(1, 0.95, 0.85))
		var destination_scene_path: String = theme_entry["scene"]
		play_button.pressed.connect(func(): scene_requested.emit(destination_scene_path))
		card_content.add_child(play_button)
		action_control = play_button
	else:
		var locked_label := Label.new()
		locked_label.text = "Coming Soon"
		locked_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		locked_label.add_theme_color_override("font_color", Color(0.4, 0.4, 0.45, 0.4))
		card_content.add_child(locked_label)
		action_control = locked_label

	# Store child references so layout can resize them without brittle path walks.
	card_panel.set_meta("icon_area", icon_area)
	card_panel.set_meta("icon_label", icon_label)
	card_panel.set_meta("name_label", name_label)
	card_panel.set_meta("action_control", action_control)

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
