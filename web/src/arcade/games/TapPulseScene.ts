import Phaser from "phaser";

/**
 * Tap the Pulse — arcade game #2 (build order D-3, ARCADE-DESIGN-PARTY.md).
 *
 * Piano-tiles re-skin: signal pulses (lit tiles) fall down 4 lanes; tap the
 * lane to fire the pulse. One gesture, zero tutorial (Dev: pre-trained by
 * every music game ever). The ready overlay IS the 2-line tutorial (R1).
 * 3 lives (June's shared arcade economy): missing a falling pulse OR tapping
 * the wrong lane = −1 life + streak reset; no double punishment (R3).
 * Endless with a CEILINGED speed ramp (R3 shape, re-tuned for 4 lanes —
 * numbers documented below). Score: +10/tap, +5 per 5-tap streak milestone,
 * +2 "perfect" (center of lane width) with floating text (R4 analog),
 * floating "wrong lane" / "missed" feedback (near-miss legibility, Rosa).
 * Round-over panel in the site's result language (R6): veil + card +
 * "Play Again" / "Arcade".
 *
 * Touch-first (June): full-height lane tap zones (≥44 px trivially);
 * keyboard is convenience only (1/2/3/4 + D/F/J/K).
 * No colour-only signalling: pulses are lit amber tiles on dark lanes with a
 * waveform icon — shape + luminance, not hue alone; a wrong-lane tap flashes
 * the tapped lane red (motion + shape cue).
 *
 * Harness surface (R5, same as Drop Catch): public state fields + `tiles`
 * array + a public `spawnLane(lane, speed?)` — the verification harness
 * spawns via page.evaluate and lets the REAL update loop do the rest.
 * Veil/HUD leak fixes from SESSION 11 (Drop Catch) applied up front:
 * veils are tracked and destroyed on every reset; buildHud destroys any
 * previous HUD.
 */

export interface PulseTile {
  lane: number;
  body: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Graphics;
  h: number;
  speed: number;
  dead: boolean;
}

const LANE_COUNT = 4;
const TILE_H = 64;
// Phaser 3.90 KeyCodes: number keys are the WORD names ("ONE" = keyCode 49,
// "TWO" = 50, ...) — verified in the phaser bundle's KeyCodes table
// (ONE: 49, TWO: 50, THREE: 51, FOUR: 52). Letter keys are single chars.
const LANE_KEYS = ["ONE", "TWO", "THREE", "FOUR"];
const LANE_KEYS_ALT = ["D", "F", "J", "K"];

export class TapPulseScene extends Phaser.Scene {
  // ---- harness-visible state ----
  score = 0;
  lives = 3;
  taps = 0; // good taps (analog of Drop Catch `catches`)
  wrongTaps = 0; // wrong-lane taps that cost a life (analog of `badHits`)
  streak = 0;
  bestStreak = 0;
  state: "ready" | "running" | "over" = "ready";
  tiles: PulseTile[] = [];

  private hud!: Phaser.GameObjects.Container;
  private hudScore!: Phaser.GameObjects.Text;
  private hudStreak!: Phaser.GameObjects.Text;
  private lanes: Phaser.GameObjects.Rectangle[] = [];
  private col: { x: number; w: number; top: number; bottom: number } = { x: 0, w: 560, top: 96, bottom: 560 };
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private readyOverlay: Phaser.GameObjects.Container | null = null;
  private readyVeil: Phaser.GameObjects.Rectangle | null = null;
  private overOverlay: Phaser.GameObjects.Container | null = null;
  private overVeil: Phaser.GameObjects.Rectangle | null = null;
  private keyDown = [false, false, false, false];
  // The pointerdown that flips ready→running must not ALSO fire a lane:
  // Phaser processes game-object pointer events before scene-level input
  // handlers within the same frame, so the round-start tap would otherwise
  // reach tapLane() on the very next line of the same event cycle and cost
  // the player a life before a single tile exists (phantom start-tap —
  // every real start inside the play column would lose 1 life).
  private consumeNextPointer = false;

  constructor() {
    super("arcade:tap-pulse");
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.layout(w, h);
    this.drawBackdrop();
    this.buildLanes();
    this.buildHud();
    this.buildReadyOverlay();
    this.wireInput();
    this.scale.on("resize", this.onResize, this);
  }

  shutdown(): void {
    this.scale.off("resize", this.onResize, this);
    this.spawnTimer?.remove(false);
  }

  // R1: the round only starts on the first tap inside the play area
  startRound(): void {
    if (this.state !== "ready") return;
    this.state = "running";
    this.consumeNextPointer = true; // swallow the start tap itself (see flag)
    this.readyOverlay?.destroy(true);
    this.readyOverlay = null;
    this.readyVeil?.destroy(true);
    this.readyVeil = null;
    this.scheduleSpawn();
  }

  resetRound(): void {
    this.spawnTimer?.remove(false);
    this.spawnTimer = null;
    for (const t of this.tiles) if (!t.dead) { t.body.destroy(); t.icon.destroy(); }
    this.tiles = [];
    this.score = 0;
    this.lives = 3;
    this.taps = 0;
    this.wrongTaps = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.state = "ready";
    // tracked veil/overlay cleanup — SESSION 11 leak fix, applied up front
    this.overOverlay?.destroy(true);
    this.overOverlay = null;
    this.overVeil?.destroy(true);
    this.overVeil = null;
    this.readyOverlay?.destroy(true);
    this.readyOverlay = null;
    this.readyVeil?.destroy(true);
    this.readyVeil = null;
    this.buildHud();
    this.buildReadyOverlay();
  }

  /**
   * R5: public spawn — also used by the verification harness.
   * Spawns a lit pulse at the top of `lane`. `speed` overrides the ramp
   * (pass 0 to hold a tile in place for screenshot checks).
   */
  spawnLane(lane: number, speed?: number): PulseTile {
    const clampedLane = Phaser.Math.Clamp(Math.floor(lane), 0, LANE_COUNT - 1);
    const laneW = this.col.w / LANE_COUNT;
    const pad = Math.min(8, laneW * 0.06);
    const x = this.col.x + clampedLane * laneW + laneW / 2;
    const body = this.add
      .rectangle(x, this.col.top - TILE_H / 2, laneW - pad * 2, TILE_H, 0xffd86a, 0.95)
      .setStrokeStyle(3, 0xfff3c4, 1)
      .setDepth(5);
    // waveform icon (procedural; not colour-only) — small zig-zag centred
    const icon = this.add.graphics().setDepth(6);
    icon.setPosition(x, this.col.top - TILE_H / 2);
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 8; i++) {
      const px = -18 + (36 / 8) * i;
      const py = (i % 2 === 0 ? -8 : 8) * (i === 0 || i === 8 ? 0 : 1);
      pts.push(new Phaser.Geom.Point(px, py));
    }
    icon.lineStyle(3, 0x1a1208, 0.9);
    icon.strokePoints(pts, false);
    const tile: PulseTile = {
      lane: clampedLane,
      body,
      icon,
      h: TILE_H,
      speed: speed ?? this.currentSpeed(),
      dead: false,
    };
    this.tiles.push(tile);
    return tile;
  }
  // ---- ramp numbers (R3 shape, re-tuned for 4 lanes) ----
  // First 8 spawns: 110 px/s, 1.3 s apart (self-efficacy window — the
  // player must be able to react at 60 fps and at festival-tablet 30 fps).
  // Then: fall speed min(130 + 6·taps, 480) px/s, spawn interval
  // max(1.3 − 0.03·taps, 0.6) s. At the ceiling a tile crosses the ~560 px
  // column in ~1.2 s — hard but readable across the room (dual-screen rule:
  // no 20-px fiddly targets, whole lanes are the hit area).
  private currentSpeed(): number {
    if (this.taps < 8) return 110;
    return Math.min(130 + 6 * this.taps, 480);
  }

  private currentSpawnInterval(): number {
    if (this.taps < 8) return 1.3;
    return Math.max(1.3 - 0.03 * this.taps, 0.6);
  }

  private scheduleSpawn(): void {
    this.spawnTimer?.remove(false);
    this.spawnTimer = this.time.addEvent({
      delay: this.currentSpawnInterval() * 1000,
      callback: () => {
        if (this.state !== "running") return;
        // never spawn into a lane that already has a live tile (one tile per
        // lane at a time — keeps the lane legible and the tap unambiguous)
        const busy = new Set(this.tiles.filter((t) => !t.dead).map((t) => t.lane));
        const free: number[] = [];
        for (let i = 0; i < LANE_COUNT; i++) if (!busy.has(i)) free.push(i);
        if (free.length === 0) {
          this.scheduleSpawn();
          return;
        }
        this.spawnLane(free[Phaser.Math.Between(0, free.length - 1)]!);
        this.scheduleSpawn(); // re-pace: interval tightens with taps
      },
    });
  }

  update(_t: number, dtMs: number): void {
    const dt = Math.min(dtMs, 50) / 1000;
    if (this.state !== "running") return;
    for (const t of this.tiles) {
      if (t.dead) continue;
      // ramp applies to falling tiles; a speed-0 tile is intentionally held
      // (spawnLane(lane, 0) — screenshot / harness checks) and must not drift
      if (t.speed > 0) t.speed = Math.max(t.speed, this.taps < 8 ? 110 : this.currentSpeed());
      t.body.y += t.speed * dt;
      t.icon.y = t.body.y;
      // miss: bottom edge of the tile crossed the catch line (lane bottom)
      if (t.body.y - t.h / 2 > this.col.bottom) {
        this.kill(t);
        this.loseLife("missed", t.lane);
      }
    }
    this.tiles = this.tiles.filter((t) => !t.dead);
  }

  private kill(t: PulseTile): void {
    t.dead = true;
    t.body.destroy();
    t.icon.destroy();
  }

  /**
   * Core input: fire lane `lane` (0–3). Called by pointer taps on lane zones
   * and by the keyboard. If the LOWEST live tile in the lane is within the
   * catch band of the lane bottom it is a good tap (perfect = tile centre
   * within 12 px of the band centre). A tap with no tile in range is a
   * wrong-lane tap: −1 life + streak reset (R3 symmetric economy, no
   * double punishment — the life cost IS the only penalty).
   */
  tapLane(lane: number): void {
    if (this.state !== "running") return;
    const clampedLane = Phaser.Math.Clamp(Math.floor(lane), 0, LANE_COUNT - 1);
    // flash the lane either way (feedback for EVERY input — deaf-visitor
    // rule: the visual readout of the tap is the signal)
    this.flashLane(clampedLane);
    // catch band: tile CENTRE within [bottom − 38, bottom + 32] — i.e. just
    // above the beat line, or below it while the tile is still alive (the
    // miss test kills a tile once its TOP crosses the line, i.e. centre >
    // bottom + h/2 = bottom + 32). At onboarding 110 px/s that is a ~0.6 s
    // window — generous; at the 480 px/s ceiling ~0.15 s — the hard end.
    const bandTop = this.col.bottom - 38;
    let target: PulseTile | null = null;
    for (const t of this.tiles) {
      if (t.dead || t.lane !== clampedLane) continue;
      if (t.body.y >= bandTop && t.body.y <= this.col.bottom + t.h / 2) {
        if (!target || t.body.y > target.body.y) target = t; // lowest wins
      }
    }
    if (target) {
      const wasTarget = target;
      this.kill(wasTarget);
      this.taps += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const perfect = Math.abs(wasTarget.body.y - this.col.bottom) < 14; // centre on the beat line
      this.score += 10;
      if (perfect) this.score += 2;
      if (this.streak % 5 === 0) this.score += 5;
      this.floatText(perfect ? "+12 perfect!" : "+10", this.laneX(clampedLane), this.col.bottom - 40, perfect ? "#ffd86a" : "#7ee8a0");
      this.updateHud();
      this.scheduleSpawn(); // spawn pace tightens with taps
    } else {
      this.loseLife("wrong", clampedLane);
    }
  }

  // R3: symmetric life economy — miss and wrong-tap both cost 1 life
  private loseLife(why: "missed" | "wrong", lane: number): void {
    this.lives -= 1;
    this.streak = 0;
    const x = this.laneX(lane);
    if (why === "wrong") {
      this.wrongTaps += 1;
      this.floatText("wrong lane", x, this.col.bottom - 40, "#ff8a8a");
      this.cameras.main.shake(120, 0.006);
    } else {
      this.floatText("missed", x, this.col.bottom - 40, "#8a9ab0");
    }
    this.updateHud();
    if (this.lives <= 0) this.gameOver();
  }

  // R6: round-over panel in the site's result language
  private gameOver(): void {
    this.state = "over";
    this.spawnTimer?.remove(false);
    this.spawnTimer = null;
    for (const t of this.tiles) if (!t.dead) { t.body.setVisible(false); t.icon.setVisible(false); } // freeze the board behind the veil
    const w = this.scale.width;
    const h = this.scale.height;
    this.overVeil = this.add.rectangle(w / 2, h / 2, w, h, 0x05080f, 0.72).setDepth(99);
    this.overOverlay = this.add.container(w / 2, h / 2).setDepth(100);
    const card = this.add.graphics();
    const cw = Math.min(520, w - 60);
    const ch = 300;
    card.fillStyle(0x111a2a, 0.98);
    card.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 18);
    card.lineStyle(2, 0xffd060, 0.8);
    card.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 18);
    this.overOverlay.add(card);
    this.overOverlay.add(
      this.add.text(0, -ch / 2 + 58, "ROUND OVER", { fontFamily: "ui-sans-serif, system-ui", fontSize: "34px", color: "#ffd86a", fontStyle: "bold" }).setOrigin(0.5),
    );
    this.overOverlay.add(
      this.add.text(0, -ch / 2 + 116, `score ${this.score}   ·   pulses ${this.taps}   ·   best streak ${this.bestStreak}`, { fontFamily: "ui-sans-serif, system-ui", fontSize: "18px", color: "#9fb5d8" }).setOrigin(0.5),
    );
    this.overOverlay.add(
      this.add.text(0, -ch / 2 + 156, "The signal faded out. Ready for another beat?", { fontFamily: "ui-sans-serif, system-ui", fontSize: "15px", color: "#8fb6ff", fontStyle: "italic" }).setOrigin(0.5),
    );
    this.overOverlay.add(this.makeResultButton(0, ch / 2 - 66, "Play Again", () => this.resetRound()));
    this.overOverlay.add(this.makeResultButton(0, ch / 2 - 14, "Arcade", () => this.scene.start("arcade-select")));
  }

  private laneX(lane: number): number {
    return this.col.x + (lane + 0.5) * (this.col.w / LANE_COUNT);
  }

  private floatText(text: string, x: number, y: number, color: string): void {
    const t = this.add
      .text(x, y, text, { fontFamily: "ui-sans-serif, system-ui", fontSize: "18px", color, fontStyle: "bold" })
      .setOrigin(0.5).setDepth(20).setAlpha(0);
    this.tweens.add({ targets: t, y: y - 46, alpha: 1, duration: 650, ease: "Cubic.out", onComplete: () => t.destroy() });
  }

  private flashLane(lane: number): void {
    const f = this.laneFlash[lane];
    if (!f) return;
    // dedicated flash rect per lane (never touch the lane rect's own style —
    // tweening fillAlpha down and back would leave the lane transparent)
    f.setFillStyle(0xffd86a, 0.35);
    this.tweens.add({ targets: f, fillAlpha: 0, duration: 260, ease: "Cubic.out" });
  }
  private layout(w: number, h: number): void {
    this.col = {
      x: Math.max(0, (w - Math.min(560, w - 48)) / 2),
      w: Math.min(560, w - 48),
      top: 96,
      bottom: h - 96,
    };
  }

  private onResize = (): void => {
    const w = this.scale.width;
    const h = this.scale.height;
    this.layout(w, h);
    this.drawBackdrop();
    this.buildLanes();
  };

  private backdropG!: Phaser.GameObjects.Graphics;

  private drawBackdrop(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.backdropG?.destroy();
    const bg = this.add.graphics().setDepth(0);
    for (let i = 0; i < 60; i++) {
      const t = i / 59;
      bg.fillStyle(this.lerp(0x080d1c, 0x101d33, t), 1);
      bg.fillRect(0, (i * h) / 60, w, h / 60 + 1);
    }
    // play column frame
    const c = this.col;
    bg.lineStyle(2, 0x2c3a55, 0.9);
    bg.strokeRoundedRect(c.x, c.top, c.w, c.bottom - c.top, 12);
    this.backdropG = bg;
  }

  private lerp(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg2 = (b >> 8) & 255, bb = b & 255;
    const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg2 - ag) * t), bl = Math.round(ab + (bb - ab) * t);
    return (r << 16) | (g << 8) | bl;
  }

  private laneW(): number {
    return this.col.w / LANE_COUNT;
  }

  private laneFlash: Phaser.GameObjects.Rectangle[] = [];

  private buildLanes(): void {
    for (const r of this.lanes) r.destroy();
    this.lanes = [];
    for (const f of this.laneFlash) f.destroy();
    this.laneFlash = [];
    this.laneBand?.destroy();
    this.laneLabels?.destroy();
    const c = this.col;
    const lw = this.laneW();
    for (let i = 0; i < LANE_COUNT; i++) {
      const lane = this.add
        .rectangle(c.x + (i + 0.5) * lw, (c.top + c.bottom) / 2, lw - 2, c.bottom - c.top, 0x0d1526, 0.92)
        .setDepth(1);
      this.lanes.push(lane);
      // lane divider ticks
      const d = this.add.graphics().setDepth(2);
      d.lineStyle(2, 0x22314e, 0.9);
      d.lineBetween(c.x + i * lw, c.top, c.x + i * lw, c.bottom);
      d.lineBetween(c.x + (i + 1) * lw, c.top, c.x + (i + 1) * lw, c.bottom);
      d.lineStyle(1, 0x1a2740, 0.7);
      d.lineBetween(c.x + i * lw + 14, c.bottom - 12, c.x + i * lw + 34, c.bottom - 12);
      d.lineBetween(c.x + i * lw + lw - 34, c.bottom - 12, c.x + i * lw + lw - 14, c.bottom - 12);
    }
    // catch band (the "beat zone") + beat line — the visual the player taps to
    const band = this.add.graphics().setDepth(2);
    band.fillStyle(0xffd060, 0.07);
    band.fillRect(c.x + 1, c.bottom - 96, c.w - 2, 96);
    band.lineStyle(3, 0xffd060, 0.85);
    band.lineBetween(c.x + 4, c.bottom, c.x + c.w - 4, c.bottom);
    // per-lane tap flash rects (separate from the lane rects — flashLane
    // tweens THESE, so the lane's own fill is never left altered)
    for (let i = 0; i < LANE_COUNT; i++) {
      const f = this.add
        .rectangle(c.x + (i + 0.5) * lw, (c.top + c.bottom) / 2, lw - 2, c.bottom - c.top, 0xffd86a, 0)
        .setDepth(4);
      this.laneFlash.push(f);
    }
    // lane number labels under the beat line (dual-screen: readable at wall
    // distance). Clamped above the screen bottom: on short viewports
    // (col.bottom = h − 96) the labels would otherwise render off-screen.
    const labels = this.add.text(c.x + c.w / 2, Math.min(c.bottom + 26, this.scale.height - 14), "1        2        3        4", {
      fontFamily: "ui-monospace, monospace",
      fontSize: "18px",
      color: "#5a7a9a",
      align: "center",
    }).setOrigin(0.5).setDepth(2);
    // store for resize cleanup
    this.laneLabels = labels;
    this.laneBand = band;
  }

  private laneBand!: Phaser.GameObjects.Graphics;
  private laneLabels!: Phaser.GameObjects.Text;

  private buildHud(): void {
    this.hud?.destroy(true); // resetRound rebuilds the HUD — never stack two
    this.hud = this.add.container(0, 0).setDepth(30);
    const c = this.col;
    const score = this.add.text(c.x, 64, "score 0", { fontFamily: "ui-monospace, monospace", fontSize: "26px", color: "#ffd86a", fontStyle: "bold" }).setOrigin(0, 0.5);
    const streak = this.add.text(c.x + 220, 64, "streak 0", { fontFamily: "ui-monospace, monospace", fontSize: "20px", color: "#7ee8a0" }).setOrigin(0, 0.5);
    const back = this.add.text(28, 40, "← Arcade", { fontFamily: "ui-sans-serif, system-ui", fontSize: "22px", color: "#9fb5d8", fontStyle: "bold" }).setOrigin(0);
    this.hud.add([score, streak, back]);
    this.hudScore = score;
    this.hudStreak = streak;
    const hit = this.add.rectangle(28 + 60, 40, 150, 44, 0xffffff, 0.001).setInteractive({ useHandCursor: true }).on("pointerdown", () => this.scene.start("arcade-select"));
    this.hud.add(hit);
    this.updateHud();
  }

  private updateHud(): void {
    if (!this.hudScore) return;
    this.hudScore.setText(`score ${this.score}`);
    this.hudStreak.setText(`streak ${this.streak}`);
  }

  // R1: ready overlay doubles as the 2-line tutorial
  private buildReadyOverlay(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.readyVeil = this.add.rectangle(w / 2, h / 2, w, h, 0x05080f, 0.6).setDepth(49);
    this.readyOverlay = this.add.container(w / 2, h / 2).setDepth(50);
    const lines: Array<[string, number, string]> = [
      ["TAP THE PULSE", 40, "#ffd86a"],
      ["Tap the lane when the pulse reaches the beat line", 20, "#9fb5d8"],
      ["Wrong lane or missed pulse = −1 life · 3 lives", 16, "#5a7a9a"],
      ["keys: 1 2 3 4 · ESC back", 14, "#41506a"],
      ["TAP TO START", 26, "#4fd1c5"],
    ];
    lines.forEach(([t, fs, col], i) => {
      this.readyOverlay!.add(
        this.add.text(0, -110 + i * 52, t, { fontFamily: "ui-sans-serif, system-ui", fontSize: `${fs}px`, color: col, fontStyle: "bold", align: "center" }).setOrigin(0.5),
      );
    });
    const hit = this.add.rectangle(0, 0, Math.min(600, w - 40), 340, 0xffffff, 0.001).setInteractive().on("pointerdown", () => this.startRound());
    this.readyOverlay.add(hit);
  }

  // R6: buttons in the site's result-panel style (PLAY button visual)
  private makeResultButton(x: number, y: number, label: string, cb: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const bw = 220;
    const bh = 46;
    const bg = this.add.graphics();
    bg.fillStyle(0xffd060, 0.95);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    c.add(bg);
    c.add(this.add.text(0, 0, label, { fontFamily: "ui-sans-serif, system-ui", fontSize: "19px", color: "#1a1208", fontStyle: "bold" }).setOrigin(0.5));
    const hit = this.add.rectangle(0, 0, bw, bh, 0xffffff, 0.001).setInteractive({ useHandCursor: true }).on("pointerdown", (e: unknown) => {
      (e as { event?: { stopPropagation?: () => void } }).event?.stopPropagation?.();
      cb();
    });
    c.add(hit);
    return c;
  }

  private wireInput(): void {
    // pointer: any tap inside the column fires the lane under the finger
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.consumeNextPointer) {
        // this IS the round-start tap — always consumed, even if it landed
        // outside the column (the flag must not leak onto a later tap)
        this.consumeNextPointer = false;
        return;
      }
      if (this.state !== "running") return; // ready overlay / over panel own their taps
      const c = this.col;
      if (p.worldX < c.x || p.worldX >= c.x + c.w) return;
      const lane = Phaser.Math.Clamp(Math.floor((p.worldX - c.x) / this.laneW()), 0, LANE_COUNT - 1);
      this.tapLane(lane);
    });
    // keyboard is convenience only (June: touch-first, keys optional)
    const keys = [...LANE_KEYS, ...LANE_KEYS_ALT];
    keys.forEach((k, idx) => {
      const lane = idx < LANE_KEYS.length ? idx : idx - LANE_KEYS.length;
      this.input.keyboard?.on(`keydown-${k}`, () => this.tapLane(lane));
    });
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("arcade-select"));
  }
}
