import Phaser from "phaser";
import { PROTEIN_INTRO } from "./config";
import { viewportSize } from "./assets";

/** Full-screen briefing before gameplay — matches Immune Rescue intro styling. */
export class ProteinIntroOverlay {
  private readonly scene: Phaser.Scene;
  private readonly onDismiss: () => void;
  private veil!: Phaser.GameObjects.Rectangle;
  private root!: Phaser.GameObjects.Container;
  private destroyed = false;
  private armed = false;

  constructor(scene: Phaser.Scene, onDismiss: () => void) {
    this.scene = scene;
    this.onDismiss = onDismiss;
    this.build();
    this.bindInput();
    this.armAfterPlayClick();
    scene.scale.on("resize", this.layout, this);
    this.layout();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unbindInput();
    this.scene.scale.off("resize", this.layout, this);
    this.root?.destroy(true);
    this.veil?.destroy();
  }

  private build(): void {
    this.veil = this.scene.add
      .rectangle(0, 0, 10, 10, 0x05080f, 0.72)
      .setScrollFactor(0)
      .setDepth(1950)
      .setInteractive({ useHandCursor: true });

    this.root = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(1960);

    const panel = this.scene.add.graphics();
    this.root.add(panel);

    const title = this.scene.add
      .text(0, 0, PROTEIN_INTRO.title, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "28px",
        color: "#ffd86a",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5, 0);
    this.root.add(title);

    const body = this.scene.add
      .text(0, 0, PROTEIN_INTRO.body, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "17px",
        color: "#e8eef8",
        align: "center",
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);
    this.root.add(body);

    const dismiss = this.scene.add
      .text(0, 0, PROTEIN_INTRO.dismiss, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "20px",
        color: "#4fd1c5",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5, 0);
    this.root.add(dismiss);

    this.root.setData("panel", panel);
    this.root.setData("title", title);
    this.root.setData("body", body);
    this.root.setData("dismiss", dismiss);
  }

  private armAfterPlayClick(): void {
    const tryArm = (): void => {
      if (this.destroyed) return;
      const input = this.scene.input;
      if (input.pointer1.isDown || input.pointer2.isDown || input.pointer3.isDown) {
        this.scene.time.delayedCall(50, tryArm);
        return;
      }
      this.armed = true;
    };
    this.scene.time.delayedCall(150, tryArm);
  }

  private bindInput(): void {
    this.veil.on("pointerup", this.dismiss);
    this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.dismiss);
    this.scene.input.keyboard?.once("keydown-SPACE", this.dismiss);
    this.scene.input.keyboard?.once("keydown-ENTER", this.dismiss);
  }

  private unbindInput(): void {
    this.veil.off("pointerup", this.dismiss);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.dismiss);
  }

  private dismiss = (): void => {
    if (this.destroyed || !this.armed) return;
    this.onDismiss();
    this.destroy();
  };

  private layout = (): void => {
    const { w, h } = viewportSize(this.scene);
    this.veil.setPosition(w / 2, h / 2);
    this.veil.setSize(w, h);

    const title = this.root.getData("title") as Phaser.GameObjects.Text;
    const body = this.root.getData("body") as Phaser.GameObjects.Text;
    const dismiss = this.root.getData("dismiss") as Phaser.GameObjects.Text;
    const panel = this.root.getData("panel") as Phaser.GameObjects.Graphics;

    const cardW = Math.min(640, w - 48);
    const wrap = cardW - 56;
    title.setFontSize(Math.max(24, Math.min(34, Math.round(w * 0.045))));
    body.setFontSize(Math.max(17, Math.min(21, Math.round(w * 0.026))));
    dismiss.setFontSize(Math.max(19, Math.min(24, Math.round(w * 0.028))));
    title.setWordWrapWidth(wrap);
    body.setWordWrapWidth(wrap);

    const contentH = title.height + 18 + body.height + 28 + dismiss.height;
    const panelH = contentH + 32;
    const panelTop = -panelH / 2;

    title.setPosition(0, panelTop + 16);
    body.setPosition(0, title.y + title.height + 18);
    dismiss.setPosition(0, body.y + body.height + 28);

    panel.clear();
    panel.fillStyle(0x120818, 0.94);
    panel.fillRoundedRect(-cardW / 2, panelTop, cardW, panelH, 14);
    panel.lineStyle(2, 0x4fd1c5, 0.55);
    panel.strokeRoundedRect(-cardW / 2, panelTop, cardW, panelH, 14);

    this.root.setPosition(w / 2, h / 2);
  };
}
