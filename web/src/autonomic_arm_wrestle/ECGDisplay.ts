import Phaser from "phaser";
import { ANS_CONFIG } from "./config";

/** Procedural ECG strip — flatline in Phase 1, BPM-coupled in Phase 2. */
export class ECGDisplay {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly root: Phaser.GameObjects.Container;
  private bpm = 60;
  private flatline = true;
  private phase = 0;
  private scroll = 0;
  private stripW = 400;

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1490);
    parent.add(this.root);
    const bg = scene.add.rectangle(0, 0, 420, 56, 0x050810, 0.85);
    bg.setStrokeStyle(1, 0x4fd1c5, 0.35);
    this.root.add(bg);
    this.gfx = scene.add.graphics();
    this.root.add(this.gfx);
    this.root.add(
      scene.add
        .text(-190, -34, "ECG", {
          fontFamily: "ui-monospace, monospace",
          fontSize: "11px",
          color: "#4fd1c5",
        })
        .setOrigin(0, 0.5),
    );
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
    this.flatline = false;
  }

  setFlatline(on: boolean): void {
    this.flatline = on;
    if (on) this.bpm = 40;
  }

  layout(cx: number, cy: number, width: number): void {
    this.stripW = Math.min(420, width - 40);
    this.root.setPosition(cx, cy);
  }

  update(dt: number): void {
    this.scroll += dt * (this.bpm / 60) * 90;
    this.phase += dt * (this.bpm / 60) * Math.PI * 2;
    this.gfx.clear();
    this.gfx.lineStyle(2, 0x4fd1c5, 0.9);
    const left = -this.stripW / 2;
    const midY = 6;
    this.gfx.beginPath();
    this.gfx.moveTo(left, midY);
    for (let x = 0; x <= this.stripW; x += 4) {
      const t = (x + this.scroll) * 0.04;
      let y = midY;
      if (this.flatline) {
        y += Math.sin(t * 0.2) * 1.5;
      } else {
        const beat = Math.sin(t - this.phase * 0.15);
        if (beat > 0.85) y -= 14 * (beat - 0.85) * 6;
        else if (beat > 0.5) y += 6 * (beat - 0.5) * 2;
        y += Math.sin(t * 3) * 1.2;
      }
      this.gfx.lineTo(left + x, y);
    }
    this.gfx.strokePath();
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
