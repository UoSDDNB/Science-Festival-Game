import Phaser from "phaser";
import { HeatField } from "../sim/HeatField";
import { LevelDef, WORLD_WIDTH, WORLD_HEIGHT } from "../types";

/**
 * F3-toggleable debug grid: x/y rulers, fire/creature/obstacle markers,
 * grid lines, target-radius circle. Same purpose as the Godot version —
 * lets a developer or AI talk about positions in shared coordinates.
 */
export class DebugOverlay {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly xLabels: Phaser.GameObjects.Text[] = [];
  private readonly yLabels: Phaser.GameObjects.Text[] = [];
  private readonly fireLabel: Phaser.GameObjects.Text;
  private readonly creatureLabel: Phaser.GameObjects.Text;
  private readonly heatLabel: Phaser.GameObjects.Text;
  private readonly field: HeatField;
  private readonly def: LevelDef;
  private visibleState = false;
  private currentTargetHeat = 0;
  private intensity = 1;

  constructor(scene: Phaser.Scene, field: HeatField, def: LevelDef) {
    this.field = field;
    this.def = def;
    this.g = scene.add.graphics().setDepth(900).setVisible(false);

    for (let x = 0; x <= WORLD_WIDTH; x += 200) {
      const t = scene.add
        .text(x + 4, 6, String(x), { fontFamily: "ui-monospace, monospace", fontSize: "13px", color: "#ffe07a" })
        .setDepth(901)
        .setVisible(false);
      this.xLabels.push(t);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += 100) {
      const t = scene.add
        .text(4, y + 2, String(y), { fontFamily: "ui-monospace, monospace", fontSize: "12px", color: "#7df0ff", backgroundColor: "#0006" })
        .setDepth(901)
        .setVisible(false);
      this.yLabels.push(t);
    }

    this.fireLabel = scene.add
      .text(def.fire.x + 12, def.fire.y - 24, "SOURCE", { fontFamily: "ui-monospace, monospace", fontSize: "14px", color: "#ff9a30" })
      .setDepth(901)
      .setVisible(false);
    this.creatureLabel = scene.add
      .text(def.creature.x + 12, def.creature.y - 24, "TARGET", { fontFamily: "ui-monospace, monospace", fontSize: "14px", color: "#5ad0ff" })
      .setDepth(901)
      .setVisible(false);
    this.heatLabel = scene.add
      .text(WORLD_WIDTH - 200, 20, "", { fontFamily: "ui-monospace, monospace", fontSize: "18px", color: "#ffeb80" })
      .setDepth(901)
      .setVisible(false);
  }

  toggle(): void {
    this.visibleState = !this.visibleState;
    this.g.setVisible(this.visibleState);
    this.xLabels.forEach((t) => t.setVisible(this.visibleState));
    this.yLabels.forEach((t) => t.setVisible(this.visibleState));
    this.fireLabel.setVisible(this.visibleState);
    this.creatureLabel.setVisible(this.visibleState);
    this.heatLabel.setVisible(this.visibleState);
  }

  setTelemetry(targetHeat: number, intensity: number): void {
    this.currentTargetHeat = targetHeat;
    this.intensity = intensity;
  }

  update(): void {
    if (!this.visibleState) return;
    const g = this.g;
    g.clear();

    // Heat-field grid lines
    g.lineStyle(1, 0xffffff, 0.05);
    for (let x = 0; x <= this.field.gridW; x++) {
      g.lineBetween(x * this.field.cellSize, 0, x * this.field.cellSize, WORLD_HEIGHT);
    }
    for (let y = 0; y <= this.field.gridH; y++) {
      g.lineBetween(0, y * this.field.cellSize, WORLD_WIDTH, y * this.field.cellSize);
    }

    // 200px vertical rulers
    g.lineStyle(1, 0xffffff, 0.18);
    for (let x = 0; x <= WORLD_WIDTH; x += 200) g.lineBetween(x, 0, x, WORLD_HEIGHT);
    g.lineStyle(1, 0xffffff, 0.12);
    for (let y = 0; y <= WORLD_HEIGHT; y += 100) g.lineBetween(0, y, WORLD_WIDTH, y);

    // Obstacle cells
    for (let y = 0; y < this.field.gridH; y++) {
      for (let x = 0; x < this.field.gridW; x++) {
        if (this.field.obstacles[y * this.field.gridW + x]) {
          g.fillStyle(0xaaaaaa, 0.25);
          g.fillRect(x * this.field.cellSize, y * this.field.cellSize, this.field.cellSize, this.field.cellSize);
        }
      }
    }

    // Fire marker
    g.fillStyle(0xff7733, 0.9);
    g.fillCircle(this.def.fire.x, this.def.fire.y, 9);
    g.lineStyle(2, 0xff7733, 0.45);
    g.strokeCircle(this.def.fire.x, this.def.fire.y, this.def.fire.tapRadius);

    // Creature marker
    g.fillStyle(0x5ad0ff, 0.9);
    g.fillCircle(this.def.creature.x, this.def.creature.y, 9);
    g.lineStyle(2, 0x5ad0ff, 0.35);
    g.strokeCircle(this.def.creature.x, this.def.creature.y, this.field.targetRadius * this.field.cellSize);

    // Obstacle marker
    if (this.def.obstacle) {
      g.fillStyle(0xff3a3a, 0.9);
      g.fillCircle(this.def.obstacle.x, this.def.obstacle.y, 9);
      g.lineStyle(2, 0xff3a3a, 0.45);
      g.strokeCircle(this.def.obstacle.x, this.def.obstacle.y, this.def.obstacle.radius);
    }

    this.heatLabel.setText(`heat=${this.currentTargetHeat.toFixed(0)}°  int=${this.intensity.toFixed(2)}`);
  }

  destroy(): void {
    this.g.destroy();
    this.xLabels.forEach((t) => t.destroy());
    this.yLabels.forEach((t) => t.destroy());
    this.fireLabel.destroy();
    this.creatureLabel.destroy();
    this.heatLabel.destroy();
  }
}
