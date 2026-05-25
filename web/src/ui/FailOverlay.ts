import Phaser from "phaser";
import { FailConfig } from "../types";

/**
 * Fail overlay — pulsing red veil + title/body/biology line + retry/menu buttons.
 * Visually distinct from the WinOverlay so the player feels the cost of overshoot.
 */
export class FailOverlay {
  private readonly scene: Phaser.Scene;
  private readonly veil: Phaser.GameObjects.Rectangle;
  private readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, cfg: FailConfig, onReplay: () => void, onMenu: () => void) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;

    this.veil = scene.add
      .rectangle(0, 0, w, h, 0xff0a18, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2200)
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

    const cx = w / 2;
    const cy = h / 2;
    const container = scene.add.container(cx, cy).setScrollFactor(0).setDepth(2210);
    this.container = container;
    container.setAlpha(0);

    const card = scene.add.graphics();
    card.fillStyle(0x180000, 0.95);
    card.fillRoundedRect(-360, -200, 720, 400, 18);
    card.lineStyle(2.5, 0xff5a4a, 0.85);
    card.strokeRoundedRect(-360, -200, 720, 400, 18);
    container.add(card);

    const title = scene.add
      .text(0, -150, cfg.title, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "48px",
        color: "#ff8070",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);
    container.add(title);

    const body = scene.add
      .text(0, -60, cfg.body, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "20px",
        color: "#ffcfc4",
        align: "center",
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5, 0.5);
    container.add(body);

    const biology = scene.add
      .text(0, 50, cfg.biologyLine, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "18px",
        color: "#ffd0c0",
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: 600 },
      })
      .setOrigin(0.5, 0.5);
    container.add(biology);

    const btnReplay = this.makeButton(-90, 140, "Try Again", onReplay);
    const btnMenu = this.makeButton(90, 140, "Menu", onMenu);
    container.add(btnReplay);
    container.add(btnMenu);

    scene.tweens.add({ targets: container, alpha: 1, duration: 500, delay: 350 });
  }

  private makeButton(x: number, y: number, text: string, cb: () => void): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x320a10, 0.95);
    bg.fillRoundedRect(-75, -22, 150, 44, 8);
    bg.lineStyle(1.5, 0xff8070, 0.7);
    bg.strokeRoundedRect(-75, -22, 150, 44, 8);
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
      .rectangle(0, 0, 150, 44, 0xffffff, 0.001)
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
