class_name WinDetector
extends Node

## Monitors the target zone heat and detects win and damage conditions.

signal level_won()
signal damage_tick(heat: float)
signal entered_target_zone()
signal left_target_zone()

@export var target_heat_min: float = 50.0
@export var target_heat_max: float = 70.0
@export var sustain_duration: float = 3.0
@export var damage_threshold: float = 85.0

var _is_currently_in_target_zone: bool = false
var _time_spent_in_target_zone: float = 0.0
var _level_has_been_won: bool = false

var heat_simulation: HeatSimulation = null


func setup(heat_simulation_node: HeatSimulation) -> void:
	# Remember the heat simulation so we can read the target zone each frame.
	heat_simulation = heat_simulation_node


func _process(delta_seconds: float) -> void:
	# Stop monitoring once the level is already won or simulation is missing.
	if _level_has_been_won or not heat_simulation:
		return

	# Read the zone that represents the creature or dragon.
	var target_zone := heat_simulation.get_target_zone()
	if not target_zone:
		return

	# Read the current heat value from the target zone.
	var target_zone_heat := target_zone.heat

	# Emit damage when heat exceeds the safe upper limit.
	if target_zone_heat >= damage_threshold:
		damage_tick.emit(target_zone_heat)

	# Determine whether heat is inside the winning temperature band.
	var is_inside_target_band := (
		target_zone_heat >= target_heat_min and target_zone_heat <= target_heat_max
	)

	# Announce the first moment the player enters the target band.
	if is_inside_target_band and not _is_currently_in_target_zone:
		_is_currently_in_target_zone = true
		_time_spent_in_target_zone = 0.0
		entered_target_zone.emit()
	# Announce when heat leaves the target band and reset the sustain timer.
	elif not is_inside_target_band and _is_currently_in_target_zone:
		_is_currently_in_target_zone = false
		_time_spent_in_target_zone = 0.0
		left_target_zone.emit()

	# Accumulate time while heat stays inside the winning band.
	if _is_currently_in_target_zone:
		_time_spent_in_target_zone += delta_seconds
		# Declare victory after the required sustain duration elapses.
		if _time_spent_in_target_zone >= sustain_duration:
			_level_has_been_won = true
			level_won.emit()


func reset() -> void:
	# Clear all win and sustain tracking so the detector can run again.
	_level_has_been_won = false
	_is_currently_in_target_zone = false
	_time_spent_in_target_zone = 0.0
