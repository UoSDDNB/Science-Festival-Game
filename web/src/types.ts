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
