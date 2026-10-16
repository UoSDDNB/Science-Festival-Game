import Phaser from "phaser";
import { applyDisplayWidth, PROTEIN_TEX } from "./assets";
import type { PlayBounds } from "./types";

/** Ribosome image anchored at the bottom of the play panel (no amino acid sprites). */
export class RibosomeStrip {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly ribosome: Phaser.GameObjects.Image;
  private bounds: PlayBounds = { left: 0, top: 0, width: 100, height: 60 };
  private pulseTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(1100).setScrollFactor(0);
    this.ribosome = scene.add.image(0, 0, PROTEIN_TEX.ribosome).setOrigin(0.5, 0.5);
    this.root.add(this.ribosome);
  }

  setSequence(_sequence: string): void {
    // Sequence is shown in the HUD and structure panel only.
  }

  playAddAnimation(): void {
    this.pulseTween?.stop();
    const riboW = Math.min(this.bounds.height * 1.6, this.bounds.width * 0.22);
    applyDisplayWidth(this.ribosome, riboW);
    this.pulseTween = this.scene.tweens.add({
      targets: this.ribosome,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 120,
      yoyo: true,
    });
  }

  layout(play: PlayBounds, stripH: number): void {
    this.bounds = { ...play, height: stripH };
    const y = play.top + play.height - stripH / 2;
    this.root.setPosition(play.left + play.width / 2, y);
    const riboW = Math.min(stripH * 1.6, play.width * 0.22);
    applyDisplayWidth(this.ribosome, riboW);
    this.ribosome.setPosition(0, 0);
  }

  spawnZoneHeight(play: PlayBounds): number {
    return Math.max(80, play.height - this.bounds.height - 8);
  }

  destroy(): void {
    this.pulseTween?.stop();
    this.root.destroy(true);
  }
}
