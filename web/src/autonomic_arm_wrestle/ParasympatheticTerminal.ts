import Phaser from "phaser";
import { ANS_COLORS, ANS_CONFIG } from "./config";
import type { MoleculePool } from "./MoleculePool";
import type { PooledMolecule } from "./types";

/** P1 parasympathetic terminal — ACh packaging, vesicle release, MAO enzyme tap. */
export class ParasympatheticTerminal {
  private readonly root: Phaser.GameObjects.Container;
  private readonly chrome: Phaser.GameObjects.Container;
  private vesicleCount = 0;
  private vesicleGfx: Phaser.GameObjects.Arc;
  private membraneY = 0;
  private left = 0;
  private right = 0;
  private top = 0;
  private bottom = 0;
  private enzymeZone: Phaser.Geom.Circle;
  private dragging: PooledMolecule | null = null;
  private dragPointer = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly pool: MoleculePool,
    private readonly onRelease: (x: number, y: number) => void,
    private readonly onEnzymeTap: (x: number, y: number) => boolean,
  ) {
    this.root = scene.add.container(0, 0).setDepth(40);
    this.chrome = scene.add.container(0, 0);
    this.root.add(this.chrome);
    this.vesicleGfx = scene.add.circle(0, 0, ANS_CONFIG.vesicleRadius, ANS_COLORS.p1, 0.35);
    this.vesicleGfx.setStrokeStyle(2, ANS_COLORS.p1, 0.9);
    this.root.add(this.vesicleGfx);
    this.enzymeZone = new Phaser.Geom.Circle(0, 0, ANS_CONFIG.enzymeTapRadius);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp);
  }

  layout(left: number, right: number, top: number, bottom: number): void {
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.membraneY = top + (bottom - top) * 0.72;
    this.enzymeZone.setTo(left + (right - left) * 0.2, bottom - 36, ANS_CONFIG.enzymeTapRadius);
    this.vesicleGfx.setPosition(left + (right - left) * 0.5, top + (bottom - top) * 0.45);
    this.chrome.removeAll(true);
    this.chrome.add(
      this.scene.add
        .text(left + 8, top + 8, "P1 · ACh · MAO", {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: "11px",
          color: "#4fd1c5",
        })
        .setOrigin(0, 0),
    );
    const enzyme = this.scene.add.circle(this.enzymeZone.x, this.enzymeZone.y, 18, 0x224466, 0.9);
    enzyme.setStrokeStyle(2, ANS_COLORS.p1, 0.8);
    this.chrome.add(enzyme);
    this.chrome.add(
      this.scene.add
        .text(this.enzymeZone.x, this.enzymeZone.y, "MAO", {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: "10px",
          color: "#ffffff",
        })
        .setOrigin(0.5),
    );
    if (this.pool.entries.every((m) => !m.active || m.kind !== "ach_free")) {
      this.spawnFreeDots();
    }
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp);
    this.root.destroy(true);
  }

  private spawnFreeDots(): void {
    for (let i = 0; i < ANS_CONFIG.freeDotCount; i++) {
      const x = Phaser.Math.Between(this.left + 20, this.right - 20);
      const y = Phaser.Math.Between(this.top + 40, this.membraneY - 30);
      this.pool.spawn("ach_free", x, y);
    }
  }

  private inZone(x: number): boolean {
    return x < this.scene.scale.width * 0.5;
  }

  private onDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.inZone(pointer.x)) return;
    if (Phaser.Geom.Circle.Contains(this.enzymeZone, pointer.x, pointer.y)) {
      this.onEnzymeTap(pointer.x, pointer.y);
      return;
    }
    for (const m of this.pool.entries) {
      if (!m.active || m.kind !== "ach_free") continue;
      if (Phaser.Math.Distance.Between(pointer.x, pointer.y, m.sprite.x, m.sprite.y) <= m.r + 6) {
        this.dragging = m;
        this.dragPointer = pointer.id;
        return;
      }
    }
    if (
      this.vesicleCount >= ANS_CONFIG.dotsPerVesicle &&
      Phaser.Math.Distance.Between(pointer.x, pointer.y, this.vesicleGfx.x, this.vesicleGfx.y) <=
        ANS_CONFIG.vesicleRadius + 8
    ) {
      this.dragPointer = pointer.id;
    }
  };

  private onMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.dragPointer || !pointer.isDown) return;
    if (this.dragging) {
      this.dragging.sprite.setPosition(pointer.x, pointer.y);
      const d = Phaser.Math.Distance.Between(
        pointer.x,
        pointer.y,
        this.vesicleGfx.x,
        this.vesicleGfx.y,
      );
      if (d < ANS_CONFIG.vesicleRadius + 8) {
        this.pool.recycle(this.dragging);
        this.dragging = null;
        this.vesicleCount = Math.min(ANS_CONFIG.dotsPerVesicle, this.vesicleCount + 1);
        this.vesicleGfx.setFillStyle(ANS_COLORS.p1, 0.2 + 0.15 * this.vesicleCount);
      }
      return;
    }
    if (this.vesicleCount >= ANS_CONFIG.dotsPerVesicle) {
      this.vesicleGfx.setPosition(
        Phaser.Math.Clamp(pointer.x, this.left + 30, this.right - 10),
        Phaser.Math.Clamp(pointer.y, this.top + 30, this.bottom - 10),
      );
    }
  };

  private onUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.dragPointer) return;
    if (
      this.vesicleCount >= ANS_CONFIG.dotsPerVesicle &&
      this.vesicleGfx.y >= this.membraneY - 10
    ) {
      this.onRelease(this.right - 8, this.vesicleGfx.y);
      this.vesicleCount = 0;
      this.vesicleGfx.setFillStyle(ANS_COLORS.p1, 0.35);
      this.vesicleGfx.setPosition(this.left + (this.right - this.left) * 0.5, this.top + (this.bottom - this.top) * 0.45);
      this.spawnFreeDots();
    }
    this.dragging = null;
    this.dragPointer = -1;
  };
}
