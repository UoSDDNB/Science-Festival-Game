import Phaser from "phaser";
import { IMMUNE_CONFIG } from "./config";

/** Texture keys loaded from repo `images/` (served via `web/public/images`). */
export const IMMUNE_TEX = {
  tissue: "immune-tissue",
  bacteria: "immune-bacteria",
  neutrophil: "immune-neutrophil",
} as const;

const IMAGE_PATHS: Record<(typeof IMMUNE_TEX)[keyof typeof IMMUNE_TEX], string> = {
  [IMMUNE_TEX.tissue]: "images/Tissue.png",
  [IMMUNE_TEX.bacteria]: "images/bacteria.png",
  [IMMUNE_TEX.neutrophil]: "images/neutrophil.png",
};

/** Bacteria on-screen width (smaller than the neutrophil). */
export function microbeSpriteWidth(): number {
  return IMMUNE_CONFIG.colonyBaseRadius * 2.0;
}

export function bacteriaDisplaySize(_radius: number): { w: number; h: number } {
  const w = microbeSpriteWidth();
  return { w, h: w * 0.55 };
}

/** Neutrophil diameter — larger than bacteria for clear player focus. */
export function neutrophilDisplaySize(sizeScale = 1): number {
  return IMMUNE_CONFIG.colonyBaseRadius * 5.5 * sizeScale;
}

/** Queue Immune Rescue PNGs on a Phaser loader (BootScene). */
export function preloadImmuneImages(scene: Phaser.Scene): void {
  for (const [key, path] of Object.entries(IMAGE_PATHS)) {
    if (!scene.textures.exists(key)) {
      scene.load.image(key, path);
    }
  }
}

/**
 * Turn near-black pixels transparent on sprite sheets that ship on a black matte
 * (bacteria / neutrophil art).
 */
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
  // Replace texture source with processed canvas.
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  scene.textures.addCanvas(key, canvas);
}

/**
 * Tissue backdrop that zooms (uniform scale) until it covers the viewport —
 * fills left/right/top/bottom; excess is cropped, aspect preserved.
 * Always pass the current logical screen size from `viewportSize(scene)` so
 * the zoom adapts to phone, tablet, and desktop viewports.
 */
export function addTissueBackground(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container | null,
  width: number,
  height: number,
): Phaser.GameObjects.Image {
  const img = scene.add.image(0, 0, IMMUNE_TEX.tissue).setOrigin(0.5, 0.5);
  img.setScrollFactor(0);
  img.setDepth(0);
  zoomTissueToFill(img, width, height);
  if (parent) parent.add(img);
  return img;
}

/**
 * Zoom tissue to cover `width`×`height` (object-fit: cover).
 * Call again whenever the screen size changes.
 */
export function zoomTissueToFill(
  img: Phaser.GameObjects.Image,
  width: number,
  height: number,
): void {
  const vw = Math.max(1, width);
  const vh = Math.max(1, height);
  const fw = Math.max(1, img.frame.realWidth);
  const fh = Math.max(1, img.frame.realHeight);
  const zoom = Math.max(vw / fw, vh / fh);
  img.setOrigin(0.5, 0.5);
  img.setScale(zoom);
  img.setPosition(vw / 2, vh / 2);
}

/**
 * Logical game viewport from Phaser Scale.RESIZE — tracks the player's
 * actual screen/browser size (not retina backing-store pixels).
 */
export function viewportSize(scene: Phaser.Scene): { w: number; h: number } {
  return {
    w: Math.max(1, scene.scale.width),
    h: Math.max(1, scene.scale.height),
  };
}
