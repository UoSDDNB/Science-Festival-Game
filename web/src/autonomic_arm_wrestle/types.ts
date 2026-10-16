/** Game phase within AutonomicArmWrestleScene. */
export type AutonomicPhase = "awakening" | "duel" | "result";

export type PlayerSide = "p1" | "p2";

export type MoleculeKind =
  | "ach_free"
  | "ne_free"
  | "ach_cleft"
  | "ne_cleft";

export type ReceptorKind = "M2" | "Beta1";

export type DuelOutcome = "p1_win" | "p2_win" | "draw";

export interface LayoutBands {
  hudTop: number;
  playTop: number;
  playBottom: number;
  cleftLeft: number;
  cleftRight: number;
  cleftCenterX: number;
}

export interface PooledMolecule {
  sprite: Phaser.GameObjects.Arc;
  kind: MoleculeKind;
  active: boolean;
  vx: number;
  vy: number;
  r: number;
}
