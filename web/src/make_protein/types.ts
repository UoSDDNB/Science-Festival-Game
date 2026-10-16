/** One-letter amino acid code (standard 20). */
export type AminoAcidCode =
  | "A"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "K"
  | "L"
  | "M"
  | "N"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "V"
  | "W"
  | "Y";

export interface PlayBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PanelBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ProteinLayout {
  structure: PanelBounds;
  alphaFold: PanelBounds;
  play: PlayBounds;
  ribosomeStripH: number;
  hintBox: PanelBounds;
}

export interface SpawnedAcid {
  id: number;
  code: AminoAcidCode;
  sprite: Phaser.GameObjects.Image;
  worldX: number;
  worldY: number;
  vx: number;
  vy: number;
}
