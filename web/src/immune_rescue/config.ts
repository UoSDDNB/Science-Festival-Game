import { ImmunePalette } from "./types";

/** Tunables for Immune Rescue balance and touch chrome. */
export const IMMUNE_CONFIG = {
  worldWidth: 1920,
  worldHeight: 1080,
  /** Colonies the player must engulf to win (ramps difficulty with progress). */
  winEngulfCount: 10,
  maxTissueDamage: 100,
  /** Damage per second scaled by live colony count. */
  damagePerColonyPerSec: 1.55,
  neutrophilSpeed: 280,
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
  /** Single-player: always keep this many bacteria visible (refill on kill). */
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
  /** Seconds before NETosis can be used again. */
  netosisCooldownSeconds: 8,
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
  title: "CLEARED!",
  body: "Your neutrophil followed the chemical trail, engulfed the invaders, and protected the tissue.",
  biologyLine:
    "That is chemotaxis and phagocytosis — immune cells smell infection, crawl toward it, and swallow the threat.",
};

export const IMMUNE_FAIL = {
  title: "OVERWHELMED",
  body: "Infection spread faster than the neutrophil could clear. Tissue integrity collapsed.",
  biologyLine:
    "When pathogens outpace innate immunity, inflammation and tissue damage spiral — this is why speed and targeting matter.",
  triggerSeconds: 0,
};

/** Opening briefing shown before Immune Rescue gameplay starts. */
export const IMMUNE_INTRO = {
  title: "Infection detected",
  body:
    "You have an infection. Your neutrophil has moved from the blood stream into the tissue.\n\n" +
    "You are a neutrophil and you need to engulf the bacteria before your immune system becomes overwhelmed.\n\n" +
    "Press the AI help to release granule proteins and chromatin to help you kill the bacteria.",
  dismiss: "Tap anywhere to begin",
} as const;
