class_name Zone
extends RefCounted

## Represents a heat zone in the simulation.
## Visually rendered as an irregular ice polygon, not a "node" in the UI sense.

var id: int
var heat: float = 0.0
var conductivity_modifier: float = 1.0
var is_source: bool = false
var is_target: bool = false
var polygon: Polygon2D = null
var area: Area2D = null


func _init(p_id: int, p_conductivity_mod: float = 1.0, p_is_source: bool = false, p_is_target: bool = false) -> void:
	id = p_id
	conductivity_modifier = p_conductivity_mod
	is_source = p_is_source
	is_target = p_is_target


func add_heat(amount: float) -> void:
	heat = clampf(heat + amount, 0.0, 100.0)


func get_normalized_heat() -> float:
	return heat / 100.0
