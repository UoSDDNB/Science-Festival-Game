class_name Channel
extends RefCounted

## A connection between two zones through which heat flows.
## Visually rendered as a natural ice crack/fissure.

var zone_a_id: int
var zone_b_id: int
var conductivity: float
var visual: Line2D = null


func _init(p_zone_a: int, p_zone_b: int, p_conductivity: float) -> void:
	zone_a_id = p_zone_a
	zone_b_id = p_zone_b
	conductivity = p_conductivity
