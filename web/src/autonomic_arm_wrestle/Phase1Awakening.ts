import Phaser from "phaser";
import { ANS_COLORS, ANS_CONFIG, ANS_COPY } from "./config";
import { AutonomicGauge } from "./AutonomicGauge";
import { ECGDisplay } from "./ECGDisplay";
import { StrokeInput } from "./StrokeInput";
import type { AutonomicArmWrestleScene } from "./AutonomicArmWrestleScene";

/** Phase 1 — shared stroke awakening with flatline ECG until combined threshold. */
export class Phase1Awakening {
  private readonly root: Phaser.GameObjects.Container;
  private readonly gauge: AutonomicGauge;
  private readonly ecg: ECGDisplay;
  private readonly stroke: StrokeInput;
  private readonly p1Bar: Phaser.GameObjects.Rectangle;
  private readonly p2Bar: Phaser.GameObjects.Rectangle;
  private readonly combinedBar: Phaser.GameObjects.Rectangle;
  private readonly progressLabel: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly zoneGfx: Phaser.GameObjects.Graphics;
  private transitionGfx?: Phaser.GameObjects.Graphics;
  private done = false;

  constructor(private readonly scene: AutonomicArmWrestleScene) {
    this.root = scene.add.container(0, 0).setDepth(100);
    this.zoneGfx = scene.add.graphics();
    this.root.add(this.zoneGfx);

    this.gauge = new AutonomicGauge(scene, this.root);
    this.ecg = new ECGDisplay(scene, this.root);
    this.ecg.setFlatline(true);

    const barBg = scene.add.rectangle(0, 0, 160, 12, 0x111827, 0.9);
    this.p1Bar = scene.add.rectangle(-80, 0, 4, 10, ANS_COLORS.p1, 0.95);
    this.p2Bar = scene.add.rectangle(80, 0, 4, 10, ANS_COLORS.p2, 0.95);
    this.combinedBar = scene.add.rectangle(0, 0, 4, 10, ANS_COLORS.saNode, 0.95);
    this.root.add(barBg);
    this.root.add(this.p1Bar);
    this.root.add(this.p2Bar);
    this.root.add(this.combinedBar);
    this.progressLabel = scene.add
      .text(0, 0, "Awakening 0%", {
        fontFamily: "ui-monospace, monospace",
        fontSize: "12px",
        color: "#ffd86a",
      })
      .setOrigin(0.5);
    this.root.add(this.progressLabel);

    this.hint = scene.add
      .text(0, 0, ANS_COPY.phase1Hint, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "14px",
        color: "#d8e8f8",
        align: "center",
        wordWrap: { width: 320 },
      })
      .setOrigin(0.5);

    this.root.add(this.hint);

    this.stroke = new StrokeInput(scene, (bias) => this.onThreshold(bias));
    this.layout();
  }

  layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    this.zoneGfx.clear();
    this.zoneGfx.fillStyle(ANS_COLORS.p1, 0.08);
    this.zoneGfx.fillRect(0, h * 0.18, w * 0.5, h * 0.72);
    this.zoneGfx.fillStyle(ANS_COLORS.p2, 0.08);
    this.zoneGfx.fillRect(w * 0.5, h * 0.18, w * 0.5, h * 0.72);
    this.zoneGfx.lineStyle(2, 0xffffff, 0.15);
    this.zoneGfx.lineBetween(w * 0.5, h * 0.18, w * 0.5, h * 0.9);

    this.gauge.layout(w / 2, h * 0.12, w);
    this.ecg.layout(w / 2, h * 0.2, w);
    this.p1Bar.setPosition(w * 0.25, h * 0.28);
    this.p2Bar.setPosition(w * 0.75, h * 0.28);
    this.combinedBar.setPosition(w / 2, h * 0.34);
    this.progressLabel.setPosition(w / 2, h * 0.38);
    this.hint.setPosition(w / 2, h * 0.85);
    this.hint.setWordWrapWidth(w * 0.85);
  }

  update(dt: number): void {
    if (this.done) return;
    this.stroke.update(dt);
    this.gauge.setValue(this.stroke.bias);
    this.ecg.update(dt);

    const p1Frac = Phaser.Math.Clamp(this.stroke.p1Charge / ANS_CONFIG.awakeningThreshold, 0, 1);
    const p2Frac = Phaser.Math.Clamp(this.stroke.p2Charge / ANS_CONFIG.awakeningThreshold, 0, 1);
    const combinedFrac = this.stroke.progress;
    this.p1Bar.width = 150 * p1Frac;
    this.p1Bar.x = this.scene.scale.width * 0.25 - 75 + this.p1Bar.width / 2;
    this.p2Bar.width = 150 * p2Frac;
    this.p2Bar.x = this.scene.scale.width * 0.75 - 75 + this.p2Bar.width / 2;
    this.combinedBar.width = Math.min(220, this.scene.scale.width * 0.5) * combinedFrac;
    this.combinedBar.x =
      this.scene.scale.width / 2 -
      Math.min(220, this.scene.scale.width * 0.5) / 2 +
      this.combinedBar.width / 2;
    this.progressLabel.setText(`Awakening ${Math.round(combinedFrac * 100)}%`);
  }

  destroy(): void {
    this.stroke.destroy();
    this.gauge.destroy();
    this.ecg.destroy();
    this.root.destroy(true);
  }

  private onThreshold(bias: number): void {
    if (this.done) return;
    this.done = true;
    this.stroke.destroy();
    this.ecg.setFlatline(false);
    this.ecg.setBpm(ANS_CONFIG.postAwakeningBpm);
    this.progressLabel.setText("Awakening complete!");

    this.transitionGfx = this.scene.add.graphics().setDepth(200);
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.transitionGfx.lineStyle(2, ANS_COLORS.saNode, 0.6);
      this.transitionGfx.lineBetween(
        cx + Math.cos(a) * 40,
        cy + Math.sin(a) * 40,
        cx + Math.cos(a) * 180,
        cy + Math.sin(a) * 180,
      );
    }

    let entered = false;
    const finish = (): void => {
      if (entered) return;
      entered = true;
      this.transitionGfx?.destroy();
      this.transitionGfx = undefined;
      this.scene.enterPhase2(bias);
    };
    this.scene.time.delayedCall(350, finish);
  }
}
