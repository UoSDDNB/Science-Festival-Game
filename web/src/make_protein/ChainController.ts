import Phaser from "phaser";
import { PROTEIN_CONFIG } from "./config";
import { aaTextureKey, displaySizeFromWidth, fitPlayfieldSprite } from "./assets";
import type { SpriteDisplaySize } from "./assets";
import type { AminoAcidCode, PlayBounds } from "./types";

export interface ChainLayoutMetrics {
  headSpriteW: number;
  play: PlayBounds;
  zoneTop: number;
  zoneH: number;
}

/** Pointer-steered chain head (starts as M) with trailing residue sprites. */
export class ChainController {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Image;
  private readonly headHit: Phaser.GameObjects.Arc;
  private readonly trail: Phaser.GameObjects.Container;
  private readonly choices: Phaser.GameObjects.Container;
  private readonly trailSprites: Phaser.GameObjects.Image[] = [];
  private velocity = new Phaser.Math.Vector2(0, 0);
  private activePointerId: number | null = null;
  private targetX = 0;
  private targetY = 0;
  private hasTarget = false;
  private inputBlocked: () => boolean = () => false;
  private playBounds: PlayBounds = { left: 0, top: 0, width: 100, height: 100 };
  private zoneTop = 0;
  private zoneH = 100;
  private headSpriteW = 56;
  private sequence = "M";
  private positioned = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(1120).setScrollFactor(0);
    this.trail = scene.add.container(0, 0);
    this.choices = scene.add.container(0, 0);
    this.head = scene.add.image(0, 0, aaTextureKey("M")).setOrigin(0.5, 0.5);
    this.headHit = scene.add
      .circle(0, 0, 48, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true, draggable: false });
    this.root.add([this.trail, this.choices, this.head, this.headHit]);
    fitPlayfieldSprite(this.head, 56);

    this.headHit.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.onDown(pointer));
    scene.input.on("pointerdown", this.onDown, this);
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.input.on("pointerupoutside", this.onUp, this);
  }

  get x(): number {
    return this.root.x;
  }

  get y(): number {
    return this.root.y;
  }

  setSequence(sequence: string): void {
    this.sequence = sequence;
    fitPlayfieldSprite(this.head, this.headSpriteW);
    this.rebuildTrail();
  }

  setInputBlocked(blocked: () => boolean): void {
    this.inputBlocked = blocked;
  }

  getHeadSpriteW(): number {
    return this.headSpriteW;
  }

  getChoiceLayer(): Phaser.GameObjects.Container {
    return this.choices;
  }

  worldToLocal(worldX: number, worldY: number): { x: number; y: number } {
    return { x: worldX - this.root.x, y: worldY - this.root.y };
  }

  clearChoices(): void {
    this.choices.removeAll(true);
  }

  getHeadDisplaySize(): SpriteDisplaySize {
    return displaySizeFromWidth(this.headSpriteW);
  }

  layout(metrics: ChainLayoutMetrics): void {
    this.playBounds = metrics.play;
    this.zoneTop = metrics.zoneTop;
    this.zoneH = metrics.zoneH;
    this.headSpriteW = metrics.headSpriteW;

    if (!this.positioned) {
      this.centerInZone();
    }
    this.clampPosition();
    const headSize = fitPlayfieldSprite(this.head, this.headSpriteW);
    this.headHit.setRadius(Math.max(headSize.w, headSize.h) * 0.52);
    this.rebuildTrail();
  }

  isPlayerDragging(): boolean {
    return this.activePointerId !== null;
  }

  /** Place M on the left side of the spawn zone, away from floating choices. */
  centerInZone(): void {
    this.root.setPosition(
      this.playBounds.left + this.playBounds.width * 0.22,
      this.zoneTop + this.zoneH * 0.5,
    );
    this.positioned = true;
    this.clampPosition();
  }

  update(dt: number): void {
    let desiredX = 0;
    let desiredY = 0;
    if (this.hasTarget) {
      const dx = this.targetX - this.root.x;
      const dy = this.targetY - this.root.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.5) {
        const speedScale = Phaser.Math.Clamp(dist / 80, 0.25, 1);
        const speed = PROTEIN_CONFIG.chainSpeed * speedScale;
        desiredX = (dx / dist) * speed;
        desiredY = (dy / dist) * speed;
      }
    }
    const blend = 1 - Math.exp(-12 * dt);
    this.velocity.x = Phaser.Math.Linear(this.velocity.x, desiredX, blend);
    this.velocity.y = Phaser.Math.Linear(this.velocity.y, desiredY, blend);
    this.root.x += this.velocity.x * dt;
    this.root.y += this.velocity.y * dt;
    this.clampPosition();
    this.layoutTrail();
  }

  destroy(): void {
    this.headHit.off("pointerdown");
    this.scene.input.off("pointerdown", this.onDown, this);
    this.scene.input.off("pointermove", this.onMove, this);
    this.scene.input.off("pointerup", this.onUp, this);
    this.scene.input.off("pointerupoutside", this.onUp, this);
    this.root.destroy(true);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.inputBlocked()) return;
    if (this.activePointerId !== null) return;
    if (!this.inPlayPanel(pointer.x, pointer.y) && !this.nearHead(pointer.x, pointer.y)) return;
    this.activePointerId = pointer.id;
    const clamped = this.clampTarget(pointer.x, pointer.y);
    this.setTarget(clamped.x, clamped.y);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (this.inputBlocked()) return;
    if (pointer.id !== this.activePointerId) return;
    const clamped = this.clampTarget(pointer.x, pointer.y);
    this.setTarget(clamped.x, clamped.y);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    this.activePointerId = null;
    this.clearTarget();
  }

  private setTarget(x: number, y: number): void {
    const alpha = 0.42;
    this.targetX = this.hasTarget ? Phaser.Math.Linear(this.targetX, x, alpha) : x;
    this.targetY = this.hasTarget ? Phaser.Math.Linear(this.targetY, y, alpha) : y;
    this.hasTarget = true;
  }

  private clearTarget(): void {
    this.hasTarget = false;
  }

  private inPlayPanel(x: number, y: number): boolean {
    return (
      x >= this.playBounds.left &&
      x <= this.playBounds.left + this.playBounds.width &&
      y >= this.playBounds.top &&
      y <= this.playBounds.top + this.playBounds.height
    );
  }

  private nearHead(x: number, y: number): boolean {
    return Math.hypot(x - this.root.x, y - this.root.y) <= this.headSpriteW * 0.65;
  }

  private clampTarget(x: number, y: number): { x: number; y: number } {
    const size = displaySizeFromWidth(this.headSpriteW);
    const padX = size.w * 0.55;
    const padY = size.h * 0.55;
    return {
      x: Phaser.Math.Clamp(x, this.playBounds.left + padX, this.playBounds.left + this.playBounds.width - padX),
      y: Phaser.Math.Clamp(y, this.zoneTop + padY, this.zoneTop + this.zoneH - padY),
    };
  }

  private clampPosition(): void {
    const size = displaySizeFromWidth(this.headSpriteW);
    const padX = size.w * 0.55;
    const padY = size.h * 0.55;
    this.root.x = Phaser.Math.Clamp(
      this.root.x,
      this.playBounds.left + padX,
      this.playBounds.left + this.playBounds.width - padX,
    );
    this.root.y = Phaser.Math.Clamp(this.root.y, this.zoneTop + padY, this.zoneTop + this.zoneH - padY);
  }

  private rebuildTrail(): void {
    this.trail.removeAll(true);
    this.trailSprites.length = 0;
    const codes = this.sequence.slice(0, -1).split("") as AminoAcidCode[];
    const trailW = this.headSpriteW;
    codes.forEach((code) => {
      const img = this.scene.add.image(0, 0, aaTextureKey(code)).setOrigin(0.5, 0.5);
      this.trail.add(img);
      fitPlayfieldSprite(img, trailW);
      this.trailSprites.push(img);
    });
    this.layoutTrail();
  }

  private layoutTrail(): void {
    const spacing = this.headSpriteW * 0.58;
    this.trailSprites.forEach((sprite, i) => {
      const idx = this.trailSprites.length - i;
      sprite.setPosition(-idx * spacing, 0);
    });
  }
}
