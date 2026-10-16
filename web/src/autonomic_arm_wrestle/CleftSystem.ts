import Phaser from "phaser";
import { ANS_COLORS, ANS_CONFIG } from "./config";
import type { MoleculePool } from "./MoleculePool";
import type { PooledMolecule, ReceptorKind } from "./types";

interface Receptor {
  kind: ReceptorKind;
  x: number;
  y: number;
  gfx: Phaser.GameObjects.Arc;
}

/** SA node cleft — receptor binding, drift, and ACh/NE neutralization. */
export class CleftSystem {
  private readonly root: Phaser.GameObjects.Container;
  private receptors: Receptor[] = [];
  private cleftLeft = 0;
  private cleftRight = 0;
  private cleftTop = 0;
  private cleftBottom = 0;
  private lastBindTime = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly pool: MoleculePool,
    private readonly onGaugeDelta: (d: number) => void,
  ) {
    this.root = scene.add.container(0, 0).setDepth(50);
  }

  layout(left: number, right: number, top: number, bottom: number): void {
    this.cleftLeft = left;
    this.cleftRight = right;
    this.cleftTop = top;
    this.cleftBottom = bottom;
    this.root.removeAll(true);
    this.receptors = [];

    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const tissue = this.scene.add.rectangle(cx, cy, right - left, bottom - top, ANS_COLORS.saNode, 0.35);
    tissue.setStrokeStyle(2, 0xffffff, 0.2);
    this.root.add(tissue);

    const m2 = this.makeReceptor("M2", left + (right - left) * 0.35, cy + 20);
    const b1 = this.makeReceptor("Beta1", left + (right - left) * 0.65, cy - 20);
    this.receptors.push(m2, b1);
  }

  update(dt: number, gaugeValue: number): void {
    const now = this.scene.time.now;
    for (const m of this.pool.entries) {
      if (!m.active || !m.kind.endsWith("_cleft")) continue;
      if (m.kind === "ach_cleft") m.vy = ANS_CONFIG.achFallSpeed;
      else m.vy = -ANS_CONFIG.neRiseSpeed;
      m.sprite.x += m.vx * dt;
      m.sprite.y += m.vy * dt;
      if (m.sprite.y < this.cleftTop - 40 || m.sprite.y > this.cleftBottom + 40) {
        this.pool.recycle(m);
        continue;
      }
      for (const r of this.receptors) {
        if (this.tryBind(m, r)) {
          this.lastBindTime = now;
          break;
        }
      }
    }

    this.neutralize();
    if (now - this.lastBindTime > ANS_CONFIG.homeostasisDriftDelaySec * 1000) {
      const drift = (0.5 - gaugeValue) * ANS_CONFIG.homeostasisDrift * dt;
      if (Math.abs(drift) > 0.0001) this.onGaugeDelta(drift);
    }
  }

  destroy(): void {
    this.root.destroy(true);
  }

  private makeReceptor(kind: ReceptorKind, x: number, y: number): Receptor {
    const col = kind === "M2" ? ANS_COLORS.p1 : ANS_COLORS.p2;
    const gfx = this.scene.add.circle(x, y, ANS_CONFIG.receptorRadius, col, 0.25);
    gfx.setStrokeStyle(2, col, 0.9);
    this.root.add(gfx);
    this.root.add(
      this.scene.add
        .text(x, y - 28, kind === "M2" ? "M₂" : "β₁", {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: "12px",
          color: "#ffffff",
        })
        .setOrigin(0.5),
    );
    return { kind, x, y, gfx };
  }

  private tryBind(m: PooledMolecule, r: Receptor): boolean {
    const match =
      (m.kind === "ach_cleft" && r.kind === "M2") || (m.kind === "ne_cleft" && r.kind === "Beta1");
    if (!match) return false;
    const d = Phaser.Math.Distance.Between(m.sprite.x, m.sprite.y, r.x, r.y);
    if (d > ANS_CONFIG.receptorRadius + m.r) return false;
    const delta = r.kind === "M2" ? -ANS_CONFIG.bindPush : ANS_CONFIG.bindPush;
    this.onGaugeDelta(delta);
    this.pool.recycle(m);
    this.scene.tweens.add({ targets: r.gfx, scale: 1.2, duration: 80, yoyo: true });
    return true;
  }

  private neutralize(): void {
    const ach = this.pool.entries.filter((m) => m.active && m.kind === "ach_cleft");
    const ne = this.pool.entries.filter((m) => m.active && m.kind === "ne_cleft");
    for (const a of ach) {
      for (const n of ne) {
        const d = Phaser.Math.Distance.Between(a.sprite.x, a.sprite.y, n.sprite.x, n.sprite.y);
        if (d < ANS_CONFIG.neutralizeRadius * 2) {
          this.pool.recycle(a);
          this.pool.recycle(n);
          break;
        }
      }
    }
  }
}
