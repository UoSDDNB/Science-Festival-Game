import Phaser from "phaser";
import { FailConfig } from "../types";
import { PANEL_VEIL, PANEL_CONTENT, computeResultLayout, type ResultLayout } from "./resultLayout";

/**
 * Fail overlay — pulsing red veil + title/body/biology line + retry/menu buttons.
 * Visually distinct from the WinOverlay so the player feels the cost of overshoot.
 *
 * Layering: PANEL_VEIL / PANEL_CONTENT (2600/2610) sit above any cutscene —
 * see resultLayout.ts depth ladder.
 */
export class FailOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly veil: Phaser.GameObjects.Rectangle;
  private readonly L: ResultLayout;

  constructor(scene: Phaser.Scene, cfg: FailConfig, onReplay: () => void, onMenu: () => void) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.L = computeResultLayout(w, h, true);

    this.veil = scene.add
      .rectangle(0, 0, w, h, 0xff0a18, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(PANEL_VEIL)
      .setInteractive();
    scene.tweens.add({ targets: this.veil, fillAlpha: 0.6, duration: 600 });

    // Pulse the veil
    scene.tweens.add({
      targets: this.veil,
      fillAlpha: { from: 0.55, to: 0.75 },
      duration: 700,
      delay: 700,
      yoyo: true,
      repeat: -1,
    });

    const container = scene.add.container(w / 2, h / 2).setScrollFactor(0).setDepth(PANEL_CONTENT);
    this.container = container;
    container.setAlpha(0);

    const { cardW, cardH, wrap } = this.L;
    const card = scene.add.graphics();
    card.fillStyle(0x180000, 0.95);
    card.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
    card.lineStyle(2.5, 0xff5a4a, 0.85);
    card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
    container.add(card);

    const title = scene.add
      .text(0, this.L.titleY, cfg.title, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: `${this.L.titleSize}px`,
        color: "#ff8070",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);
    container.add(title);

    const body = scene.add
      .text(0, this.L.bodyY, cfg.body, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: `${this.L.bodySize}px`,
        color: "#ffcfc4",
        align: "center",
        wordWrap: { width: wrap },
      })
      .setOrigin(0.5, 0.5);
    container.add(body);

    const biology = scene.add
      .text(0, this.L.bioY, cfg.biologyLine, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: `${this.L.bioSize}px`,
        color: "#ffd0c0",
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: wrap },
      })
      .setOrigin(0.5, 0.5);
    container.add(biology);

    const btnReplay = this.makeButton(-this.L.btnW / 2 - 6, this.L.btnY, "Try Again", onReplay);
    const btnMenu = this.makeButton(this.L.btnW / 2 + 6, this.L.btnY, "Menu", onMenu);
    container.add(btnReplay);
    container.add(btnMenu);

    scene.tweens.add({ targets: container, alpha: 1, duration: 500, delay: 350 });
  }

  private makeButton(x: number, y: number, text: string, cb: () => void): Phaser.GameObjects.Container {
    const bw = this.L.btnW;
    const bh = this.L.btnH;
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x320a10, 0.95);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    bg.lineStyle(1.5, 0xff8070, 0.7);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    c.add(bg);
    const t = this.scene.add
      .text(0, 0, text, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "18px",
        color: "#fff0e8",
      })
      .setOrigin(0.5, 0.5);
    c.add(t);
    const hit = this.scene.add
      .rectangle(0, 0, bw, bh, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", cb)
      .on("pointerover", () => t.setColor("#ffe860"))
      .on("pointerout", () => t.setColor("#fff0e8"));
    c.add(hit);
    return c;
  }

  destroy(): void {
    this.veil.destroy();
    this.container.destroy();
  }
}
