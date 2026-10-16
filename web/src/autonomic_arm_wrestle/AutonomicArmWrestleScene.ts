import Phaser from "phaser";
import { Phase1Awakening } from "./Phase1Awakening";
import { Phase2Duel } from "./Phase2Duel";
import { AutonomicResultOverlay } from "./AutonomicResultOverlay";
import type { AutonomicPhase, DuelOutcome } from "./types";

/** Top-level Autonomic Arm-Wrestle scene with internal phase FSM. */
export class AutonomicArmWrestleScene extends Phaser.Scene {
  private phase: AutonomicPhase = "awakening";
  private phase1: Phase1Awakening | null = null;
  private phase2: Phase2Duel | null = null;
  private result: AutonomicResultOverlay | null = null;
  private backBtn: Phaser.GameObjects.Text | null = null;
  private resizeTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("autonomic-arm-wrestle");
  }

  create(): void {
    this.phase = "awakening";
    this.cameras.main.setBackgroundColor("#120818");
    this.backBtn = this.add
      .text(12, 12, "← Menu", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "16px",
        color: "#9fb5d8",
      })
      .setScrollFactor(0)
      .setDepth(3000)
      .setInteractive({ useHandCursor: true });
    this.backBtn.on("pointerup", () => this.goMenu());

    this.input.keyboard?.on("keydown-ESC", () => this.goMenu());
    this.scale.on(Phaser.Scale.Events.RESIZE, this.scheduleResize);
    window.addEventListener("orientationchange", this.onOrientationChange);

    this.startPhase1();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    if (this.phase === "awakening") this.phase1?.update(dt);
    else if (this.phase === "duel") this.phase2?.update(dt);
  }

  enterPhase2(initialBias: number): void {
    this.phase1?.destroy();
    this.phase1 = null;
    try {
      this.phase2 = new Phase2Duel(this, initialBias, (outcome) => this.enterResult(outcome));
      this.phase = "duel";
    } catch (err) {
      console.error("Autonomic Arm-Wrestle: failed to start Phase 2", err);
      this.phase2 = null;
      this.startPhase1();
    }
  }

  enterResult(outcome: DuelOutcome): void {
    this.phase2?.destroy();
    this.phase2 = null;
    this.phase = "result";
    this.result = new AutonomicResultOverlay(
      this,
      outcome,
      () => this.restart(),
      () => this.goMenu(),
    );
  }

  shutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.scheduleResize);
    window.removeEventListener("orientationchange", this.onOrientationChange);
    this.resizeTimer?.remove(false);
    this.teardownPhases();
    this.backBtn?.destroy();
    this.backBtn = null;
  }

  private startPhase1(): void {
    this.teardownPhases();
    this.phase = "awakening";
    this.phase1 = new Phase1Awakening(this);
  }

  private restart(): void {
    this.result?.destroy();
    this.result = null;
    this.startPhase1();
  }

  private goMenu(): void {
    this.scene.start("level-select");
  }

  private teardownPhases(): void {
    this.phase1?.destroy();
    this.phase2?.destroy();
    this.result?.destroy();
    this.phase1 = null;
    this.phase2 = null;
    this.result = null;
  }

  private scheduleResize = (): void => {
    this.resizeTimer?.remove(false);
    this.resizeTimer = this.time.delayedCall(80, () => this.applyResize());
  };

  private onOrientationChange = (): void => {
    window.setTimeout(() => {
      this.scale.refresh();
      this.scheduleResize();
    }, 150);
  };

  private applyResize(): void {
    this.phase1?.layout();
    this.phase2?.layout();
  }
}
