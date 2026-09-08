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
  /** Optional in-scene animation that plays BEFORE the win panel. Currently
   *  only "sneeze" (mast-cell degranulation burst). Data-driven so any
   *  degranulation-themed level (mast_cell, two_keys) can use it. */
  cutscene?: "sneeze";
  title: string;
  body: string;
  biologyLine: string;
}

export type CreatureKind = "scrat" | "sprite" | "mast_cell" | "neutrophil";
export type BackgroundKind = "ice_age" | "enchanted" | "tissue" | "nasal_journey";
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
  /** Optional SECOND heat source (e.g. a second pollen grain). Both sources
   *  feed the SAME `manualHeat` total, but when `keyHeatCaps` is set each
   *  source's contribution is capped — the AND-gate requirement (idea 4 "Two
   *  Keys": the mast cell only degranulates when IgE is CROSSED, i.e. two
   *  allergens bind at once). Without caps the behaviour is a plain
   *  dual-source level. */
  fireSecondary?: { x: number; y: number; tapRadius: number; kind?: FireKind };
  /** Optional per-source cap on `manualHeat` contribution (e.g. 45 each → a
   *  single source can never reach a 50-70 band alone; BOTH sources are
   *  required — the "Two Keys" AND-gate, ideas 4/11). When absent (or with a
   *  single source) behaviour is the legacy uncapped single total. */
  keyHeatCap?: number;
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
