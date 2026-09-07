/**
 * 2D grid heat simulation — pure TS, zero Phaser dependency.
 * Heat spreads continuously through neighbour cells. Obstacles block diffusion.
 * Source cells inject heat each tick. Target region is monitored.
 * Biologically: this is the diffusion equation for a signalling molecule
 * propagating through tissue. Continuous, not zone-based.
 */
export class HeatField {
  readonly gridW: number;
  readonly gridH: number;
  readonly cellSize: number;

  readonly heat: Float32Array;
  readonly obstacles: Uint8Array;
  private readonly prev: Float32Array;

  sourceCells: Array<[number, number]> = [];
  targetCx = 0;
  targetCy = 0;
  targetRadius = 2;

  diffusionRate = 0.06;
  dissipationRate = 0.005;
  sourceHeatRate = 15;
  sourceHeatScale = 1;

  frozen = false;

  private accum = 0;
  private readonly tickInterval = 1 / 30;

  constructor(gridW: number, gridH: number, cellSize: number) {
    this.gridW = gridW;
    this.gridH = gridH;
    this.cellSize = cellSize;
    const n = gridW * gridH;
    this.heat = new Float32Array(n);
    this.prev = new Float32Array(n);
    this.obstacles = new Uint8Array(n);
  }

  setObstacleCircle(cx: number, cy: number, radius: number): void {
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= this.gridW || y < 0 || y >= this.gridH) continue;
        this.obstacles[y * this.gridW + x] = 1;
      }
    }
  }

  worldToGrid(worldX: number, worldY: number): [number, number] {
    return [
      Math.max(0, Math.min(this.gridW - 1, Math.floor(worldX / this.cellSize))),
      Math.max(0, Math.min(this.gridH - 1, Math.floor(worldY / this.cellSize))),
    ];
  }

  injectHeat(worldX: number, worldY: number, amount: number, radiusCells = 2): void {
    const [cx, cy] = this.worldToGrid(worldX, worldY);
    const r = Math.ceil(radiusCells);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.hypot(dx, dy);
        if (dist > radiusCells) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= this.gridW || y < 0 || y >= this.gridH) continue;
        const idx = y * this.gridW + x;
        if (this.obstacles[idx]) continue;
        const falloff = 1 - dist / radiusCells;
        this.heat[idx] = Math.min(100, this.heat[idx] + amount * falloff);
      }
    }
  }

  getHeatAt(worldX: number, worldY: number): number {
    const [x, y] = this.worldToGrid(worldX, worldY);
    return this.heat[y * this.gridW + x];
  }

  getTargetHeat(): number {
    let total = 0;
    let peak = 0;
    let count = 0;
    const r = this.targetRadius;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = this.targetCx + dx;
        const y = this.targetCy + dy;
        if (x < 0 || x >= this.gridW || y < 0 || y >= this.gridH) continue;
        const h = this.heat[y * this.gridW + x];
        total += h;
        if (h > peak) peak = h;
        count++;
      }
    }
    const avg = total / Math.max(1, count);
    return peak * 0.7 + avg * 0.3;
  }

  update(dt: number): void {
    if (this.frozen) return;
    this.accum += dt;
    while (this.accum >= this.tickInterval) {
      this.accum -= this.tickInterval;
      this.tick();
    }
  }

  private tick(): void {
    const { gridW, gridH, heat, prev, obstacles } = this;
    prev.set(heat);
    const diff = this.diffusionRate;
    const diss = 1 - this.dissipationRate;

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const idx = y * gridW + x;
        if (obstacles[idx]) {
          heat[idx] = 0;
          continue;
        }
        let h = prev[idx];
        let sum = 0;
        let n = 0;
        // 4-neighbour
        if (x > 0 && !obstacles[idx - 1]) { sum += prev[idx - 1]; n++; }
        if (x < gridW - 1 && !obstacles[idx + 1]) { sum += prev[idx + 1]; n++; }
        if (y > 0 && !obstacles[idx - gridW]) { sum += prev[idx - gridW]; n++; }
        if (y < gridH - 1 && !obstacles[idx + gridW]) { sum += prev[idx + gridW]; n++; }
        if (n > 0) h += (sum / n - h) * diff;
        h *= diss;
        heat[idx] = h < 0 ? 0 : h > 100 ? 100 : h;
      }
    }

    const src = this.sourceHeatRate * this.sourceHeatScale * this.tickInterval;
    for (const [sx, sy] of this.sourceCells) {
      const idx = sy * gridW + sx;
      heat[idx] = Math.min(100, heat[idx] + src);
    }
  }
}
