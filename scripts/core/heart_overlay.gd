class_name HeartOverlay
extends Control

## Beating heart that appears behind ice as the creature warms.
## Heart becomes visible, then starts beating with increasing intensity.
## Replaces the biomarker system with a single, intuitive visual.

var _current_heat: float = 0.0
var _beat_time: float = 0.0
var _beat_scale: float = 1.0
var _heart_visible: bool = false

const APPEAR_THRESHOLD := 15.0   # Heart silhouette starts appearing
const BEAT_THRESHOLD := 30.0     # Heart starts beating
const STRONG_BEAT := 50.0        # Strong rhythmic beating
const DANGER_THRESHOLD := 70.0   # Frantic beating


func set_heat(value: float) -> void:
	_current_heat = value


func _process(delta: float) -> void:
	_beat_time += delta

	var bpm := 0.0
	if _current_heat >= BEAT_THRESHOLD:
		bpm = remap(clampf(_current_heat, BEAT_THRESHOLD, 90.0), BEAT_THRESHOLD, 90.0, 40.0, 140.0)

	if bpm > 0:
		var beat_freq := bpm / 60.0
		var beat_phase := sin(_beat_time * beat_freq * TAU)
		# Sharp heartbeat curve — quick contraction, slow release
		var contraction := maxf(0.0, beat_phase)
		contraction = pow(contraction, 0.4)  # Sharpen the peak
		_beat_scale = 1.0 + contraction * 0.12
	else:
		_beat_scale = 1.0

	queue_redraw()


func _draw() -> void:
	if _current_heat < APPEAR_THRESHOLD:
		return

	var center := size / 2.0
	var base_size := minf(size.x, size.y) * 0.3

	# Heart alpha — fades in between 15-40 degrees
	var alpha := remap(clampf(_current_heat, APPEAR_THRESHOLD, 40.0), APPEAR_THRESHOLD, 40.0, 0.0, 0.7)

	# Heart color — shifts from icy blue to warm red
	var warmth := remap(clampf(_current_heat, APPEAR_THRESHOLD, 70.0), APPEAR_THRESHOLD, 70.0, 0.0, 1.0)
	var heart_color := Color(
		lerpf(0.3, 0.9, warmth),
		lerpf(0.6, 0.15, warmth),
		lerpf(0.9, 0.1, warmth),
		alpha
	)

	# Danger: pulsing red
	if _current_heat >= DANGER_THRESHOLD:
		var danger_flash := sin(_beat_time * 8.0) * 0.3 + 0.7
		heart_color = Color(1.0, 0.1, 0.05, alpha * danger_flash)

	var s := base_size * _beat_scale

	# Draw heart shape using circles + triangle
	var left_circle := center + Vector2(-s * 0.25, -s * 0.15)
	var right_circle := center + Vector2(s * 0.25, -s * 0.15)
	var bottom := center + Vector2(0, s * 0.45)

	# Glow behind heart
	var glow_color := heart_color
	glow_color.a *= 0.25
	draw_circle(center + Vector2(0, s * 0.05), s * 0.7, glow_color)

	# Heart lobes
	draw_circle(left_circle, s * 0.3, heart_color)
	draw_circle(right_circle, s * 0.3, heart_color)

	# Heart bottom (triangle)
	var tri := PackedVector2Array([
		center + Vector2(-s * 0.48, -s * 0.1),
		center + Vector2(s * 0.48, -s * 0.1),
		bottom
	])
	draw_colored_polygon(tri, heart_color)

	# Inner highlight
	var highlight := heart_color
	highlight.a *= 0.4
	draw_circle(left_circle + Vector2(s * 0.05, -s * 0.05), s * 0.12, highlight)
