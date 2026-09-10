import Phaser from "phaser";

export interface ColonyPoint {
  id: number;
  x: number;
  y: number;
}

/**
 * Optional AI assistant: highlights a suggested fastest visit order through
 * all live colonies from the neutrophil’s current position.
 *
 * Does not steer or play. Geometry-only (open travel); updates every frame as
 * colonies appear or disappear.
 */
export class ImmuneAssistant {
  private readonly scene: Phaser.Scene;
  private readonly worldLayer: Phaser.GameObjects.Container;

  private enabled = false;
  private toggleBtn!: Phaser.GameObjects.Container;
  private toggleLabel!: Phaser.GameObjects.Text;
  private routeGfx!: Phaser.GameObjects.Graphics;
  private orderLabels: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, worldLayer: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.worldLayer = worldLayer;
    this.routeGfx = scene.add.graphics().setDepth(9);
    this.worldLayer.add(this.routeGfx);
    this.buildToggle();
    scene.scale.on("resize", this.layout, this);
    this.layout();
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Redraw the suggested tour: neutrophil → colonies in a short open path
   * that visits every live colony once (nearest-neighbour + 2-opt).
   */
  update(neutrophilX: number, neutrophilY: number, colonies: readonly ColonyPoint[]): void {
    if (!this.enabled) {
      this.clearDraw();
      return;
    }
    if (colonies.length === 0) {
      this.clearDraw();
      return;
    }
    const order = shortestOpenTour(neutrophilX, neutrophilY, colonies);
    this.drawTour(neutrophilX, neutrophilY, order);
  }

  destroy(): void {
    this.scene.scale.off("resize", this.layout, this);
    this.clearDraw();
    this.routeGfx.destroy();
    this.toggleBtn.destroy(true);
  }

  private buildToggle(): void {
    this.toggleBtn = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(1520);
    this.toggleBtn.setData("blockSteer", true);
    const tg = this.scene.add.graphics();
    tg.fillStyle(0x0a1420, 0.85);
    tg.fillRoundedRect(-54, -18, 108, 36, 8);
    tg.lineStyle(1, 0x4fd1c5, 0.7);
    tg.strokeRoundedRect(-54, -18, 108, 36, 8);
    this.toggleBtn.add(tg);
    this.toggleLabel = this.scene.add
      .text(0, 0, "AI route", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "14px",
        color: "#cfd8e8",
      })
      .setOrigin(0.5);
    this.toggleBtn.add(this.toggleLabel);
    const hit = this.scene.add
      .rectangle(0, 0, 108, 36, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.setData("blockSteer", true);
    hit.on("pointerdown", () => {
      // Tissue integrity keeps ticking — AI only draws a route hint.
      this.enabled = !this.enabled;
      this.toggleLabel.setText(this.enabled ? "AI on" : "AI route");
      if (!this.enabled) this.clearDraw();
    });
    this.toggleBtn.add(hit);
  }

  private layout = (): void => {
    this.toggleBtn.setPosition(this.scene.scale.width - 70, 40);
  };

  private drawTour(sx: number, sy: number, order: ColonyPoint[]): void {
    this.clearLabelsOnly();
    this.routeGfx.clear();

    // Soft spokes to every colony (context), then bold optimal order.
    this.routeGfx.lineStyle(1.5, 0x4fd1c5, 0.18);
    for (const c of order) {
      this.routeGfx.lineBetween(sx, sy, c.x, c.y);
    }

    this.routeGfx.lineStyle(4, 0xffe060, 0.9);
    this.routeGfx.beginPath();
    this.routeGfx.moveTo(sx, sy);
    for (const c of order) {
      this.routeGfx.lineTo(c.x, c.y);
    }
    this.routeGfx.strokePath();

    // Direction ticks on first leg (next target).
    if (order.length > 0) {
      const next = order[0]!;
      this.routeGfx.fillStyle(0xffe060, 0.95);
      this.routeGfx.fillCircle(next.x, next.y, 10);
      this.drawArrowHead(sx, sy, next.x, next.y);
    }

    for (let i = 0; i < order.length; i++) {
      const c = order[i]!;
      const label = this.scene.add
        .text(c.x, c.y - 28, String(i + 1), {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: "16px",
          color: "#0a1208",
          backgroundColor: "#ffe060",
          padding: { x: 5, y: 2 },
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(10);
      this.worldLayer.add(label);
      this.orderLabels.push(label);
    }
  }

  private drawArrowHead(x0: number, y0: number, x1: number, y1: number): void {
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const len = 16;
    const ax = x1 - Math.cos(ang) * 18;
    const ay = y1 - Math.sin(ang) * 18;
    this.routeGfx.fillStyle(0xffe060, 0.95);
    this.routeGfx.fillTriangle(
      x1,
      y1,
      ax + Math.cos(ang + 2.5) * len,
      ay + Math.sin(ang + 2.5) * len,
      ax + Math.cos(ang - 2.5) * len,
      ay + Math.sin(ang - 2.5) * len,
    );
  }

  private clearLabelsOnly(): void {
    for (const t of this.orderLabels) t.destroy();
    this.orderLabels = [];
  }

  private clearDraw(): void {
    this.routeGfx.clear();
    this.clearLabelsOnly();
  }
}

/** Nearest-neighbour open tour from start, improved with 2-opt. */
export function shortestOpenTour(
  startX: number,
  startY: number,
  colonies: readonly ColonyPoint[],
): ColonyPoint[] {
  if (colonies.length === 0) return [];
  if (colonies.length === 1) return [colonies[0]!];

  const remaining = [...colonies];
  const tour: ColonyPoint[] = [];
  let cx = startX;
  let cy = startY;
  while (remaining.length > 0) {
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i]!;
      const d = (p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    const next = remaining.splice(bestI, 1)[0]!;
    tour.push(next);
    cx = next.x;
    cy = next.y;
  }

  return twoOptOpen(startX, startY, tour);
}

function pathLength(startX: number, startY: number, tour: ColonyPoint[]): number {
  let len = 0;
  let px = startX;
  let py = startY;
  for (const p of tour) {
    len += Math.hypot(p.x - px, p.y - py);
    px = p.x;
    py = p.y;
  }
  return len;
}

/** 2-opt for an open path (start fixed outside the tour). */
function twoOptOpen(startX: number, startY: number, tour: ColonyPoint[]): ColonyPoint[] {
  const path = [...tour];
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 40) {
    improved = false;
    const best = pathLength(startX, startY, path);
    for (let i = 0; i < path.length - 1; i++) {
      for (let k = i + 1; k < path.length; k++) {
        const trial = path.slice(0, i).concat(path.slice(i, k + 1).reverse(), path.slice(k + 1));
        const len = pathLength(startX, startY, trial);
        if (len + 0.01 < best) {
          for (let t = 0; t < path.length; t++) path[t] = trial[t]!;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }
  return path;
}
