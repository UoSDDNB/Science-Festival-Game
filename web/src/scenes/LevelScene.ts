import Phaser from "phaser";
import { HeatField } from "../sim/HeatField";
import { HeatOverlay } from "../visuals/heatOverlay";
import { buildBackground } from "../visuals/backgrounds";
import { buildCreature, CreatureVisual } from "../visuals/creature";
import { FireVisual } from "../visuals/fire";
import { GestureTracker } from "../input/GestureTracker";
import { Thermometer } from "../ui/Thermometer";
import { HintSystem } from "../ui/HintSystem";
import { WinOverlay } from "../ui/WinOverlay";
import { DebugOverlay } from "../ui/DebugOverlay";
import { SneezeCutscene } from "../ui/SneezeCutscene";
import { FailOverlay } from "../ui/FailOverlay";
import { getLevel } from "../levels";
import { LevelDef, WORLD_WIDTH, WORLD_HEIGHT, GRID_H, CELL_SIZE } from "../types";
import { hexToInt } from "../visuals/palette";

interface LaunchData {
  levelId: string;
}

/**
 * Main gameplay scene. Reads a LevelDef, builds the world procedurally,
 * runs the heat sim, and drives all UI + win/lose state.
 *
 * Camera modes:
 *  - "letterbox" (default): the 1920×1080 design world fits inside the viewport.
 *  - "scroll": worlds wider than 1920 horizontally scroll to follow the player's finger.
 *
 * Outcome modes:
 *  - sustained-in-band → win path (optional sneeze cutscene before the win overlay)
 *  - sustained-above-danger → fail path (anaphylaxis-style red overlay), only if def.fail is set
 */
export class LevelScene extends Phaser.Scene {
  private def!: LevelDef;
  private worldWidth = WORLD_WIDTH;
  private field!: HeatField;
  private overlay!: HeatOverlay;
  private creature!: CreatureVisual;
  private fire!: FireVisual;
  private gestures!: GestureTracker;
  private thermometer!: Thermometer;
  private hints!: HintSystem;
  private debug!: DebugOverlay;
  private dragTrail!: Phaser.GameObjects.Graphics;
  private worldLayer!: Phaser.GameObjects.Container;

  private fireIntensity = 1.0;
  private manualHeat = 0;
  private targetHeat = 0;
  private inTarget = false;
  private timeInTarget = 0;
  private timeAboveDanger = 0;
  private done = false;
  private dragPoints: Array<{ x: number; y: number; t: number }> = [];

  // Camera state
  private cameraFollow = false;
  private cameraFocusX = WORLD_WIDTH / 2;
  private cameraFocusY = WORLD_HEIGHT / 2;
  private cameraTargetX = WORLD_WIDTH / 2;
  private worldScale = 1;

  // Shake state
  private shakeAmp = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;

  constructor() {
    super("level");
  }

  init(data: LaunchData): void {
    const def = getLevel(data.levelId);
    if (!def) throw new Error(`Unknown level: ${data.levelId}`);
    this.def = def;
    this.worldWidth = def.worldWidth ?? WORLD_WIDTH;
    this.cameraFollow = def.cameraFollow ?? (this.worldWidth > WORLD_WIDTH);
    this.fireIntensity = 1;
    this.manualHeat = 0;
    this.targetHeat = 0;
    this.inTarget = false;
    this.timeInTarget = 0;
    this.timeAboveDanger = 0;
    this.done = false;
    this.dragPoints = [];
    this.cameraFocusX = Math.max(WORLD_WIDTH / 2, Math.min(this.worldWidth - WORLD_WIDTH / 2, def.fire.x));
    this.cameraFocusY = WORLD_HEIGHT / 2;
    this.cameraTargetX = this.cameraFocusX;
    this.shakeAmp = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(this.def.palette.bgTop);

    this.worldLayer = this.add.container(0, 0);
    this.worldLayer.setDepth(0);

    // Background
    const bg = buildBackground(this, this.def);
    this.worldLayer.add(bg);

    // Obstacle (drawn before heat overlay so the overlay highlights it)
    if (this.def.obstacle) {
      const og = this.add.graphics();
      const obs = this.def.obstacle;
      const col = hexToInt(this.def.palette.obstacle);
      if (obs.kind === "fibre") {
        og.fillStyle(col, 0.95);
        og.fillEllipse(obs.x, obs.y, obs.radius * 2.4, obs.radius * 1.1);
        og.lineStyle(2, 0xffffff, 0.18);
        for (let i = -2; i <= 2; i++) {
          og.strokeEllipse(obs.x, obs.y + i * obs.radius * 0.18, obs.radius * 2.2, obs.radius * 0.1);
        }
        og.fillStyle(0xffffff, 0.07);
        og.fillEllipse(obs.x - obs.radius * 0.4, obs.y - obs.radius * 0.2, obs.radius * 1.4, obs.radius * 0.5);
      } else {
        og.fillStyle(col, 1);
        og.fillCircle(obs.x, obs.y, obs.radius);
        og.lineStyle(3, 0x0a0a14, 0.4);
        og.strokeCircle(obs.x, obs.y, obs.radius);
        og.fillStyle(0xffffff, 0.08);
        og.fillCircle(obs.x - 20, obs.y - 30, obs.radius * 0.55);
      }
      og.setDepth(3);
      this.worldLayer.add(og);
    }

    // Heat simulation — grid width scales with the world
    const gridW = Math.round(this.worldWidth / CELL_SIZE);
    this.field = new HeatField(gridW, GRID_H, CELL_SIZE);
    this.field.diffusionRate = this.def.sim.diffusion;
    this.field.dissipationRate = this.def.sim.dissipation;
    this.field.sourceHeatRate = this.def.sim.sourceHeat;
    this.field.targetRadius = this.def.sim.targetRadius;
    const [fcx, fcy] = this.field.worldToGrid(this.def.fire.x, this.def.fire.y);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = fcx + dx;
        const cy = fcy + dy;
        if (cx >= 0 && cx < gridW && cy >= 0 && cy < GRID_H) {
          this.field.sourceCells.push([cx, cy]);
        }
      }
    }
    const [tcx, tcy] = this.field.worldToGrid(this.def.creature.x, this.def.creature.y);
    this.field.targetCx = tcx;
    this.field.targetCy = tcy;
    if (this.def.obstacle) {
      const [ocx, ocy] = this.field.worldToGrid(this.def.obstacle.x, this.def.obstacle.y);
      this.field.setObstacleCircle(ocx, ocy, Math.ceil(this.def.obstacle.radius / CELL_SIZE));
    }
    this.field.injectHeat(this.def.fire.x, this.def.fire.y, 18, 4);

    // Heat overlay
    this.overlay = new HeatOverlay(this, this.field, this.worldWidth);
    this.worldLayer.add(this.overlay.image);

    // Drag trail (additive)
    this.dragTrail = this.add.graphics();
    this.dragTrail.setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    this.worldLayer.add(this.dragTrail);

    // Fire + creature
    this.fire = new FireVisual(this, this.def);
    this.worldLayer.add(this.fire.container);
    this.creature = buildCreature(this, this.def);
    this.worldLayer.add(this.creature.container);

    // UI
    this.thermometer = new Thermometer(this);
    this.thermometer.setBand(this.def.win.minHeat, this.def.win.maxHeat, this.def.win.dangerHeat);
    this.layoutThermometer();

    this.hints = new HintSystem(this);
    this.hints.setDragHint(this.def.hints.drag);

    this.debug = new DebugOverlay(this, this.field, this.def);

    // Input
    this.gestures = new GestureTracker(
      this,
      {
        onTap: (x, y) => this.handleTap(x, y),
        onDragStart: (x, y) => this.handleDragStart(x, y),
        onDragMove: (x, y) => this.handleDragMove(x, y),
        onDragEnd: () => this.handleDragEnd(),
        onSwirlRevolution: () => this.handleSwirlRevolution(),
        onPinch: (d) => this.handlePinch(d),
      },
      (sx, sy) => this.screenToWorld(sx, sy),
    );
    this.gestures.setSwirlPivot(this.def.fire.x, this.def.fire.y);

    this.input.keyboard?.on("keydown-F3", () => this.debug.toggle());
    this.input.keyboard?.on("keydown-PLUS", () => this.bumpIntensity(0.2));
    this.input.keyboard?.on("keydown-EQUALS", () => this.bumpIntensity(0.2));
    this.input.keyboard?.on("keydown-MINUS", () => this.bumpIntensity(-0.2));
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("level-select"));
    this.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.bumpIntensity(dy > 0 ? -0.15 : 0.15);
      this.hints.notifyPinch();
    });

    this.makeBackButton();

    this.scale.on("resize", this.handleResize, this);
    this.handleResize();
  }

  private makeBackButton(): void {
    const btn = this.add.container(80, 40).setScrollFactor(0).setDepth(1500);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(-60, -20, 120, 40, 8);
    g.lineStyle(1, 0xffffff, 0.25);
    g.strokeRoundedRect(-60, -20, 120, 40, 8);
    btn.add(g);
    const t = this.add.text(0, 0, "← Menu", {
      fontFamily: "ui-sans-serif, system-ui",
      fontSize: "16px",
      color: "#cfd8e8",
    }).setOrigin(0.5);
    btn.add(t);
    const hit = this.add.rectangle(0, 0, 120, 40, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("level-select"));
    btn.add(hit);
  }

  private layoutThermometer(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const tw = Math.min(70, Math.max(48, w * 0.045));
    const th = Math.min(720, Math.max(360, h * 0.62));
    const x = w - tw - Math.max(30, w * 0.025);
    const y = (h - th) / 2;
    this.thermometer.setBounds(x, y, tw, th);
  }

  private handleResize(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    if (this.cameraFollow) {
      // Fit by viewport height; horizontal scroll handled by cameraFocusX
      this.worldScale = h / WORLD_HEIGHT;
    } else {
      this.worldScale = Math.min(w / WORLD_WIDTH, h / WORLD_HEIGHT);
    }
    this.applyCameraTransform();
    this.cameras.main.setSize(w, h);
    this.layoutThermometer();
    this.hints?.resize(w, h);
  }

  private applyCameraTransform(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    if (this.cameraFollow) {
      // Centre cameraFocus in viewport
      const baseX = w / 2 - this.cameraFocusX * this.worldScale;
      const baseY = h / 2 - this.cameraFocusY * this.worldScale;
      this.worldLayer.setScale(this.worldScale);
      this.worldLayer.setPosition(baseX + this.shakeOffsetX, baseY + this.shakeOffsetY);
    } else {
      const baseX = (w - WORLD_WIDTH * this.worldScale) / 2;
      const baseY = (h - WORLD_HEIGHT * this.worldScale) / 2;
      this.worldLayer.setScale(this.worldScale);
      this.worldLayer.setPosition(baseX + this.shakeOffsetX, baseY + this.shakeOffsetY);
    }
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);

    if (!this.done) {
      this.fireIntensity = Phaser.Math.Linear(this.fireIntensity, 1.0, Math.min(1, dt * 0.6));
      this.field.sourceHeatScale = this.fireIntensity;
      this.manualHeat = Math.max(0, this.manualHeat - this.def.sim.decayPerSec * dt);
      this.targetHeat = this.manualHeat;
    }

    this.field.update(dt);
    this.overlay.update();
    this.fire.update(this.fireIntensity);

    // Camera follow — lerp focus toward target each frame
    if (this.cameraFollow) {
      const minX = WORLD_WIDTH / 2;
      const maxX = Math.max(minX, this.worldWidth - WORLD_WIDTH / 2);
      const desired = Phaser.Math.Clamp(this.cameraTargetX, minX, maxX);
      this.cameraFocusX = Phaser.Math.Linear(this.cameraFocusX, desired, Math.min(1, dt * 2.2));
    }

    // Screen shake — amplitude tracks heat
    this.updateShake(dt);
    this.applyCameraTransform();

    this.thermometer.setHeat(this.targetHeat);
    this.thermometer.update(dt);
    this.creature.setLifeSignal(Math.min(1, this.targetHeat / this.def.win.maxHeat));
    this.creature.iceDissolve(Math.min(1, this.targetHeat / 70));
    this.hints.updateMaxHeat(this.targetHeat);
    this.hints.update(dt);
    this.debug.setTelemetry(this.targetHeat, this.fireIntensity);
    this.debug.update();

    this.refreshTrail();

    if (!this.done) this.checkOutcomes(dt);
  }

  private updateShake(dt: number): void {
    if (!this.def.shakeWithHeat) {
      this.shakeAmp = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      return;
    }
    const h = this.targetHeat;
    let target = 0;
    if (h > 25) target = ((h - 25) / 35) * 4;            // 25→60 = 0→4
    if (h > 60) target = 4 + ((h - 60) / 25) * 9;         // 60→85 = 4→13
    if (h > 85) target = 13 + ((h - 85) / 15) * 16;       // 85→100 = 13→29
    this.shakeAmp = Phaser.Math.Linear(this.shakeAmp, target, Math.min(1, dt * 4));
    if (this.shakeAmp < 0.2) {
      this.shakeOffsetX = 0; this.shakeOffsetY = 0;
    } else {
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeAmp * 2;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeAmp * 2;
    }
  }

  private screenToWorld(sx: number, sy: number): [number, number] {
    const s = this.worldLayer.scaleX || 1;
    const ox = this.worldLayer.x;
    const oy = this.worldLayer.y;
    return [(sx - ox) / s, (sy - oy) / s];
  }

  private isNearFire(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.def.fire.x, this.def.fire.y) < this.def.fire.tapRadius;
  }

  private handleTap(x: number, y: number): void {
    if (this.done) return;
    if (!this.isNearFire(x, y)) return;
    this.field.injectHeat(x, y, this.def.sim.tapHeat * this.fireIntensity, 3.5);
    this.manualHeat = Math.min(100, this.manualHeat + 2);
    this.spawnBurst();
    this.hints.notifyTap();
    if (this.cameraFollow) this.cameraTargetX = x;
  }

  private handleDragStart(x: number, y: number): void {
    if (this.done) return;
    if (this.isNearFire(x, y)) {
      this.field.injectHeat(x, y, this.def.sim.tapHeat * this.fireIntensity, 3.5);
      this.manualHeat = Math.min(100, this.manualHeat + 2);
      this.spawnBurst();
      this.hints.notifyTap();
    }
    this.dragPoints = [{ x, y, t: this.time.now }];
    if (this.cameraFollow) this.cameraTargetX = x;
  }

  private handleDragMove(x: number, y: number): void {
    if (this.done) return;
    if (this.def.obstacle && Phaser.Math.Distance.Between(x, y, this.def.obstacle.x, this.def.obstacle.y) < this.def.obstacle.radius) {
      this.spawnDeflection(x, y);
      return;
    }

    const distFromFire = Phaser.Math.Distance.Between(x, y, this.def.fire.x, this.def.fire.y);
    if (distFromFire < this.def.fire.tapRadius) {
      this.field.injectHeat(x, y, this.def.sim.dragHeat * this.fireIntensity * 0.5, 3);
    } else {
      this.field.injectHeat(x, y, this.def.sim.dragHeat * this.fireIntensity, 3.5);
      const distToCreature = Phaser.Math.Distance.Between(x, y, this.def.creature.x, this.def.creature.y);
      if (distToCreature < 320) {
        this.manualHeat = Math.min(100, this.manualHeat + 0.45 * this.fireIntensity);
      }
    }

    this.dragPoints.push({ x, y, t: this.time.now });
    if (this.dragPoints.length > 160) this.dragPoints.splice(0, this.dragPoints.length - 160);
    this.hints.notifyDrag();

    if (this.cameraFollow) this.cameraTargetX = x;
  }

  private handleDragEnd(): void {
    // Trail fades in refreshTrail
  }

  private handleSwirlRevolution(): void {
    this.fireIntensity = Math.min(2.5, this.fireIntensity + 0.3);
    this.spawnBurst();
    this.hints.notifyHold();
  }

  private handlePinch(delta: number): void {
    this.fireIntensity = Phaser.Math.Clamp(this.fireIntensity + delta, 0.3, 2.5);
    if (delta > 0) this.hints.notifyPinch();
  }

  private bumpIntensity(amount: number): void {
    this.fireIntensity = Phaser.Math.Clamp(this.fireIntensity + amount, 0.3, 2.5);
    if (amount > 0) this.hints.notifyPinch();
  }

  private refreshTrail(): void {
    const now = this.time.now;
    this.dragPoints = this.dragPoints.filter((p) => now - p.t < 600);
    const g = this.dragTrail;
    g.clear();
    if (this.dragPoints.length < 2) return;
    const fire = hexToInt(this.def.palette.fire);
    const hot = hexToInt(this.def.palette.fireHot);
    g.lineStyle(28, fire, 0.28);
    this.strokePolyline(g);
    g.lineStyle(14, hot, 0.55);
    this.strokePolyline(g);
    g.lineStyle(5, 0xffffff, 0.55);
    this.strokePolyline(g);
  }

  private strokePolyline(g: Phaser.GameObjects.Graphics): void {
    g.beginPath();
    const p0 = this.dragPoints[0]!;
    g.moveTo(p0.x, p0.y);
    for (let i = 1; i < this.dragPoints.length; i++) {
      const p = this.dragPoints[i]!;
      g.lineTo(p.x, p.y);
    }
    g.strokePath();
  }

  private spawnBurst(): void {
    const x = this.def.fire.x;
    const y = this.def.fire.y;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
      const dist = 40 + Math.random() * 60;
      const spark = this.add.image(x, y, "spark")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.5 + Math.random() * 0.4)
        .setDepth(7);
      this.worldLayer.add(spark);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 350 + Math.random() * 250,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private spawnDeflection(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 25;
      const s = this.add.circle(x, y, 4, 0x9ad8ff, 0.85).setDepth(8);
      this.worldLayer.add(s);
      this.tweens.add({
        targets: s,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 250,
        onComplete: () => s.destroy(),
      });
    }
  }

  // --- Outcomes ---

  private checkOutcomes(dt: number): void {
    // Anaphylaxis fail path (only if def.fail is set)
    if (this.def.fail && this.targetHeat >= this.def.win.dangerHeat) {
      this.timeAboveDanger += dt;
      if (this.timeAboveDanger >= this.def.fail.triggerSeconds) {
        this.handleAnaphylaxis();
        return;
      }
    } else {
      this.timeAboveDanger = Math.max(0, this.timeAboveDanger - dt * 0.5);
    }

    // Damage flash (only if NOT going to land in a fail screen — keep the warning if no fail path)
    if (!this.def.fail && this.targetHeat >= this.def.win.dangerHeat) {
      this.hints.showWarning("Careful — too much heat!");
      const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xff0000, 0.18)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(1300);
      this.tweens.add({ targets: flash, alpha: 0, duration: 280, onComplete: () => flash.destroy() });
    } else if (this.def.fail && this.targetHeat >= this.def.win.dangerHeat) {
      // Subtle warning text while approaching anaphylaxis
      this.hints.showWarning("Slow down — too much!");
    }

    const inZone = this.targetHeat >= this.def.win.minHeat && this.targetHeat <= this.def.win.maxHeat;
    if (inZone && !this.inTarget) {
      this.inTarget = true;
      this.timeInTarget = 0;
      this.hints.showEncouragement("Hold it steady…");
    } else if (!inZone && this.inTarget) {
      this.inTarget = false;
      this.timeInTarget = 0;
    }
    if (this.inTarget) {
      this.timeInTarget += dt;
      if (this.timeInTarget >= this.def.win.sustainSeconds) this.handleWin();
    }
  }

  private handleWin(): void {
    this.done = true;
    this.field.frozen = true;
    this.creature.setThawed(true);

    // Big shake burst, then either sneeze cutscene or straight WinOverlay
    this.tweens.addCounter({
      from: 18, to: 0, duration: 700, onUpdate: (t) => {
        this.shakeAmp = t.getValue() ?? 0;
      },
    });

    if (this.def.id === "mast_cell") {
      // Cutscene first, then WinOverlay
      new SneezeCutscene(this, () => {
        new WinOverlay(
          this,
          this.def,
          () => this.scene.restart({ levelId: this.def.id }),
          () => this.scene.start("level-select"),
        );
      });
    } else {
      new WinOverlay(
        this,
        this.def,
        () => this.scene.restart({ levelId: this.def.id }),
        () => this.scene.start("level-select"),
      );
    }
  }

  private handleAnaphylaxis(): void {
    if (!this.def.fail) return;
    this.done = true;
    this.field.frozen = true;
    // Harsh shake burst that decays
    this.tweens.addCounter({
      from: 30, to: 0, duration: 1500, onUpdate: (t) => {
        this.shakeAmp = t.getValue() ?? 0;
      },
    });
    new FailOverlay(
      this,
      this.def.fail,
      () => this.scene.restart({ levelId: this.def.id }),
      () => this.scene.start("level-select"),
    );
  }
}
