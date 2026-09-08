import Phaser from "phaser";
import { HeatField } from "../sim/HeatField";
import { rgbaBytes } from "./palette";
import { WORLD_HEIGHT } from "../types";

export type HeatOverlayOptions = {
  /** "heat" uses the fire gradient; "chemokine" uses teal/green chemotaxis colours. */
  mode?: "heat" | "chemokine";
};

/**
 * Renders the heat field as a smooth, additively-blended overlay.
 * Implementation: a grid-sized CanvasTexture we repaint via ImageData each
 * frame, drawn scaled across the world. Bilinear filtering gives the
 * continuous gradient look — no visible cell boundaries.
 */
export class HeatOverlay {
  private readonly scene: Phaser.Scene;
  private readonly field: HeatField;
  readonly image: Phaser.GameObjects.Image;
  private readonly canvasTexture: Phaser.Textures.CanvasTexture;
  private readonly imageData: ImageData;
  private readonly mode: "heat" | "chemokine";

  constructor(scene: Phaser.Scene, field: HeatField, worldWidth: number, options?: HeatOverlayOptions) {
    this.scene = scene;
    this.field = field;
    this.mode = options?.mode ?? "heat";
    const key = "heat-overlay-" + Math.random().toString(36).slice(2, 7);
    const tex = scene.textures.createCanvas(key, field.gridW, field.gridH);
    if (!tex) throw new Error("Failed to create heat overlay texture");
    this.canvasTexture = tex;
    const ctx = tex.getContext();
    this.imageData = ctx.createImageData(field.gridW, field.gridH);
    this.image = scene.add
      .image(0, 0, key)
      .setOrigin(0, 0)
      .setDisplaySize(worldWidth, WORLD_HEIGHT)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.85);
    this.image.setDepth(2);
  }

  setDepth(z: number): void {
    this.image.setDepth(z);
  }

  destroy(): void {
    this.image.destroy();
    this.scene.textures.remove(this.canvasTexture.key);
  }

  update(): void {
    const data = this.imageData.data;
    const heat = this.field.heat;
    for (let i = 0; i < heat.length; i++) {
      const h = heat[i];
      const px = i * 4;
      if (h < 0.5) {
        data[px] = 0; data[px + 1] = 0; data[px + 2] = 0; data[px + 3] = 0;
        continue;
      }
      const t = Math.min(1, h / 100);
      if (this.mode === "chemokine") {
        data[px] = Math.round(40 + t * 120);
        data[px + 1] = Math.round(180 + t * 60);
        data[px + 2] = Math.round(170 + t * 50);
        data[px + 3] = Math.min(200, Math.max(0, t * 210));
      } else {
        const [r, g, b] = rgbaBytes(t);
        data[px] = r;
        data[px + 1] = g;
        data[px + 2] = b;
        data[px + 3] = Math.min(220, Math.max(0, t * 230));
      }
    }
    const ctx = this.canvasTexture.getContext();
    ctx.putImageData(this.imageData, 0, 0);
    this.canvasTexture.refresh();
  }
}
