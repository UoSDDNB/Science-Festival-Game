import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { LevelSelectScene } from "./scenes/LevelSelectScene";
import { LevelScene } from "./scenes/LevelScene";
import { ArcadeSelectScene } from "./arcade/ArcadeSelectScene";
import { GAME_SCENES } from "./arcade/registry";
import { ImmuneModeSelectScene } from "./immune_rescue/ImmuneModeSelectScene";
import { ImmuneRescueScene } from "./immune_rescue/ImmuneRescueScene";
import { WORLD_WIDTH, WORLD_HEIGHT } from "./types";

/**
 * Phaser bootstrap. The whole game ships as JS + bundled JSON — no asset CDN.
 * Scale.RESIZE fills the device screen (festival tablets, phones, laptops).
 * Letterboxing of in-game coordinates is handled inside LevelScene / ImmuneRescue.
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
  scene: [
    BootScene,
    LevelSelectScene,
    LevelScene,
    ArcadeSelectScene,
    ImmuneModeSelectScene,
    ImmuneRescueScene,
    ...GAME_SCENES,
  ],
};

const game = new Phaser.Game(config);

// Test/debug hook: expose the game instance for headless verification scripts.
(window as unknown as { __PHASER_GAME?: Phaser.Game }).__PHASER_GAME = game;

export { WORLD_WIDTH, WORLD_HEIGHT };
