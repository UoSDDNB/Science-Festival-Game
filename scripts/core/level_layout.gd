class_name LevelLayout
extends Resource

## Data-driven level configuration.
## One .tres per level skin — positions, zones, channels, simulation params, win text.

# --- Identity ---
@export var level_name: String = ""
@export var level_id: String = ""

# --- Art ---
@export var background_texture: Texture2D
@export var fire_sprite_texture: Texture2D
@export var fire_sprite_scale: float = 0.0  # 0 = no fire sprite (fire is in background)
@export var creature_texture: Texture2D
@export var creature_thawed_texture: Texture2D

# --- Positions (world coordinates, 1920x1080 reference) ---
@export var fire_position: Vector2 = Vector2(530, 870)
@export var creature_position: Vector2 = Vector2(860, 350)
@export var heart_position: Vector2 = Vector2(860, 400)
@export var obstacle_position: Vector2 = Vector2.ZERO  # Zero = no obstacle
@export var background_position: Vector2 = Vector2(960, 540)

# --- Radii ---
@export var fire_tap_radius: float = 180.0
@export var fire_spread_radius: float = 300.0
@export var creature_no_input_radius: float = 280.0
@export var obstacle_radius: float = 0.0

# --- Creature display ---
@export var creature_scale: float = 0.25

# --- Heart ---
@export var heart_base_scale: float = 0.07

# --- Zone definitions ---
## Each entry: { id: int, conductivity: float, is_source: bool, is_target: bool }
@export var zone_configs: Array[Dictionary] = []

# --- Channel definitions ---
## Each entry: { from: int, to: int, conductivity: float }
@export var channel_configs: Array[Dictionary] = []

# --- Zone polygons (world coordinates) ---
## Each PackedVector2Array defines one zone's polygon. Index matches zone_configs order.
@export var zone_polygons: Array[PackedVector2Array] = []

# --- Obstacle zone ID (-1 = none) ---
@export var obstacle_zone_id: int = -1

# --- Grid simulation tuning ---
@export var use_grid_sim: bool = true
@export var grid_diffusion_rate: float = 0.18
@export var grid_dissipation_rate: float = 0.015
@export var grid_source_heat: float = 8.0
@export var grid_target_radius: int = 3  # cells around creature to average

# --- Simulation tuning (shared) ---
@export var dissipation_rate: float = 0.035
@export var max_fire_distance: float = 850.0
@export var tap_heat: float = 20.0
@export var hold_base_heat: float = 5.0
@export var hold_accel_rate: float = 0.8
@export var drag_heat: float = 8.0

# --- Win conditions ---
@export var win_sustain_duration: float = 2.5
@export var target_heat_min: float = 50.0
@export var target_heat_max: float = 70.0
@export var damage_threshold: float = 85.0

# --- Win screen text ---
@export var win_title: String = "AWAKENED"
@export var win_body: String = ""
@export var win_biology_line: String = ""

# --- Hint text overrides ---
@export var hint_drag_text: String = "Drag from fire toward the creature"


func has_obstacle() -> bool:
	return obstacle_position != Vector2.ZERO and obstacle_radius > 0.0
