class_name Channel
extends RefCounted

## A connection between two zones through which heat flows.
## Visually rendered as a natural ice crack or fissure.

var zone_a_id: int
var zone_b_id: int
var conductivity: float
var visual: Line2D = null


func _init(
	first_zone_identifier: int,
	second_zone_identifier: int,
	channel_conductivity: float
) -> void:
	# Store the identifier of the first connected zone.
	zone_a_id = first_zone_identifier
	# Store the identifier of the second connected zone.
	zone_b_id = second_zone_identifier
	# Store how easily heat flows across this channel.
	conductivity = channel_conductivity
