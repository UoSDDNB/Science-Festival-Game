import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { LevelSelectScene } from "./scenes/LevelSelectScene";
import { LevelScene } from "./scenes/LevelScene";
import { ArcadeSelectScene } from "./arcade/ArcadeSelectScene";
import { GAME_SCENES } from "./arcade/registry";
import { WORLD_WIDTH, WORLD_HEIGHT } from "./types";

/**
 * Phaser bootstrap. The whole game ships as JS + bundled JSON — no asset CDN.
 * Scale.FIT keeps a stable design resolution while filling the device screen
 * (festival tablets, phones, laptops). The actual letterboxing of in-game
 * coordinates is handled inside LevelScene so UI can stay edge-anchored.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#070b14",
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  fps: { target: 60, forceSetTimeOut: false },
  scene: [BootScene, LevelSelectScene, LevelScene, ArcadeSelectScene, ...GAME_SCENES],
};

const game = new Phaser.Game(config);

// Test/debug hook: expose the game instance for headless verification scripts
// (sci-game-live/play/verify*.mjs read scene state via page.evaluate).
// No effect on gameplay. Safe to remove if the hook is unwanted in the shipped bundle.
(window as unknown as { __PHASER_GAME?: Phaser.Game }).__PHASER_GAME = game;

// Re-export so unused imports don't break tree-shaking
export { WORLD_WIDTH, WORLD_HEIGHT };
