import Phaser from "phaser";
import { IMMUNE_CONFIG } from "./config";

export interface NetosisTarget {
  id: number;
  x: number;
  y: number;
  radius: number;
}

export interface NetosisHooks {
  /** All live colonies, nearest to the neutrophil first (fibers travel to targets). */
  listTargets: (x: number, y: number) => readonly NetosisTarget[];
  getColonyPosition: (id: number) => { x: number; y: number; radius: number } | null;
  destroyColony: (id: number) => boolean;
}

interface ActiveNet {
  container: Phaser.GameObjects.Container;
  life: number;
}

interface FlyingFiber {
  targetId: number;
  headX: number;
  headY: number;
  gfx: Phaser.GameObjects.Graphics;
}

/**
 * NETosis helper: press to release chromatin fibers from the neutrophil one at a
 * time — each fiber travels to a bacterium, blooms into a sticky trap, and destroys it.
 */
export class NetosisSystem {
  private readonly scene: Phaser.Scene;
  private readonly worldLayer: Phaser.GameObjects.Container;
  private readonly hooks: NetosisHooks;

  private cooldown = 0;
  private activeNets: ActiveNet[] = [];
  private releaseBtn!: Phaser.GameObjects.Container;
  private releaseLabel!: Phaser.GameObjects.Text;
  private btnBg!: Phaser.GameObjects.Graphics;

  private btnHalfW = 110;
  private btnHalfH = 40;
  private btnLabelSize = 22;
  private btnCountdownSize = 36;
  private labelFlashTimer: Phaser.Time.TimerEvent | null = null;
  private chromeTop = 88;

  private salvoQueue: number[] = [];
  private salvoDestroyed = 0;
  private shotGapTimer = 0;
  private activeFiber: FlyingFiber | null = null;
  private btnPointerId: number | null = null;
  private inputBlocked: () => boolean = () => false;

  constructor(scene: Phaser.Scene, worldLayer: Phaser.GameObjects.Container, hooks: NetosisHooks) {
    this.scene = scene;
    this.worldLayer = worldLayer;
    this.hooks = hooks;
    this.buildButton();
  }

  /** Called by ImmuneRescueScene so the button stays inside the top HUD band. */
  layoutInChrome(chromeTop: number): void {
    this.chromeTop = chromeTop;
    this.layout();
  }

  get isReady(): boolean {
    return this.cooldown <= 0 && this.salvoQueue.length === 0 && this.activeFiber === null;
  }

  update(dt: number, neutrophilX: number, neutrophilY: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.refreshButton();

    for (const net of [...this.activeNets]) {
      net.life -= dt;
      const t = Phaser.Math.Clamp(net.life / IMMUNE_CONFIG.netosisLifeSeconds, 0, 1);
      net.container.setAlpha(0.25 + t * 0.55);
      if (net.life <= 0) {
        net.container.destroy(true);
        this.activeNets = this.activeNets.filter((n) => n !== net);
      }
    }

    if (this.activeFiber) {
      this.advanceFiber(dt, neutrophilX, neutrophilY);
    } else if (this.salvoQueue.length > 0) {
      this.shotGapTimer -= dt;
      if (this.shotGapTimer <= 0) {
        this.launchNextFiber(neutrophilX, neutrophilY);
      }
    }
  }

  destroy(): void {
    this.labelFlashTimer?.remove(false);
    this.activeFiber?.gfx.destroy();
    this.activeFiber = null;
    for (const net of this.activeNets) net.container.destroy(true);
    this.activeNets = [];
    this.releaseBtn.destroy(true);
  }

  /** Scene wires neutrophil position into this after button tap. */
  bindNeutrophilPosition(getPos: () => { x: number; y: number }): void {
    this.getNeutrophilPos = getPos;
  }

  /** Block releases while intro overlay or other UI pauses gameplay. */
  setInputBlocked(blocked: () => boolean): void {
    this.inputBlocked = blocked;
  }

  private getNeutrophilPos: () => { x: number; y: number } = () => ({ x: 0, y: 0 });

  tryReleaseAt(x: number, y: number): boolean {
    if (this.inputBlocked()) return false;
    if (this.cooldown > 0 || this.salvoQueue.length > 0 || this.activeFiber) return false;

    const targets = this.hooks.listTargets(x, y).slice(0, IMMUNE_CONFIG.netosisMaxTargetsPerSalvo);
    if (targets.length === 0) {
      this.flashButtonLabel("No bacteria");
      return false;
    }

    this.salvoQueue = targets.map((t) => t.id);
    this.salvoDestroyed = 0;
    this.shotGapTimer = 0;
    this.cooldown = IMMUNE_CONFIG.netosisCooldownSeconds;
    this.launchNextFiber(x, y);
    return true;
  }

  private launchNextFiber(sourceX: number, sourceY: number): void {
    while (this.salvoQueue.length > 0) {
      const targetId = this.salvoQueue.shift()!;
      if (this.hooks.getColonyPosition(targetId)) {
        const gfx = this.scene.add.graphics().setDepth(12);
        this.worldLayer.add(gfx);
        this.activeFiber = {
          targetId,
          headX: sourceX,
          headY: sourceY,
          gfx,
        };
        return;
      }
    }
    this.finishSalvo();
  }

  private advanceFiber(dt: number, sourceX: number, sourceY: number): void {
    const fiber = this.activeFiber;
    if (!fiber) return;

    const target = this.hooks.getColonyPosition(fiber.targetId);
    if (!target) {
      this.clearFiber();
      this.shotGapTimer = IMMUNE_CONFIG.netosisShotGapSeconds;
      return;
    }

    const dx = target.x - fiber.headX;
    const dy = target.y - fiber.headY;
    const dist = Math.hypot(dx, dy) || 1;
    const step = IMMUNE_CONFIG.netosisFiberSpeed * dt;
    const hitDist = target.radius * 0.55 + 18;

    if (dist <= hitDist) {
      this.impactAt(target.x, target.y, target.radius, fiber.targetId);
      return;
    }

    fiber.headX += (dx / dist) * Math.min(step, dist);
    fiber.headY += (dy / dist) * Math.min(step, dist);
    this.drawFiber(fiber, sourceX, sourceY, target.x, target.y);
  }

  private impactAt(x: number, y: number, colonyRadius: number, targetId: number): void {
    this.clearFiber();
    const trapRadius = colonyRadius * IMMUNE_CONFIG.netosisTrapRadiusScale;
    this.spawnNetVisual(x, y, trapRadius);
    if (this.hooks.destroyColony(targetId)) {
      this.salvoDestroyed += 1;
    }
    this.shotGapTimer = IMMUNE_CONFIG.netosisShotGapSeconds;
    if (this.salvoQueue.length === 0 && !this.activeFiber) {
      this.finishSalvo();
    }
  }

  private finishSalvo(): void {
    this.salvoDestroyed = 0;
    this.refreshButton();
  }

  private flashButtonLabel(text: string, ms = 900): void {
    this.labelFlashTimer?.remove(false);
    this.releaseLabel.setText(text);
    this.labelFlashTimer = this.scene.time.delayedCall(ms, () => {
      this.labelFlashTimer = null;
      if (this.releaseLabel.active) this.refreshButton();
    });
  }

  private clearFiber(): void {
    this.activeFiber?.gfx.destroy();
    this.activeFiber = null;
  }

  private drawFiber(
    fiber: FlyingFiber,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
  ): void {
    const gfx = fiber.gfx;
    gfx.clear();

    // Tether from neutrophil to the traveling granule head.
    gfx.lineStyle(5, 0xf5eeff, 0.55);
    gfx.beginPath();
    gfx.moveTo(sourceX, sourceY);
    gfx.lineTo(fiber.headX, fiber.headY);
    gfx.strokePath();

    gfx.lineStyle(2, 0xc8a8ff, 0.45);
    const wispCount = 4;
    for (let i = 0; i < wispCount; i++) {
      const t = (i + 1) / (wispCount + 1);
      const wx = Phaser.Math.Linear(sourceX, fiber.headX, t);
      const wy = Phaser.Math.Linear(sourceY, fiber.headY, t);
      const perp = Math.atan2(fiber.headY - sourceY, fiber.headX - sourceX) + Math.PI / 2;
      const sway = 14 + i * 4;
      gfx.lineBetween(wx, wy, wx + Math.cos(perp) * sway, wy + Math.sin(perp) * sway);
    }

    // Faint aim line toward the bacterium.
    gfx.lineStyle(1.5, 0xe8d8ff, 0.25);
    gfx.lineBetween(fiber.headX, fiber.headY, targetX, targetY);

    // Granule head — chromatin + protein bundle leaving the cell.
    gfx.fillStyle(0xffffff, 0.95);
    gfx.fillCircle(fiber.headX, fiber.headY, 10);
    gfx.fillStyle(0xc8a8ff, 0.85);
    gfx.fillCircle(fiber.headX, fiber.headY, 6);
  }

  private spawnNetVisual(x: number, y: number, radius: number): void {
    if (this.activeNets.length >= IMMUNE_CONFIG.netosisMaxActive) {
      const oldest = this.activeNets.shift();
      oldest?.container.destroy(true);
    }

    const container = this.scene.add.container(x, y).setDepth(8);
    const gfx = this.scene.add.graphics();
    container.add(gfx);
    this.worldLayer.add(container);

    const fibrilCount = 18;
    const fibrils: { ex: number; ey: number }[] = [];
    for (let i = 0; i < fibrilCount; i++) {
      const ang = (i / fibrilCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const len = radius * (0.5 + Math.random() * 0.5);
      fibrils.push({ ex: Math.cos(ang) * len, ey: Math.sin(ang) * len });
    }

    const drawNet = (scale: number, alpha: number): void => {
      gfx.clear();
      gfx.fillStyle(0xe8d8ff, alpha * 0.28);
      gfx.fillCircle(0, 0, radius * scale);

      gfx.lineStyle(2.5, 0xf5eeff, alpha * 0.8);
      for (const f of fibrils) {
        gfx.beginPath();
        gfx.moveTo(0, 0);
        gfx.lineTo(f.ex * scale, f.ey * scale);
        gfx.strokePath();
      }

      gfx.lineStyle(1.5, 0xc8a8ff, 0.55 * alpha);
      for (let i = 0; i < fibrils.length; i++) {
        const a = fibrils[i]!;
        const b = fibrils[(i + 2) % fibrils.length]!;
        gfx.lineBetween(a.ex * scale * 0.75, a.ey * scale * 0.75, b.ex * scale * 0.75, b.ey * scale * 0.75);
      }
    };

    drawNet(0.08, 0.5);
    this.scene.tweens.add({
      targets: { s: 0.08 },
      s: 1,
      duration: 320,
      ease: "Cubic.Out",
      onUpdate: (_t, target) => drawNet((target as { s: number }).s, 0.9),
    });

    this.activeNets.push({ container, life: IMMUNE_CONFIG.netosisLifeSeconds });
  }

  private buildButton(): void {
    this.releaseBtn = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(1520);
    this.releaseBtn.setData("blockSteer", true);

    const btnW = this.btnHalfW * 2;
    const btnH = this.btnHalfH * 2;

    this.btnBg = this.scene.add.graphics();
    this.drawButtonBg(false);
    this.releaseBtn.add(this.btnBg);

    this.releaseLabel = this.scene.add
      .text(0, 0, "AI help", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: `${this.btnLabelSize}px`,
        color: "#f0e8ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.releaseBtn.add(this.releaseLabel);

    const zone = new Phaser.Geom.Rectangle(-this.btnHalfW, -this.btnHalfH, btnW, btnH);
    this.releaseBtn.setInteractive(zone, Phaser.Geom.Rectangle.Contains);
    this.releaseBtn.on(
      "pointerdown",
      (pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        if (this.inputBlocked()) return;
        this.btnPointerId = pointer.id;
      },
    );
    this.releaseBtn.on(
      "pointerup",
      (pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        if (pointer.id !== this.btnPointerId) return;
        this.btnPointerId = null;
        if (this.inputBlocked()) return;
        const { x, y } = this.getNeutrophilPos();
        this.tryReleaseAt(x, y);
      },
    );
    this.releaseBtn.on("pointerupoutside", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.btnPointerId) this.btnPointerId = null;
    });
  }

  private drawButtonBg(ready: boolean): void {
    const hw = this.btnHalfW;
    const hh = this.btnHalfH;
    const btnW = hw * 2;
    const btnH = hh * 2;
    this.btnBg.clear();
    this.btnBg.fillStyle(0x1a0a28, ready ? 0.92 : 0.78);
    this.btnBg.fillRoundedRect(-hw, -hh, btnW, btnH, 14);
    this.btnBg.lineStyle(2, 0xc8a8ff, ready ? 0.9 : 0.5);
    this.btnBg.strokeRoundedRect(-hw, -hh, btnW, btnH, 14);
  }

  private refreshButton(): void {
    if (this.labelFlashTimer) return;

    const busy = this.salvoQueue.length > 0 || this.activeFiber !== null;

    if (this.cooldown > 0) {
      const secs = Math.max(1, Math.ceil(this.cooldown));
      this.releaseLabel.setText(String(secs));
      this.releaseLabel.setFontSize(this.btnCountdownSize);
      this.releaseLabel.setAlpha(0.9);
      this.drawButtonBg(false);
      return;
    }

    this.releaseLabel.setText("AI help");
    this.releaseLabel.setFontSize(this.btnLabelSize);

    if (busy) {
      this.releaseLabel.setAlpha(0.65);
      this.drawButtonBg(false);
      return;
    }

    this.releaseLabel.setAlpha(1);
    this.drawButtonBg(true);
  }

  private layout = (): void => {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const isShort = h < 520;
    const margin = Math.round(isShort ? 8 : 12);
    const scale = Phaser.Math.Clamp(Math.min(w / 390, h / 844), 0.42, 1.35);
    if (isShort) {
      this.btnHalfW = Math.round(88 * scale);
      this.btnHalfH = Math.round(30 * scale);
    } else {
      this.btnHalfW = Math.round(110 * scale);
      this.btnHalfH = Math.round(40 * scale);
    }
    this.btnLabelSize = Math.max(18, Math.min(26, Math.round(22 * scale)));
    this.btnCountdownSize = Math.max(26, Math.min(42, Math.round(34 * scale)));

    const btnY = Math.min(this.chromeTop - this.btnHalfH - margin, this.btnHalfH + margin);
    this.releaseBtn.setPosition(w - this.btnHalfW - margin, Math.max(this.btnHalfH + margin, btnY));
    this.redrawButtonBg();
    this.refreshButton();
  };

  private redrawButtonBg(): void {
    const hw = this.btnHalfW;
    const hh = this.btnHalfH;
    const ready = this.cooldown <= 0 && this.salvoQueue.length === 0 && this.activeFiber === null;
    this.btnBg.clear();
    this.btnBg.fillStyle(0x1a0a28, ready ? 0.92 : 0.78);
    this.btnBg.fillRoundedRect(-hw, -hh, hw * 2, hh * 2, 14);
    this.btnBg.lineStyle(2, 0xc8a8ff, ready ? 0.9 : 0.5);
    this.btnBg.strokeRoundedRect(-hw, -hh, hw * 2, hh * 2, 14);

    const zone = new Phaser.Geom.Rectangle(-hw, -hh, hw * 2, hh * 2);
    this.releaseBtn.setInteractive(zone, Phaser.Geom.Rectangle.Contains);
  }
}

/** @deprecated Use NetosisSystem — kept for import stability during transition. */
export const ImmuneAssistant = NetosisSystem;
