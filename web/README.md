# Playtime — web rewrite (Phaser 3 + TypeScript)

A small, single-page web game teaching biological signalling cascades through play. This directory is the Phaser/TS rewrite of the original Godot prototype that lives in the repo root.

## Run

```bash
cd web
npm install
npm run dev          # http://localhost:5173
npm run build        # produces dist/
./deploy.sh          # builds + rsyncs dist/ to the Hetzner VPS
```

No external art assets. Everything visual is procedurally drawn from JS — backgrounds, fire, creatures, heat overlay, UI.

## Code layout

```
src/
├── main.ts                     Phaser game config (scenes wired here)
├── types.ts                    Shared types + world constants
├── sim/HeatField.ts            Pure-TS 2D heat simulation (zero Phaser deps)
├── input/GestureTracker.ts     Tap / drag / swirl / pinch detection
├── scenes/
│   ├── BootScene.ts            Build procedural textures, jump to menu
│   ├── LevelSelectScene.ts     Card-based level picker
│   └── LevelScene.ts           Generic level — reads a LevelDef, runs the sim
├── ui/
│   ├── Thermometer.ts          Golden band + danger zone + mercury fill
│   ├── HintSystem.ts           Progressive, dismissible hints (zero tutorial text)
│   ├── WinOverlay.ts           Title + body + one-line biology reveal
│   └── DebugOverlay.ts         F3 — grid, coords, target/source markers
├── visuals/
│   ├── palette.ts              Heat gradient sampling, colour helpers
│   ├── textures.ts             Canvas-generated textures (glow, ember, flake, spark)
│   ├── backgrounds.ts          Procedural backgrounds per level
│   ├── heatOverlay.ts          Grid → ImageData → scaled sprite (additive)
│   ├── fire.ts                 Procedural fire stack + particle emitters
│   └── creature.ts             Procedural Scrat / dragon / sprite silhouettes
└── levels/
    ├── ice_age.json            Tutorial — threshold activation
    ├── norse.json              Puzzle — pathway specificity around a boulder
    └── index.ts                Level registry
```

## Adding a level

1. Drop a new JSON in `src/levels/` following the `LevelDef` schema (see `types.ts`).
2. Add it to the import list in `src/levels/index.ts`.
3. If the creature is new, add a branch in `src/visuals/creature.ts` (or reuse `sprite`).
4. If the backdrop is new, add a branch in `src/visuals/backgrounds.ts` (or pick an existing kind).

No engine resources, no scene files, no asset pipeline.

## Gameplay model (one paragraph)

A fire injects heat into a 2D grid; the grid diffuses heat continuously with dissipation; obstacles block flow. The player taps the fire (action-potential-style spike), swirls around it (positive feedback = stokes intensity), and drags toward the creature (carries heat through tissue). The thermometer reads "manual heat" — a separate value driven by tap + proximity-drag and decaying steadily — so the player must keep working. Win = heat held inside a golden band for 2.5s. Damage threshold above the band = "cytokine-storm" overshoot. After the win, one line of biology lands.

## Pedagogical principle

Invent the mechanic, *then* reveal the biology. The win screen is the only place biology is named.
