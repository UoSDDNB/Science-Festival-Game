import type { AminoAcidCode } from "./types";

/** Standard 20 proteinogenic amino acids (one-letter codes). */
export const AMINO_ACIDS: readonly AminoAcidCode[] = [
  "A",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "K",
  "L",
  "M",
  "N",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "V",
  "W",
  "Y",
] as const;

/** Insulin B-chain sequence — AlphaFold prediction target (after starter M). */
export const TARGET_SEQUENCE = "FVNQHLCGSHLVEALYLVCGERGFFYTPKT" as const;

export const PROTEIN_PALETTE = {
  bgTop: "#0a1424",
  bgBottom: "#18253c",
  panelBg: 0x120818,
  panelBorder: 0x4fd1c5,
  accent: "#4fd1c5",
  title: "#ffd86a",
  body: "#e8eef8",
  alphaFold: "#8fb6ff",
  correct: "#5ad07a",
  wrong: "#ff5a4a",
};

export const PROTEIN_CONFIG = {
  /** Player chain head movement speed (px/s in play space). */
  chainSpeed: 340,
  /** Decoys shown alongside the target (target + decoys = 3 choices). */
  decoyCount: 2,
  /** Exactly three floating amino acids at a time. */
  maxFloating: 3,
  /** Wrong picks before fail. */
  maxWrong: 5,
  /** Full names for HUD labels. */
  acidNames: {
    A: "Alanine",
    C: "Cysteine",
    D: "Aspartate",
    E: "Glutamate",
    F: "Phenylalanine",
    G: "Glycine",
    H: "Histidine",
    I: "Isoleucine",
    K: "Lysine",
    L: "Leucine",
    M: "Methionine",
    N: "Asparagine",
    P: "Proline",
    Q: "Glutamine",
    R: "Arginine",
    S: "Serine",
    T: "Threonine",
    V: "Valine",
    W: "Tryptophan",
    Y: "Tyrosine",
  } satisfies Record<AminoAcidCode, string>,
};

export const PROTEIN_HINT =
  "Drag methionine (M) to the amino acid that matches AlphaFold's next prediction. Build the insulin sequence and watch the structure fold.";

export const PROTEIN_INTRO = {
  title: "Make that protein!",
  body:
    "AlphaFold has predicted the 3D structure of insulin from its amino acid sequence.\n\n" +
    "Drag the start protein M to the next amino acid on screen that matches the AlphaFold prediction and build the chain residue by residue.",
  dismiss: "Tap to begin",
};

export const PROTEIN_WIN = {
  title: "Well done!",
  body: "You built the insulin amino acid sequence and folded the predicted protein structure.",
  biologyLine: "AlphaFold solved protein folding from sequence — insulin is a classic example of structure-driven function.",
};

export const PROTEIN_FAIL = {
  title: "Bad luck!",
  body: "Too many mismatched amino acids — the ribosome couldn't finish the chain in time.",
  biologyLine: "Check AlphaFold's next prediction and steer your chain to the matching letter on screen.",
};
