class_name ResponsiveLayout
extends RefCounted

## Shared helpers that turn fixed design pixels into viewport-relative sizes.
## Used by menus, narrative, win overlay, and hints so the UI fits phones and laptops.

## Design height the project was authored against (project.godot viewport).
const DESIGN_HEIGHT := 1080.0
## Design width the project was authored against.
const DESIGN_WIDTH := 1920.0
## Below this width, level-select cards stack vertically instead of side by side.
const NARROW_WIDTH_THRESHOLD := 700.0


static func get_viewport_size(from_node: Node) -> Vector2:
	# Read the current visible area from the node's viewport.
	return from_node.get_viewport().get_visible_rect().size


static func content_width(
	viewport_size: Vector2,
	width_fraction: float,
	maximum_design_pixels: float
) -> float:
	# Cap content width so panels stay readable on large screens and shrink on phones.
	var fractional_width := viewport_size.x * width_fraction
	# Never exceed the design maximum width.
	return minf(maximum_design_pixels, fractional_width)


static func horizontal_margin(viewport_size: Vector2, margin_fraction: float) -> float:
	# Convert a width fraction into a left or right margin in pixels.
	return viewport_size.x * margin_fraction


static func vertical_margin(viewport_size: Vector2, margin_fraction: float) -> float:
	# Convert a height fraction into a top or bottom margin in pixels.
	return viewport_size.y * margin_fraction


static func scale_font_size(
	viewport_size: Vector2,
	design_font_size: float,
	minimum_font_size: float,
	maximum_font_size: float
) -> int:
	# Scale fonts with viewport height while keeping them between clamp bounds.
	var height_scale := viewport_size.y / DESIGN_HEIGHT
	var scaled_size := design_font_size * height_scale
	# Clamp so tiny phones stay readable and huge screens stay restrained.
	return int(clampf(scaled_size, minimum_font_size, maximum_font_size))


static func scale_dimension(
	viewport_size: Vector2,
	design_pixels: float,
	minimum_pixels: float,
	maximum_pixels: float
) -> float:
	# Scale a design-pixel size with viewport height, then clamp.
	var height_scale := viewport_size.y / DESIGN_HEIGHT
	var scaled_pixels := design_pixels * height_scale
	return clampf(scaled_pixels, minimum_pixels, maximum_pixels)


static func is_narrow_viewport(viewport_size: Vector2) -> bool:
	# Return true when cards should stack rather than sit in a horizontal row.
	return viewport_size.x < NARROW_WIDTH_THRESHOLD


static func apply_centered_panel_offsets(
	control_node: Control,
	panel_half_width: float,
	panel_half_height: float
) -> void:
	# Apply symmetric offsets around the center anchor point.
	control_node.offset_left = -panel_half_width
	control_node.offset_right = panel_half_width
	control_node.offset_top = -panel_half_height
	control_node.offset_bottom = panel_half_height
