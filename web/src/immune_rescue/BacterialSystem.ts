import Phaser from "phaser";
import { ChemotaxisField } from "./ChemotaxisField";
import { IMMUNE_CONFIG, IMMUNE_PALETTE } from "./config";
import { Colony, Decoy, ImmuneMode } from "./types";
import { hexToInt } from "../visuals/palette";
import { IMMUNE_TEX, bacteriaDisplaySize } from "./assets";

export type ScreenToWorld = (sx: number, sy: number) => [number, number];

/**
 * Bacterial colonies + decoys: AI spawn/replicate in single-player,
 * P2 placement in two-player, emission into the chemotaxis field.
 */
export class BacterialSystem {
  private readonly scene: Phaser.Scene;
  private readonly chemotaxis: ChemotaxisField;
  private readonly mode: ImmuneMode;
  private readonly worldLayer: Phaser.GameObjects.Container;
  private readonly toWorld: ScreenToWorld;

  private colonies: Colony[] = [];
  private decoys: Decoy[] = [];
  private nextId = 1;
  private aiSpawnTimer = 0;
  private p2ColonyCooldown = 0;
  private p2DecoyCooldown = 0;
  private engulfed = 0;
  private longPressPointer: number | null = null;
  private longPressStart = 0;
  private longPressX = 0;
  private longPressY = 0;

  constructor(
    scene: Phaser.Scene,
    chemotaxis: ChemotaxisField,
    worldLayer: Phaser.GameObjects.Container,
    mode: ImmuneMode,
    toWorld: ScreenToWorld,
  ) {
    this.scene = scene;
    this.chemotaxis = chemotaxis;
    this.worldLayer = worldLayer;
    this.mode = mode;
    this.toWorld = toWorld;
    this.seedInitial();
    if (mode === "two") {
      scene.input.on("pointerdown", this.onP2Down, this);
      scene.input.on("pointerup", this.onP2Up, this);
      scene.input.on("pointerupoutside", this.onP2Up, this);
    }
  }

  get engulfedCount(): number {
    return this.engulfed;
  }

  get colonyCount(): number {
    return this.colonies.length;
  }

  get winTarget(): number {
    return IMMUNE_CONFIG.winEngulfCount;
  }

  /** Live colony positions (e.g. for debugging or future helpers). */
  listColonies(): ReadonlyArray<{ id: number; x: number; y: number }> {
    return this.colonies.map((c) => ({ id: c.id, x: c.x, y: c.y }));
  }

  /** Damage contribution this frame from infection pressure (rises with progress). */
  infectionPressure(): number {
    const progress = this.progress01();
    const ramp = 1 + progress * 0.85;
    return this.colonies.length * IMMUNE_CONFIG.damagePerColonyPerSec * ramp;
  }

  /** 0 at start → 1 when win target is reached. */
  private progress01(): number {
    return Phaser.Math.Clamp(this.engulfed / Math.max(1, IMMUNE_CONFIG.winEngulfCount), 0, 1);
  }

  update(dt: number, neutrophilX = 0, neutrophilY = 0): void {
    this.p2ColonyCooldown = Math.max(0, this.p2ColonyCooldown - dt);
    this.p2DecoyCooldown = Math.max(0, this.p2DecoyCooldown - dt);
    const progress = this.progress01();

    if (this.mode === "single") {
      this.maintainColonyPopulation(progress, neutrophilX, neutrophilY);
    } else {
      this.aiSpawnTimer += dt;
      const spawnEvery = Phaser.Math.Linear(
        IMMUNE_CONFIG.aiSpawnSeconds,
        IMMUNE_CONFIG.aiSpawnSeconds * 0.35,
        progress,
      );
      if (this.aiSpawnTimer >= spawnEvery && this.colonies.length < IMMUNE_CONFIG.maxColonies) {
        this.aiSpawnTimer = 0;
        const sizeScale = Phaser.Math.Linear(1, IMMUNE_CONFIG.minColonySizeScale, progress);
        this.spawnColony(this.randomEdgeX(), this.randomEdgeY(), sizeScale);
      }
    }

    const fleeSpeed = IMMUNE_CONFIG.fleeSpeedMax * progress;
    const margin = 80;
    for (const colony of this.colonies) {
      this.chemotaxis.emit(
        colony.x,
        colony.y,
        IMMUNE_CONFIG.colonyEmitAmount * colony.size * dt * 8,
        IMMUNE_CONFIG.colonyEmitRadiusCells,
      );

      // Bacteria drift continuously — harder to catch without steering onto them.
      const wanderSpeed =
        IMMUNE_CONFIG.bacteriaWanderSpeed * (0.55 + colony.size * 0.45) * (1 + progress * 0.35);
      colony.wanderAngle += (Math.random() - 0.5) * dt * 2.8;
      colony.x += Math.cos(colony.wanderAngle) * wanderSpeed * dt;
      colony.y += Math.sin(colony.wanderAngle) * wanderSpeed * dt;

      // Later colonies dodge the neutrophil — harder to catch.
      if (fleeSpeed > 0.5) {
        const fdx = colony.x - neutrophilX;
        const fdy = colony.y - neutrophilY;
        const fdist = Math.hypot(fdx, fdy) || 1;
        const fleeRadius = IMMUNE_CONFIG.neutrophilRadius * 1.8;
        if (fdist < fleeRadius) {
          const urgency = 1 - fdist / fleeRadius;
          colony.x += (fdx / fdist) * fleeSpeed * urgency * dt;
          colony.y += (fdy / fdist) * fleeSpeed * urgency * dt;
        }
      }

      colony.x = Phaser.Math.Clamp(colony.x, margin, IMMUNE_CONFIG.worldWidth - margin);
      colony.y = Phaser.Math.Clamp(colony.y, margin, IMMUNE_CONFIG.worldHeight - margin);
      colony.visual?.setPosition?.(colony.x, colony.y);

      colony.replicateTimer += dt;
      const replicateEvery = Phaser.Math.Linear(
        IMMUNE_CONFIG.replicateSeconds,
        IMMUNE_CONFIG.replicateSeconds * 0.45,
        progress,
      );
      if (
        this.mode === "two" &&
        colony.replicateTimer >= replicateEvery &&
        this.colonies.length < IMMUNE_CONFIG.maxColonies
      ) {
        colony.replicateTimer = 0;
        const ang = Math.random() * Math.PI * 2;
        const dist = colony.radius * 2.2;
        const childSize = Math.max(
          IMMUNE_CONFIG.minColonySizeScale,
          colony.size * Phaser.Math.Linear(0.85, 0.55, progress),
        );
        this.spawnColony(colony.x + Math.cos(ang) * dist, colony.y + Math.sin(ang) * dist, childSize);
      }
    }

    for (const decoy of [...this.decoys]) {
      this.chemotaxis.emit(decoy.x, decoy.y, IMMUNE_CONFIG.decoyEmitAmount * dt * 10, 3);
      decoy.life -= dt;
      if (decoy.life <= 0) this.removeDecoy(decoy);
    }

    if (this.longPressPointer !== null) {
      const held = this.scene.time.now - this.longPressStart;
      if (held >= 450) {
        this.tryPlaceDecoy(this.longPressX, this.longPressY);
        this.longPressPointer = null;
      }
    }
  }

  /** Engulf overlapping colonies when the player is actively steering onto them. */
  tryEngulf(nx: number, ny: number, radius: number, isSteering: boolean): number {
    if (!isSteering) return 0;
    let cleared = 0;
    for (const colony of [...this.colonies]) {
      const d = Math.hypot(colony.x - nx, colony.y - ny);
      if (d <= radius + colony.radius) {
        this.removeColony(colony);
        this.engulfed += 1;
        cleared += 1;
        this.burst(colony.x, colony.y, hexToInt(IMMUNE_PALETTE.bacteria));
      }
    }
    return cleared;
  }

  /**
   * All live colonies sorted nearest-first — NET fibers travel from the neutrophil.
   */
  coloniesForNetosis(nx: number, ny: number): Array<{ id: number; x: number; y: number; radius: number }> {
    return this.colonies
      .map((c) => ({ id: c.id, x: c.x, y: c.y, radius: c.radius }))
      .sort((a, b) => {
        const da = Math.hypot(a.x - nx, a.y - ny);
        const db = Math.hypot(b.x - nx, b.y - ny);
        return da - db;
      });
  }

  /**
   * Colonies within NETosis reach, nearest first.
   */
  coloniesInNetosisRange(
    nx: number,
    ny: number,
    radius: number,
  ): Array<{ id: number; x: number; y: number; radius: number }> {
    return this.colonies
      .filter((c) => Math.hypot(c.x - nx, c.y - ny) <= radius + c.radius * 0.85)
      .map((c) => ({ id: c.id, x: c.x, y: c.y, radius: c.radius }))
      .sort((a, b) => {
        const da = Math.hypot(a.x - nx, a.y - ny);
        const db = Math.hypot(b.x - nx, b.y - ny);
        return da - db;
      });
  }

  /** Live position for a traveling NET fiber to track a moving colony. */
  getColonyPosition(id: number): { x: number; y: number; radius: number } | null {
    const colony = this.colonies.find((c) => c.id === id);
    return colony ? { x: colony.x, y: colony.y, radius: colony.radius } : null;
  }

  /** Kill one colony after a NET fiber arrives — counts toward win target. */
  netosisKillColony(id: number): boolean {
    const colony = this.colonies.find((c) => c.id === id);
    if (!colony) return false;
    const { x, y } = colony;
    this.removeColony(colony);
    this.engulfed += 1;
    this.netBurst(x, y);
    return true;
  }

  destroy(): void {
    if (this.mode === "two") {
      this.scene.input.off("pointerdown", this.onP2Down, this);
      this.scene.input.off("pointerup", this.onP2Up, this);
      this.scene.input.off("pointerupoutside", this.onP2Up, this);
    }
    for (const c of this.colonies) c.visual?.destroy(true);
    for (const d of this.decoys) d.visual?.destroy(true);
    this.colonies = [];
    this.decoys = [];
  }

  private seedInitial(): void {
    const spots = [
      [1480, 320],
      [1200, 520],
      [1600, 700],
    ];
    for (let i = 0; i < IMMUNE_CONFIG.initialColonies; i++) {
      const [x, y] = spots[i] ?? [900 + (i % 5) * 160, 280 + Math.floor(i / 5) * 200];
      this.spawnColony(x!, y!, 1);
    }
  }

  /** Single-player: refill to 2–3 bacteria whenever the player clears one. */
  private maintainColonyPopulation(progress: number, avoidX: number, avoidY: number): void {
    while (this.colonies.length < IMMUNE_CONFIG.minColoniesOnScreen) {
      if (!this.spawnReplenishment(progress, avoidX, avoidY)) break;
    }
    while (this.colonies.length < IMMUNE_CONFIG.maxColoniesOnScreen) {
      if (!this.spawnReplenishment(progress, avoidX, avoidY)) break;
    }
  }

  private spawnReplenishment(progress: number, avoidX: number, avoidY: number): boolean {
    if (this.colonies.length >= IMMUNE_CONFIG.maxColoniesOnScreen) return false;
    const sizeScale = Phaser.Math.Linear(1, IMMUNE_CONFIG.minColonySizeScale, progress);
    let x = this.randomEdgeX();
    let y = this.randomEdgeY();
    for (let i = 0; i < 10; i++) {
      if (Math.hypot(x - avoidX, y - avoidY) > IMMUNE_CONFIG.neutrophilRadius * 2.2) break;
      x = this.randomEdgeX();
      y = this.randomEdgeY();
    }
    return this.spawnColony(x, y, sizeScale) !== null;
  }

  private spawnColony(x: number, y: number, size: number): Colony | null {
    const cap =
      this.mode === "single" ? IMMUNE_CONFIG.maxColoniesOnScreen : IMMUNE_CONFIG.maxColonies;
    if (this.colonies.length >= cap) return null;
    const cx = Phaser.Math.Clamp(x, 80, IMMUNE_CONFIG.worldWidth - 80);
    const cy = Phaser.Math.Clamp(y, 80, IMMUNE_CONFIG.worldHeight - 80);
    const radius = IMMUNE_CONFIG.colonyBaseRadius * size;
    const visual = this.drawColony(cx, cy, radius);
    const colony: Colony = {
      id: this.nextId++,
      x: cx,
      y: cy,
      radius,
      size,
      replicateTimer: 0,
      wanderAngle: Math.random() * Math.PI * 2,
      visual,
    };
    this.colonies.push(colony);
    return colony;
  }

  private drawColony(x: number, y: number, radius: number): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y);
    if (this.scene.textures.exists(IMMUNE_TEX.bacteria)) {
      const img = this.scene.add.image(0, 0, IMMUNE_TEX.bacteria);
      const { w, h } = bacteriaDisplaySize(radius);
      img.setDisplaySize(w, h);
      c.add(img);
    } else {
      const g = this.scene.add.graphics();
      const col = hexToInt(IMMUNE_PALETTE.bacteria);
      g.fillStyle(col, 0.9);
      g.fillCircle(0, 0, radius);
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(-radius * 0.25, -radius * 0.2, radius * 0.35);
      g.lineStyle(2, 0x1a3a22, 0.5);
      g.strokeCircle(0, 0, radius);
      c.add(g);
    }
    this.worldLayer.add(c);
    return c;
  }

  private removeColony(colony: Colony): void {
    colony.visual?.destroy(true);
    this.colonies = this.colonies.filter((c) => c.id !== colony.id);
  }

  private tryPlaceColony(worldX: number, worldY: number): void {
    if (this.p2ColonyCooldown > 0) return;
    if (this.spawnColony(worldX, worldY, 1)) {
      this.p2ColonyCooldown = IMMUNE_CONFIG.p2ColonyCooldown;
    }
  }

  private tryPlaceDecoy(worldX: number, worldY: number): void {
    if (this.p2DecoyCooldown > 0) return;
    if (this.decoys.length >= IMMUNE_CONFIG.maxDecoys) return;
    const x = Phaser.Math.Clamp(worldX, 60, IMMUNE_CONFIG.worldWidth - 60);
    const y = Phaser.Math.Clamp(worldY, 60, IMMUNE_CONFIG.worldHeight - 60);
    const visual = this.drawDecoy(x, y);
    const decoy: Decoy = {
      id: this.nextId++,
      x,
      y,
      life: IMMUNE_CONFIG.decoyLifeSeconds,
      visual,
    };
    this.decoys.push(decoy);
    this.p2DecoyCooldown = IMMUNE_CONFIG.p2DecoyCooldown;
  }

  private drawDecoy(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y);
    const g = this.scene.add.graphics();
    const col = hexToInt(IMMUNE_PALETTE.decoy);
    g.fillStyle(col, 0.55);
    g.fillCircle(0, 0, 22);
    g.lineStyle(2, 0xfff5b8, 0.9);
    g.strokeCircle(0, 0, 22);
    g.lineStyle(2, col, 0.8);
    g.lineBetween(-10, 0, 10, 0);
    g.lineBetween(0, -10, 0, 10);
    c.add(g);
    this.worldLayer.add(c);
    return c;
  }

  private removeDecoy(decoy: Decoy): void {
    decoy.visual?.destroy(true);
    this.decoys = this.decoys.filter((d) => d.id !== decoy.id);
  }

  private onP2Down(pointer: Phaser.Input.Pointer): void {
    if (pointer.x < this.scene.scale.width * 0.5) return;
    this.longPressPointer = pointer.id;
    this.longPressStart = this.scene.time.now;
    const [wx, wy] = this.toWorld(pointer.x, pointer.y);
    this.longPressX = wx;
    this.longPressY = wy;
  }

  private onP2Up(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.longPressPointer) return;
    const held = this.scene.time.now - this.longPressStart;
    this.longPressPointer = null;
    if (held < 450) {
      const [wx, wy] = this.toWorld(pointer.x, pointer.y);
      this.tryPlaceColony(wx, wy);
    }
  }

  private burst(x: number, y: number, color: number): void {
    for (let i = 0; i < IMMUNE_CONFIG.engulfBurstCount; i++) {
      const ang = (i / IMMUNE_CONFIG.engulfBurstCount) * Math.PI * 2;
      const spark = this.scene.add.circle(x, y, 4, color, 0.9);
      this.worldLayer.add(spark);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(ang) * 40,
        y: y + Math.sin(ang) * 40,
        alpha: 0,
        duration: 320,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private netBurst(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spark = this.scene.add.circle(x, y, 3, 0xe8d8ff, 0.95);
      this.worldLayer.add(spark);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(ang) * 28,
        y: y + Math.sin(ang) * 28,
        alpha: 0,
        scale: 0.2,
        duration: 480,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private randomEdgeX(): number {
    return Math.random() < 0.5 ? 100 + Math.random() * 200 : IMMUNE_CONFIG.worldWidth - 300 + Math.random() * 200;
  }

  private randomEdgeY(): number {
    return 120 + Math.random() * (IMMUNE_CONFIG.worldHeight - 240);
  }
}
