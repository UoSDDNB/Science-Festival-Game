import Phaser from "phaser";

/**
 * Build all procedural textures once at boot.
 * Everything in this file is canvas-based — no external assets.
 */
export function buildProceduralTextures(scene: Phaser.Scene): void {
  buildRadialGlow(scene, "glow-warm", [255, 220, 120, 1.0], [255, 90, 20, 0.0], 256);
  buildRadialGlow(scene, "glow-hot", [255, 240, 200, 1.0], [255, 80, 30, 0.0], 256);
  buildRadialGlow(scene, "glow-cold", [180, 220, 255, 1.0], [40, 80, 160, 0.0], 256);
  buildSoftDisc(scene, "disc-soft", 64);
  buildEmber(scene, "ember", 32);
  buildFlake(scene, "flake", 32);
  buildSpark(scene, "spark", 24);
}

function buildRadialGlow(
  scene: Phaser.Scene,
  key: string,
  innerRgba: [number, number, number, number],
  outerRgba: [number, number, number, number],
  size: number,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, `rgba(${innerRgba[0]},${innerRgba[1]},${innerRgba[2]},${innerRgba[3]})`);
  g.addColorStop(0.5, `rgba(${innerRgba[0]},${innerRgba[1]},${innerRgba[2]},${innerRgba[3] * 0.45})`);
  g.addColorStop(1, `rgba(${outerRgba[0]},${outerRgba[1]},${outerRgba[2]},${outerRgba[3]})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

function buildSoftDisc(scene: Phaser.Scene, key: string, size: number): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.6, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

function buildEmber(scene: Phaser.Scene, key: string, size: number): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(255,230,170,1)");
  g.addColorStop(0.4, "rgba(255,140,50,0.85)");
  g.addColorStop(1, "rgba(180,40,10,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

function buildFlake(scene: Phaser.Scene, key: string, size: number): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(240,250,255,0.95)");
  g.addColorStop(1, "rgba(180,210,240,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

function buildSpark(scene: Phaser.Scene, key: string, size: number): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(255,255,220,1)");
  g.addColorStop(0.6, "rgba(255,180,80,0.6)");
  g.addColorStop(1, "rgba(255,80,30,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}
