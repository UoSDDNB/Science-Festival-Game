class_name WinDetector
extends Node

## Monitors the target zone heat and detects win/damage conditions.

signal level_won()
signal damage_tick(heat: float)
signal entered_target_zone()
signal left_target_zone()

@export var target_heat_min: float = 50.0
@export var target_heat_max: float = 70.0
@export var sustain_duration: float = 3.0
@export var damage_threshold: float = 85.0

var _in_target_zone: bool = false
var _time_in_target: float = 0.0
var _won: bool = false

var heat_simulation: HeatSimulation = null


func setup(sim: HeatSimulation) -> void:
	heat_simulation = sim


func _process(delta: float) -> void:
	if _won or not heat_simulation:
		return

	var target := heat_simulation.get_target_zone()
	if not target:
		return

	var heat := target.heat

	# Check damage
	if heat >= damage_threshold:
		damage_tick.emit(heat)

	# Check target zone
	var in_zone := heat >= target_heat_min and heat <= target_heat_max
	if in_zone and not _in_target_zone:
		_in_target_zone = true
		_time_in_target = 0.0
		entered_target_zone.emit()
	elif not in_zone and _in_target_zone:
		_in_target_zone = false
		_time_in_target = 0.0
		left_target_zone.emit()

	if _in_target_zone:
		_time_in_target += delta
		if _time_in_target >= sustain_duration:
			_won = true
			level_won.emit()


func reset() -> void:
	_won = false
	_in_target_zone = false
	_time_in_target = 0.0
