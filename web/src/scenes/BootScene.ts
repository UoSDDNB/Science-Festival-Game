import Phaser from "phaser";
import { buildProceduralTextures } from "../visuals/textures";
import { IMMUNE_TEX, preloadImmuneImages, punchBlackMatte } from "../immune_rescue/assets";

/**
 * BootScene — load Immune Rescue PNGs, generate procedural textures, then
 * start gameplay (Infection detected intro).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    preloadImmuneImages(this);
  }

  create(): void {
    punchBlackMatte(this, IMMUNE_TEX.bacteria);
    punchBlackMatte(this, IMMUNE_TEX.neutrophil);
    buildProceduralTextures(this);
    this.scene.start("immune-rescue", { mode: "single" });
  }
}
