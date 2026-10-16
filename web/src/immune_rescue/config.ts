import { ImmunePalette } from "./types";

/** Tunables for Immune Rescue balance and touch chrome. */
export const IMMUNE_CONFIG = {
  worldWidth: 1920,
  worldHeight: 1080,
  /** Colonies the player must engulf to win (ramps difficulty with progress). */
  winEngulfCount: 15,
  /** Tissue integrity pool (~10 extra seconds vs base 100 at three live colonies). */
  maxTissueDamage: 147,
  /** Damage per second scaled by live colony count. */
  damagePerColonyPerSec: 1.55,
  neutrophilSpeed: 370,
  neutrophilRadius: 360,
  /** Soft scent pull — finger steering is required to engulf. */
  chemotaxisAssist: 0.12,
  /** Ambient bacterial drift (world units / sec). */
  bacteriaWanderSpeed: 58,
  joystickRadius: 72,
  joystickDeadzone: 0.12,
  colonyBaseRadius: 120,
  colonyEmitAmount: 14,
  colonyEmitRadiusCells: 2.5,
  replicateSeconds: 7.5,
  aiSpawnSeconds: 5.5,
  /** Two-player cap for P2-placed colonies. */
  maxColonies: 22,
  /** Single-player: always keep this many bacteria visible (refill on destroy). */
  minColoniesOnScreen: 2,
  maxColoniesOnScreen: 3,
  maxDecoys: 6,
  decoyEmitAmount: 18,
  decoyLifeSeconds: 9,
  p2ColonyCooldown: 1.1,
  p2DecoyCooldown: 2.2,
  initialColonies: 3,
  engulfBurstCount: 12,
  /** How strongly late-game colonies flee the neutrophil (world units / sec at full progress). */
  fleeSpeedMax: 95,
  /** NETosis: max reach from neutrophil to pick targets (world units). */
  netosisRadius: 420,
  /** Seconds before NETosis can be used again (button shows 5→1 countdown). */
  netosisCooldownSeconds: 5,
  /** How long each trap web stays visible at a bacterium. */
  netosisLifeSeconds: 5.5,
  /** Max trap webs on screen at once. */
  netosisMaxActive: 8,
  /** Speed of chromatin fibers shot from the neutrophil (world units / sec). */
  netosisFiberSpeed: 640,
  /** Pause between each bacterium in one NETosis burst. */
  netosisShotGapSeconds: 0.32,
  /** Max bacteria targeted per button press. */
  netosisMaxTargetsPerSalvo: 10,
  /** Trap visual size relative to colony radius. */
  netosisTrapRadiusScale: 1.45,
  /** Late-game colony size multiplier floor (smaller = harder to engulf). */
  minColonySizeScale: 0.45,
} as const;

export const IMMUNE_PALETTE: ImmunePalette = {
  bgTop: "#3a1220",
  bgBottom: "#7a2a3a",
  ground: "#5a1f2e",
  groundAccent: "#a04a5e",
  neutrophil: "#d8e8f8",
  neutrophilAccent: "#4a6a9a",
  bacteria: "#5ad07a",
  decoy: "#ffe060",
  scent: "#4fd1c5",
  accent: "#4fd1c5",
};

export const IMMUNE_WIN = {
  title: "Well done!",
  body: "Your neutrophil engulfed the bacteria via phagocytosis and cleared the infection.",
  biologyLine:
    "The AI helper also released extracellular nets to trap and destroy bacteria using granule proteins and chromatin.",
};

export const IMMUNE_FAIL = {
  title: "Bad luck!",
  body: "Engulfing the bacteria via phagocytosis alone is not enough to clear the spread of infection.",
  biologyLine:
    "Try using the AI helper to release extracellular nets to trap and destroy the bacteria using granule proteins and chromatin to help you.",
  triggerSeconds: 0,
};

/** Opening briefing shown before Immune Rescue gameplay starts. */
export const IMMUNE_INTRO = {
  title: "Infection detected",
  body:
    "You have an infection. Your neutrophil has moved from the blood stream into the tissue.\n\n" +
    "You are a neutrophil and you need to engulf the bacteria before your immune system becomes overwhelmed.\n\n" +
    "Press the AI help to release granule proteins and chromatin to help you destroy the bacteria.",
  dismiss: "Tap anywhere to begin",
} as const;
