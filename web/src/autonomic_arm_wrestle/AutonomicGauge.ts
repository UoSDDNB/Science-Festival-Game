import Phaser from "phaser";
import { ANS_COLORS } from "./config";

/** Central homeostasis gauge — 0 = blue (parasympathetic), 1 = orange (sympathetic). */
export class AutonomicGauge {
  private readonly root: Phaser.GameObjects.Container;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly marker: Phaser.GameObjects.Rectangle;
  private barW = 200;
  private value = 0.5;

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1500);
    parent.add(this.root);

    const bg = scene.add.rectangle(0, 0, 220, 18, ANS_COLORS.gaugeBg, 0.95);
    bg.setStrokeStyle(2, 0xffffff, 0.2);
    this.root.add(bg);

    this.fill = scene.add.rectangle(0, 0, 220, 18, 0x000000, 0.001);
    this.root.add(this.fill);

    this.marker = scene.add.rectangle(0, 0, 8, 24, 0xffffff, 0.95);
    this.root.add(this.marker);

    this.root.add(
      scene.add
        .text(-120, -22, "Parasympathetic", {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: "11px",
          color: "#4fd1c5",
        })
        .setOrigin(0, 0.5),
    );
    this.root.add(
      scene.add
        .text(120, -22, "Sympathetic", {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: "11px",
          color: "#ff8a4a",
        })
        .setOrigin(1, 0.5),
    );
  }

  setValue(v: number): void {
    this.value = Phaser.Math.Clamp(v, 0, 1);
    this.redrawMarker();
  }

  getValue(): number {
    return this.value;
  }

  nudge(delta: number): void {
    this.setValue(this.value + delta);
  }

  layout(cx: number, cy: number, width: number): void {
    this.barW = Math.min(280, width * 0.55);
    this.root.setPosition(cx, cy);
    this.redrawMarker();
  }

  destroy(): void {
    this.root.destroy(true);
  }

  private redrawMarker(): void {
    const x = (this.value - 0.5) * this.barW;
    this.marker.setPosition(x, 0);
    const col = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(ANS_COLORS.p1),
      Phaser.Display.Color.ValueToColor(ANS_COLORS.p2),
      100,
      Math.round(this.value * 100),
    );
    this.marker.setFillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 0.95);
  }
}
