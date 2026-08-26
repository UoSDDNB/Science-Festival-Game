export interface Palette {
  bgTop: string;
  bgBottom: string;
  ground: string;
  groundAccent: string;
  fire: string;
  fireHot: string;
  obstacle: string;
  creature: string;
  creatureAccent: string;
  accent: string;
}

export interface SimConfig {
  diffusion: number;
  dissipation: number;
  sourceHeat: number;
  targetRadius: number;
  tapHeat: number;
  dragHeat: number;
  decayPerSec: number;
}

export interface WinConfig {
  minHeat: number;
  maxHeat: number;
  dangerHeat: number;
  sustainSeconds: number;
  title: string;
  body: string;
  biologyLine: string;
}

export type CreatureKind = "scrat" | "dragon" | "sprite" | "mast_cell";
export type BackgroundKind = "ice_age" | "norse" | "enchanted" | "tissue" | "nasal_journey";
export type FireKind = "campfire" | "pollen";

export interface FailConfig {
  /** Seconds above dangerHeat before the fail state triggers. */
  triggerSeconds: number;
  title: string;
  body: string;
  biologyLine: string;
}

export interface LevelDef {
  id: string;
  name: string;
  order: number;
  unlocked: boolean;
  background: BackgroundKind;
  palette: Palette;
  /** Optional override for level world width. If > 1920, the level uses scroll-camera mode. */
  worldWidth?: number;
  /** If present, the camera tracks the player's finger with smooth lerping (defaults to true when worldWidth > 1920). */
  cameraFollow?: boolean;
  fire: { x: number; y: number; tapRadius: number; kind?: FireKind };
  creature: { x: number; y: number; kind: CreatureKind; size: number; encased?: boolean };
  obstacle?: { x: number; y: number; radius: number; kind?: "boulder" | "fibre" };
  /** Multiple obstacles (e.g. a boulder wall the fire must route around). When
   *  present, collision + rendering use this array; the singular `obstacle`
   *  above is the fallback when `obstacles` is absent. Touching any obstacle
   *  surface extinguishes a dragged fire. */
  obstacles?: Array<{ x: number; y: number; radius: number; kind?: "boulder" | "fibre" }>;
  sim: SimConfig;
  win: WinConfig;
  fail?: FailConfig;
  /** If true, screen shake amplitude scales with target heat. */
  shakeWithHeat?: boolean;
  /** Optional label drawn under the meter (thermometer). Levels whose
   *  abstraction is not temperature (e.g. mast_cell: "Activation") set this;
   *  fire levels stay unlabeled. */
  meterLabel?: string;
  /** Per-level instruction text. `drag` required; the rest are optional overrides
   *  of the HintSystem defaults. An empty string suppresses that hint entirely. */
  hints: { drag: string; tap?: string; hold?: string; pinch?: string };
}

export const WORLD_WIDTH = 1920;
export const WORLD_HEIGHT = 1080;
export const GRID_W = 48;
export const GRID_H = 27;
export const CELL_SIZE = WORLD_WIDTH / GRID_W; // 40

/**
 * Single source of truth for a level's obstacle geometry: the `obstacles`
 * array when present, else the legacy singular `obstacle`, else none.
 * Collision, rendering, and the heat-field mask all read this so the rocks
 * you SEE are exactly the rocks that EXTINGUISH a dragged fire.
 */
export type ObstacleDef = { x: number; y: number; radius: number; kind?: "boulder" | "fibre" };
export function obstaclesOf(def: LevelDef): ObstacleDef[] {
  if (def.obstacles && def.obstacles.length) return def.obstacles;
  if (def.obstacle) return [def.obstacle];
  return [];
}
