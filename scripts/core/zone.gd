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


func _init(
	zone_identifier: int,
	conductivity_modifier_value: float = 1.0,
	is_source_zone: bool = false,
	is_target_zone: bool = false
) -> void:
	# Store the unique identifier for this heat zone.
	id = zone_identifier
	# Store how quickly heat moves through this zone relative to others.
	conductivity_modifier = conductivity_modifier_value
	# Mark whether this zone is the fire source that replenishes heat.
	is_source = is_source_zone
	# Mark whether this zone is the creature or dragon target zone.
	is_target = is_target_zone


func add_heat(heat_amount: float) -> void:
	# Increase zone heat and clamp the result between zero and one hundred.
	heat = clampf(heat + heat_amount, 0.0, 100.0)


func get_normalized_heat() -> float:
	# Return heat as a zero-to-one fraction for display and gradient sampling.
	return heat / 100.0
