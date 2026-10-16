import Phaser from "phaser";
import { PROTEIN_PALETTE, TARGET_SEQUENCE } from "./config";
import { PROTEIN_TEX } from "./assets";
import type { PanelBounds } from "./types";

/** Top-left panel — insulin structure reveals as the chain is built. */
export class StructurePanel {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly structure: Phaser.GameObjects.Image;
  private bounds: PanelBounds = { left: 0, top: 0, width: 100, height: 100 };
  private builtCount = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1200);
    this.frame = scene.add.graphics();
    this.title = scene.add
      .text(0, 0, "Live structure", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "18px",
        color: PROTEIN_PALETTE.title,
        fontStyle: "bold",
      })
      .setOrigin(0, 0);
    this.subtitle = scene.add
      .text(0, 0, "Insulin folding as you build", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "14px",
        color: PROTEIN_PALETTE.alphaFold,
        fontStyle: "italic",
      })
      .setOrigin(0, 0);
    this.structure = scene.add
      .image(0, 0, PROTEIN_TEX.insulin)
      .setOrigin(0.5, 0.5)
      .setAlpha(0.22);
    this.root.add([this.frame, this.structure, this.title, this.subtitle]);
  }

  setSequence(sequence: string): void {
    this.builtCount = Math.max(0, sequence.length - 1);
    this.refreshStructureAlpha();
  }

  layout(bounds: PanelBounds, titleSize: number, subSize: number): void {
    this.bounds = bounds;
    this.title.setFontSize(titleSize);
    this.subtitle.setFontSize(subSize);
    this.title.setPosition(bounds.left + 12, bounds.top + 10);
    this.subtitle.setPosition(bounds.left + 12, bounds.top + 10 + titleSize + 4);

    this.frame.clear();
    this.frame.fillStyle(PROTEIN_PALETTE.panelBg, 0.94);
    this.frame.fillRoundedRect(bounds.left, bounds.top, bounds.width, bounds.height, 12);
    this.frame.lineStyle(2, PROTEIN_PALETTE.panelBorder, 0.55);
    this.frame.strokeRoundedRect(bounds.left, bounds.top, bounds.width, bounds.height, 12);

    const imgTop = bounds.top + 48;
    const imgH = bounds.height - 56;
    const imgW = bounds.width - 24;
    const fw = this.structure.frame.realWidth;
    const fh = this.structure.frame.realHeight;
    const scale = Math.min(imgW / fw, imgH / fh);
    this.structure.setPosition(bounds.left + bounds.width / 2, imgTop + imgH / 2);
    this.structure.setScale(scale);
    this.refreshStructureAlpha();
  }

  destroy(): void {
    this.root.destroy(true);
  }

  private refreshStructureAlpha(): void {
    const t = this.builtCount / TARGET_SEQUENCE.length;
    this.structure.setAlpha(0.18 + t * 0.82);
  }
}
