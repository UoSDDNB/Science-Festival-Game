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

# Fire source position in world coordinates, set by the level script.
var fire_position: Vector2 = Vector2(960, 920)
var max_fire_distance: float = 800.0

var zones: Array[Zone] = []
var channels: Array[Channel] = []
var _tick_timer: float = 0.0
var _simulation_is_frozen: bool = false

# Zone identifiers that block heat flow through connected channels.
var obstacle_zone_ids: Array[int] = []

# Heat thresholds used to detect upward and downward bracket crossings.
var _zone_thresholds := [20.0, 40.0, 50.0, 60.0, 70.0, 85.0]
var _zone_last_bracket: Dictionary = {}


func setup(zone_list: Array[Zone], channel_list: Array[Channel]) -> void:
	# Store the zone and channel topology for the current level.
	zones = zone_list
	channels = channel_list
	# Record the starting heat bracket for every zone.
	for zone in zones:
		_zone_last_bracket[zone.id] = _get_bracket(zone.heat)


func freeze() -> void:
	# Stop simulation ticks while the level is paused or won.
	_simulation_is_frozen = true


func unfreeze() -> void:
	# Resume simulation ticks after a pause.
	_simulation_is_frozen = false


func _process(delta_seconds: float) -> void:
	# Do nothing while the simulation is frozen.
	if _simulation_is_frozen:
		return
	# Accumulate elapsed time until the next simulation tick.
	_tick_timer += delta_seconds
	# Wait until the configured tick interval has passed.
	if _tick_timer < tick_interval:
		return
	# Consume one tick interval from the accumulator.
	_tick_timer -= tick_interval
	# Run dissipation, diffusion, clamping, and threshold checks.
	_simulate_tick()
	# Broadcast the latest zone states to listeners.
	_emit_states()


func _simulate_tick() -> void:
	# Apply dissipation and source replenishment to every zone.
	for zone in zones:
		if zone.is_source:
			# Pull the fire source back toward its baseline temperature.
			zone.heat = lerpf(zone.heat, 50.0, source_replenish_rate * tick_interval)
		else:
			# Reduce heat proportionally so cold zones stay cold without input.
			zone.heat -= zone.heat * dissipation_rate
			# Prevent heat from dropping below zero.
			zone.heat = maxf(zone.heat, 0.0)

	# Move heat between connected zones through each channel.
	for channel in channels:
		var zone_a := _get_zone(channel.zone_a_id)
		var zone_b := _get_zone(channel.zone_b_id)
		if not zone_a or not zone_b:
			continue
		# Skip channels that touch an obstacle zone such as the boulder.
		if channel.zone_a_id in obstacle_zone_ids or channel.zone_b_id in obstacle_zone_ids:
			continue

		# Compute how much heat should move based on the difference between zones.
		var heat_difference := zone_a.heat - zone_b.heat
		var heat_flow := heat_difference * channel.conductivity * flow_rate
		# Remove heat from the warmer side of the channel.
		zone_a.heat -= heat_flow
		# Add the same amount of heat to the cooler side.
		zone_b.heat += heat_flow

	# Clamp every zone into the valid zero-to-one-hundred range.
	for zone in zones:
		zone.heat = clampf(zone.heat, 0.0, 100.0)

	# Detect threshold bracket crossings and emit directional signals.
	for zone in zones:
		var new_bracket := _get_bracket(zone.heat)
		var old_bracket: int = _zone_last_bracket.get(zone.id, 0)
		if new_bracket != old_bracket:
			var crossing_direction := "up" if new_bracket > old_bracket else "down"
			zone_threshold_crossed.emit(zone.id, zone.heat, crossing_direction)
			_zone_last_bracket[zone.id] = new_bracket


func _emit_states() -> void:
	# Build a snapshot array describing every zone for UI and debug listeners.
	var zone_state_list: Array[Dictionary] = []
	for zone in zones:
		zone_state_list.append({
			"id": zone.id,
			"heat": zone.heat,
			"normalized": zone.get_normalized_heat(),
			"is_source": zone.is_source,
			"is_target": zone.is_target,
		})
	heat_updated.emit(zone_state_list)


func _get_proximity(world_position: Vector2) -> float:
	# Measure how close the input position is to the fire source.
	var distance_from_fire := fire_position.distance_to(world_position)
	# Convert distance into a zero-to-one proximity factor.
	var proximity_factor := 1.0 - clampf(distance_from_fire / max_fire_distance, 0.0, 0.9)
	# Never return a proximity value below the configured minimum.
	return maxf(proximity_factor, min_proximity)


func apply_tap(zone_identifier: int, world_position: Vector2) -> void:
	# Look up the zone that received the tap.
	var tapped_zone := _get_zone(zone_identifier)
	if tapped_zone and zone_identifier not in obstacle_zone_ids:
		# Scale tap heat by how close the tap is to the fire.
		var proximity_factor := _get_proximity(world_position)
		tapped_zone.add_heat(tap_heat * proximity_factor)


func apply_drag(zone_identifier: int, world_position: Vector2) -> void:
	# Look up the zone under the drag path.
	var dragged_zone := _get_zone(zone_identifier)
	if dragged_zone and zone_identifier not in obstacle_zone_ids:
		# Scale drag heat by proximity to the fire source.
		var proximity_factor := _get_proximity(world_position)
		dragged_zone.add_heat(drag_heat * proximity_factor)


func apply_hold(zone_identifier: int, world_position: Vector2, hold_duration_seconds: float) -> void:
	# Look up the zone receiving sustained hold input.
	var held_zone := _get_zone(zone_identifier)
	if held_zone and zone_identifier not in obstacle_zone_ids:
		# Scale hold heat by proximity to the fire source.
		var proximity_factor := _get_proximity(world_position)
		# Accelerate hold output over time up to the configured cap.
		var hold_acceleration := minf(
			pow(1.0 + hold_duration_seconds * hold_accel_rate, 2.0),
			hold_cap_multiplier
		)
		var heat_to_add := hold_base_heat * hold_acceleration * proximity_factor
		held_zone.add_heat(heat_to_add)


func get_zone_heat(zone_identifier: int) -> float:
	# Return the heat of a zone, or zero if the identifier is invalid.
	var requested_zone := _get_zone(zone_identifier)
	return requested_zone.heat if requested_zone else 0.0


func get_target_zone() -> Zone:
	# Return the zone marked as the creature or dragon target.
	for zone in zones:
		if zone.is_target:
			return zone
	return null


func _get_zone(zone_identifier: int) -> Zone:
	# Search the zone list for a matching identifier.
	for zone in zones:
		if zone.id == zone_identifier:
			return zone
	return null


func _get_bracket(heat_value: float) -> int:
	# Count how many thresholds the heat value has crossed.
	var bracket_index := 0
	for threshold_value in _zone_thresholds:
		if heat_value >= threshold_value:
			bracket_index += 1
	return bracket_index
