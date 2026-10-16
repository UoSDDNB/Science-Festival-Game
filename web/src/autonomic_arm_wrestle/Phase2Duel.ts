import Phaser from "phaser";
import { ANS_COLORS, ANS_CONFIG } from "./config";
import { AutonomicGauge } from "./AutonomicGauge";
import { CleftSystem } from "./CleftSystem";
import { ECGDisplay } from "./ECGDisplay";
import { MoleculePool } from "./MoleculePool";
import { ParasympatheticTerminal } from "./ParasympatheticTerminal";
import { SympatheticTerminal } from "./SympatheticTerminal";
import { AutonomicHud } from "./AutonomicHud";
import type { AutonomicArmWrestleScene } from "./AutonomicArmWrestleScene";
import type { DuelOutcome } from "./types";

/** Phase 2 — molecular duel with gauge-driven BPM and 60s round timer. */
export class Phase2Duel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly gauge: AutonomicGauge;
  private readonly ecg: ECGDisplay;
  private readonly hud: AutonomicHud;
  private readonly pool: MoleculePool;
  private readonly cleft: CleftSystem;
  private readonly p1: ParasympatheticTerminal;
  private readonly p2: SympatheticTerminal;
  private readonly moodGfx: Phaser.GameObjects.Rectangle;
  private timeLeft: number;
  private sustainSide: "low" | "high" | null = null;
  private sustainTimer = 0;
  private finished = false;

  constructor(
    private readonly scene: AutonomicArmWrestleScene,
    initialBias: number,
    private readonly onEnd: (outcome: DuelOutcome) => void,
  ) {
    this.timeLeft = ANS_CONFIG.duelDurationSec;
    this.root = scene.add.container(0, 0).setDepth(100);
    this.moodGfx = scene.add
      .rectangle(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width, scene.scale.height, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(-1);
    this.root.add(this.moodGfx);

    this.gauge = new AutonomicGauge(scene, this.root);
    this.gauge.setValue(initialBias);
    this.ecg = new ECGDisplay(scene, this.root);
    this.ecg.setFlatline(false);
    this.hud = new AutonomicHud(scene, this.root);

    this.pool = new MoleculePool(scene, this.root);
    this.cleft = new CleftSystem(scene, this.pool, (d) => this.gauge.nudge(d));
    this.p1 = new ParasympatheticTerminal(scene, this.pool, (x, y) => this.spawnAchCleft(x, y), (x, y) =>
      this.dissolveNear(x, y, "ne_cleft"),
    );
    this.p2 = new SympatheticTerminal(scene, this.pool, (x, y) => this.spawnNeCleft(x, y), (x, y) =>
      this.dissolveNear(x, y, "ach_cleft"),
    );
    this.layout();
  }

  layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const hudTop = h * 0.08;
    const playTop = h * 0.22;
    const playBottom = h * 0.92;
    const cleftLeft = w * 0.32;
    const cleftRight = w * 0.68;

    this.moodGfx.setPosition(w / 2, h / 2);
    this.moodGfx.setSize(w, h);
    this.gauge.layout(w / 2, hudTop + 20, w);
    this.ecg.layout(w / 2, hudTop + 58, w);
    this.hud.layout(w, h, this.timeLeft);

    this.p1.layout(8, cleftLeft - 8, playTop, playBottom);
    this.p2.layout(cleftRight + 8, w - 8, playTop, playBottom);
    this.cleft.layout(cleftLeft, cleftRight, playTop + 20, playBottom - 20);
  }

  update(dt: number): void {
    if (this.finished) return;
    this.timeLeft -= dt;
    const gauge = this.gauge.getValue();
    const bpm = Phaser.Math.Linear(ANS_CONFIG.minBpm, ANS_CONFIG.maxBpm, Math.pow(gauge, 0.85));
    this.ecg.setBpm(bpm);
    this.ecg.update(dt);
    this.hud.setTimer(this.timeLeft);
    this.hud.setBpm(Math.round(bpm));
    this.cleft.update(dt, gauge);
    this.updateMood(gauge);

    const low = gauge <= 1 - ANS_CONFIG.winThreshold;
    const high = gauge >= ANS_CONFIG.winThreshold;
    if (low) this.trackSustain("low", dt);
    else if (high) this.trackSustain("high", dt);
    else {
      this.sustainSide = null;
      this.sustainTimer = 0;
    }

    if (this.timeLeft <= 0) {
      this.finish(this.outcomeFromGauge(gauge));
    } else if (this.sustainTimer >= ANS_CONFIG.earlyWinSustainSec) {
      this.finish(this.sustainSide === "low" ? "p1_win" : "p2_win");
    }
  }

  destroy(): void {
    this.p1.destroy();
    this.p2.destroy();
    this.cleft.destroy();
    this.pool.destroy();
    this.hud.destroy();
    this.gauge.destroy();
    this.ecg.destroy();
    this.root.destroy(true);
  }

  private spawnAchCleft(x: number, y: number): void {
    for (let i = 0; i < ANS_CONFIG.cleftSpawnBurst; i++) {
      this.pool.spawn("ach_cleft", x, y + i * 6, Phaser.Math.FloatBetween(-30, 30), ANS_CONFIG.achFallSpeed);
    }
  }

  private spawnNeCleft(x: number, y: number): void {
    for (let i = 0; i < ANS_CONFIG.cleftSpawnBurst; i++) {
      this.pool.spawn("ne_cleft", x, y - i * 6, Phaser.Math.FloatBetween(-30, 30), -ANS_CONFIG.neRiseSpeed);
    }
  }

  private dissolveNear(x: number, y: number, kind: "ach_cleft" | "ne_cleft"): boolean {
    let hit = false;
    for (const m of this.pool.entries) {
      if (!m.active || m.kind !== kind) continue;
      if (Phaser.Math.Distance.Between(x, y, m.sprite.x, m.sprite.y) <= ANS_CONFIG.enzymeTapRadius) {
        this.pool.recycle(m);
        hit = true;
      }
    }
    return hit;
  }

  private trackSustain(side: "low" | "high", dt: number): void {
    if (this.sustainSide === side) this.sustainTimer += dt;
    else {
      this.sustainSide = side;
      this.sustainTimer = 0;
    }
  }

  private outcomeFromGauge(gauge: number): DuelOutcome {
    if (gauge <= 1 - ANS_CONFIG.winThreshold) return "p1_win";
    if (gauge >= ANS_CONFIG.winThreshold) return "p2_win";
    return "draw";
  }

  private finish(outcome: DuelOutcome): void {
    if (this.finished) return;
    this.finished = true;
    this.onEnd(outcome);
  }

  private updateMood(gauge: number): void {
    if (gauge < 0.2) {
      this.moodGfx.setFillStyle(ANS_COLORS.p1, 0.12);
    } else if (gauge > 0.8) {
      this.moodGfx.setFillStyle(ANS_COLORS.p2, 0.14);
    } else {
      this.moodGfx.setFillStyle(0xe8a0b8, 0.06);
    }
  }
}
