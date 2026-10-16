import Phaser from "phaser";
import { ImmuneMode } from "./types";
import { IMMUNE_CONFIG } from "./config";

const INFO_PANEL_BG = 0x120818;
const INFO_PANEL_BORDER = 0x4fd1c5;
const INFO_TITLE = "#ffd86a";
const INFO_BODY = "#e8eef8";

/** Baseline phone viewport — HUD scales proportionally from this. */
const HUD_REF_W = 390;
const HUD_REF_H = 844;

interface HudLayoutMetrics {
  margin: number;
  padX: number;
  padY: number;
  radius: number;
  labelSize: number;
  counterSize: number;
  barH: number;
  labelBarGap: number;
  barCounterGap: number;
  statusBarW: number;
  borderW: number;
}

export interface ImmuneHudLayout {
  metrics: HudLayoutMetrics;
  statusBox: { left: number; top: number; width: number; height: number };
  chromeTop: number;
  chromeBottom: number;
}

function hudLayoutMetrics(w: number, h: number): HudLayoutMetrics {
  const isShort = h < 520;
  const isNarrow = w < 420;
  let s = Math.min(w / HUD_REF_W, h / HUD_REF_H);
  if (isShort) s *= 0.88;
  if (isNarrow) s *= 0.92;
  s = Phaser.Math.Clamp(s, 0.52, 1.5);

  const margin = Math.round(10 * s);
  const padX = Math.round(14 * s);
  const padY = Math.round(10 * s);
  const aiReserve = Math.round((isNarrow ? 210 : 230) * s);
  const statusMaxInnerW = Math.max(96 * s, w - margin * 2 - aiReserve - padX * 2);

  return {
    margin,
    padX,
    padY,
    radius: Math.max(8, Math.round(12 * s)),
    labelSize: Math.max(16, Math.round((isShort ? 17 : 19) * s)),
    counterSize: Math.max(20, Math.round((isShort ? 22 : 24) * s)),
    barH: Math.max(12, Math.round((isShort ? 16 : 18) * s)),
    labelBarGap: Math.max(4, Math.round(6 * s)),
    barCounterGap: Math.max(5, Math.round(7 * s)),
    statusBarW: Math.round(Math.min(w * 0.42, statusMaxInnerW, 440 * s)),
    borderW: Math.max(1, 1.5 * s),
  };
}

function measureTextBlock(
  scene: Phaser.Scene,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
  wrapWidth: number,
): { width: number; height: number } {
  const probe = scene.make.text({
    x: 0,
    y: 0,
    text,
    style: { ...style, wordWrap: { width: wrapWidth } },
  });
  probe.setVisible(false);
  const bounds = { width: probe.width, height: probe.height };
  probe.destroy();
  return bounds;
}

/** Measure HUD boxes and the screen bands they occupy (top / bottom chrome). */
export function computeImmuneHudLayout(
  scene: Phaser.Scene,
  w: number,
  h: number,
  _mode: ImmuneMode,
  destroyedLabel = "Destroyed bacteria 0/15",
): ImmuneHudLayout {
  const m = hudLayoutMetrics(w, h);

  const statusLabel = measureTextBlock(scene, "Spread of infection", {
    fontFamily: "ui-sans-serif, system-ui",
    fontSize: `${m.labelSize}px`,
    fontStyle: "bold",
  }, m.statusBarW);
  const counter = measureTextBlock(scene, destroyedLabel, {
    fontFamily: "ui-sans-serif, system-ui",
    fontSize: `${m.counterSize}px`,
    fontStyle: "bold",
  }, m.statusBarW);

  const statusContentH =
    statusLabel.height + m.labelBarGap + m.barH + m.barCounterGap + counter.height;
  const statusBoxW = Math.max(statusLabel.width, m.statusBarW, counter.width) + m.padX * 2;
  const statusBoxH = statusContentH + m.padY * 2;
  const statusBox = {
    left: m.margin,
    top: m.margin,
    width: statusBoxW,
    height: statusBoxH,
  };

  return {
    metrics: m,
    statusBox,
    chromeTop: statusBox.top + statusBox.height + m.margin,
    chromeBottom: m.margin,
  };
}

/** Infection spread meter, destroyed counter, and two-player zone chrome. */
export class TissueHud {
  private readonly scene: Phaser.Scene;
  private readonly mode: ImmuneMode;
  private root: Phaser.GameObjects.Container;
  private barBg: Phaser.GameObjects.Rectangle;
  private barFill: Phaser.GameObjects.Rectangle;
  private barLabel: Phaser.GameObjects.Text;
  private destroyedText: Phaser.GameObjects.Text;
  private statusBox: Phaser.GameObjects.Graphics;
  private zoneGfx: Phaser.GameObjects.Graphics | null = null;
  private integrity: number = IMMUNE_CONFIG.maxTissueDamage;
  private destroyedLabel = "Destroyed bacteria 0/15";

  constructor(scene: Phaser.Scene, mode: ImmuneMode) {
    this.scene = scene;
    this.mode = mode;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1400);

    this.barLabel = scene.add
      .text(0, 0, "Spread of infection", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "19px",
        color: INFO_TITLE,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.barBg = scene.add.rectangle(0, 0, 320, 24, 0x000000, 0.35).setOrigin(0, 0.5);
    this.barFill = scene.add.rectangle(0, 0, 320, 24, 0x4fd1c5, 0.95).setOrigin(0, 0.5);
    this.barBg.setStrokeStyle(2, INFO_PANEL_BORDER, 0.25);

    this.destroyedText = scene.add
      .text(0, 0, "", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "30px",
        color: INFO_BODY,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.statusBox = scene.add.graphics();

    this.root.add([
      this.statusBox,
      this.barLabel,
      this.barBg,
      this.barFill,
      this.destroyedText,
    ]);
    if (mode === "two") {
      this.zoneGfx = scene.add.graphics().setScrollFactor(0).setDepth(1390);
    }
  }

  get tissueIntegrity(): number {
    return this.integrity;
  }

  applyDamage(amount: number): void {
    this.integrity = Math.max(0, this.integrity - amount);
    this.refreshBar();
  }

  setEngulfed(engulfed: number, target: number, _liveColonies?: number): void {
    this.destroyedLabel = `Destroyed bacteria ${engulfed}/${target}`;
    this.destroyedText.setText(this.destroyedLabel);
  }

  applyLayout(layout: ImmuneHudLayout): void {
    const m = layout.metrics;
    const innerLeft = layout.statusBox.left + m.padX;

    this.barLabel.setFontSize(m.labelSize);
    this.destroyedText.setFontSize(m.counterSize);

    const labelY = layout.statusBox.top + m.padY + this.barLabel.height / 2;
    this.barLabel.setPosition(innerLeft, labelY);

    const barY = labelY + this.barLabel.height / 2 + m.labelBarGap + m.barH / 2;
    this.barBg.setPosition(innerLeft, barY);
    this.barBg.width = m.statusBarW;
    this.barBg.height = m.barH;
    this.barFill.setPosition(innerLeft, barY);
    this.barFill.height = m.barH;
    this.barBg.setStrokeStyle(m.borderW, INFO_PANEL_BORDER, 0.25);
    this.refreshBar();

    const counterY = barY + m.barH / 2 + m.barCounterGap + this.destroyedText.height / 2;
    this.destroyedText.setPosition(innerLeft, counterY);

    this.drawHudBox(
      this.statusBox,
      layout.statusBox.left,
      layout.statusBox.top,
      layout.statusBox.width,
      layout.statusBox.height,
      m.radius,
      m.borderW,
    );

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    if (this.zoneGfx && this.mode === "two") {
      this.zoneGfx.clear();
      this.zoneGfx.lineStyle(m.borderW, 0x4fd1c5, 0.35);
      this.zoneGfx.lineBetween(w * 0.5, layout.chromeTop, w * 0.5, h - layout.chromeBottom);
      this.zoneGfx.fillStyle(0x4fd1c5, 0.06);
      this.zoneGfx.fillRect(0, layout.chromeTop, w * 0.5, h - layout.chromeTop - layout.chromeBottom);
      this.zoneGfx.fillStyle(0xff5a4a, 0.06);
      this.zoneGfx.fillRect(w * 0.5, layout.chromeTop, w * 0.5, h - layout.chromeTop - layout.chromeBottom);
    }
  }

  destroy(): void {
    this.zoneGfx?.destroy();
    this.root.destroy(true);
  }

  private drawHudBox(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    boxW: number,
    boxH: number,
    radius: number,
    borderW: number,
  ): void {
    gfx.clear();
    gfx.fillStyle(INFO_PANEL_BG, 0.94);
    gfx.fillRoundedRect(x, y, boxW, boxH, radius);
    gfx.lineStyle(borderW, INFO_PANEL_BORDER, 0.55);
    gfx.strokeRoundedRect(x, y, boxW, boxH, radius);
  }

  private refreshBar(): void {
    const barW = this.barBg.width;
    const t = this.integrity / IMMUNE_CONFIG.maxTissueDamage;
    this.barFill.width = Math.max(4, barW * t);
    const color = t > 0.45 ? 0x4fd1c5 : t > 0.2 ? 0xffd060 : 0xff5a4a;
    this.barFill.setFillStyle(color, 0.95);
  }
}
