import Phaser from "phaser";
import { LevelDef } from "../types";
import { PANEL_VEIL, PANEL_CONTENT, computeResultLayout, type ResultLayout } from "./resultLayout";

/**
 * Post-win overlay. Title + body + one-line biology reveal, then two buttons.
 * The biology line is the whole pedagogical payoff — kept terse, never lecture-y.
 *
 * Layering: PANEL_VEIL / PANEL_CONTENT (2600/2610) sit above the sneeze
 * cutscene (2300/2310/2400) — see resultLayout.ts depth ladder. The LevelScene
 * destroys the cutscene before opening this panel; the depths are the guarantee
 * that the panel is never covered.
 */
export class WinOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly veil: Phaser.GameObjects.Rectangle;
  private readonly L: ResultLayout;

  constructor(scene: Phaser.Scene, def: LevelDef, onReplay: () => void, onMenu: () => void) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.L = computeResultLayout(w, h, false);

    this.veil = scene.add
      .rectangle(0, 0, w, h, 0x000000, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(PANEL_VEIL)
      .setInteractive();

    const container = scene.add.container(w / 2, h / 2).setScrollFactor(0).setDepth(PANEL_CONTENT);
    this.container = container;
    container.setAlpha(0);

    const { cardW, cardH, wrap } = this.L;
    const card = scene.add.graphics();
    card.fillStyle(0x0c1322, 0.92);
    card.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
    card.lineStyle(2, 0xffd060, 0.6);
    card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
    container.add(card);

    const title = scene.add
      .text(0, this.L.titleY, def.win.title, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: `${this.L.titleSize}px`,
        color: "#ffd86a",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);
    container.add(title);

    const body = scene.add
      .text(0, this.L.bodyY, def.win.body, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: `${this.L.bodySize}px`,
        color: "#cfd8e8",
        align: "center",
        wordWrap: { width: wrap },
      })
      .setOrigin(0.5, 0.5);
    container.add(body);

    const biology = scene.add
      .text(0, this.L.bioY, def.win.biologyLine, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: `${this.L.bioSize}px`,
        color: "#8fb6ff",
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: wrap },
      })
      .setOrigin(0.5, 0.5);
    container.add(biology);

    const btnReplay = this.makeButton(-this.L.btnW / 2 - 6, this.L.btnY, "Play Again", onReplay);
    const btnMenu = this.makeButton(this.L.btnW / 2 + 6, this.L.btnY, "Menu", onMenu);
    container.add(btnReplay);
    container.add(btnMenu);

    scene.tweens.add({ targets: this.veil, fillAlpha: 0.6, duration: 700 });
    scene.tweens.add({ targets: container, alpha: 1, duration: 500, delay: 200 });
  }

  private makeButton(x: number, y: number, text: string, cb: () => void): Phaser.GameObjects.Container {
    const bw = this.L.btnW;
    const bh = this.L.btnH;
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x182234, 0.95);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    bg.lineStyle(1.5, 0x6a8fc4, 0.7);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    c.add(bg);
    const t = this.scene.add
      .text(0, 0, text, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "18px",
        color: "#e6eef8",
      })
      .setOrigin(0.5, 0.5);
    c.add(t);
    const hit = this.scene.add
      .rectangle(0, 0, bw, bh, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", cb)
      .on("pointerover", () => t.setColor("#ffd86a"))
      .on("pointerout", () => t.setColor("#e6eef8"));
    c.add(hit);
    return c;
  }

  destroy(): void {
    this.veil.destroy();
    this.container.destroy();
  }
}
