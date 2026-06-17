class_name HeartOverlay
extends Control

## Beating heart that appears behind ice as the creature warms.
## Heart becomes visible, then starts beating with increasing intensity.
## Replaces the biomarker system with a single, intuitive visual.

var _current_heat: float = 0.0
var _beat_time_seconds: float = 0.0
var _beat_scale_multiplier: float = 1.0
var _heart_is_visible: bool = false

const APPEAR_THRESHOLD := 15.0
const BEAT_THRESHOLD := 30.0
const STRONG_BEAT := 50.0
const DANGER_THRESHOLD := 70.0


func set_heat(heat_value: float) -> void:
	# Store the latest heat value that drives heart visibility and beat speed.
	_current_heat = heat_value


func _process(delta_seconds: float) -> void:
	# Advance the beat animation timer.
	_beat_time_seconds += delta_seconds

	# Compute beats per minute from the current heat value.
	var beats_per_minute := 0.0
	if _current_heat >= BEAT_THRESHOLD:
		beats_per_minute = remap(
			clampf(_current_heat, BEAT_THRESHOLD, 90.0),
			BEAT_THRESHOLD,
			90.0,
			40.0,
			140.0
		)

	# Apply a pulsing scale while the heart is beating.
	if beats_per_minute > 0:
		var beat_frequency := beats_per_minute / 60.0
		var beat_phase := sin(_beat_time_seconds * beat_frequency * TAU)
		var contraction_amount := maxf(0.0, beat_phase)
		contraction_amount = pow(contraction_amount, 0.4)
		_beat_scale_multiplier = 1.0 + contraction_amount * 0.12
	else:
		_beat_scale_multiplier = 1.0

	queue_redraw()


func _draw() -> void:
	# Do not draw the heart until heat crosses the appearance threshold.
	if _current_heat < APPEAR_THRESHOLD:
		return

	# Compute the center and base size of the procedural heart shape.
	var heart_center := size / 2.0
	var base_heart_size := minf(size.x, size.y) * 0.3

	# Fade the heart in between the appearance and visibility thresholds.
	var heart_alpha := remap(
		clampf(_current_heat, APPEAR_THRESHOLD, 40.0),
		APPEAR_THRESHOLD,
		40.0,
		0.0,
		0.7
	)

	# Shift heart color from icy blue toward warm red as heat rises.
	var warmth_fraction := remap(
		clampf(_current_heat, APPEAR_THRESHOLD, 70.0),
		APPEAR_THRESHOLD,
		70.0,
		0.0,
		1.0
	)
	var heart_color := Color(
		lerpf(0.3, 0.9, warmth_fraction),
		lerpf(0.6, 0.15, warmth_fraction),
		lerpf(0.9, 0.1, warmth_fraction),
		heart_alpha
	)

	# Flash red when heat enters the danger zone.
	if _current_heat >= DANGER_THRESHOLD:
		var danger_flash_alpha := sin(_beat_time_seconds * 8.0) * 0.3 + 0.7
		heart_color = Color(1.0, 0.1, 0.05, heart_alpha * danger_flash_alpha)

	var scaled_heart_size := base_heart_size * _beat_scale_multiplier

	# Draw a soft glow behind the heart shape.
	var glow_color := heart_color
	glow_color.a *= 0.25
	draw_circle(heart_center + Vector2(0, scaled_heart_size * 0.05), scaled_heart_size * 0.7, glow_color)

	# Compute the positions of the two upper heart lobes.
	var left_lobe_center := heart_center + Vector2(-scaled_heart_size * 0.25, -scaled_heart_size * 0.15)
	var right_lobe_center := heart_center + Vector2(scaled_heart_size * 0.25, -scaled_heart_size * 0.15)
	var heart_bottom_point := heart_center + Vector2(0, scaled_heart_size * 0.45)

	# Draw the circular lobes that form the top of the heart.
	draw_circle(left_lobe_center, scaled_heart_size * 0.3, heart_color)
	draw_circle(right_lobe_center, scaled_heart_size * 0.3, heart_color)

	# Draw the triangular bottom of the heart.
	var heart_triangle := PackedVector2Array([
		heart_center + Vector2(-scaled_heart_size * 0.48, -scaled_heart_size * 0.1),
		heart_center + Vector2(scaled_heart_size * 0.48, -scaled_heart_size * 0.1),
		heart_bottom_point
	])
	draw_colored_polygon(heart_triangle, heart_color)

	# Add a small highlight on the left lobe.
	var highlight_color := heart_color
	highlight_color.a *= 0.4
	draw_circle(
		left_lobe_center + Vector2(scaled_heart_size * 0.05, -scaled_heart_size * 0.05),
		scaled_heart_size * 0.12,
		highlight_color
	)
