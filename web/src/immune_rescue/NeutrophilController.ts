import Phaser from "phaser";
import { ChemotaxisField } from "./ChemotaxisField";
import { IMMUNE_CONFIG } from "./config";
import { ImmuneMode } from "./types";

export type ScreenToWorld = (sx: number, sy: number) => [number, number];

/**
 * Touch steering for the neutrophil: virtual joystick (P1 zone) + optional
 * chemotaxis assist from the chemical gradient.
 */
export class NeutrophilController {
  private readonly scene: Phaser.Scene;
  private readonly chemotaxis: ChemotaxisField;
  private readonly mode: ImmuneMode;
  private readonly body: Phaser.GameObjects.Container;
  private readonly toWorld: ScreenToWorld;

  private velocity = new Phaser.Math.Vector2(0, 0);
  private joystickBase: Phaser.GameObjects.Arc | null = null;
  private joystickKnob: Phaser.GameObjects.Arc | null = null;
  private stickVector = new Phaser.Math.Vector2(0, 0);
  private activePointerId: number | null = null;
  private baseX = 0;
  private baseY = 0;

  constructor(
    scene: Phaser.Scene,
    body: Phaser.GameObjects.Container,
    chemotaxis: ChemotaxisField,
    mode: ImmuneMode,
    toWorld: ScreenToWorld,
  ) {
    this.scene = scene;
    this.body = body;
    this.chemotaxis = chemotaxis;
    this.mode = mode;
    this.toWorld = toWorld;
    this.buildJoystick();
    scene.input.on("pointerdown", this.onDown, this);
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.input.on("pointerupoutside", this.onUp, this);
    scene.scale.on("resize", this.layoutJoystick, this);
    this.layoutJoystick();
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  /** Integrate velocity for one frame. */
  update(dt: number): void {
    const assist = this.chemotaxis.sampleGradient(this.body.x, this.body.y);
    assist.scale(IMMUNE_CONFIG.neutrophilSpeed * IMMUNE_CONFIG.chemotaxisAssist);

    const stick = this.stickVector.clone().scale(IMMUNE_CONFIG.neutrophilSpeed);
    this.velocity.set(stick.x + assist.x, stick.y + assist.y);

    this.body.x = Phaser.Math.Clamp(
      this.body.x + this.velocity.x * dt,
      IMMUNE_CONFIG.neutrophilRadius,
      IMMUNE_CONFIG.worldWidth - IMMUNE_CONFIG.neutrophilRadius,
    );
    this.body.y = Phaser.Math.Clamp(
      this.body.y + this.velocity.y * dt,
      IMMUNE_CONFIG.neutrophilRadius,
      IMMUNE_CONFIG.worldHeight - IMMUNE_CONFIG.neutrophilRadius,
    );
  }

  destroy(): void {
    this.scene.input.off("pointerdown", this.onDown, this);
    this.scene.input.off("pointermove", this.onMove, this);
    this.scene.input.off("pointerup", this.onUp, this);
    this.scene.input.off("pointerupoutside", this.onUp, this);
    this.scene.scale.off("resize", this.layoutJoystick, this);
    this.joystickBase?.destroy();
    this.joystickKnob?.destroy();
  }

  private buildJoystick(): void {
    const r = IMMUNE_CONFIG.joystickRadius;
    this.joystickBase = this.scene.add
      .circle(0, 0, r, 0x0a1424, 0.45)
      .setStrokeStyle(2, 0x4fd1c5, 0.7)
      .setScrollFactor(0)
      .setDepth(1500);
    this.joystickKnob = this.scene.add
      .circle(0, 0, r * 0.42, 0x4fd1c5, 0.85)
      .setScrollFactor(0)
      .setDepth(1501);
  }

  private layoutJoystick(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const r = IMMUNE_CONFIG.joystickRadius;
    // Single: bottom-left. Two-player: bottom of left half.
    const zoneRight = this.mode === "two" ? w * 0.5 : w;
    this.baseX = Phaser.Math.Clamp(r + 24, r + 8, zoneRight - r - 16);
    this.baseY = h - r - 28;
    this.joystickBase?.setPosition(this.baseX, this.baseY);
    this.joystickKnob?.setPosition(this.baseX, this.baseY);
    this.stickVector.set(0, 0);
  }

  private inP1Zone(pointer: Phaser.Input.Pointer): boolean {
    if (this.mode !== "two") return true;
    return pointer.x < this.scene.scale.width * 0.5;
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.inP1Zone(pointer)) return;
    if (this.activePointerId !== null) return;
    const dx = pointer.x - this.baseX;
    const dy = pointer.y - this.baseY;
    const nearStick = Math.hypot(dx, dy) <= IMMUNE_CONFIG.joystickRadius * 1.35;
    const [wx, wy] = this.toWorld(pointer.x, pointer.y);
    const nearBody =
      Math.hypot(wx - this.body.x, wy - this.body.y) <= IMMUNE_CONFIG.neutrophilRadius * 2.2;
    if (!nearStick && !nearBody) return;
    this.activePointerId = pointer.id;
    this.applyStick(pointer.x, pointer.y);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    this.applyStick(pointer.x, pointer.y);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    this.activePointerId = null;
    this.stickVector.set(0, 0);
    this.joystickKnob?.setPosition(this.baseX, this.baseY);
  }

  private applyStick(px: number, py: number): void {
    const r = IMMUNE_CONFIG.joystickRadius;
    let dx = px - this.baseX;
    let dy = py - this.baseY;
    const len = Math.hypot(dx, dy) || 1;
    if (len > r) {
      dx = (dx / len) * r;
      dy = (dy / len) * r;
    }
    this.joystickKnob?.setPosition(this.baseX + dx, this.baseY + dy);
    const nx = dx / r;
    const ny = dy / r;
    const mag = Math.hypot(nx, ny);
    if (mag < IMMUNE_CONFIG.joystickDeadzone) {
      this.stickVector.set(0, 0);
      return;
    }
    this.stickVector.set(nx, ny);
  }
}
