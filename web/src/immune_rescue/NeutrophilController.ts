import Phaser from "phaser";
import { ChemotaxisField } from "./ChemotaxisField";
import { IMMUNE_CONFIG } from "./config";
import { ImmuneMode } from "./types";

export type ScreenToWorld = (sx: number, sy: number) => [number, number];

export interface MovementClamp {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export type GetMovementClamp = () => MovementClamp;

/**
 * Direct pointer steering: hold/drag with touch or mouse in the P1 zone and the
 * neutrophil moves toward that world point. No on-screen joystick.
 * Ignores UI chrome marked with data `blockSteer` (e.g. NETosis button).
 */
export class NeutrophilController {
  private readonly scene: Phaser.Scene;
  private readonly chemotaxis: ChemotaxisField;
  private readonly mode: ImmuneMode;
  private readonly body: Phaser.GameObjects.Container;
  private readonly toWorld: ScreenToWorld;
  private readonly getClamp: GetMovementClamp;

  private velocity = new Phaser.Math.Vector2(0, 0);
  private activePointerId: number | null = null;
  private targetX = 0;
  private targetY = 0;
  private hasTarget = false;
  private inputBlocked: () => boolean = () => false;

  constructor(
    scene: Phaser.Scene,
    body: Phaser.GameObjects.Container,
    chemotaxis: ChemotaxisField,
    mode: ImmuneMode,
    toWorld: ScreenToWorld,
    getClamp: GetMovementClamp,
  ) {
    this.scene = scene;
    this.body = body;
    this.chemotaxis = chemotaxis;
    this.mode = mode;
    this.toWorld = toWorld;
    this.getClamp = getClamp;
    scene.input.on("pointerdown", this.onDown, this);
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.input.on("pointerupoutside", this.onUp, this);
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  /** True while the player is holding/dragging to steer the neutrophil. */
  get isSteering(): boolean {
    return this.hasTarget && this.activePointerId !== null;
  }

  /** Block steering while intro overlays or other UI pauses gameplay. */
  setInputBlocked(blocked: () => boolean): void {
    this.inputBlocked = blocked;
  }

  /** Integrate velocity for one frame — toward the held pointer, plus soft chemotaxis. */
  update(dt: number): void {
    const assist = this.chemotaxis.sampleGradient(this.body.x, this.body.y);
    assist.scale(IMMUNE_CONFIG.neutrophilSpeed * IMMUNE_CONFIG.chemotaxisAssist);

    let desiredX = 0;
    let desiredY = 0;
    if (this.hasTarget) {
      const dx = this.targetX - this.body.x;
      const dy = this.targetY - this.body.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.5) {
        const speedScale = Phaser.Math.Clamp(dist / 72, 0.2, 1);
        const speed = IMMUNE_CONFIG.neutrophilSpeed * speedScale;
        desiredX = (dx / dist) * speed + assist.x;
        desiredY = (dy / dist) * speed + assist.y;
      } else {
        desiredX = assist.x;
        desiredY = assist.y;
      }
    }

    const blend = 1 - Math.exp(-12 * dt);
    this.velocity.x = Phaser.Math.Linear(this.velocity.x, desiredX, blend);
    this.velocity.y = Phaser.Math.Linear(this.velocity.y, desiredY, blend);

    const { minX, maxX, minY, maxY } = this.getClamp();
    this.body.x = Phaser.Math.Clamp(this.body.x + this.velocity.x * dt, minX, maxX);
    this.body.y = Phaser.Math.Clamp(this.body.y + this.velocity.y * dt, minY, maxY);
  }

  destroy(): void {
    this.scene.input.off("pointerdown", this.onDown, this);
    this.scene.input.off("pointermove", this.onMove, this);
    this.scene.input.off("pointerup", this.onUp, this);
    this.scene.input.off("pointerupoutside", this.onUp, this);
  }

  private inP1Zone(pointer: Phaser.Input.Pointer): boolean {
    if (this.mode !== "two") return true;
    return pointer.x < this.scene.scale.width * 0.5;
  }

  /** True when the pointer is over HUD that should not steer the neutrophil. */
  private hitsSteerBlocker(pointer: Phaser.Input.Pointer): boolean {
    const hits = this.scene.input.hitTestPointer(pointer);
    return hits.some((obj) => {
      const go = obj as Phaser.GameObjects.GameObject & {
        getData?: (key: string) => unknown;
        parentContainer?: Phaser.GameObjects.Container | null;
      };
      if (go.getData?.("blockSteer")) return true;
      let p: Phaser.GameObjects.Container | null | undefined = go.parentContainer;
      while (p) {
        if (p.getData?.("blockSteer")) return true;
        p = p.parentContainer;
      }
      return false;
    });
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.inputBlocked()) return;
    if (!this.inP1Zone(pointer)) return;
    if (this.hitsSteerBlocker(pointer)) return;
    if (this.activePointerId !== null) return;
    this.activePointerId = pointer.id;
    this.setTargetFromPointer(pointer);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (this.inputBlocked()) return;
    if (pointer.id !== this.activePointerId) return;
    if (!this.inP1Zone(pointer)) {
      this.clearTarget();
      return;
    }
    this.setTargetFromPointer(pointer);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    this.activePointerId = null;
    this.clearTarget();
  }

  private setTargetFromPointer(pointer: Phaser.Input.Pointer): void {
    const [wx, wy] = this.toWorld(pointer.x, pointer.y);
    const alpha = 0.35;
    this.targetX = this.hasTarget ? Phaser.Math.Linear(this.targetX, wx, alpha) : wx;
    this.targetY = this.hasTarget ? Phaser.Math.Linear(this.targetY, wy, alpha) : wy;
    this.hasTarget = true;
  }

  private clearTarget(): void {
    this.hasTarget = false;
  }
}
