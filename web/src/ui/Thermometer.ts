import Phaser from "phaser";

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Thermometer UI — golden target band, danger zone, mercury fill.
 * Drawn entirely with Graphics into a fixed UI container.
 */
export class Thermometer {
  private readonly scene: Phaser.Scene;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly outlineG: Phaser.GameObjects.Graphics;
  private bounds: Bounds = { x: 0, y: 0, width: 60, height: 540 };
  private displayHeat = 0;
  private targetHeat = 0;
  private pulseT = 0;

  minBand = 50;
  maxBand = 70;
  dangerThreshold = 85;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.outlineG = scene.add.graphics().setScrollFactor(0).setDepth(1000);
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(1001);
  }

  setBand(min: number, max: number, danger: number): void {
    this.minBand = min;
    this.maxBand = max;
    this.dangerThreshold = danger;
  }

  setBounds(x: number, y: number, w: number, h: number): void {
    this.bounds = { x, y, width: w, height: h };
    this.drawOutline();
  }

  setHeat(value: number): void {
    this.targetHeat = Math.max(0, Math.min(100, value));
  }

  update(dt: number): void {
    this.displayHeat = Phaser.Math.Linear(this.displayHeat, this.targetHeat, Math.min(1, dt * 6));
    this.pulseT += dt;
    this.drawFill();
  }

  destroy(): void {
    this.g.destroy();
    this.outlineG.destroy();
  }

  private drawOutline(): void {
    const { x, y, width, height } = this.bounds;
    const g = this.outlineG;
    g.clear();
    // Glass column
    g.fillStyle(0x101a2a, 0.55);
    g.fillRoundedRect(x, y, width, height, width * 0.45);
    g.lineStyle(2, 0x6a809e, 0.85);
    g.strokeRoundedRect(x, y, width, height, width * 0.45);
    // Bulb
    const cx = x + width / 2;
    const by = y + height + 4;
    g.fillStyle(0x101a2a, 0.85);
    g.fillCircle(cx, by, width * 0.9);
    g.lineStyle(2, 0x6a809e, 0.9);
    g.strokeCircle(cx, by, width * 0.9);
    // Tick marks
    g.lineStyle(1.5, 0xc7d2e6, 0.7);
    for (let i = 0; i <= 10; i++) {
      const ty = y + (height - 12) * (i / 10) + 6;
      const len = i % 5 === 0 ? width * 0.5 : width * 0.25;
      g.lineBetween(x + width, ty, x + width + len, ty);
    }
  }

  private drawFill(): void {
    const { x, y, width, height } = this.bounds;
    const innerPad = width * 0.22;
    const tubeLeft = x + innerPad;
    const tubeRight = x + width - innerPad;
    const tubeTop = y + 14;
    const tubeBottom = y + height - 14;
    const tubeH = tubeBottom - tubeTop;
    const tubeW = tubeRight - tubeLeft;

    const g = this.g;
    g.clear();

    // Golden target band — always visible
    const bandTop = tubeBottom - (this.maxBand / 100) * tubeH;
    const bandBot = tubeBottom - (this.minBand / 100) * tubeH;
    const inTarget = this.displayHeat >= this.minBand && this.displayHeat <= this.maxBand;
    const bandAlpha = inTarget ? 0.55 + Math.sin(this.pulseT * 5) * 0.15 : 0.35;
    g.fillStyle(0xffd060, bandAlpha);
    g.fillRect(tubeLeft - 4, bandTop, tubeW + 8, bandBot - bandTop);
    g.lineStyle(1.5, 0xffd060, 0.7);
    g.lineBetween(tubeLeft - 6, bandTop, tubeRight + 6, bandTop);
    g.lineBetween(tubeLeft - 6, bandBot, tubeRight + 6, bandBot);

    // Danger zone marker
    if (this.displayHeat > 65) {
      const dangerTop = tubeTop;
      const dangerBot = tubeBottom - (this.dangerThreshold / 100) * tubeH;
      g.fillStyle(0xff2a18, 0.1 + Math.sin(this.pulseT * 7) * 0.08);
      g.fillRect(tubeLeft, dangerTop, tubeW, dangerBot - dangerTop);
    }

    // Mercury fill
    const fillH = (this.displayHeat / 100) * tubeH;
    if (fillH > 1) {
      const fillTop = tubeBottom - fillH;
      const col = this.mercuryColour();
      g.fillStyle(col, 0.95);
      g.fillRect(tubeLeft, fillTop, tubeW, fillH);
      // Highlight stripe
      g.fillStyle(0xffffff, 0.18);
      g.fillRect(tubeLeft + tubeW * 0.3, fillTop, tubeW * 0.18, fillH);
      // Glow cap
      g.fillStyle(col, 0.5);
      g.fillRect(tubeLeft - 2, fillTop - 2, tubeW + 4, 4);
    } else {
      // Cold sliver
      g.fillStyle(0x3a6cb4, 0.7);
      g.fillRect(tubeLeft, tubeBottom - 5, tubeW, 5);
    }

    // Filled bulb (always coloured by current temp)
    const bx = x + width / 2;
    const by = y + height + 4;
    g.fillStyle(this.mercuryColour(), 0.95);
    g.fillCircle(bx, by, width * 0.78);
  }

  private mercuryColour(): number {
    const h = this.displayHeat;
    if (h < 30) return lerpColor(0x2a66c8, 0xff8a30, h / 30);
    if (h < 75) return 0xff8a30;
    return lerpColor(0xff8a30, 0xff1a10, (h - 75) / 25);
  }
}

function lerpColor(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ab + (bb - ab) * k);
}
