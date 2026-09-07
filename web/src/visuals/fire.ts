import Phaser from "phaser";
import { LevelDef } from "../types";
import { hexToInt } from "./palette";

/**
 * Procedural fire — a glow + a particle plume. Intensity drives every
 * visual knob so the player feels "stoking" instantly.
 *
 * Two visual kinds:
 *   - "campfire" (default): logs + upward flame plume. Used for Ice Age / Norse.
 *   - "pollen": no logs, spiky grain at the base, omnidirectional dust halo.
 *     Used for mast-cell-style levels where the source is a particle cloud.
 */
export class FireVisual {
  readonly container: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly hotCore: Phaser.GameObjects.Image;
  private readonly flameEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly emberEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly kind: "campfire" | "pollen";

  constructor(scene: Phaser.Scene, def: LevelDef) {
    const c = scene.add.container(def.fire.x, def.fire.y);
    c.setDepth(5);
    this.container = c;
    this.kind = def.fire.kind ?? "campfire";

    const baseG = scene.add.graphics();
    if (this.kind === "campfire") {
      // Logs / base
      baseG.fillStyle(0x3a2418, 1);
      baseG.fillRoundedRect(-60, 10, 120, 22, 10);
      baseG.fillStyle(0x5a3825, 1);
      baseG.fillRoundedRect(-50, 4, 100, 14, 7);
      baseG.lineStyle(2, 0x2a1810, 0.7);
      baseG.strokeRoundedRect(-60, 10, 120, 22, 10);
    } else {
      // Pollen grain: spiky golden disc with darker spore body
      const pollen = hexToInt(def.palette.fire);
      const dark = 0xd49a18;
      baseG.fillStyle(dark, 1);
      baseG.fillCircle(0, 0, 26);
      baseG.fillStyle(pollen, 1);
      baseG.fillCircle(0, 0, 20);
      // Procedural spikes
      baseG.fillStyle(dark, 0.85);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const tipX = Math.cos(a) * 28;
        const tipY = Math.sin(a) * 28;
        const sideAng = a + Math.PI / 2;
        const sX = Math.cos(a) * 18;
        const sY = Math.sin(a) * 18;
        baseG.fillTriangle(
          sX + Math.cos(sideAng) * 3, sY + Math.sin(sideAng) * 3,
          sX - Math.cos(sideAng) * 3, sY - Math.sin(sideAng) * 3,
          tipX, tipY,
        );
      }
      // Inner glint
      baseG.fillStyle(0xfff5b8, 0.8);
      baseG.fillCircle(-5, -6, 5);
    }
    c.add(baseG);

    // Outer glow
    this.glow = scene.add.image(0, this.kind === "campfire" ? -20 : 0, "glow-warm");
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    this.glow.setScale(2.5);
    this.glow.setTint(hexToInt(def.palette.fire));
    c.add(this.glow);

    // Inner hot core
    this.hotCore = scene.add.image(0, this.kind === "campfire" ? -10 : 0, "glow-hot");
    this.hotCore.setBlendMode(Phaser.BlendModes.ADD);
    this.hotCore.setScale(0.7);
    c.add(this.hotCore);

    if (this.kind === "campfire") {
      this.flameEmitter = scene.add.particles(0, 0, "ember", {
        x: { min: -14, max: 14 },
        y: { min: -10, max: 4 },
        speedY: { min: -150, max: -90 },
        speedX: { min: -25, max: 25 },
        lifespan: 700,
        scale: { start: 0.7, end: 0 },
        alpha: { start: 0.85, end: 0 },
        tint: [hexToInt(def.palette.fireHot), hexToInt(def.palette.fire), 0xff9050],
        blendMode: Phaser.BlendModes.ADD,
        frequency: 30,
        quantity: 1,
      });
      this.emberEmitter = scene.add.particles(0, 0, "spark", {
        x: 0,
        y: -20,
        speedY: { min: -130, max: -240 },
        speedX: { min: -40, max: 40 },
        lifespan: 1400,
        scale: { start: 0.35, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: 0xffd060,
        blendMode: Phaser.BlendModes.ADD,
        frequency: 90,
        quantity: 1,
      });
    } else {
      // Pollen: omnidirectional drift of tiny yellow dust
      this.flameEmitter = scene.add.particles(0, 0, "ember", {
        x: { min: -10, max: 10 },
        y: { min: -10, max: 10 },
        speedY: { min: -50, max: 50 },
        speedX: { min: -50, max: 50 },
        lifespan: 1100,
        scale: { start: 0.35, end: 0 },
        alpha: { start: 0.75, end: 0 },
        tint: [hexToInt(def.palette.fireHot), hexToInt(def.palette.fire)],
        blendMode: Phaser.BlendModes.ADD,
        frequency: 35,
        quantity: 1,
      });
      this.emberEmitter = scene.add.particles(0, 0, "spark", {
        x: { min: -6, max: 6 },
        y: { min: -6, max: 6 },
        speedY: { min: -90, max: 90 },
        speedX: { min: -90, max: 90 },
        lifespan: 1800,
        scale: { start: 0.22, end: 0 },
        alpha: { start: 0.7, end: 0 },
        tint: 0xffe060,
        blendMode: Phaser.BlendModes.ADD,
        frequency: 90,
        quantity: 1,
      });
    }
    this.flameEmitter.setDepth(5);
    this.emberEmitter.setDepth(5);
    c.add(this.flameEmitter);
    c.add(this.emberEmitter);
  }

  update(intensity: number): void {
    const t = Math.max(0, Math.min(1.5, (intensity - 0.3) / 2.2));
    this.glow.setScale(2.0 + intensity * 1.4);
    this.glow.setAlpha(0.55 + Math.min(0.4, intensity * 0.25));
    this.hotCore.setScale(0.5 + intensity * 0.6);
    this.hotCore.setAlpha(0.5 + t * 0.5);

    this.flameEmitter.setFrequency(Math.max(8, 50 - intensity * 18));
    this.flameEmitter.setParticleScale(0.4 + intensity * 0.5);

    this.emberEmitter.setFrequency(Math.max(30, 130 - intensity * 40));
    this.emberEmitter.setParticleScale(0.22 + intensity * 0.25);
  }

  destroy(): void {
    this.container.destroy();
  }
}
