import Phaser from "phaser";
import { GameDef } from "./types";
import { DropCatchScene } from "./games/DropCatchScene";
import { TapPulseScene } from "./games/TapPulseScene";

/**
 * Arcade game registry — the single list ArcadeSelectScene renders from and
 * main.ts registers as scenes. Add a new mini-game: implement the scene in
 * src/arcade/games/, append it here. Build order of record: web/docs/
 * ARCADE-DESIGN-PARTY.md D-3 (Drop Catch → Tap the Pulse → Sugar Match →
 * Signal Blocks → Chase! → Line Manager).
 */
export const GAMES: GameDef[] = [
  {
    id: "drop_catch",
    name: "Drop Catch",
    blurb: "Drag the receptor. Catch the round ones, dodge the spiky ones.",
    accent: "#4fd1c5",
    sceneKey: "arcade:drop-catch",
    scene: DropCatchScene,
    snapshot: (s) => {
      const p = s as unknown as DropCatchScene;
      return { score: p.score, lives: p.lives, catches: p.catches, streak: p.streak, state: p.state };
    },
  },
  {
    id: "tap_pulse",
    name: "Tap the Pulse",
    blurb: "Tap the falling signal pulses. Don't miss the beat.",
    accent: "#ffd060",
    sceneKey: "arcade:tap-pulse",
    scene: TapPulseScene,
    snapshot: (s) => {
      const p = s as unknown as TapPulseScene;
      return { score: p.score, lives: p.lives, taps: p.taps, streak: p.streak, state: p.state };
    },
  },
  // Remaining four (locked cards until shipped — D-3 order):
  { id: "sugar_match", name: "Sugar Match", blurb: "Swap cells until three match. Chain the cascades.", accent: "#f472b6", locked: true },
  { id: "signal_blocks", name: "Signal Blocks", blurb: "Stack the fragments, clear the lines, keep the channel open.", accent: "#818cf8", locked: true },
  { id: "line_manager", name: "Line Manager", blurb: "Route every signal to its cell before the junction jams.", accent: "#fb923c", locked: true },
  { id: "chase", name: "Chase!", blurb: "Wander the tissue, eat the signal dots, outrun the rogue.", accent: "#a3e635", locked: true },
];

export function getGame(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}

/** Scenes to register in the Phaser config (unlocked games only). */
export const GAME_SCENES: Array<new (key?: string) => Phaser.Scene> = GAMES.filter(
  (g) => g.scene,
).map((g) => g.scene!);
