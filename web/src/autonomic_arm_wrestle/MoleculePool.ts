import Phaser from "phaser";
import { ANS_COLORS, ANS_CONFIG } from "./config";
import type { MoleculeKind, PooledMolecule } from "./types";

/** Object pool for draggable ACh/NE dots and cleft molecules. */
export class MoleculePool {
  readonly entries: PooledMolecule[] = [];
  private readonly scene: Phaser.Scene;
  private readonly parent: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, capacity = 64) {
    this.scene = scene;
    this.parent = parent;
    for (let i = 0; i < capacity; i++) {
      const sprite = scene.add.circle(0, 0, ANS_CONFIG.moleculeRadius, ANS_COLORS.p1, 0.95);
      sprite.setVisible(false);
      parent.add(sprite);
      this.entries.push({
        sprite,
        kind: "ach_free",
        active: false,
        vx: 0,
        vy: 0,
        r: ANS_CONFIG.moleculeRadius,
      });
    }
  }

  spawn(
    kind: MoleculeKind,
    x: number,
    y: number,
    vx = 0,
    vy = 0,
  ): PooledMolecule | null {
    const slot = this.entries.find((e) => !e.active);
    if (!slot) return null;
    slot.active = true;
    slot.kind = kind;
    slot.vx = vx;
    slot.vy = vy;
    slot.sprite.setPosition(x, y);
    slot.sprite.setVisible(true);
    slot.sprite.setFillStyle(kind.startsWith("ach") ? ANS_COLORS.p1 : ANS_COLORS.p2, 0.95);
    slot.sprite.setInteractive({ useHandCursor: true });
    return slot;
  }

  recycle(m: PooledMolecule): void {
    m.active = false;
    m.vx = 0;
    m.vy = 0;
    m.sprite.disableInteractive();
    m.sprite.setVisible(false);
  }

  destroy(): void {
    for (const e of this.entries) e.sprite.destroy();
    this.entries.length = 0;
  }
}
