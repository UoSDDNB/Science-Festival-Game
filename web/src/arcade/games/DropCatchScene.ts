import Phaser from "phaser";

/**
 * Drop Catch — arcade game #1 (ARCADE-DESIGN-PARTY.md §7 + R1–R7).
 *
 * Objects (good = smooth circles, bad = spiky stars — shape encodes type,
 * never colour alone) fall through a fixed-width play column. Drag anywhere
 * on the canvas to move the receptor bucket horizontally (1:1 finger→bucket,
 * clamped to the column; R2). Round starts on first tap (R1 ready state,
 * which IS the 3-line tutorial). 3 lives: missing a good OR catching a bad
 * object = −1 life + streak reset (R3). Endless with a CEILINGED speed ramp
 * (R3 numbers). Score: +10/catch, +5 per 5-catch milestone, +2 edge catch
 * (rim < 20 px) with floating "+2 edge!" text (R4). Round-over panel in the
 * site's result language: veil + card + "Play Again" / "Arcade" (R6).
 *
 * Public state fields + `objects` array are the harness surface (R5): the
 * verification harness pushes spawn() calls via page.evaluate and lets the
 * real update loop do the rest — no test hooks in the scene itself.
 */

export interface DropObject {
  kind: "good" | "bad";
  body: Phaser.GameObjects.Arc | Phaser.GameObjects.Graphics;
  r: number;
  vy: number;
  dead: boolean;
}

const GOOD_HUES = [0x7ec3ee, 0x4fd1c5, 0xffd86a, 0xf9a8d4, 0xa3e635];
const BAD_COLOR = 0xef4444;
const BUCKET_W = 96;
const BUCKET_H = 28;

export class DropCatchScene extends Phaser.Scene {
  // ---- harness-visible state (R5) ----
  score = 0;
  lives = 3;
  catches = 0;
  badHits = 0;
  streak = 0;
  state: "ready" | "running" | "over" = "ready";
  objects: DropObject[] = [];

  private bucket!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Container;
  private col: { x: number; w: number; top: number; bottom: number } = { x: 0, w: 600, top: 90, bottom: 600 };
  private targetX = 0;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private readyOverlay: Phaser.GameObjects.Container | null = null;
  private overOverlay: Phaser.GameObjects.Container | null = null;
  private keyL = false;
  private keyR = false;
  private dragging = false;

  constructor() {
    super("arcade:drop-catch");
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.targetX = w / 2;
    this.layout(w, h);
    this.drawBackdrop();
    this.buildBucket();
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
    this.readyOverlay?.destroy(true);
    this.readyOverlay = null;
    this.scheduleSpawn();
  }

  resetRound(): void {
    this.spawnTimer?.remove(false);
    this.spawnTimer = null;
    for (const o of this.objects) if (!o.dead) o.body.destroy();
    this.objects = [];
    this.score = 0;
    this.lives = 3;
    this.catches = 0;
    this.badHits = 0;
    this.streak = 0;
    this.state = "ready";
    this.overOverlay?.destroy(true);
    this.overOverlay = null;
    this.targetX = this.scale.width / 2;
    this.buildHud();
    this.buildReadyOverlay();
  }

  // R5: public spawn — also used by the verification harness
  spawn(kind: "good" | "bad", x?: number, vy?: number): DropObject {
    const r = kind === "good" ? 16 : 15;
    const cx = x ?? Phaser.Math.Between(this.col.x + r + 8, this.col.x + this.col.w - r - 8);
    let body: Phaser.GameObjects.Arc | Phaser.GameObjects.Graphics;
    if (kind === "good") {
      const hue = GOOD_HUES[Phaser.Math.Between(0, GOOD_HUES.length - 1)]!;
      body = this.add.circle(cx, this.col.top - r, r, hue).setStrokeStyle(3, 0xffffff, 0.5).setDepth(5);
    } else {
      // spiky star — shape (not colour) encodes "bad" (June rule)
      const g = this.add.graphics().setDepth(5);
      this.drawStar(g, cx, this.col.top - r, r);
      body = g;
    }
    const obj: DropObject = { kind, body, r, vy: vy ?? this.currentSpeed(), dead: false };
    this.objects.push(obj);
    return obj;
  }

  private currentSpeed(): number {
    if (this.catches < 10) return 90;
    return Math.min(120 + 2.2 * this.catches, 420);
  }

  private currentSpawnInterval(): number {
    if (this.catches < 10) return 1.8;
    return Math.max(1.6 - 0.03 * this.catches, 0.7);
  }

  private scheduleSpawn(): void {
    this.spawnTimer?.remove(false);
    this.spawnTimer = this.time.addEvent({
      delay: this.currentSpawnInterval() * 1000,
      callback: () => {
        if (this.state !== "running") return;
        const badProb = this.catches < 10 ? 0 : Math.min(0.15 + 0.005 * this.catches, 0.35);
        this.spawn(Math.random() * 100 < badProb * 100 ? "bad" : "good");
        this.scheduleSpawn(); // re-pace: interval tightens with catches
      },
    });
  }

  update(_t: number, dtMs: number): void {
    const dt = Math.min(dtMs, 50) / 1000;
    // bucket motion: 1:1 direct follow while dragging (R2, no inertia);
    // lerp toward target for tap-to-move / keyboard
    if (this.dragging) this.targetX = this.input.activePointer.worldX;
    else {
      const kb = (this.keyR ? 1 : 0) - (this.keyL ? 1 : 0);
      if (kb !== 0) this.targetX += kb * 480 * dt;
    }
    const clamped = Phaser.Math.Clamp(this.targetX, this.col.x + BUCKET_W / 2, this.col.x + this.col.w - BUCKET_W / 2);
    if (this.dragging) this.bucket.x = clamped;
    else this.bucket.x += Phaser.Math.Clamp(clamped - this.bucket.x, -1400 * dt, 1400 * dt);
    if (this.state !== "running") return;

    const catchLine = this.col.bottom - BUCKET_H;
    for (const o of this.objects) {
      if (o.dead) continue;
      o.vy = Math.max(o.vy, this.catches < 10 ? 90 : this.currentSpeed()); // ramp applies to falling objects too
      o.body.y += o.vy * dt;
      if (o.body.y - o.r > this.col.bottom + 40) {
        this.kill(o);
        if (o.kind === "good") this.loseLife("missed");
        continue;
      }
      // catch test: crossing the bucket's top edge while horizontally inside
      if (o.body.y + o.r >= catchLine && o.body.y - o.r <= catchLine + 12) {
        const off = Math.abs(o.body.x - this.bucket.x);
        if (off <= BUCKET_W / 2 - 4) {
          this.kill(o);
          if (o.kind === "good") this.goodCatch(off);
          else this.loseLife("bad");
        }
      }
    }
    this.objects = this.objects.filter((o) => !o.dead);
  }

  private kill(o: DropObject): void {
    o.dead = true;
    o.body.destroy();
  }

  // R4: +10 catch, +5 per 5-catch milestone, +2 edge catch (< 20 px from rim)
  private goodCatch(off: number): void {
    this.catches += 1;
    this.streak += 1;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.score += 10;
    const edge = off > BUCKET_W / 2 - 20;
    if (edge) this.score += 2;
    if (this.streak % 5 === 0) this.score += 5;
    this.floatText(edge ? "+12 edge!" : "+10", this.bucket.x, this.col.bottom - 44, edge ? "#ffd86a" : "#7ee8a0");
    this.tweens.add({ targets: this.bucket, scaleY: 1.25, y: "-=6", duration: 60, yoyo: true });
    this.updateHud();
    this.scheduleSpawn(); // spawn pace tightens with catches
  }

  // R3: symmetric life economy — miss-good and catch-bad both cost 1 life
  private loseLife(_why: "missed" | "bad"): void {
    this.lives -= 1;
    this.streak = 0;
    if (_why === "bad") {
      this.badHits += 1;
      this.floatText("spike!", this.bucket.x, this.col.bottom - 44, "#ff8a8a");
      this.cameras.main.shake(120, 0.006);
    } else {
      this.floatText("missed", this.bucket.x, this.col.bottom - 44, "#8a9ab0");
    }
    this.updateHud();
    if (this.lives <= 0) this.gameOver();
  }

  // R6: round-over panel in the site's result language
  private gameOver(): void {
    this.state = "over";
    this.spawnTimer?.remove(false);
    this.spawnTimer = null;
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x05080f, 0.72).setDepth(99);
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
      this.add.text(0, -ch / 2 + 116, `score ${this.score}   ·   caught ${this.catches}   ·   best streak ${this.bestStreak}`, { fontFamily: "ui-sans-serif, system-ui", fontSize: "18px", color: "#9fb5d8" }).setOrigin(0.5),
    );
    this.overOverlay.add(
      this.add.text(0, -ch / 2 + 156, "The receptor stopped listening. Try again?", { fontFamily: "ui-sans-serif, system-ui", fontSize: "15px", color: "#8fb6ff", fontStyle: "italic" }).setOrigin(0.5),
    );
    this.overOverlay.add(this.makeResultButton(0, ch / 2 - 66, "Play Again", () => this.resetRound()));
    this.overOverlay.add(this.makeResultButton(0, ch / 2 - 14, "Arcade", () => this.scene.start("arcade-select")));
  }

  private bestStreak = 0;
  private floatText(text: string, x: number, y: number, color: string): void {
    const t = this.add
      .text(x, y, text, { fontFamily: "ui-sans-serif, system-ui", fontSize: "18px", color, fontStyle: "bold" })
      .setOrigin(0.5).setDepth(20).setAlpha(0);
    this.tweens.add({ targets: t, y: y - 46, alpha: 1, duration: 650, ease: "Cubic.out", onComplete: () => t.destroy() });
  }

  private layout(w: number, h: number): void {
    this.col = {
      x: Math.max(0, (w - Math.min(680, w - 32)) / 2),
      w: Math.min(680, w - 32),
      top: 96,
      bottom: h - 64,
    };
  }

  private onResize = (): void => {
    const w = this.scale.width;
    const h = this.scale.height;
    this.layout(w, h);
    this.bucket.y = this.col.bottom;
    this.targetX = Phaser.Math.Clamp(this.targetX, this.col.x + BUCKET_W / 2, this.col.x + this.col.w - BUCKET_W / 2);
  };

  private drawBackdrop(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const bg = this.add.graphics().setDepth(0);
    for (let i = 0; i < 60; i++) {
      const t = i / 59;
      bg.fillStyle(this.lerp(0x080d1c, 0x101d33, t), 1);
      bg.fillRect(0, (i * h) / 60, w, h / 60 + 1);
    }
    // play column frame + catch line
    const c = this.col;
    bg.lineStyle(2, 0x2c3a55, 0.9);
    bg.strokeRoundedRect(c.x, c.top, c.w, c.bottom - c.top, 14);
    bg.lineStyle(2, 0x4fd1c5, 0.5);
    bg.lineBetween(c.x + 10, c.bottom - BUCKET_H, c.x + c.w - 10, c.bottom - BUCKET_H);
  }

  private lerp(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg2 = (b >> 8) & 255, bb = b & 255;
    const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg2 - ag) * t), bl = Math.round(ab + (bb - ab) * t);
    return (r << 16) | (g << 8) | bl;
  }

  private buildBucket(): void {
    this.bucket = this.add.container(this.scale.width / 2, this.col.bottom).setDepth(10);
    const g = this.add.graphics();
    g.fillStyle(0x16233c, 0.95);
    g.fillRoundedRect(-BUCKET_W / 2, -BUCKET_H, BUCKET_W, BUCKET_H, 8);
    g.lineStyle(3, 0x4fd1c5, 1);
    g.strokeRoundedRect(-BUCKET_W / 2, -BUCKET_H, BUCKET_W, BUCKET_H, 8);
    // "receptor" binding site marker (top-edge tick marks, June: no colour-only)
    g.lineStyle(2, 0x9fb5d8, 0.8);
    for (let i = 1; i < 4; i++) {
      const x = -BUCKET_W / 2 + (BUCKET_W / 4) * i;
      g.lineBetween(x, -BUCKET_H, x, -BUCKET_H + 8);
    }
    this.bucket.add(g);
  }

  private buildHud(): void {
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

  private hudScore!: Phaser.GameObjects.Text;
  private hudStreak!: Phaser.GameObjects.Text;

  private updateHud(): void {
    if (!this.hudScore) return;
    this.hudScore.setText(`score ${this.score}`);
    this.hudStreak.setText(`streak ${this.streak}`);
  }

  // R1: ready overlay doubles as the 3-line tutorial. Container is centred
  // on the screen (children use origin-centred coords); the veil sits in the
  // scene layer below it.
  private buildReadyOverlay(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x05080f, 0.6).setDepth(49);
    this.readyOverlay = this.add.container(w / 2, h / 2).setDepth(50);
    const lines: Array<[string, number, string]> = [
      ["DROP CATCH", 40, "#ffd86a"],
      ["Drag the receptor · Catch the round ones · Avoid the spiky ones", 20, "#9fb5d8"],
      ["3 misses end the round", 16, "#5a7a9a"],
      ["TAP TO START", 26, "#4fd1c5"],
    ];
    lines.forEach(([t, fs, col], i) => {
      this.readyOverlay!.add(
        this.add.text(0, -90 + i * 52, t, { fontFamily: "ui-sans-serif, system-ui", fontSize: `${fs}px`, color: col, fontStyle: "bold", align: "center" }).setOrigin(0.5),
      );
    });
    const hit = this.add.rectangle(0, 0, Math.min(600, w - 40), 300, 0xffffff, 0.001).setInteractive().on("pointerdown", () => this.startRound());
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
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.state === "ready") return; // ready overlay's own hit rect starts the round
      if (this.state === "over") return;
      this.dragging = true;
      this.targetX = p.worldX;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.dragging) this.targetX = p.worldX;
    });
    const end = () => {
      this.dragging = false;
    };
    this.input.on("pointerup", end);
    this.input.on("pointerupoutside", end);
    this.input.keyboard?.on("keydown-LEFT", () => (this.keyL = true));
    this.input.keyboard?.on("keyup-LEFT", () => (this.keyL = false));
    this.input.keyboard?.on("keydown-RIGHT", () => (this.keyR = true));
    this.input.keyboard?.on("keyup-RIGHT", () => (this.keyR = false));
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("arcade-select"));
  }

  private drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    g.fillStyle(BAD_COLOR, 1);
    const pts: Array<[number, number]> = [];
    const spikes = 7;
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? r : r * 0.55;
      const a = (Math.PI * i) / spikes - Math.PI / 2;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    g.fillPoints(pts, true);
    g.lineStyle(2, 0x7f1d1d, 0.9);
    g.strokePoints(pts, true);
  }
}
