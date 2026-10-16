/** Tunables and copy for Autonomic Arm-Wrestle. */
export const ANS_CONFIG = {
  /** Combined stroke units to exit Phase 1 (distance × chargeRate). */
  awakeningThreshold: 400,
  /** Charge added per pixel stroked (primary Phase 1 input). */
  chargeRate: 0.08,
  strokeEmaAlpha: 0.25,
  maxStrokeJumpPx: 80,
  /** Per-side speed decay when no pointer is down (1/s). */
  strokeSpeedDecay: 6,
  biasClampMin: 0.35,
  biasClampMax: 0.65,
  duelDurationSec: 60,
  bindPush: 0.04,
  homeostasisDrift: 0.015,
  homeostasisDriftDelaySec: 2,
  winThreshold: 0.8,
  earlyWinSustainSec: 3,
  dotsPerVesicle: 4,
  achFallSpeed: 140,
  neRiseSpeed: 140,
  moleculeRadius: 9,
  receptorRadius: 22,
  neutralizeRadius: 16,
  enzymeTapRadius: 48,
  minBpm: 45,
  maxBpm: 180,
  postAwakeningBpm: 75,
  vesicleRadius: 28,
  freeDotCount: 8,
  cleftSpawnBurst: 3,
} as const;

export const ANS_COPY = {
  phase1Hint:
    "Both players: stroke your half of the screen rapidly to awaken the SA node.",
  phase2P1Hint:
    "Blue (left): pack ACh into vesicles, release at the membrane, guide ACh to M2 receptors. Tap MAO to destroy NE.",
  phase2P2Hint:
    "Orange (right): pack NE into vesicles, release at the membrane, guide NE to β1 receptors. Tap AChE to destroy ACh.",
  p1WinTitle: "Bradycardia",
  p1WinBody: "The vagus brake won. Heart rate slowed and the body drifted toward sleep.",
  p1Biology:
    "Parasympathetic ACh on M2 receptors slows the SA node — bradycardia is a calm, rest-and-digest state.",
  p2WinTitle: "Tachycardia",
  p2WinBody: "Fight-or-flight took over. Heart rate surged as the body prepared to flee.",
  p2Biology:
    "Sympathetic NE on β1 receptors accelerates the SA node — tachycardia is the fight-or-flight pulse.",
  drawTitle: "Homeostasis",
  drawBody: "Neither branch dominated. The heart stayed near equilibrium.",
  drawBiology:
    "Autonomic balance keeps heart rate in a workable band — too much brake or accelerator is dangerous.",
} as const;

export const ANS_COLORS = {
  p1: 0x4fd1c5,
  p2: 0xff8a4a,
  gaugeBg: 0x1a1028,
  saNode: 0xe8a0b8,
} as const;
