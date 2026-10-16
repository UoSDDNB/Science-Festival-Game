import Phaser from "phaser";
import { LevelDef } from "../types";

/**
 * Optional animated interior layer for nasal_journey levels.
 * The Allergy Cell now uses the bloodstream photo for background cells, so
 * this stays empty — only the playable mast cell sprite is drawn on top.
 */
export interface InteriorVisual {
  container: Phaser.GameObjects.Container;
  update(dt: number): void;
  destroy(): void;
}

export function buildInterior(scene: Phaser.Scene, _def: LevelDef): InteriorVisual {
  const container = scene.add.container(0, 0).setDepth(1);

  return {
    container,
    update(_dt: number) {},
    destroy() {
      container.destroy(true);
    },
  };
}
