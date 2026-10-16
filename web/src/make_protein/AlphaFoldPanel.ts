import Phaser from "phaser";
import { PROTEIN_CONFIG, PROTEIN_PALETTE, TARGET_SEQUENCE } from "./config";
import { PROTEIN_TEX } from "./assets";
import type { AminoAcidCode, PanelBounds } from "./types";

const PREDICTED_LABEL = "The next amino acid predicted: ";

/** Top-right panel — AlphaFold insulin prediction + next residue. */
export class AlphaFoldPanel {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly structure: Phaser.GameObjects.Image;
  private readonly nextLabel: Phaser.GameObjects.Text;
  private readonly nextCode: Phaser.GameObjects.Text;
  private readonly nextName: Phaser.GameObjects.Text;
  private readonly progress: Phaser.GameObjects.Text;
  private bounds: PanelBounds = { left: 0, top: 0, width: 100, height: 100 };
  private nextIndex = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1200);
    this.frame = scene.add.graphics();
    this.title = scene.add
      .text(0, 0, "AlphaFold", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "18px",
        color: PROTEIN_PALETTE.title,
        fontStyle: "bold",
      })
      .setOrigin(0, 0);
    this.subtitle = scene.add
      .text(0, 0, "Predicted insulin structure", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "14px",
        color: PROTEIN_PALETTE.alphaFold,
        fontStyle: "italic",
      })
      .setOrigin(0, 0);
    this.structure = scene.add.image(0, 0, PROTEIN_TEX.insulin).setOrigin(0.5, 0.5);
    this.nextLabel = scene.add
      .text(0, 0, PREDICTED_LABEL, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "15px",
        color: PROTEIN_PALETTE.body,
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: 200 },
      })
      .setOrigin(0.5, 0);
    this.nextCode = scene.add
      .text(0, 0, "?", {
        fontFamily: "ui-monospace, monospace",
        fontSize: "40px",
        color: PROTEIN_PALETTE.accent,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);
    this.nextName = scene.add
      .text(0, 0, "", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "14px",
        color: PROTEIN_PALETTE.body,
        align: "center",
      })
      .setOrigin(0.5, 0);
    this.progress = scene.add
      .text(0, 0, "", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "13px",
        color: PROTEIN_PALETTE.alphaFold,
        align: "center",
      })
      .setOrigin(0.5, 0);
    this.root.add([
      this.frame,
      this.structure,
      this.title,
      this.subtitle,
      this.nextLabel,
      this.nextCode,
      this.nextName,
      this.progress,
    ]);
    this.setNextIndex(0);
  }

  setNextIndex(index: number): void {
    this.nextIndex = index;
    if (index >= TARGET_SEQUENCE.length) {
      this.nextLabel.setText("Sequence complete");
      this.nextCode.setText("✓");
      this.nextName.setText("Insulin folded");
      this.progress.setText(`${TARGET_SEQUENCE.length}/${TARGET_SEQUENCE.length} residues`);
      return;
    }
    const code = TARGET_SEQUENCE[index] as AminoAcidCode;
    this.nextLabel.setText(PREDICTED_LABEL);
    this.nextCode.setText(code);
    this.nextName.setText(PROTEIN_CONFIG.acidNames[code]);
    this.progress.setText(`Residue ${index + 1} of ${TARGET_SEQUENCE.length}`);
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

    const imgTop = bounds.top + 44;
    const imgH = bounds.height * 0.42;
    const imgW = bounds.width - 20;
    const fw = this.structure.frame.realWidth;
    const fh = this.structure.frame.realHeight;
    const scale = Math.min(imgW / fw, imgH / fh);
    this.structure.setPosition(bounds.left + bounds.width / 2, imgTop + imgH / 2);
    this.structure.setScale(scale);

    const cx = bounds.left + bounds.width / 2;
    const wrap = bounds.width - 24;
    const labelSize = Math.max(13, Math.min(16, Math.round(bounds.width * 0.038)));
    const codeSize = Math.max(28, Math.min(44, Math.round(bounds.width * 0.1)));
    this.nextLabel.setFontSize(labelSize);
    this.nextLabel.setWordWrapWidth(wrap);
    const predY = bounds.top + bounds.height * 0.52;
    this.nextLabel.setPosition(cx, predY);
    this.nextCode.setFontSize(codeSize);
    this.nextCode.setPosition(cx, predY + this.nextLabel.height + codeSize * 0.55);
    this.nextName.setPosition(cx, this.nextCode.y + codeSize * 0.55);
    this.progress.setPosition(cx, bounds.top + bounds.height - 14);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
