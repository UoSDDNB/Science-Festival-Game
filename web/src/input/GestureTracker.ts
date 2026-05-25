import Phaser from "phaser";

export interface GestureCallbacks {
  onTap?: (worldX: number, worldY: number) => void;
  onDragStart?: (worldX: number, worldY: number) => void;
  onDragMove?: (worldX: number, worldY: number) => void;
  onDragEnd?: () => void;
  /** Called when swirl accumulates >= 360°, with the current touch position. */
  onSwirlRevolution?: (worldX: number, worldY: number) => void;
  /** Called when two-pointer pinch delta crosses a threshold. delta > 0 = spread. */
  onPinch?: (delta: number) => void;
}

/**
 * Gesture detection — tap / drag / swirl-around-pivot / pinch.
 * Pivot for swirl detection is set via setSwirlPivot (the fire position).
 */
export type ScreenToWorld = (sx: number, sy: number) => [number, number];

export class GestureTracker {
  private readonly scene: Phaser.Scene;
  private readonly cb: GestureCallbacks;
  private readonly toWorld: ScreenToWorld;
  private pivot = new Phaser.Math.Vector2(0, 0);
  private dragging = false;
  private dragId = -1;
  private prevAngle = 0;
  private accumAngle = 0;
  private lastPinchDist = 0;
  private dragStartPos = new Phaser.Math.Vector2();
  private dragStartTime = 0;
  private movedSignificantly = false;

  constructor(scene: Phaser.Scene, cb: GestureCallbacks, toWorld: ScreenToWorld) {
    this.scene = scene;
    this.cb = cb;
    this.toWorld = toWorld;

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handleMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handleUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handleUp, this);
  }

  setSwirlPivot(x: number, y: number): void {
    this.pivot.set(x, y);
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handleMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handleUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handleUp, this);
  }

  private worldXY(pointer: Phaser.Input.Pointer): [number, number] {
    return this.toWorld(pointer.x, pointer.y);
  }

  private activePointers(): Phaser.Input.Pointer[] {
    const ps = [this.scene.input.pointer1, this.scene.input.pointer2, this.scene.input.pointer3];
    return ps.filter((p) => p && p.isDown);
  }

  private handleDown(pointer: Phaser.Input.Pointer): void {
    const active = this.activePointers();
    if (active.length >= 2) {
      this.dragging = false;
      this.cb.onDragEnd?.();
      const [a, b] = active;
      this.lastPinchDist = Phaser.Math.Distance.Between(a!.x, a!.y, b!.x, b!.y);
      return;
    }
    const [wx, wy] = this.worldXY(pointer);
    this.dragId = pointer.id;
    this.dragging = true;
    this.movedSignificantly = false;
    this.dragStartPos.set(wx, wy);
    this.dragStartTime = this.scene.time.now;
    this.accumAngle = 0;
    this.prevAngle = Math.atan2(wy - this.pivot.y, wx - this.pivot.x);
    this.cb.onDragStart?.(wx, wy);
  }

  private handleMove(pointer: Phaser.Input.Pointer): void {
    const active = this.activePointers();
    if (active.length >= 2) {
      const [a, b] = active;
      const dist = Phaser.Math.Distance.Between(a!.x, a!.y, b!.x, b!.y);
      if (this.lastPinchDist > 0) {
        const d = (dist - this.lastPinchDist) * 0.004;
        if (Math.abs(d) > 0.001) this.cb.onPinch?.(d);
      }
      this.lastPinchDist = dist;
      return;
    }
    if (!this.dragging || pointer.id !== this.dragId) return;
    const [wx, wy] = this.worldXY(pointer);

    if (!this.movedSignificantly && Phaser.Math.Distance.Between(wx, wy, this.dragStartPos.x, this.dragStartPos.y) > 12) {
      this.movedSignificantly = true;
    }

    // Swirl detection — angular displacement around pivot
    const angle = Math.atan2(wy - this.pivot.y, wx - this.pivot.x);
    let delta = angle - this.prevAngle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.accumAngle += Math.abs(delta);
    this.prevAngle = angle;
    if (this.accumAngle >= Math.PI * 2) {
      this.accumAngle -= Math.PI * 2;
      this.cb.onSwirlRevolution?.(wx, wy);
    }

    this.cb.onDragMove?.(wx, wy);
  }

  private handleUp(pointer: Phaser.Input.Pointer): void {
    const remaining = this.activePointers().filter((p) => p.id !== pointer.id);
    if (remaining.length >= 2) {
      const [a, b] = remaining;
      this.lastPinchDist = Phaser.Math.Distance.Between(a!.x, a!.y, b!.x, b!.y);
      return;
    }
    this.lastPinchDist = 0;
    if (!this.dragging || pointer.id !== this.dragId) return;
    this.dragging = false;
    const duration = this.scene.time.now - this.dragStartTime;
    if (!this.movedSignificantly && duration < 350) {
      this.cb.onTap?.(this.dragStartPos.x, this.dragStartPos.y);
    }
    this.cb.onDragEnd?.();
  }
}
