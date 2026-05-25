import Phaser from "phaser";
import { buildProceduralTextures } from "../visuals/textures";

/**
 * BootScene — generate all procedural textures, then jump to the level select.
 * Nothing is loaded over the network: the whole game ships as JS + JSON.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    buildProceduralTextures(this);
    this.scene.start("level-select");
  }
}
