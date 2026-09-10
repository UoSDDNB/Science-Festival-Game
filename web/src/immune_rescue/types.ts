/** Shared types for the Immune Rescue scene family. */

export type ImmuneMode = "single" | "two";

export interface ImmuneLaunchData {
  mode: ImmuneMode;
}

export interface Colony {
  id: number;
  x: number;
  y: number;
  radius: number;
  size: number;
  replicateTimer: number;
  /** Runtime Phaser container; typed loosely to avoid pulling Phaser into this module. */
  visual: { destroy: (fromScene?: boolean) => void; setPosition?: (x: number, y: number) => void } | null;
}

export interface Decoy {
  id: number;
  x: number;
  y: number;
  life: number;
  /** Runtime Phaser container; typed loosely to avoid pulling Phaser into this module. */
  visual: { destroy: (fromScene?: boolean) => void } | null;
}

export interface ImmunePalette {
  bgTop: string;
  bgBottom: string;
  ground: string;
  groundAccent: string;
  neutrophil: string;
  neutrophilAccent: string;
  bacteria: string;
  decoy: string;
  scent: string;
  accent: string;
}
