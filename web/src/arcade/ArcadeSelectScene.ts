import Phaser from "phaser";
import { GAMES, getGame } from "./registry";
import { hexToInt } from "../visuals/palette";
import { lerpHex } from "../visuals/cardPreview";
import { ScrollPanel } from "../ui/ScrollPanel";

/**
 * Arcade submenu ("THE ARCADE"). Reached from the main level-select's
 * arcade card (ARCADE-DESIGN-PARTY.md D-1, Option B).
 *
 * Layout: 2-column card grid when w >= 640, 1 column below; when the grid
 * overflows the scroll area the cards go into the existing ScrollPanel
 * (same component as the main select's phone mode). Whole-card tap launches
 * a game; "← Levels" back button top-left (same slot as in-level "← Menu").
 * 80 ms debounced resize rebuild (LevelSelectScene pattern).
 */

const GRID_MIN_W = 640;
const CARD_H = 150;
const GAP = 18;

export class ArcadeSelectScene extends Phaser.Scene {
  private uiRoot: Phaser.GameObjects.Container | null = null;
  private scrollPanel: ScrollPanel | null = null;
  private resizeTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("arcade-select");
  }

  create(): void {
    this.scale.on("resize", this.scheduleRebuild, this);
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("level-select"));
    this.rebuild();
  }

  shutdown(): void {
    this.scale.off("resize", this.scheduleRebuild, this);
    this.resizeTimer?.remove(false);
    this.scrollPanel?.destroy();
    this.scrollPanel = null;
  }

  private scheduleRebuild(): void {
    this.resizeTimer?.remove(false);
    this.resizeTimer = this.time.delayedCall(80, () => this.rebuild());
  }

  private rebuild(): void {
    this.scrollPanel?.destroy();
    this.scrollPanel = null;
    if (this.uiRoot) this.uiRoot.destroy(true);
    const w = this.scale.width;
    const h = this.scale.height;
    this.uiRoot = this.add.container(0, 0);

    // Backdrop (same deep-blue gradient family as the main select)
    const bg = this.add.graphics();
    for (let i = 0; i < 60; i++) {
      const t = i / 59;
      bg.fillStyle(lerpHex(0x080d1c, 0x18253c, t), 1);
      bg.fillRect(0, (i * h) / 60, w, h / 60 + 1);
    }
    this.uiRoot.add(bg);

    // Back button — top-left, same slot as in-level "← Menu"
    const back = this.add
      .text(28, 40, "← Levels", { fontFamily: "ui-sans-serif, system-ui", fontSize: "22px", color: "#9fb5d8", fontStyle: "bold" })
      .setOrigin(0);
    const backHit = this.add
      .rectangle(28 + 55, 40, 150, 44, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("level-select"));
    this.uiRoot.add([back, backHit]);

    // Title
    const title = this.add
      .text(w / 2, 40, "THE ARCADE", { fontFamily: "ui-sans-serif, system-ui", fontSize: "34px", color: "#ffd86a", fontStyle: "bold" })
      .setOrigin(0.5, 0);
    this.uiRoot.add(title);

    // Grid geometry
    const cols = w >= GRID_MIN_W ? 2 : 1;
    const cardW = Math.min(420, (w - 48 - GAP * (cols - 1)) / cols);
    const rows = Math.ceil(GAMES.length / cols);
    const contentH = rows * CARD_H + (rows - 1) * GAP;
    const areaTop = 96;
    const areaH = Math.max(120, h - areaTop - 16);
    const overflow = contentH > areaH;

    const host = overflow
      ? (this.createScrollParent(areaTop, areaH, contentH), this.scrollPanel!.list)
      : this.uiRoot;

    GAMES.forEach((g, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = (w - (cardW * cols + GAP * (cols - 1))) / 2 + col * (cardW + GAP) + cardW / 2;
      const y = (overflow ? 0 : areaTop) + row * (CARD_H + GAP) + CARD_H / 2;
      const card = this.makeCard(x, y, cardW, CARD_H, g);
      if (overflow && this.scrollPanel) this.scrollPanel.add(card, CARD_H);
      else host.add(card);
    });
  }

  /** Same scroll-parent pattern as LevelSelectScene.createScrollParent. */
  private createScrollParent(areaTop: number, areaH: number, contentH: number): void {
    const w = this.scale.width;
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x0a1424, 0.6);
    backdrop.fillRoundedRect(12, areaTop, w - 24, areaH, 12);
    this.uiRoot!.add(backdrop);
    this.scrollPanel = new ScrollPanel(this);
    this.scrollPanel.setViewport(12, areaTop, w - 24, areaH);
    this.scrollPanel.setContentHeight(contentH);
    this.uiRoot!.add(this.scrollPanel.container);
  }

  private makeCard(
    cx: number, cy: number, w: number, h: number,
    g: (typeof GAMES)[number],
  ): Phaser.GameObjects.Container {
    const c = this.add.container(cx, cy);
    const r = 14;
    const body = this.add.graphics();
    body.fillStyle(0x111a2a, 0.9);
    body.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    const accent = hexToInt(g.accent);
    body.lineStyle(2, accent, g.locked ? 0.3 : 0.8);
    body.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    // Accent band (procedural art; the v4 scaffold's MenuScene card style)
    body.fillStyle(accent, g.locked ? 0.25 : 0.9);
    body.fillRoundedRect(-w / 2, -h / 2, w, 10, { tl: r, tr: r, bl: 0, br: 0 });
    c.add(body);

    const name = this.add
      .text(0, -h / 2 + 44, g.name, { fontFamily: "ui-sans-serif, system-ui", fontSize: "26px", color: g.locked ? "#5a6a80" : "#e8eef8", fontStyle: "bold", align: "center" })
      .setOrigin(0.5);
    c.add(name);
    const blurb = this.add
      .text(0, -h / 2 + 78, g.blurb, { fontFamily: "ui-sans-serif, system-ui", fontSize: "15px", color: g.locked ? "#41506a" : "#8fb6ff", fontStyle: "italic", align: "center", wordWrap: { width: w - 36 } })
      .setOrigin(0.5);
    c.add(blurb);
    const tag = this.add
      .text(0, h / 2 - 24, g.locked ? "Coming Soon" : "TAP TO PLAY", { fontFamily: "ui-monospace, monospace", fontSize: "13px", color: g.locked ? "#41506a" : "#ffd86a" })
      .setOrigin(0.5);
    c.add(tag);

    if (!g.locked && g.scene && g.sceneKey) {
      const key = g.sceneKey;
      const hit = this.add
        .rectangle(0, 0, w, h, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.scene.start(key));
      c.add(hit);
    }
    return c;
  }
}
