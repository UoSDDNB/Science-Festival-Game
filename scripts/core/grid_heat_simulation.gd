class_name GridHeatSimulation
extends Node

## 2D grid-based heat diffusion engine.
## Heat spreads continuously through neighbor cells — no discrete zones.
## Obstacles block diffusion. Fire source injects heat. Target region monitored.

signal heat_changed()

# Grid dimensions (cells)
var grid_w: int = 48
var grid_h: int = 27
var cell_size: float = 40.0

# Simulation params
var diffusion_rate: float = 0.18
var dissipation_rate: float = 0.015
var source_heat_rate: float = 8.0

# State
var heat: PackedFloat32Array  # flat 2D array [y * grid_w + x]
var obstacles: PackedByteArray  # 1 = blocked
var _frozen: bool = false
var _tick_timer: float = 0.0
var tick_interval: float = 0.033  # ~30 Hz simulation

# Source / target positions (grid coords)
var source_cells: Array[Vector2i] = []
var target_center: Vector2i = Vector2i.ZERO
var target_radius: int = 3  # cells radius for target averaging


func setup(p_grid_w: int, p_grid_h: int, p_cell_size: float) -> void:
	grid_w = p_grid_w
	grid_h = p_grid_h
	cell_size = p_cell_size
	var total := grid_w * grid_h
	heat = PackedFloat32Array()
	heat.resize(total)
	heat.fill(0.0)
	obstacles = PackedByteArray()
	obstacles.resize(total)
	obstacles.fill(0)


func set_obstacle_rect(rect: Rect2i) -> void:
	for y in range(maxi(rect.position.y, 0), mini(rect.end.y, grid_h)):
		for x in range(maxi(rect.position.x, 0), mini(rect.end.x, grid_w)):
			obstacles[y * grid_w + x] = 1


func set_obstacle_circle(center: Vector2i, radius: int) -> void:
	for dy in range(-radius, radius + 1):
		for dx in range(-radius, radius + 1):
			if dx * dx + dy * dy <= radius * radius:
				var x := center.x + dx
				var y := center.y + dy
				if x >= 0 and x < grid_w and y >= 0 and y < grid_h:
					obstacles[y * grid_w + x] = 1


func world_to_grid(world_pos: Vector2) -> Vector2i:
	return Vector2i(clampi(int(world_pos.x / cell_size), 0, grid_w - 1),
					clampi(int(world_pos.y / cell_size), 0, grid_h - 1))


func grid_to_world(gx: int, gy: int) -> Vector2:
	return Vector2(gx * cell_size + cell_size * 0.5, gy * cell_size + cell_size * 0.5)


func freeze() -> void:
	_frozen = true


func unfreeze() -> void:
	_frozen = false


func inject_heat(world_pos: Vector2, amount: float, radius: float = 1.5) -> void:
	## Add heat at world position, spreading across nearby cells.
	var center := world_to_grid(world_pos)
	var r := ceili(radius)
	for dy in range(-r, r + 1):
		for dx in range(-r, r + 1):
			var dist := sqrt(float(dx * dx + dy * dy))
			if dist > radius:
				continue
			var x := center.x + dx
			var y := center.y + dy
			if x < 0 or x >= grid_w or y < 0 or y >= grid_h:
				continue
			if obstacles[y * grid_w + x] == 1:
				continue
			var falloff := 1.0 - (dist / radius)
			var idx := y * grid_w + x
			heat[idx] = minf(heat[idx] + amount * falloff, 100.0)


func get_heat_at(world_pos: Vector2) -> float:
	var g := world_to_grid(world_pos)
	return heat[g.y * grid_w + g.x]


func get_target_heat() -> float:
	## Weighted metric: 70% peak + 30% average in cells around target.
	## This way any heat near the creature registers immediately.
	var total := 0.0
	var peak := 0.0
	var count := 0
	for dy in range(-target_radius, target_radius + 1):
		for dx in range(-target_radius, target_radius + 1):
			if dx * dx + dy * dy > target_radius * target_radius:
				continue
			var x := target_center.x + dx
			var y := target_center.y + dy
			if x >= 0 and x < grid_w and y >= 0 and y < grid_h:
				var h := heat[y * grid_w + x]
				total += h
				peak = maxf(peak, h)
				count += 1
	var avg := total / maxf(count, 1.0)
	return peak * 0.7 + avg * 0.3


func _process(delta: float) -> void:
	if _frozen:
		return
	_tick_timer += delta
	if _tick_timer < tick_interval:
		return
	_tick_timer -= tick_interval
	_simulate_tick()
	heat_changed.emit()


func _simulate_tick() -> void:
	# Copy current heat for reading while writing
	var prev := heat.duplicate()

	for y in range(grid_h):
		for x in range(grid_w):
			var idx := y * grid_w + x
			if obstacles[idx] == 1:
				heat[idx] = 0.0
				continue

			var h := prev[idx]

			# Diffusion from neighbors
			var neighbor_sum := 0.0
			var neighbor_count := 0
			for d in [Vector2i(-1, 0), Vector2i(1, 0), Vector2i(0, -1), Vector2i(0, 1)]:
				var nx := x + d.x
				var ny := y + d.y
				if nx >= 0 and nx < grid_w and ny >= 0 and ny < grid_h:
					var nidx := ny * grid_w + nx
					if obstacles[nidx] == 0:
						neighbor_sum += prev[nidx]
						neighbor_count += 1

			if neighbor_count > 0:
				var avg := neighbor_sum / neighbor_count
				h = lerpf(h, avg, diffusion_rate)

			# Dissipation
			h *= (1.0 - dissipation_rate)

			heat[idx] = clampf(h, 0.0, 100.0)

	# Source cells: continuously inject base heat
	for sc in source_cells:
		var idx := sc.y * grid_w + sc.x
		if idx >= 0 and idx < heat.size():
			heat[idx] = minf(heat[idx] + source_heat_rate * tick_interval, 100.0)
