import Phaser from "phaser";
import { LevelDef } from "../types";

/**
 * Post-win overlay. Title + body + one-line biology reveal, then two buttons.
 * The biology line is the whole pedagogical payoff — kept terse, never lecture-y.
 */
export class WinOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly veil: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, def: LevelDef, onReplay: () => void, onMenu: () => void) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;

    this.veil = scene.add
      .rectangle(0, 0, w, h, 0x000000, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive();

    const cx = w / 2;
    const cy = h / 2;
    const container = scene.add.container(cx, cy).setScrollFactor(0).setDepth(2001);
    this.container = container;
    container.setAlpha(0);

    const card = scene.add.graphics();
    card.fillStyle(0x0c1322, 0.92);
    card.fillRoundedRect(-360, -200, 720, 400, 18);
    card.lineStyle(2, 0xffd060, 0.6);
    card.strokeRoundedRect(-360, -200, 720, 400, 18);
    container.add(card);

    const title = scene.add
      .text(0, -150, def.win.title, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "44px",
        color: "#ffd86a",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);
    container.add(title);

    const body = scene.add
      .text(0, -70, def.win.body, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "20px",
        color: "#cfd8e8",
        align: "center",
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5, 0.5);
    container.add(body);

    const biology = scene.add
      .text(0, 40, def.win.biologyLine, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "18px",
        color: "#8fb6ff",
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: 600 },
      })
      .setOrigin(0.5, 0.5);
    container.add(biology);

    const btnReplay = this.makeButton(-90, 140, "Play Again", onReplay);
    const btnMenu = this.makeButton(90, 140, "Menu", onMenu);
    container.add(btnReplay);
    container.add(btnMenu);

    scene.tweens.add({ targets: this.veil, fillAlpha: 0.6, duration: 700 });
    scene.tweens.add({ targets: container, alpha: 1, duration: 500, delay: 200 });
  }

  private makeButton(x: number, y: number, text: string, cb: () => void): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x182234, 0.95);
    bg.fillRoundedRect(-75, -22, 150, 44, 8);
    bg.lineStyle(1.5, 0x6a8fc4, 0.7);
    bg.strokeRoundedRect(-75, -22, 150, 44, 8);
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
      .rectangle(0, 0, 150, 44, 0xffffff, 0.001)
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
