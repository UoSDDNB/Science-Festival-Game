import Phaser from "phaser";
import { ANS_COPY } from "./config";

/** Phase 2 HUD — timer, BPM readout, team hints. */
export class AutonomicHud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly bpmText: Phaser.GameObjects.Text;
  private readonly p1Hint: Phaser.GameObjects.Text;
  private readonly p2Hint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1510);
    parent.add(this.root);
    this.timerText = scene.add.text(0, 0, "60s", {
      fontFamily: "ui-monospace, monospace",
      fontSize: "18px",
      color: "#ffd86a",
    }).setOrigin(0.5);
    this.bpmText = scene.add.text(0, 0, "BPM 75", {
      fontFamily: "ui-monospace, monospace",
      fontSize: "14px",
      color: "#ffffff",
    }).setOrigin(0.5);
    this.p1Hint = scene.add.text(0, 0, ANS_COPY.phase2P1Hint, {
      fontFamily: "ui-sans-serif, system-ui",
      fontSize: "11px",
      color: "#9fb5d8",
      wordWrap: { width: 200 },
    }).setOrigin(0, 0);
    this.p2Hint = scene.add.text(0, 0, ANS_COPY.phase2P2Hint, {
      fontFamily: "ui-sans-serif, system-ui",
      fontSize: "11px",
      color: "#9fb5d8",
      wordWrap: { width: 200 },
    }).setOrigin(1, 0);
    this.root.add([this.timerText, this.bpmText, this.p1Hint, this.p2Hint]);
  }

  layout(w: number, h: number, timeLeft: number): void {
    this.timerText.setPosition(w - 48, h * 0.1);
    this.bpmText.setPosition(w / 2, h * 0.1);
    this.p1Hint.setPosition(12, h * 0.94);
    this.p2Hint.setPosition(w - 12, h * 0.94);
    this.p1Hint.setWordWrapWidth(w * 0.42);
    this.p2Hint.setWordWrapWidth(w * 0.42);
    this.setTimer(timeLeft);
  }

  setTimer(sec: number): void {
    this.timerText.setText(`${Math.max(0, Math.ceil(sec))}s`);
  }

  setBpm(bpm: number): void {
    this.bpmText.setText(`BPM ${bpm}`);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
