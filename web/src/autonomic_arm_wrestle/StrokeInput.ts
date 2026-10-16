import Phaser from "phaser";
import { ANS_CONFIG } from "./config";
import { PlayerSide } from "./types";

interface PointerTrack {
  side: PlayerSide;
  lx: number;
  ly: number;
  emaSpeed: number;
}

/** Split-zone stroke speed sampling for Phase 1 awakening. */
export class StrokeInput {
  p1Charge = 0;
  p2Charge = 0;
  enabled = true;
  private readonly pointers = new Map<number, PointerTrack>();
  private p1Speed = 0;
  private p2Speed = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onComplete: (bias: number) => void,
  ) {
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp);
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp);
  }

  get totalCharge(): number {
    return this.p1Charge + this.p2Charge;
  }

  get progress(): number {
    return Phaser.Math.Clamp(this.totalCharge / ANS_CONFIG.awakeningThreshold, 0, 1);
  }

  get bias(): number {
    const total = Math.max(1, this.totalCharge);
    const raw = 0.5 + (this.p1Charge - this.p2Charge) / (2 * total);
    return Phaser.Math.Clamp(raw, ANS_CONFIG.biasClampMin, ANS_CONFIG.biasClampMax);
  }

  update(dt: number): void {
    if (!this.enabled) return;

    const p1Active = this.hasActivePointer("p1");
    const p2Active = this.hasActivePointer("p2");
    if (!p1Active) this.p1Speed = decaySpeed(this.p1Speed, dt);
    if (!p2Active) this.p2Speed = decaySpeed(this.p2Speed, dt);

    // Sustained motion while a finger is held down (EMA speed from recent moves).
    this.p1Charge += this.p1Speed * ANS_CONFIG.chargeRate * dt;
    this.p2Charge += this.p2Speed * ANS_CONFIG.chargeRate * dt;

    if (this.totalCharge >= ANS_CONFIG.awakeningThreshold) {
      this.enabled = false;
      this.onComplete(this.bias);
    }
  }

  private hasActivePointer(side: PlayerSide): boolean {
    for (const track of this.pointers.values()) {
      if (track.side === side) return true;
    }
    return false;
  }

  private sideFor(x: number): PlayerSide {
    return x < this.scene.scale.width * 0.5 ? "p1" : "p2";
  }

  private onDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.enabled) return;
    this.pointers.set(pointer.id, {
      side: this.sideFor(pointer.x),
      lx: pointer.x,
      ly: pointer.y,
      emaSpeed: 0,
    });
  };

  private onMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.enabled || !pointer.isDown) return;
    const track = this.pointers.get(pointer.id);
    if (!track) return;
    const dx = pointer.x - track.lx;
    const dy = pointer.y - track.ly;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) return;
    if (dist > ANS_CONFIG.maxStrokeJumpPx) {
      track.lx = pointer.x;
      track.ly = pointer.y;
      return;
    }
    track.lx = pointer.x;
    track.ly = pointer.y;

    // Primary charge path: distance moved this event (matches plan integral).
    const delta = dist * ANS_CONFIG.chargeRate;
    if (track.side === "p1") this.p1Charge += delta;
    else this.p2Charge += delta;

    const dtSec = Math.max(0.008, this.scene.game.loop.delta / 1000);
    const inst = dist / dtSec;
    track.emaSpeed =
      track.emaSpeed * (1 - ANS_CONFIG.strokeEmaAlpha) + inst * ANS_CONFIG.strokeEmaAlpha;
    if (track.side === "p1") this.p1Speed = track.emaSpeed;
    else this.p2Speed = track.emaSpeed;

    if (this.totalCharge >= ANS_CONFIG.awakeningThreshold) {
      this.enabled = false;
      this.onComplete(this.bias);
    }
  };

  private onUp = (pointer: Phaser.Input.Pointer): void => {
    this.pointers.delete(pointer.id);
  };
}

function decaySpeed(speed: number, dt: number): number {
  return speed * Math.exp(-ANS_CONFIG.strokeSpeedDecay * dt);
}
