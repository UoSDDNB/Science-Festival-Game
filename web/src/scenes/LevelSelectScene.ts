import Phaser from "phaser";
import { LEVELS } from "../levels";
import { LevelDef, WORLD_WIDTH, WORLD_HEIGHT } from "../types";
import { hexToInt } from "../visuals/palette";

/**
 * Card-based level select. Cards are procedurally drawn; play button launches
 * the level scene with the chosen LevelDef.
 */
export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("level-select");
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // Backdrop
    const bg = this.add.graphics();
    for (let i = 0; i < 60; i++) {
      const t = i / 59;
      const top = 0x080d1c;
      const bot = 0x18253c;
      const ar = (top >> 16) & 0xff, ag = (top >> 8) & 0xff, ab = top & 0xff;
      const br = (bot >> 16) & 0xff, bg2 = (bot >> 8) & 0xff, bb = bot & 0xff;
      const col = (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg2 - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
      bg.fillStyle(col, 1);
      bg.fillRect(0, (i * h) / 60, w, h / 60 + 1);
    }

    this.add
      .text(w / 2, h * 0.12, "PLAYTIME", { fontFamily: "ui-sans-serif, system-ui", fontSize: "72px", color: "#ffd86a", fontStyle: "bold" })
      .setOrigin(0.5);
    this.add
      .text(w / 2, h * 0.2, "an invitation to feel how cells talk", { fontFamily: "ui-sans-serif, system-ui", fontSize: "22px", color: "#9fb5d8", fontStyle: "italic" })
      .setOrigin(0.5);

    const cardW = 320;
    const cardH = 380;
    const gap = 40;
    const totalW = LEVELS.length * cardW + (LEVELS.length - 1) * gap;
    const startX = (w - totalW) / 2;
    const y = h * 0.55;

    LEVELS.forEach((lvl, i) => {
      this.makeCard(startX + i * (cardW + gap) + cardW / 2, y, cardW, cardH, lvl);
    });

    // Quick-start most-recent / first level on Enter
    this.input.keyboard?.on("keydown-ENTER", () => {
      this.launch(LEVELS[0]!);
    });
  }

  private makeCard(cx: number, cy: number, w: number, h: number, lvl: LevelDef): void {
    const tint = hexToInt(lvl.palette.fire);

    const card = this.add.container(cx, cy);

    const g = this.add.graphics();
    g.fillStyle(0x111a2a, 0.85);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.lineStyle(2, tint, 0.65);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    card.add(g);

    // Decorative palette swatch
    const swatch = this.add.graphics();
    const sx = -w / 2 + 24;
    const sy = -h / 2 + 24;
    swatch.fillStyle(hexToInt(lvl.palette.bgTop), 1); swatch.fillRoundedRect(sx, sy, 48, 48, 6);
    swatch.fillStyle(hexToInt(lvl.palette.bgBottom), 1); swatch.fillRoundedRect(sx + 56, sy, 48, 48, 6);
    swatch.fillStyle(tint, 1); swatch.fillRoundedRect(sx + 112, sy, 48, 48, 6);
    swatch.fillStyle(hexToInt(lvl.palette.creature), 1); swatch.fillRoundedRect(sx + 168, sy, 48, 48, 6);
    card.add(swatch);

    const order = this.add.text(w / 2 - 24, -h / 2 + 24, `0${lvl.order}`, {
      fontFamily: "ui-monospace, monospace",
      fontSize: "20px",
      color: "#5a7090",
    }).setOrigin(1, 0);
    card.add(order);

    const name = this.add.text(0, -h / 2 + 110, lvl.name, {
      fontFamily: "ui-sans-serif, system-ui",
      fontSize: "30px",
      color: "#e8eef8",
      fontStyle: "bold",
    }).setOrigin(0.5);
    card.add(name);

    const blurb = this.add.text(0, -h / 2 + 160, lvl.win.biologyLine, {
      fontFamily: "ui-sans-serif, system-ui",
      fontSize: "15px",
      color: "#8fb6ff",
      fontStyle: "italic",
      align: "center",
      wordWrap: { width: w - 60 },
    }).setOrigin(0.5, 0);
    card.add(blurb);

    if (lvl.unlocked) {
      const playBtn = this.makePlayButton(0, h / 2 - 48, "PLAY", () => this.launch(lvl));
      card.add(playBtn);
    } else {
      const locked = this.add.text(0, h / 2 - 48, "Coming Soon", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "16px",
        color: "#5a6a80",
      }).setOrigin(0.5);
      card.add(locked);
    }
  }

  private makePlayButton(x: number, y: number, label: string, cb: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xffd060, 0.95);
    g.fillRoundedRect(-90, -22, 180, 44, 10);
    c.add(g);
    const t = this.add.text(0, 0, label, {
      fontFamily: "ui-sans-serif, system-ui",
      fontSize: "20px",
      color: "#1a1208",
      fontStyle: "bold",
    }).setOrigin(0.5);
    c.add(t);
    const hit = this.add.rectangle(0, 0, 180, 44, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", cb)
      .on("pointerover", () => g.clear().fillStyle(0xffe79a, 1).fillRoundedRect(-90, -22, 180, 44, 10))
      .on("pointerout", () => g.clear().fillStyle(0xffd060, 0.95).fillRoundedRect(-90, -22, 180, 44, 10));
    c.add(hit);
    return c;
  }

  private launch(lvl: LevelDef): void {
    this.scene.start("level", { levelId: lvl.id });
  }
}

// Ensure unused import is harmless (build target)
void WORLD_WIDTH;
void WORLD_HEIGHT;
