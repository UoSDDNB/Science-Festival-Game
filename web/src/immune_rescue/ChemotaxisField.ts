import Phaser from "phaser";
import { HeatField } from "../sim/HeatField";
import { GRID_H, GRID_W, CELL_SIZE } from "../types";
import { IMMUNE_CONFIG } from "./config";

/**
 * Chemokine / chemoattractant field built on HeatField.
 * Colonies and decoys inject signal; the neutrophil samples the gradient.
 */
export class ChemotaxisField {
  readonly field: HeatField;
  readonly worldWidth: number;
  readonly worldHeight: number;

  constructor(worldWidth = IMMUNE_CONFIG.worldWidth, worldHeight = IMMUNE_CONFIG.worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    const cell = CELL_SIZE;
    const gw = Math.max(1, Math.round(worldWidth / cell));
    const gh = Math.max(1, Math.round(worldHeight / cell));
    this.field = new HeatField(gw || GRID_W, gh || GRID_H, cell);
    this.field.diffusionRate = 0.08;
    this.field.dissipationRate = 0.01;
    this.field.sourceHeatRate = 0;
  }

  /** Inject chemoattractant at a world position (colony or decoy). */
  emit(worldX: number, worldY: number, amount: number, radiusCells = 2.5): void {
    this.field.injectHeat(worldX, worldY, amount, radiusCells);
  }

  /** Advance diffusion / dissipation. */
  update(dt: number): void {
    this.field.update(dt);
  }

  /** Heat (0–100) at a world point. */
  getSignal(worldX: number, worldY: number): number {
    return this.field.getHeatAt(worldX, worldY);
  }

  /**
   * Sample four neighbours and return a unit vector toward higher signal.
   * Returns zero vector if the field is flat.
   */
  sampleGradient(worldX: number, worldY: number): Phaser.Math.Vector2 {
    const step = this.field.cellSize;
    const right = this.field.getHeatAt(worldX + step, worldY);
    const left = this.field.getHeatAt(worldX - step, worldY);
    const down = this.field.getHeatAt(worldX, worldY + step);
    const up = this.field.getHeatAt(worldX, worldY - step);
    const gx = right - left;
    const gy = down - up;
    const v = new Phaser.Math.Vector2(gx, gy);
    if (v.lengthSq() < 0.0001) {
      return v.set(0, 0);
    }
    return v.normalize();
  }

  destroy(): void {
    this.field.frozen = true;
  }
}
