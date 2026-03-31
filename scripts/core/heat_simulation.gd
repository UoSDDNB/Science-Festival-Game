class_name HeatSimulation
extends Node

## Zone-based diffusion engine with proximity-scaled input and hold acceleration.
## Zones are invisible — the player interacts with a continuous heat field.

signal heat_updated(zone_states: Array[Dictionary])
signal zone_threshold_crossed(zone_id: int, heat: float, direction: String)

# Simulation constants
@export var tick_interval: float = 0.1
@export var dissipation_rate: float = 0.03
@export var flow_rate: float = 0.15
@export var source_replenish_rate: float = 0.5

# Input constants
@export var tap_heat: float = 25.0
@export var drag_heat: float = 8.0
@export var hold_base_heat: float = 5.0
@export var hold_accel_rate: float = 0.8
@export var hold_cap_multiplier: float = 10.0
@export var min_proximity: float = 0.1

# Fire source position (world coordinates, set by level)
var fire_position: Vector2 = Vector2(960, 920)
var max_fire_distance: float = 800.0

var zones: Array[Zone] = []
var channels: Array[Channel] = []
var _tick_timer: float = 0.0
var _frozen: bool = false

# Obstacle zones — heat cannot flow through these channels
var obstacle_zone_ids: Array[int] = []

# Threshold tracking
var _zone_thresholds := [20.0, 40.0, 50.0, 60.0, 70.0, 85.0]
var _zone_last_bracket: Dictionary = {}


func setup(p_zones: Array[Zone], p_channels: Array[Channel]) -> void:
	zones = p_zones
	channels = p_channels
	for zone in zones:
		_zone_last_bracket[zone.id] = _get_bracket(zone.heat)


func freeze() -> void:
	_frozen = true


func unfreeze() -> void:
	_frozen = false


func _process(delta: float) -> void:
	if _frozen:
		return
	_tick_timer += delta
	if _tick_timer < tick_interval:
		return
	_tick_timer -= tick_interval
	_simulate_tick()
	_emit_states()


func _simulate_tick() -> void:
	# 1. Dissipation
	for zone in zones:
		if zone.is_source:
			zone.heat = lerpf(zone.heat, 50.0, source_replenish_rate * tick_interval)
		else:
			zone.heat -= zone.heat * dissipation_rate
			zone.heat = maxf(zone.heat, 0.0)

	# 2. Diffusion through channels
	for channel in channels:
		var zone_a := _get_zone(channel.zone_a_id)
		var zone_b := _get_zone(channel.zone_b_id)
		if not zone_a or not zone_b:
			continue
		# Skip channels that touch obstacle zones
		if channel.zone_a_id in obstacle_zone_ids or channel.zone_b_id in obstacle_zone_ids:
			continue

		var delta_heat := zone_a.heat - zone_b.heat
		var flow := delta_heat * channel.conductivity * flow_rate
		zone_a.heat -= flow
		zone_b.heat += flow

	# 3. Clamp
	for zone in zones:
		zone.heat = clampf(zone.heat, 0.0, 100.0)

	# 4. Threshold crossings
	for zone in zones:
		var new_bracket := _get_bracket(zone.heat)
		var old_bracket: int = _zone_last_bracket.get(zone.id, 0)
		if new_bracket != old_bracket:
			var direction := "up" if new_bracket > old_bracket else "down"
			zone_threshold_crossed.emit(zone.id, zone.heat, direction)
			_zone_last_bracket[zone.id] = new_bracket


func _emit_states() -> void:
	var states: Array[Dictionary] = []
	for zone in zones:
		states.append({
			"id": zone.id,
			"heat": zone.heat,
			"normalized": zone.get_normalized_heat(),
			"is_source": zone.is_source,
			"is_target": zone.is_target,
		})
	heat_updated.emit(states)


# --- Proximity-scaled input ---

func _get_proximity(world_pos: Vector2) -> float:
	var dist := fire_position.distance_to(world_pos)
	var proximity := 1.0 - clampf(dist / max_fire_distance, 0.0, 0.9)
	return maxf(proximity, min_proximity)


func apply_tap(zone_id: int, world_pos: Vector2) -> void:
	var zone := _get_zone(zone_id)
	if zone and zone_id not in obstacle_zone_ids:
		var proximity := _get_proximity(world_pos)
		zone.add_heat(tap_heat * proximity)


func apply_drag(zone_id: int, world_pos: Vector2) -> void:
	var zone := _get_zone(zone_id)
	if zone and zone_id not in obstacle_zone_ids:
		var proximity := _get_proximity(world_pos)
		zone.add_heat(drag_heat * proximity)


func apply_hold(zone_id: int, world_pos: Vector2, hold_duration: float) -> void:
	var zone := _get_zone(zone_id)
	if zone and zone_id not in obstacle_zone_ids:
		var proximity := _get_proximity(world_pos)
		var acceleration := minf(pow(1.0 + hold_duration * hold_accel_rate, 2.0), hold_cap_multiplier)
		var heat := hold_base_heat * acceleration * proximity
		zone.add_heat(heat)


func get_zone_heat(zone_id: int) -> float:
	var zone := _get_zone(zone_id)
	return zone.heat if zone else 0.0


func get_target_zone() -> Zone:
	for zone in zones:
		if zone.is_target:
			return zone
	return null


func _get_zone(zone_id: int) -> Zone:
	for zone in zones:
		if zone.id == zone_id:
			return zone
	return null


func _get_bracket(heat: float) -> int:
	var bracket := 0
	for threshold in _zone_thresholds:
		if heat >= threshold:
			bracket += 1
	return bracket
