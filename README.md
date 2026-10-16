# Playtime — Science Festival Game

**Playtime** is an educational browser game that teaches biological signalling cascades through play. Players guide heat (or pollen) through tissue-like pathways to activate a target cell — invent the mechanic first, then learn the biology on the win/fail screen.

| Property | Value |
|----------|-------|
| **Production engine** | **Phaser 3 + TypeScript + Vite** ([`web/`](web/)) |
| Live URL | [Open the game](https://playtime.204.168.183.57.sslip.io/) |
| Levels (live) | Ice Age · Fire Meets Ice · The Allergy Cell · Two Keys · **Immune Rescue** · **Autonomic Arm-Wrestle** (scene modules) |
| Design resolution | 1920 × 1080 (scales to device; phone-friendly level select) |
| Hosting | Hetzner VPS → `https://playtime.204.168.183.57.sslip.io/` |
| Prototype (archive) | Godot 4.5 / GDScript in repo root (`scripts/`, `scenes/`) |
| Branch | `develop_charlie` (do not push product work to `main` from this workflow) |

---

## Table of Contents

1. [Repository Layout](#1-repository-layout)
2. [Game State and Screen Flows](#2-game-state-and-screen-flows)
3. [Extended Level Breakdowns](#3-extended-level-breakdowns)
4. [Function Directory (Phaser / TypeScript)](#4-function-directory-phaser--typescript)
4b. [Immune Rescue Function Glossary](#4b-immune-rescue-function-glossary-line-by-line)
4d. [Autonomic Arm-Wrestle Function Glossary](#4d-autonomic-arm-wrestle-function-glossary-line-by-line)
5. [Code Readability Rules](#5-code-readability-rules)
6. [Responsive Layout (Issue #1)](#6-responsive-layout-issue-1)
7. [Development Workflow](#7-development-workflow)
8. [Godot Prototype Archive](#8-godot-prototype-archive)

---

## 1. Repository Layout

```
Science-Festival-Game/
├── deploy.sh                     # DEFAULT: build web/ (Phaser) + upload to VPS
├── README.md                     # This file
├── images/                       # Immune Rescue art (Tissue, bacteria, neutrophil)
├── web/                          # ★ PRODUCTION — Phaser 3 + TypeScript
│   ├── package.json              # phaser, vite, typescript
│   ├── vite.config.ts
│   ├── index.html                # Dev entry (#game mount)
│   ├── public/images/            # Symlink → ../../images (served to Phaser)
│   ├── deploy.sh                 # Optional: deploy from web/ only
│   ├── dist/                     # Vite build output (committed from JLW sync)
│   ├── docs/                     # Web-side design notes
│   └── src/
│       ├── main.ts               # Phaser.Game bootstrap (Scale.RESIZE)
│       ├── types.ts              # LevelDef, palette, world constants
│       ├── sim/HeatField.ts      # 2D grid heat diffusion (no Phaser deps)
│       ├── input/GestureTracker.ts
│       ├── scenes/
│       │   ├── BootScene.ts
│       │   ├── LevelSelectScene.ts   # Responsive cards + ScrollPanel (+ Immune + Autonomic + Arcade)
│       │   └── LevelScene.ts
│       ├── immune_rescue/        # ★ Dedicated Immune Rescue scene family (not LevelDef JSON)
│       │   ├── types.ts
│       │   ├── config.ts
│       │   ├── ChemotaxisField.ts
│       │   ├── NeutrophilController.ts
│       │   ├── BacterialSystem.ts
│       │   ├── TissueHud.ts
│       │   ├── ImmuneAssistant.ts    # Optional non-autonomous AI coach
│       │   ├── ImmuneModeSelectScene.ts
│       │   └── ImmuneRescueScene.ts
│       ├── autonomic_arm_wrestle/  # ★ Two-player ANS heart-rate duel (not LevelDef JSON)
│       │   ├── types.ts
│       │   ├── config.ts
│       │   ├── AutonomicArmWrestleScene.ts
│       │   ├── Phase1Awakening.ts
│       │   ├── Phase2Duel.ts
│       │   ├── StrokeInput.ts
│       │   ├── AutonomicGauge.ts
│       │   ├── ECGDisplay.ts
│       │   ├── MoleculePool.ts
│       │   ├── CleftSystem.ts
│       │   ├── ParasympatheticTerminal.ts
│       │   ├── SympatheticTerminal.ts
│       │   ├── AutonomicHud.ts
│       │   ├── AutonomicResultOverlay.ts
│       │   └── assets.ts
│       ├── ui/                   # Thermometer, hints, win/fail, ScrollPanel…
│       ├── visuals/              # Procedural art (no CDN assets)
│       ├── levels/*.json         # Level definitions
│       └── arcade/               # Optional festival mini-games hooks
│
├── project.godot                 # Godot prototype (archive)
├── scripts/                      # GDScript prototype sources
├── scenes/                       # Godot .tscn
├── assets/art/                   # Godot static art
├── resources/
├── docs/tech-spec-v1-norse-onboarding.md
└── scripts/{setup_godot,build}.sh
```

### Shell scripts

| Script | Purpose |
|--------|---------|
| [`deploy.sh`](deploy.sh) | **Default:** `npm` build of [`web/`](web/) → rsync `web/dist/` to VPS. Optional: `PLAYTIME_TARGET=godot` |
| [`web/deploy.sh`](web/deploy.sh) | Same Phaser path from inside `web/` |
| [`scripts/build.sh`](scripts/build.sh) | Godot-only local Web export to `build/` |
| [`scripts/setup_godot.sh`](scripts/setup_godot.sh) | One-time Godot 4.5.2 + templates (prototype only) |

---

## 2. Game State and Screen Flows

There is **no global score/lives store**. Phaser scenes own their state. Level data is declarative JSON under [`web/src/levels/`](web/src/levels/).

```mermaid
stateDiagram-v2
    [*] --> Boot: App launch
    Boot --> LevelSelect: textures ready
    LevelSelect --> Level: PLAY on a level card
    LevelSelect --> ArcadeSelect: Arcade card (optional)
    LevelSelect --> ImmuneModeSelect: Immune Rescue PLAY
    LevelSelect --> AutonomicArmWrestle: Autonomic Arm-Wrestle PLAY
    ImmuneModeSelect --> ImmuneRescue: Single / Two Player
    ImmuneModeSelect --> LevelSelect: Back
    AutonomicArmWrestle --> AutonomicResult: timer / early win
    AutonomicResult --> AutonomicArmWrestle: Play Again
    AutonomicResult --> LevelSelect: Menu
    AutonomicArmWrestle --> LevelSelect: ESC / Back
    ImmuneRescue --> WinOrFailIR: engulf win / tissue fail
    WinOrFailIR --> ImmuneModeSelect: Play Again (win)
    WinOrFailIR --> ImmuneRescue: Retry same mode (fail)
    WinOrFailIR --> LevelSelect: Menu
    Level --> LevelSelect: Menu / back
    Level --> Level: Play Again
    Level --> WinOrFail: heat band / danger
    WinOrFail --> Level: Play Again
    WinOrFail --> LevelSelect: Menu
```

| Current | User action | Next | State notes |
|---------|-------------|------|-------------|
| Boot | automatic | Level select | Procedural textures built |
| Level select | PLAY on level | `LevelScene` with `levelId` | Layout rebuilds on resize/orientation |
| Level select | PLAY on **Immune Rescue** | `immune-mode-select` | Dedicated scene module (not JSON) |
| Level select | PLAY on **Autonomic Arm-Wrestle** | `autonomic-arm-wrestle` | Two-player ANS duel (no mode picker) |
| Level select | drag/wheel (phone/stack) | same screen | `ScrollPanel` scrolls fixed-height cards |
| Immune mode select | Single / Two Player | `immune-rescue` + `{ mode }` | Tissue backdrop + large buttons |
| Immune Rescue | joystick / P2 taps | same | Chemotaxis field + tissue HUD |
| Immune Rescue | engulf N colonies | Win overlay | Biology: chemotaxis / phagocytosis |
| Immune Rescue | tissue integrity ≤ 0 | Fail overlay | Biology: uncontrolled infection |
| Level | tap / swirl / drag / pinch | same | Updates `HeatField` + thermometer |
| Level | sustain in band | Win overlay (+ sneeze cutscene on Allergy Cell) | Sim frozen |
| Level | danger sustained (where configured) | Fail overlay | e.g. anaphylaxis on Allergy Cell |
| Win/Fail | Menu | Level select | Scene restart |

---

## 3. Extended Level Breakdowns

Defined in JSON; registered in [`web/src/levels/index.ts`](web/src/levels/index.ts).

### 1 — Ice Age (`ice_age.json`)

| Property | Detail |
|----------|--------|
| Theme | Frozen wasteland; thaw Scrat |
| Gestures | Tap fire, swirl to stoke, drag heat to creature |
| Win | Hold thermometer band (~45–70) for 2.5s → **THAWED!** |
| Biology line | Activating a cell / waking the immune system |

### 2 — Fire Meets Ice (`norse.json`)

| Property | Detail |
|----------|--------|
| Theme | Norse cavern; pathway around boulders |
| Obstacles | Boulder circles block heat diffusion |
| Win | Band 50–70 for 2.5s → **AWAKENED** |
| Biology | Pathway specificity metaphor |

### 3 — The Allergy Cell (`mast_cell.json`)

| Property | Detail |
|----------|--------|
| Theme | Nasal journey; pollen → mast cell |
| World | 3840px wide, camera follows |
| Fire kind | `pollen` |
| Win | Band 50–70 for 3.5s → sneeze cutscene → **AAACHOO!** |
| Fail | Sustained overshoot → **ANAPHYLAXIS** overlay |
| Biology | IgE / histamine / allergic reaction |

### 4 — Two Keys (`two_keys.json`)

| Property | Detail |
|----------|--------|
| Theme | Tissue; two pollen sources (`fire` + `fireSecondary`) |
| Mechanic | Dual-source heat with `keyHeatCap` |
| Creature | Mast-cell style target |

### Shared gameplay model

A source injects heat into a **2D grid** ([`HeatField`](web/src/sim/HeatField.ts)); heat diffuses with dissipation; obstacles block flow. The thermometer tracks a **manual heat** value (tap + proximity drag, decaying). Win = hold inside the golden band. Overshoot can trigger fail where configured. Biology is named on overlays, not during play.

### 5 — Immune Rescue (dedicated scene module)

**Not** a [`LevelDef`](web/src/types.ts) JSON level. Entry is a home-screen card peer to Arcade; gameplay lives under [`web/src/immune_rescue/`](web/src/immune_rescue/).

| Property | Detail |
|----------|--------|
| Theme | Tissue micro-environment; steer a **neutrophil** |
| Entry | Level select → **Immune Rescue** → mode select |
| Modes | **Single:** AI spawn + replication. **Two-player (same screen):** P1 left half steers; P2 right half taps colonies / holds decoys |
| Simulation | [`ChemotaxisField`](web/src/immune_rescue/ChemotaxisField.ts) wraps `HeatField`; teal chemokine overlay |
| Controls | Virtual joystick (bottom-left / left zone) + soft chemotaxis assist; drag near neutrophil also grabs stick |
| Win | Engulf **8** colonies before tissue integrity hits 0 |
| Fail | Tissue integrity ≤ 0 (infection pressure from live colonies) |
| Biology | Chemotaxis (follow chemical trail) + phagocytosis (engulf) on win; uncontrolled infection on fail |
| Optional AI | Toggle **AI route** — highlights a short visit order through all live colonies from your position (does not steer) |

**Flow:** `level-select` → `immune-mode-select` → `immune-rescue` → `WinOverlay` / `FailOverlay` → Menu (level select) or Play Again (mode select on win; same mode retry on fail).

### 3.6 — Autonomic Arm-Wrestle (dedicated scene module)

**Not** a [`LevelDef`](web/src/types.ts) JSON level. Entry is a home-screen card between Immune Rescue and Arcade; gameplay lives under [`web/src/autonomic_arm_wrestle/`](web/src/autonomic_arm_wrestle/).

| Property | Detail |
|----------|--------|
| Theme | SA node tissue; parasympathetic vs sympathetic tug-of-war |
| Entry | Level select → **Autonomic Arm-Wrestle** → gameplay (no mode picker) |
| Players | **Two-player same screen:** P1 left (blue, ACh) · P2 right (orange, NE) |
| Phase 1 | Both stroke their half; combined charge awakens the SA node; gauge bias seeds Phase 2 |
| Phase 2 | 60s duel: pack molecules into vesicles, release at membrane, guide to M₂ / β₁ receptors |
| Defenses | MAO (P1) dissolves NE in cleft; AChE (P2) dissolves ACh; ACh/NE neutralize on contact |
| Gauge | 0 = parasympathetic brake · 1 = sympathetic accelerator; drives BPM + ECG + background mood |
| Early win | Gauge ≤ 20% or ≥ 80% sustained 3s |
| End states | **Bradycardia** (P1) · **Tachycardia** (P2) · **Homeostasis** (draw) |
| Biology | Vagus/ACh/M₂ vs sympathetic NE/β₁ on the SA node pacemaker |

**Phase 1 controls**

| Side | Zone | Action |
|------|------|--------|
| P1 (left) | `x < w × 0.5` | Rapid stroke to build shared awakening charge |
| P2 (right) | `x ≥ w × 0.5` | Rapid stroke to build shared awakening charge |

**Phase 2 controls**

| Side | Action |
|------|--------|
| P1 | Drag ACh dots → vesicle (4) → drag to lower membrane → release; tap **MAO** near NE |
| P2 | Drag NE dots → vesicle (4) → drag to upper membrane → release; tap **AChE** near ACh |

**Win matrix (end of round)**

| Gauge at end | Outcome | Copy theme |
|--------------|---------|------------|
| ≤ 20% | P1 win — Bradycardia | Calm blue; vagus/ACh |
| ≥ 80% | P2 win — Tachycardia | Orange flash; β₁/NE |
| else | Draw — Homeostasis | Equilibrium ECG |

**Flow:** `level-select` → `autonomic-arm-wrestle` → Phase 1 → Phase 2 → `AutonomicResultOverlay` → Play Again (restart) or Menu.

---

## 4. Function Directory (Phaser / TypeScript)

Alphabetical by path. Public / notable methods only.

### `web/src/main.ts`

| Symbol | Description |
|--------|-------------|
| Phaser `Game` config | `Scale.RESIZE`, parent `#game`, scenes: Boot → LevelSelect → Level (+ arcade + Immune + Autonomic Arm-Wrestle) |
| `input.activePointers` | **6** — supports simultaneous two-player stroke/drag on tablets |
| `__PHASER_GAME` | Optional `window` hook for headless verification |

### `web/src/types.ts`

| Symbol | Description |
|--------|-------------|
| `LevelDef` | Level JSON schema (palette, fire, creature, sim, win, fail, obstacles…) |
| `WORLD_WIDTH` / `WORLD_HEIGHT` | 1920 × 1080 design world |
| `GRID_W` / `GRID_H` / `CELL_SIZE` | Heat grid sizing |
| `obstaclesOf(def)` | Normalises obstacle list from a level def |

### `web/src/levels/index.ts`

| Symbol | Description |
|--------|-------------|
| `LEVELS` | Sorted unlocked level registry |
| `getLevel(id)` | Lookup by id |

### `web/src/sim/HeatField.ts` — class `HeatField`

| Method | Description |
|--------|-------------|
| `constructor(gridW, gridH, cellSize)` | Allocates heat / obstacle buffers |
| `setObstacleCircle(cx, cy, radius)` | Marks blocked cells |
| `worldToGrid(x, y)` | World → cell indices |
| `injectHeat(x, y, amount, radiusCells?)` | Local heat injection |
| `getHeatAt` / `getTargetHeat` | Sampling helpers |
| `update(dt)` | Accumulates and runs diffusion ticks |
| `tick()` (private) | One diffusion + dissipation step |

### `web/src/input/GestureTracker.ts` — class `GestureTracker`

| Method | Description |
|--------|-------------|
| `constructor(scene, callbacks, toWorld)` | Wires pointer events |
| `setSwirlPivot` / `setSecondarySwirlPivot` | Swirl centres (dual-fire levels) |
| Callbacks | `onTap`, `onDragStart/Move/End`, `onSwirlRevolution`, `onPinch` |

### `web/src/scenes/BootScene.ts`

| Method | Description |
|--------|-------------|
| `create()` | `buildProceduralTextures` then start level-select |

### `web/src/scenes/LevelSelectScene.ts` — class `LevelSelectScene`

| Method | Description |
|--------|-------------|
| `create()` / `shutdown()` | Resize + orientation listeners |
| `scheduleRebuild()` / `rebuildLayout()` | Debounced full UI rebuild |
| `createScrollParent(L)` | Attaches `ScrollPanel` when cards overflow |
| `makeCard` / `makeArcadeCard` / `makeImmuneRescueCard` / `makeAutonomicArmWrestleCard` / `makePlayButton` | Card UI |
| `launch(lvl)` | Starts `LevelScene` with `levelId` |

**Layout modes:** `desktop-row` · `desktop-stack` (scrollable) · `phone-scroll` (fixed card height + `ScrollPanel`). Card count is `LEVELS.length + 3` (Immune Rescue + Autonomic Arm-Wrestle + Arcade).

#### `makeImmuneRescueCard(cx, cy, w, h, compact, wholeCardClickable)` — new

- **Purpose:** Build the teal home card that opens Immune Rescue mode select.
- **Parameters:** Card centre `(cx, cy)`, size `(w, h)`, `compact` layout flag, `wholeCardClickable` hit-target mode.
- **Returns:** `Phaser.GameObjects.Container` for the card.
- **Line-by-line:**
  1. Compute `cardMetrics` for font/button sizes matching other cards.
  2. Create a container at `(cx, cy)` and draw a dark rounded rect with teal stroke (`0x4fd1c5`).
  3. If compact, draw a 36×36 motif icon; else draw a full-width motif band via `drawImmuneRescueMotif`.
  4. Add an **IR** chip in the top-right.
  5. Add title **Immune Rescue** and optional italic blurb about chemotaxis / phagocytosis.
  6. Define `open` → `this.scene.start("immune-mode-select")`.
  7. Attach PLAY button; if whole-card clickable, add a transparent hit rect behind content that also calls `open`.
  8. Return the card container.

#### `makeAutonomicArmWrestleCard(cx, cy, w, h, compact, wholeCardClickable)` — new

- **Purpose:** Build the purple home card that launches Autonomic Arm-Wrestle directly.
- **Parameters:** Same as `makeImmuneRescueCard`.
- **Returns:** `Phaser.GameObjects.Container`.
- **Line-by-line:**
  1. Compute `cardMetrics` for responsive fonts/buttons.
  2. Draw dark rounded rect with purple stroke (`0xc084fc`).
  3. Draw `drawAutonomicArmWrestleMotif` (compact icon or full band).
  4. Add **ANS** chip in the top-right.
  5. Add title **Autonomic Arm-Wrestle** and optional blurb about SA node / ACh vs NE.
  6. Define `open` → `this.scene.start("autonomic-arm-wrestle")`.
  7. Attach PLAY button and optional whole-card hit target.
  8. Return the card container.

### `web/src/scenes/LevelScene.ts` — class `LevelScene`

| Method | Description |
|--------|-------------|
| `init` / `create` / `update` | Level lifecycle |
| `handleResize` / `applyCameraTransform` | Fit world to viewport; camera-follow for wide levels |
| `handleTap` / `handleDrag*` / `handleSwirlRevolution` / `handlePinch` | Gesture → heat |
| `checkOutcomes` / `handleWin` / `handleAnaphylaxis` | Win/fail |
| `layoutThermometer` | Edge-anchored HUD |

### `web/src/ui/ScrollPanel.ts` — class `ScrollPanel`

| Method | Description |
|--------|-------------|
| `setViewport` / `setContentHeight` / `add` | Mask-free scroll region |
| Pointer + wheel handlers | Drag/wheel scroll; cull off-screen cards |
| Note | **No geometry masks** (iOS Safari white-screen bug) |

### `web/src/ui/Thermometer.ts` · `HintSystem.ts` · `WinOverlay.ts` · `FailOverlay.ts` · `SneezeCutscene.ts` · `DebugOverlay.ts` · `resultLayout.ts`

| File | Role |
|------|------|
| `Thermometer` | Band + danger + mercury; `setBounds` / `setHeat` / `update` |
| `HintSystem` | Timed progressive hints; `resize` for narrow screens |
| `WinOverlay` / `FailOverlay` | Result panels via `computeResultLayout` |
| `SneezeCutscene` | Allergy Cell win flourish |
| `DebugOverlay` | F3 grid/telemetry |
| `computeResultLayout` | Responsive overlay metrics |

### `web/src/visuals/*`

| File | Exports |
|------|---------|
| `textures.ts` | `buildProceduralTextures` |
| `palette.ts` | `sampleHeat`, `hexToInt`, colour constants |
| `backgrounds.ts` | `buildBackground`, **`drawTissueBackdrop`** (no LevelDef) |
| `creature.ts` | `buildCreature`, **`buildNeutrophilAt`** (no LevelDef) |
| `fire.ts` | `FireVisual` |
| `heatOverlay.ts` | `HeatOverlay` (+ optional `{ mode: "chemokine" }`) |
| `cardPreview.ts` | `drawCardMotif`, `drawImmuneRescueMotif`, `drawAutonomicArmWrestleMotif`, `lerpHex` |
| `interior.ts` | `buildInterior` (nasal journey décor) |

#### `drawTissueBackdrop(g, worldW, worldH, palette)` — new / extracted

- **Purpose:** Paint a fleshy tissue backdrop without requiring a full `LevelDef`.
- **Parameters:** Phaser `Graphics` target; world width/height; palette `{ bgTop, bgBottom, ground, groundAccent }` hex strings.
- **Returns:** `void` (mutates `g`).
- **Line-by-line:**
  1. Convert palette hex strings to ints.
  2. Fill 48 horizontal gradient strips from `bgTop` → `bgBottom`.
  3. Scatter translucent accent ellipses (pseudo-random) for soft tissue noise.
  4. Stroke four faint capillary curves across the width.
  5. Wash the bottom band with semi-transparent `ground`.
  6. Sprinkle sparse white flecks as cellular texture.

#### `buildNeutrophilAt(scene, x, y, size, skinHex, accentHex)` — new export

- **Purpose:** Build a neutrophil visual usable by Immune Rescue without a fake `LevelDef`.
- **Parameters:** Scene; world position; size scale; body and nucleus hex colours.
- **Returns:** `CreatureVisual` (`container`, `setLifeSignal`, no-op thaw helpers).
- **Line-by-line:**
  1. Create a depth-6 container at `(x, y)`.
  2. Draw irregular ellipses for the cell membrane in `skinHex`.
  3. Draw three connected nucleus lobes in `accentHex` plus connecting strokes.
  4. Add pseudopod nubs on opposite sides.
  5. Add an additive `glow-warm` heart image for life-signal feedback.
  6. Return `setLifeSignal(t)` that pulses alpha/scale from chemotaxis strength.

#### `drawImmuneRescueMotif(g, x, y, w, h, rTop, rBottom)` — new

- **Purpose:** Home-card motif (tissue wash + neutrophil + bacterial dots).
- **Parameters:** Graphics; box origin/size; top/bottom corner radii.
- **Returns:** `void`.
- **Line-by-line:**
  1. `fillBox` with deep red tissue gradient.
  2. Draw pale neutrophil ellipse + darker nuclear lobes on the left.
  3. Draw three green bacterial dots on the right.
  4. Stroke a faint teal scent ring around the neutrophil.

#### `drawAutonomicArmWrestleMotif(g, x, y, w, h, rTop, rBottom)` — new

- **Purpose:** Home-card motif (SA node tissue + ECG trace + blue/orange molecule dots).
- **Parameters:** Graphics; box origin/size; top/bottom corner radii.
- **Returns:** `void`.
- **Line-by-line:**
  1. `fillBox` with deep purple tissue gradient.
  2. Draw pink SA node ellipse at centre.
  3. Stroke a small ECG spike polyline across the band.
  4. Place blue (ACh) and orange (NE) dots on left/right.

#### `HeatOverlay` constructor / `update` — chemokine mode

- **Purpose:** Same canvas overlay as heat levels; optional teal “chemokine” palette.
- **Parameters:** `options?.mode` defaults to `"heat"`; `"chemokine"` remaps RGB toward teal/green.
- **Line-by-line (`update` chemokine branch):** For each cell with heat ≥ 0.5, normalize `t = h/100`, write teal RGB `(40+120t, 180+60t, 170+50t)` and alpha proportional to `t`, then `putImageData` + refresh.

### `web/src/arcade/*`

Optional festival arcade card + `DropCatchScene`; registered in `arcade/registry.ts`.

---

## 4b. Immune Rescue Function Glossary (line-by-line)

Educational walkthrough of every public surface in [`web/src/immune_rescue/`](web/src/immune_rescue/). Private helpers are included where they are essential to understanding gameplay.

### `types.ts`

| Symbol | Role |
|--------|------|
| `ImmuneMode` | `"single" \| "two"` |
| `ImmuneLaunchData` | `{ mode }` passed into `ImmuneRescueScene.init` |
| `Colony` | Position, radius, size, replicate timer, optional visual |
| `Decoy` | Fake scent emitter with lifetime |
| `ImmunePalette` | Hex colour bundle for tissue / neutrophil / bacteria / scent |

### `config.ts`

| Symbol | Role |
|--------|------|
| `IMMUNE_CONFIG` | Tunables: world 1920×1080, win count 8, speeds, emit rates, cooldowns, caps |
| `IMMUNE_PALETTE` | Teal/immune colour set |
| `IMMUNE_WIN` / `IMMUNE_FAIL` | Overlay copy (chemotaxis/phagocytosis vs overwhelmed tissue) |

### `ChemotaxisField` — class

#### `constructor(worldWidth?, worldHeight?)`

- **Returns:** New wrapper owning a `HeatField`.
- **Lines:** Store world size → derive grid dims from `CELL_SIZE` → construct `HeatField` → set diffusion `0.08`, dissipation `0.01`, `sourceHeatRate = 0` (emission is explicit via `emit`).

#### `emit(worldX, worldY, amount, radiusCells = 2.5)`

- **Purpose:** Inject chemoattractant (colony or decoy).
- **Returns:** `void`.
- **Lines:** Forward to `field.injectHeat(...)`.

#### `update(dt)` / `getSignal(worldX, worldY)`

- Advance diffusion; sample heat 0–100 at a world point.

#### `sampleGradient(worldX, worldY)`

- **Purpose:** Unit vector toward higher signal for neutrophil assist.
- **Returns:** `Phaser.Math.Vector2` (zero if flat).
- **Line-by-line:**
  1. Read heat one cell right/left/down/up.
  2. `gx = right - left`, `gy = down - up` (central difference).
  3. If length² &lt; ε, return `(0,0)`.
  4. Otherwise `normalize()` and return.

#### `destroy()`

- Sets `field.frozen = true` so leftover ticks stop.

### `NeutrophilController` — class

#### `constructor(scene, body, chemotaxis, mode, toWorld)`

- Stores refs → `buildJoystick()` → wires pointer down/move/up (+ outside) → resize → `layoutJoystick()`.

#### Getters `x` / `y`

- Neutrophil container world position.

#### `update(dt)`

- **Line-by-line:**
  1. Sample chemotaxis gradient; scale by `neutrophilSpeed * chemotaxisAssist`.
  2. Scale stick vector by `neutrophilSpeed`; sum with assist into `velocity`.
  3. Integrate position with `dt`; clamp inside world inset by `neutrophilRadius`.

#### `destroy()`

- Unhooks listeners; destroys joystick arcs.

#### Private helpers (behaviour)

| Helper | Behaviour |
|--------|-----------|
| `buildJoystick` | Semi-transparent base + teal knob, scrollFactor 0, high depth |
| `layoutJoystick` | Bottom-left; in two-player, clamped to left half |
| `inP1Zone` | Always true in single; `pointer.x < width/2` in two |
| `onDown` | Capture if near stick **or** near neutrophil body; start stick |
| `onMove` / `onUp` | Update or release stick |
| `applyStick` | Clamp to radius, deadzone, write unit `stickVector` |

### `BacterialSystem` — class

#### `constructor(...)`

- Seeds initial colonies; in two-player, registers P2 pointer handlers.

#### Getters / `infectionPressure()`

- `engulfedCount`, `colonyCount`, `winTarget`; pressure = `colonies.length * damagePerColonyPerSec`.

#### `update(dt)`

- **Line-by-line:**
  1. Tick down P2 cooldowns.
  2. Single: every `aiSpawnSeconds`, spawn at a random edge if under cap.
  3. Each colony emits scent proportional to `size * dt`; single-mode replication after `replicateSeconds` spawns an offset child.
  4. Decoys emit stronger scent and expire when `life ≤ 0`.
  5. If a long-press is held ≥ 450 ms, place a decoy.

#### `tryEngulf(nx, ny, radius)`

- For each overlapping colony: remove, increment engulfed, particle burst; return cleared count.

#### `destroy()`

- Unhook P2 input; destroy visuals; clear arrays.

#### Private placement / draw (summary)

| Helper | Role |
|--------|------|
| `seedInitial` | Places 3 starter colonies on the right side of the tissue |
| `spawnColony` | Clamp position, draw green disc, push `Colony` |
| `tryPlaceColony` / `tryPlaceDecoy` | P2 actions with cooldowns / max decoys |
| `onP2Down` / `onP2Up` | Right-half only; short tap = colony, long hold = decoy |
| `burst` | Radial spark tweens on engulf |
| `randomEdgeX/Y` | AI spawn along left/right margins |

### `TissueHud` — class

#### `constructor(scene, mode)`

- Builds integrity bar, engulf counter, hint text; in two-player adds zone graphics; listens for resize; sets mode-specific hint.

#### `applyDamage(amount)` / `tissueIntegrity`

- Subtract damage (floor 0); refresh bar colour (teal → amber → red).

#### `setEngulfed` / `setHint` / `destroy`

- Update counter text; set hint; unhook resize and destroy nodes.

#### `layout` (private)

- Anchor bar top-left; hint bottom-centre; draw vertical split + tinted P1/P2 halves in two-player.

### `ImmuneModeSelectScene` — class (`immune-mode-select`)

#### `create()` / `shutdown()`

- Resize → `rebuild`; Esc → level select; unhook on shutdown.

#### `rebuild` (private)

- Destroy previous UI → tissue backdrop + veil → title/subtitle → stacked cards if `w < 700` else side-by-side → Back link.

#### `makeModeCard(cx, cy, cw, ch, mode, title, blurb)`

- Rounded card + title + blurb + teal PLAY rect calling `startMode(mode)`.

#### `startMode(mode)`

- `this.scene.start("immune-rescue", { mode })`.

### `ImmuneAssistant` — class (`ImmuneAssistant.ts`)

Optional **AI route** toggle. Does not play the neutrophil.

| Method | Role |
|--------|------|
| `constructor(scene, worldLayer)` | Route graphics + toggle (starts off) |
| `update(nx, ny, colonies)` | When on, draws a short open tour through every live colony from the neutrophil |
| `destroy()` | Clears graphics and toggle |
| `shortestOpenTour(sx, sy, colonies)` | Nearest-neighbour visit order + 2-opt (exported helper) |

Faint spokes to all colonies; bold numbered path = suggested order. Updates as colonies spawn or are engulfed.

### `ImmuneRescueScene` — class (`immune-rescue`)

#### `init(data)`

- Normalize mode to `"single"` or `"two"`; clear `done`.

#### `create()`

- **Line-by-line:**
  1. Create `worldLayer` container.
  2. Draw tissue backdrop into the layer.
  3. Construct `ChemotaxisField` + `HeatOverlay` in chemokine mode; add overlay image.
  4. `buildNeutrophilAt` on the left mid-height; add to layer.
  5. Construct `BacterialSystem`, `NeutrophilController` (both get `screenToWorld`), `TissueHud`.
  6. Menu back button; resize + Esc handlers; initial `handleResize`.

#### `update(_time, deltaMs)`

- Cap `dt`; update controller → bacteria → chemotaxis → overlay; pulse neutrophil from local signal; try engulf; apply infection damage; win if engulfed ≥ 8 else fail if integrity ≤ 0.

#### `shutdown()`

- Tear down controller, bacteria, HUD, overlay, field, result overlays.

#### `handleResize` / `screenToWorld` / `getWorldPoint`

- Letterbox-scale world layer to fit viewport; convert screen touches through offset/scale (critical with container scaling — do not use raw `pointer.worldX`).

#### `makeBackButton`

- Fixed HUD “← Menu” → level select.

#### `handleWin` / `handleFail`

- Freeze field; show `WinOverlay` (Play Again → mode select) or `FailOverlay` (retry same mode); Menu → level select.

#### `overlayDef(title, body, biologyLine)`

- Fabricates a minimal `LevelDef` so existing `WinOverlay` can render Immune Rescue copy without a JSON level.

### `web/src/autonomic_arm_wrestle/*` — Autonomic Arm-Wrestle module

| File | Role |
|------|------|
| `types.ts` | `AutonomicPhase`, `PlayerSide`, `MoleculeKind`, `DuelOutcome`, layout/pool types |
| `config.ts` | `ANS_CONFIG` tunables, `ANS_COPY` strings, `ANS_COLORS` |
| `AutonomicArmWrestleScene.ts` | Top-level Phaser scene + phase FSM + resize |
| `Phase1Awakening.ts` | Shared stroke threshold race + flatline ECG |
| `Phase2Duel.ts` | Terminals, cleft, gauge BPM coupling, 60s timer |
| `StrokeInput.ts` | Per-pointer stroke speed → charge |
| `AutonomicGauge.ts` | Central homeostasis bar |
| `ECGDisplay.ts` | Procedural scrolling ECG strip |
| `MoleculePool.ts` | Pooled ACh/NE dots and cleft molecules |
| `CleftSystem.ts` | M₂/β₁ receptors, drift, bind, neutralization |
| `ParasympatheticTerminal.ts` | P1 ACh packaging + MAO enzyme |
| `SympatheticTerminal.ts` | P2 NE packaging + AChE enzyme |
| `AutonomicHud.ts` | Timer, BPM, team hints |
| `AutonomicResultOverlay.ts` | Bradycardia / Tachycardia / Draw end card |
| `assets.ts` | Reserved preload hook (procedural v1) |

---

## 4d. Autonomic Arm-Wrestle Function Glossary (line-by-line)

Educational walkthrough of every public surface in [`web/src/autonomic_arm_wrestle/`](web/src/autonomic_arm_wrestle/).

### `types.ts`

| Symbol | Role |
|--------|------|
| `AutonomicPhase` | `"awakening" \| "duel" \| "result"` |
| `PlayerSide` | `"p1" \| "p2"` (parasympathetic left / sympathetic right) |
| `MoleculeKind` | Free vs cleft ACh/NE discriminant |
| `ReceptorKind` | `"M2" \| "Beta1"` |
| `DuelOutcome` | `"p1_win" \| "p2_win" \| "draw"` |
| `LayoutBands` | HUD/playfield band metrics (reserved for layout helpers) |
| `PooledMolecule` | Pool slot: sprite, kind, velocity, active flag |

### `config.ts`

| Symbol | Role |
|--------|------|
| `ANS_CONFIG` | Thresholds, charge rate, duel duration, bind push, BPM range, molecule speeds |
| `ANS_COPY` | Phase hints + result biology lines |
| `ANS_COLORS` | P1 teal, P2 orange, gauge/SA node colours |

### `assets.ts`

#### `preloadAutonomicAssets(scene)`

- **Purpose:** Reserved hook for future PNG textures; v1 uses procedural shapes only.
- **Returns:** `void`.

### `StrokeInput` — class

#### `constructor(scene, onComplete)`

- **Purpose:** Wire pointer down/move/up for split-zone stroke sampling.
- **Returns:** New tracker; calls `onComplete(bias)` when combined charge ≥ threshold.

#### `update(dt)`

- **Purpose:** Accumulate P1/P2 charge from smoothed stroke speeds each frame.
- **Returns:** `void`.

#### `destroy()`

- **Purpose:** Remove pointer listeners.
- **Returns:** `void`.

#### Getters: `totalCharge`, `bias`

- **Purpose:** Combined awakening progress and clamped gauge seed for Phase 2.

### `AutonomicGauge` — class

#### `constructor(scene, parent)`

- **Purpose:** Build central homeostasis bar (0 = blue brake, 1 = orange accelerator).
- **Returns:** Gauge instance parented into `parent`.

#### `setValue(v)` / `getValue()` / `nudge(delta)`

- **Purpose:** Read/write clamped gauge in `[0, 1]`.

#### `layout(cx, cy, width)`

- **Purpose:** Position gauge under HUD; scale bar width from viewport.

#### `destroy()`

- **Purpose:** Tear down container.

### `ECGDisplay` — class

#### `constructor(scene, parent)`

- **Purpose:** Procedural ECG strip in HUD band.

#### `setBpm(bpm)` / `setFlatline(on)`

- **Purpose:** Couple trace speed to heart rate; flatline mode for Phase 1.

#### `layout(cx, cy, width)` / `update(dt)` / `destroy()`

- **Purpose:** Responsive placement; scroll polyline each frame; cleanup.

### `Phase1Awakening` — class

#### `constructor(scene)`

- **Purpose:** Draw split zones, reserve bars, gauge, flatline ECG, stroke input.
- **Returns:** Phase controller owned by scene.

#### `layout()`

- **Purpose:** Recompute zone graphics and HUD positions on resize.

#### `update(dt)`

- **Purpose:** Advance stroke charge, gauge bias preview, ECG flatline animation.

#### `destroy()`

- **Purpose:** Tear down stroke input, gauge, ECG, graphics.

**Private `onThreshold(bias)`:** Freeze input → brief nerve-fiber FX → `scene.enterPhase2(bias)`.

### `MoleculePool` — class

#### `constructor(scene, parent, capacity?)`

- **Purpose:** Preallocate inactive circle sprites for molecules.

#### `spawn(kind, x, y, vx?, vy?)`

- **Purpose:** Activate a pool slot with kind-specific colour.
- **Returns:** `PooledMolecule | null` (null if pool exhausted).

#### `recycle(m)` / `destroy()`

- **Purpose:** Return slot to pool or tear down all sprites.

### `CleftSystem` — class

#### `constructor(scene, pool, onGaugeDelta)`

- **Purpose:** SA node band with M₂ and β₁ receptors; forwards bind deltas to gauge.

#### `layout(left, right, top, bottom)`

- **Purpose:** Place tissue rect and receptor hit circles.

#### `update(dt, gaugeValue)`

- **Purpose:** Drift cleft molecules, bind on overlap, neutralize ACh/NE pairs, homeostasis drift when idle.

#### `destroy()`

- **Purpose:** Remove cleft graphics.

### `ParasympatheticTerminal` — class

#### `constructor(scene, pool, onRelease, onEnzymeTap)`

- **Purpose:** P1 left terminal — drag ACh dots into vesicle, release at lower membrane, MAO tap zone.

#### `layout(left, right, top, bottom)`

- **Purpose:** Position vesicle, membrane band, enzyme hotspot, spawn free dots.

#### `destroy()`

- **Purpose:** Remove pointer handlers and graphics.

### `SympatheticTerminal` — class

#### `constructor(scene, pool, onRelease, onEnzymeTap)`

- **Purpose:** P2 right terminal — drag NE dots into vesicle, release at upper membrane, AChE tap zone.

#### `layout(left, right, top, bottom)` / `destroy()`

- **Purpose:** Mirror of parasympathetic terminal on the right half.

### `Phase2Duel` — class

#### `constructor(scene, initialBias, onEnd)`

- **Purpose:** Orchestrate gauge, ECG, HUD, pool, cleft, both terminals, 60s timer.
- **Returns:** Phase controller; calls `onEnd(outcome)` on timer or early win.

#### `layout()` / `update(dt)` / `destroy()`

- **Purpose:** Three-band layout; BPM from gauge; mood wash; sustain tracking for early win.

### `AutonomicHud` — class

#### `constructor(scene, parent)`

- **Purpose:** Timer, BPM readout, P1/P2 hint lines.

#### `layout(w, h, timeLeft)` / `setTimer(sec)` / `setBpm(bpm)` / `destroy()`

- **Purpose:** Responsive HUD placement and live updates.

### `AutonomicResultOverlay` — class

#### `constructor(scene, outcome, onPlayAgain, onMenu)`

- **Purpose:** End card via `computeResultLayout` — Bradycardia, Tachycardia, or Homeostasis copy.
- **Returns:** Overlay with Play Again / Menu buttons.

#### `destroy()`

- **Purpose:** Remove veil and card.

### `AutonomicArmWrestleScene` — class `Phaser.Scene`

#### `constructor()`

- **Purpose:** Register scene key `"autonomic-arm-wrestle"`.

#### `create()`

- **Purpose:** Back button, ESC handler, resize listeners, start Phase 1.

#### `update(time, delta)`

- **Purpose:** Delegate to active phase controller.

#### `enterPhase2(initialBias)` / `enterResult(outcome)`

- **Purpose:** Phase FSM transitions; tear down prior phase, construct next.

#### `shutdown()`

- **Purpose:** Remove listeners; destroy all phase objects.

**Private helpers:** `startPhase1`, `restart`, `goMenu`, `teardownPhases`, `scheduleResize`, `applyResize`.

---

## 5. Code Readability Rules

### Phaser / TypeScript (`web/`)

- Prefer descriptive names (`scrollOffset`, `cameraFollow`, `sourceHeatScale`).
- Keep simulation (`HeatField`) free of Phaser imports.
- Level content lives in JSON; code reads `LevelDef`.
- Comment non-obvious gesture / biology mapping at call sites.

### Godot prototype (`scripts/*.gd`)

Historical rules still apply in the archive: spelled-out identifiers and a comment above non-trivial lines. Prefer **not** extending Godot for new live features — extend [`web/`](web/) instead.

---

## 6. Responsive Layout (Issue #1)

### Status: **resolved on the live Phaser build**

GitHub Issue #1 (*Game Interface is Not Responsive to Screen Sizes*) is addressed in production by the Phaser level select, not by shipping the Godot export.

| Fix | Where |
|-----|--------|
| Fixed-height cards on phones | `LevelSelectScene` (`phone-scroll`, card height 132px) |
| Vertical list in portrait **and** short landscape | `min(w,h) < 520` → phone mode |
| Scroll when cards overflow | [`ScrollPanel`](web/src/ui/ScrollPanel.ts) — drag + wheel, viewport culling |
| Orientation changes | Debounced `rebuildLayout` + `orientationchange` |
| iOS white screen | **No Phaser geometry masks** (masks rendered as solid white on Safari) |

### Godot responsive helpers (kept as archive)

[`scripts/core/responsive_layout.gd`](scripts/core/responsive_layout.gd) and related menu/HUD GDScript changes remain on `develop_charlie` for the **prototype only**. They are **not** what players hit at the live URL. Prefer Phaser when closing Issue #1 against production.

### How to test (browser)

1. `cd web && npm install && npm run build` (or `./deploy.sh`).
2. Open [the live game](https://playtime.204.168.183.57.sslip.io/) (hard-refresh with `?v=` after deploy).
3. DevTools device mode:

| Profile | Expect |
|---------|--------|
| iPhone SE portrait | All level cards visible/stacked; swipe if needed |
| iPhone landscape | Scrollable list; no stretched/clipped-only cards |
| ~1280px laptop | Row or stack without overflow |
| Rotate emulator | Layout rebuilds without blank/white panel |

---

## 7. Development Workflow

### Production (Phaser) — preferred

```bash
cd /home/cle1g21/Science-Festival-Game/web
npm install
npm run dev          # http://localhost:5173
npm run build        # → web/dist/

# From repo root: build + deploy to VPS (default target is Phaser)
cd /home/cle1g21/Science-Festival-Game
./deploy.sh
```

Requires SSH to `root@204.168.183.57` **or** jump host `juri@51.77.146.49`.

**Live:** [https://playtime.204.168.183.57.sslip.io/](https://playtime.204.168.183.57.sslip.io/)

### Godot prototype (optional)

```bash
./scripts/setup_godot.sh   # once
./scripts/build.sh         # → build/
PLAYTIME_TARGET=godot ./deploy.sh   # only if you intentionally want the prototype live
```

---

## 8. Godot Prototype Archive

The repo root Godot 4.5 project is the **earlier prototype** (Norse onboarding with zone/channel heat, locked Ice Age card in GDScript menus). It is useful for history and IridisX headless exports, but **live festival play uses Phaser**.

| Area | Path |
|------|------|
| Project | [`project.godot`](project.godot) |
| Scripts | [`scripts/`](scripts/) (`main.gd`, `norse_onboarding.gd`, `heat_simulation.gd`, …) |
| Scenes | [`scenes/`](scenes/) |
| Spec | [`docs/tech-spec-v1-norse-onboarding.md`](docs/tech-spec-v1-norse-onboarding.md) |

Signal flow (prototype): Start Menu → Level Select → Narrative → Norse only. Heat model is discrete zones/channels (`Zone`, `Channel`, `HeatSimulation`, `WinDetector`), not the Phaser grid `HeatField`.

---

## License and Credits

Built for the University of Southampton Science Festival.  
Production runtime: [Phaser](https://phaser.io/) (MIT). Prototype engine: [Godot](https://godotengine.org/) (MIT).
