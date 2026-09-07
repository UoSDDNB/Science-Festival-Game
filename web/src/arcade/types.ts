import Phaser from "phaser";

/**
 * A pluggable arcade mini-game module. The shell (ArcadeSelectScene +
 * registry) owns the menu; a game module owns its own scene + state.
 *
 * Pattern lifted from the demoted v4 scaffold (arcade-games/src/shell),
 * adapted for Phaser 3.90: the scene KEY is explicit (3.90 scene keys are
 * set in the constructor, not derived from the class name).
 */
export interface GameDef {
  /** Stable id (future persistence keys). */
  id: string;
  /** Display name (menu card). */
  name: string;
  /** One-line blurb (menu card). */
  blurb: string;
  /** Card accent colour (procedural art only — no image assets). */
  accent: string;
  /** Phaser 3.90 scene key the game scene is registered under. */
  sceneKey?: string;
  /** The game's scene class. Required for unlocked games. */
  scene?: new (key?: string) => Phaser.Scene;
  /** Locked cards render "Coming Soon" and are not tappable. */
  locked?: boolean;
  /** Harness hook: compact state snapshot for programmatic verification. */
  snapshot?: (scene: Phaser.Scene) => Record<string, unknown>;
}
