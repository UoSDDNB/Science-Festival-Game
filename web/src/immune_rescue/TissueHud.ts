import Phaser from "phaser";
import { ImmuneMode } from "./types";
import { IMMUNE_CONFIG } from "./config";

/** Tissue integrity meter, engulf counter, and two-player zone chrome. */
export class TissueHud {
  private readonly scene: Phaser.Scene;
  private readonly mode: ImmuneMode;
  private root: Phaser.GameObjects.Container;
  private barBg: Phaser.GameObjects.Rectangle;
  private barFill: Phaser.GameObjects.Rectangle;
  private countText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private zoneGfx: Phaser.GameObjects.Graphics | null = null;
  private integrity: number = IMMUNE_CONFIG.maxTissueDamage;

  constructor(scene: Phaser.Scene, mode: ImmuneMode) {
    this.scene = scene;
    this.mode = mode;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1400);

    this.barBg = scene.add.rectangle(0, 0, 220, 16, 0x1a0a10, 0.85).setOrigin(0, 0.5);
    this.barFill = scene.add.rectangle(0, 0, 220, 16, 0x4fd1c5, 0.95).setOrigin(0, 0.5);
    this.countText = scene.add
      .text(0, 0, "", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "16px",
        color: "#e8eef8",
      })
      .setOrigin(0, 0.5);
    this.hintText = scene.add
      .text(0, 0, "", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "14px",
        color: "#9fb5d8",
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5, 0);

    this.root.add([this.barBg, this.barFill, this.countText, this.hintText]);
    if (mode === "two") {
      this.zoneGfx = scene.add.graphics().setScrollFactor(0).setDepth(1390);
    }
    scene.scale.on("resize", this.layout, this);
    this.layout();
    this.setHint(
      mode === "two"
        ? "P1 left: steer neutrophil · P2 right: tap seed / hold decoy"
        : "Follow the teal scent · engulf green colonies before tissue fails",
    );
  }

  get tissueIntegrity(): number {
    return this.integrity;
  }

  applyDamage(amount: number): void {
    this.integrity = Math.max(0, this.integrity - amount);
    this.refreshBar();
  }

  setEngulfed(engulfed: number, target: number, liveColonies: number): void {
    this.countText.setText(`Engulfed ${engulfed}/${target} · Live colonies ${liveColonies}`);
  }

  setHint(text: string): void {
    this.hintText.setText(text);
  }

  destroy(): void {
    this.scene.scale.off("resize", this.layout, this);
    this.zoneGfx?.destroy();
    this.root.destroy(true);
  }

  private layout = (): void => {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const barW = Math.min(260, w * 0.4);
    this.barBg.setPosition(24, 36);
    this.barBg.width = barW;
    this.barFill.setPosition(24, 36);
    this.refreshBar();
    this.countText.setPosition(24, 58);
    this.hintText.setPosition(w / 2, h - 18);
    this.hintText.setWordWrapWidth(w * 0.9);

    if (this.zoneGfx && this.mode === "two") {
      this.zoneGfx.clear();
      this.zoneGfx.lineStyle(2, 0x4fd1c5, 0.35);
      this.zoneGfx.lineBetween(w * 0.5, 0, w * 0.5, h);
      this.zoneGfx.fillStyle(0x4fd1c5, 0.06);
      this.zoneGfx.fillRect(0, 0, w * 0.5, h);
      this.zoneGfx.fillStyle(0xff5a4a, 0.06);
      this.zoneGfx.fillRect(w * 0.5, 0, w * 0.5, h);
    }
  };

  private refreshBar(): void {
    const barW = this.barBg.width;
    const t = this.integrity / IMMUNE_CONFIG.maxTissueDamage;
    this.barFill.width = Math.max(2, barW * t);
    const color = t > 0.45 ? 0x4fd1c5 : t > 0.2 ? 0xffd060 : 0xff5a4a;
    this.barFill.setFillStyle(color, 0.95);
  }
}
