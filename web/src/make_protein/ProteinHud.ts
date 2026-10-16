import Phaser from "phaser";
import { PROTEIN_HINT, PROTEIN_PALETTE } from "./config";
import type { PanelBounds } from "./types";

const PANEL_BG = 0x120818;
const PANEL_BORDER = 0x4fd1c5;

/** Bottom hint + sequence progress — Immune Rescue single-player HUD styling. */
export class ProteinHud {
  private readonly scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private hintBox: Phaser.GameObjects.Graphics;
  private hintText: Phaser.GameObjects.Text;
  private seqBox: Phaser.GameObjects.Graphics;
  private seqLabel: Phaser.GameObjects.Text;
  private seqText: Phaser.GameObjects.Text;
  private wrongText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1400);

    this.seqBox = scene.add.graphics();
    this.seqLabel = scene.add
      .text(0, 0, "Sequence built", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "19px",
        color: PROTEIN_PALETTE.title,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    this.seqText = scene.add
      .text(0, 0, "M", {
        fontFamily: "ui-monospace, monospace",
        fontSize: "26px",
        color: PROTEIN_PALETTE.body,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    this.wrongText = scene.add
      .text(0, 0, "", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "16px",
        color: PROTEIN_PALETTE.wrong,
      })
      .setOrigin(1, 0.5);

    this.hintBox = scene.add.graphics();
    this.hintText = scene.add
      .text(0, 0, PROTEIN_HINT, {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "20px",
        color: PROTEIN_PALETTE.body,
        align: "center",
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0.5);

    this.root.add([
      this.seqBox,
      this.seqLabel,
      this.seqText,
      this.wrongText,
      this.hintBox,
      this.hintText,
    ]);
  }

  setSequence(sequence: string): void {
    this.seqText.setText(sequence || "M");
  }

  setWrong(count: number, max: number): void {
    this.wrongText.setText(count > 0 ? `Mismatches ${count}/${max}` : "");
  }

  setHint(text: string): void {
    this.hintText.setText(text);
  }

  applyLayout(
    seqBounds: PanelBounds,
    hintBounds: PanelBounds,
    metrics: { labelSize: number; counterSize: number; hintSize: number; padX: number; padY: number; radius: number; borderW: number },
  ): void {
    this.seqLabel.setFontSize(metrics.labelSize);
    this.seqText.setFontSize(metrics.counterSize);
    this.hintText.setFontSize(metrics.hintSize);
    this.hintText.setWordWrapWidth(hintBounds.width - metrics.padX * 2);

    const seqInnerLeft = seqBounds.left + metrics.padX;
    const labelY = seqBounds.top + metrics.padY + this.seqLabel.height / 2;
    this.seqLabel.setPosition(seqInnerLeft, labelY);
    this.seqText.setPosition(seqInnerLeft, labelY + this.seqLabel.height / 2 + 8 + this.seqText.height / 2);
    this.wrongText.setPosition(seqBounds.left + seqBounds.width - metrics.padX, labelY);

    this.drawBox(this.seqBox, seqBounds, metrics.radius, metrics.borderW);

    const hintCenterY = hintBounds.top + hintBounds.height / 2;
    this.hintText.setPosition(hintBounds.left + hintBounds.width / 2, hintCenterY);
    this.drawBox(this.hintBox, hintBounds, metrics.radius, metrics.borderW);
  }

  destroy(): void {
    this.root.destroy(true);
  }

  private drawBox(gfx: Phaser.GameObjects.Graphics, b: PanelBounds, radius: number, borderW: number): void {
    gfx.clear();
    gfx.fillStyle(PANEL_BG, 0.94);
    gfx.fillRoundedRect(b.left, b.top, b.width, b.height, radius);
    gfx.lineStyle(borderW, PANEL_BORDER, 0.55);
    gfx.strokeRoundedRect(b.left, b.top, b.width, b.height, radius);
  }
}

export function proteinHudMetrics(w: number, h: number): {
  labelSize: number;
  counterSize: number;
  hintSize: number;
  padX: number;
  padY: number;
  radius: number;
  borderW: number;
} {
  const isShort = h < 520;
  let s = Math.min(w / 390, h / 844);
  if (isShort) s *= 0.88;
  s = Phaser.Math.Clamp(s, 0.52, 1.5);
  const hintScale = Phaser.Math.Clamp(s * 1.28, 0.72, 1.5);
  return {
    labelSize: Math.max(16, Math.round((isShort ? 17 : 19) * s)),
    counterSize: Math.max(20, Math.round((isShort ? 22 : 26) * s)),
    hintSize: Math.max(18, Math.round((isShort ? 19 : 21) * hintScale)),
    padX: Math.round(14 * s),
    padY: Math.round(10 * s),
    radius: Math.max(8, Math.round(12 * s)),
    borderW: Math.max(1, 1.5 * s),
  };
}

export function computeSeqBarBounds(w: number, h: number, playTop: number): PanelBounds {
  const m = proteinHudMetrics(w, h);
  const margin = Math.round(10 * Math.min(w / 390, h / 844));
  const barH = Math.round(m.padY * 2 + m.labelSize + m.counterSize + 8);
  return {
    left: margin,
    top: playTop - barH - 6,
    width: w - margin * 2,
    height: barH,
  };
}
