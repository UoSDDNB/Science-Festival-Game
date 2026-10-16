import Phaser from "phaser";
import { AMINO_ACIDS } from "./config";
import type { AminoAcidCode } from "./types";

export const PROTEIN_TEX = {
  ribosome: "protein-ribosome",
  insulin: "protein-insulin",
} as const;

export function aaTextureKey(code: AminoAcidCode): string {
  return `protein-aa-${code}`;
}

/** Native PNG size shared by amino-acid and ribosome art (3000×2100). */
export const AA_NATIVE_WIDTH = 3000;
export const AA_NATIVE_HEIGHT = 2100;
export const AA_ASPECT = AA_NATIVE_HEIGHT / AA_NATIVE_WIDTH;

/** On-screen diameter for floating amino acids (centimetres). */
export const AA_DIAMETER_CM = 2;

/** Player-controlled methionine (M) — larger for easy dragging. */
export const M_DIAMETER_CM = 6;

let cssPxPerCmCache: number | null = null;

/** Browser-calibrated CSS pixels per centimetre (falls back to 96 dpi). */
export function cssPxPerCm(): number {
  if (cssPxPerCmCache !== null) return cssPxPerCmCache;
  if (typeof document === "undefined") {
    cssPxPerCmCache = 96 / 2.54;
    return cssPxPerCmCache;
  }
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.width = "1cm";
  document.body.appendChild(probe);
  cssPxPerCmCache = probe.getBoundingClientRect().width;
  document.body.removeChild(probe);
  return cssPxPerCmCache;
}

export function cmToCssPx(cm: number): number {
  return cm * cssPxPerCm();
}

/** Display width for a 2 cm-diameter amino acid (width is the long axis of the PNG). */
export function aaDisplayWidthPx(): number {
  return Math.round(cmToCssPx(AA_DIAMETER_CM));
}

/** Display width for the player-controlled M. */
export function mDisplayWidthPx(): number {
  return Math.round(cmToCssPx(M_DIAMETER_CM));
}

export interface SpriteDisplaySize {
  w: number;
  h: number;
}

/** Scale sprites by width while preserving the source PNG aspect ratio. */
export function displaySizeFromWidth(width: number): SpriteDisplaySize {
  return { w: width, h: Math.round(width * AA_ASPECT) };
}

export function applyDisplayWidth(
  image: Phaser.GameObjects.Image,
  width: number,
): SpriteDisplaySize {
  return fitPlayfieldSprite(image, width);
}

/** Size play-field amino acid sprites using fixed native art dimensions. */
export function fitPlayfieldSprite(
  image: Phaser.GameObjects.Image,
  width: number,
): SpriteDisplaySize {
  const size = displaySizeFromWidth(width);
  image.setScale(size.w / AA_NATIVE_WIDTH, size.h / AA_NATIVE_HEIGHT);
  return size;
}

/** Touch collection radius for a play-field sprite width. */
export function aaCollectRadiusPx(widthPx: number): number {
  const { w, h } = displaySizeFromWidth(widthPx);
  return Math.round(Math.hypot(w, h) * 0.55);
}

export function applyDisplaySize(
  image: Phaser.GameObjects.Image,
  size: SpriteDisplaySize,
): void {
  image.setScale(size.w / AA_NATIVE_WIDTH, size.h / AA_NATIVE_HEIGHT);
}

/**
 * Size play-field sprites from the bottom play box.
 */
export function playSpriteMetrics(playW: number, zoneH: number): {
  spriteW: number;
  collectRadius: number;
} {
  const pad = 20;
  const usableW = Math.max(80, playW - pad * 2);
  const usableH = Math.max(70, zoneH - pad * 2);
  const fromWidth = usableW / 3.8;
  const fromHeight = (usableH * 0.36) / AA_ASPECT;
  const spriteW = Math.round(Math.max(40, Math.min(fromWidth, fromHeight, 68)));
  return {
    spriteW,
    collectRadius: aaCollectRadiusPx(spriteW),
  };
}

/** Texture key for a play-field amino acid baked to an exact pixel width. */
export function playAaTextureKey(code: AminoAcidCode, width: number): string {
  return `${aaTextureKey(code)}-play-${width}`;
}

/** Bake every amino acid to the play-field size used by M (scale 1 sprites). */
export function rebuildPlayAaTextures(scene: Phaser.Scene, width: number): void {
  const size = displaySizeFromWidth(width);
  for (const code of AMINO_ACIDS) {
    const sourceKey = aaTextureKey(code);
    const playKey = playAaTextureKey(code, width);
    if (!scene.textures.exists(sourceKey)) continue;
    if (scene.textures.exists(playKey)) scene.textures.remove(playKey);
    const src = scene.textures.get(sourceKey).getSourceImage() as CanvasImageSource;
    const canvas = document.createElement("canvas");
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.drawImage(src, 0, 0, size.w, size.h);
    scene.textures.addCanvas(playKey, canvas);
  }
}

/** Queue amino acid PNGs and ribosome art (repo `images/` via `web/public/images`). */
export function preloadProteinImages(scene: Phaser.Scene): void {
  if (!scene.textures.exists(PROTEIN_TEX.ribosome)) {
    scene.load.image(PROTEIN_TEX.ribosome, "images/ribosome.png");
  }
  if (!scene.textures.exists(PROTEIN_TEX.insulin)) {
    scene.load.image(PROTEIN_TEX.insulin, "images/insulin.png");
  }
  for (const code of AMINO_ACIDS) {
    const key = aaTextureKey(code);
    if (!scene.textures.exists(key)) {
      scene.load.image(key, `images/${code}.png`);
    }
  }
}

/** Turn near-black matte pixels transparent on amino acid sprites. */
export function punchBlackMatte(scene: Phaser.Scene, key: string, threshold = 18): void {
  if (!scene.textures.exists(key)) return;
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const w = src.width;
  const h = src.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(src as CanvasImageSource, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i]! <= threshold && d[i + 1]! <= threshold && d[i + 2]! <= threshold) {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  scene.textures.addCanvas(key, canvas);
}

export function punchAllProteinMattes(scene: Phaser.Scene): void {
  punchBlackMatte(scene, PROTEIN_TEX.ribosome);
  punchBlackMatte(scene, PROTEIN_TEX.insulin);
  for (const code of AMINO_ACIDS) {
    punchBlackMatte(scene, aaTextureKey(code));
  }
}

export function viewportSize(scene: Phaser.Scene): { w: number; h: number } {
  return {
    w: Math.max(1, scene.scale.width),
    h: Math.max(1, scene.scale.height),
  };
}
