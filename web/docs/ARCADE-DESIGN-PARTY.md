# ARCADE DESIGN PARTY — classic mini-games for the Playtime site

- **Doc ID:** arcade-design-party-20260831
- **Date:** 2026-08-31
- **Mode:** simulated panel — **all five personas are STUBS** (single-agent facilitation;
  see §8 transparency note). No persona "verified" anything.
- **STATUS:** PROPOSED — implementation of the first game follows in the same session
  (mission-approved); human-gated decisions are parked as OQ-1…OQ-5 with defaults.
- **Facilitator:** Hermes Agent (Playtime session 9)
- **Brief source paths:** user steer 2026-08-31 (arcade scope correction + mission);
  `/home/juri/sci-game-live/HANDOFF.md` (SESSION 8 standing decisions);
  `/home/juri/sci-game-live/NOTES.md` (engine ground truth).

## 1. Citation convention

- `[recon-260831]` — verified on disk this session; evidence column in §3 asset ledger.
- `[v4ref]` — `/home/juri/arcade-games` scaffold (Phaser 4). Demoted to REFERENCE by the
  brief: mine its menu/harness patterns, its v4 API calls do not transfer to 3.90.
- `[skill]` — playtime-game skill conventions (deploy→verify loop, harness battery, frozen
  state-manipulation convention).
- `[handoff]` — `sci-game-live/HANDOFF.md`.
- `[party-fallback]` — persona domain prior beyond cited project evidence.

## 2. Roster

| name | role | mode |
|---|---|---|
| Marlo Vega | classic-arcade designer (arcade-floor time) | STUB |
| June Okafor | UX / accessibility (touch-first, festival tablets) | STUB |
| Priya Raman | senior Phaser engineer (3.90, this codebase) | STUB |
| Dev Kowalski | skeptical playtester (festival passer-by) | STUB |
| Rosa Lindqvist | learning-science voice (engagement, audience dynamics) | STUB |

## 3. Asset ledger (all rows verified 2026-08-31 by the facilitator)

| # | fact | evidence (this session) |
|---|---|---|
| 1 | Repo `/home/juri/sci-game`, branch **JLW @ 867463b**, working tree clean | `git status`, `git log --oneline -5` |
| 2 | **origin/JLW = 867463b** — no newer commit landed; **no README.md at repo root** (only pre-existing `web/README.md`); the brief's "README commit via web UI" is not on origin | `git fetch origin`; `git ls-remote origin`; `ls` |
| 3 | `git pull --ff-only origin JLW` → "Already up to date" | terminal output |
| 4 | Live site = **v20260830080612** (matches 867463b's deploy) | `curl -fsS https://playtime.204.168.183.57.sslip.io/version.txt`; [handoff] SESSION 7 |
| 5 | 4 heat-sim levels, data-driven JSON: ice_age, norse, mast_cell, two_keys; registry `web/src/levels/index.ts` sorted by `order` | `ls web/src/levels`; read `index.ts` |
| 6 | `LevelSelectScene.ts` (412 lines): 3 layout modes — desktop-row (needs `w ≥ count·220 + (count−1)·36`; ≥6 cards → 180 px compact row), desktop-stack (scrollable via ScrollPanel since eaf953e), phone-scroll (`min(w,h) < 520`, full-width 132 px cards in ScrollPanel); whole-card click in desktop modes; 80 ms debounced resize; cards carry order chip (0N), name, `win.biologyLine` blurb, PLAY button | read `LevelSelectScene.ts` lines 28–35, 76–172, 304–407 |
| 7 | `window.__PHASER_GAME` test hook exposed at `web/src/main.ts:40` | read `main.ts` |
| 8 | Arcade scaffold [v4ref]: `src/shell/registry.ts` — `GameDef {id,name,blurb,accent,scene,snapshot?}`; `MenuScene` — responsive card grid (1 col <640 px, else up to 3), whole-card click, accent band + number chip; `games/placeholder.ts` — scene `game:placeholder`, tap counter, ESC→menu, `snapshot` state; `verify/smoke.mjs` — 8 checks (boot, menu active, ≥1 card, card tap → game scene active, tap count, ESC back, 0 page errors) under playwright-core + swiftshader + `TARGET_URL`/`SHOTDIR` env convention; Phaser 4 | `cat` of registry.ts, types.ts, main.ts, placeholder.ts, smoke.mjs |
| 9 | L5 "The Long Chase": **designed, NOT implemented**; complete plan (fibre geometry, strings, JSON draft, verify plan); dedicated-L5-session-only rule | read `PLAN-L5-LONG-CHASE.md` (320 lines); [handoff] SESSION 8 decision 5 |
| 10 | 29 official Phaser agent skills (v4-era, incl. v3-to-v4-migration) at `/home/juri/reference/phaser/skills/` — reference library, 3.90 wins on conflict | `ls` |
| 11 | `web/docs/` exists in the repo (contains `tech-spec-v1-norse-onboarding.md`) | `ls web/docs` |
| 12 | Canonical verify battery = **143 checks** (final 7, task-a 21, task-b 22, deploy-a 23, deploy-b 17, select-scroll 20, two-keys 33); harness convention: TARGET_URL/SHOTDIR env, `window.__PHASER_GAME` + `page.evaluate` reads, FROZEN state manipulation for win/fail pipelines; headless swiftshader ~30 fps (organic input-driven heat NOT reproducible — environment limitation) | [skill]; [handoff] SESSIONS 2/4/7 |
| 13 | Mission: 6 arcade games (Tetris, falling-objects bucket-catcher, piano tiles, match-3, Traffic Rush, Pac-Man); enjoyability + intuitive controls top priority; touch-first festival tablets; user lean: bucket-catcher, piano tiles first; one committed/deployed increment per game | user brief 2026-08-31 |

## 4. Round 1 — critiques of the current state

**Marlo (arcade designer).** The heat-sim levels are beautiful but they're ONE
game in four costumes: build heat, hold a band, don't overdo it. A festival
table needs rhythm change — 60–120 second dopamine loops with an instant
fail state you can see coming. That's what the six classics give us. But
"arcade-classic-inspired" is doing work in that brief: Tetris and Pac-Man are
trademarks in the public mind, so we re-skin and re-mechanic, never re-name
verbatim — "Sugar Blocks" not "Candy Crush" (the brief itself says Candy
Crush, which is literally another company's product name), "Signal Runner"
not "Pac-Man". The floor rule of the old arcades: if a kid can't do it after
one failed attempt, the controls are wrong, not the kid.

**June (UX/accessibility).** Three non-negotiables for festival tablets.
(1) Touch-first only — no keyboard-required paths; keyboard may exist as a
convenience (ESC back, arrows for Tetris), but every game must be completable
with fingers. (2) Hit targets ≥ 44 px, ideally ≥ 60 px — the existing site
already does whole-card clicks, arcade games should do the same: tap zones,
not tiny buttons. (3) No colour-only signalling — match-3 and piano tiles
that rely on red/green will fail ~8% of visitors; pair colour with shape/icon
or motion cues. Also: motion. Pac-Man-style chase at 60 fps with screen shake
is fine; full-screen flashes are not (photosensitivity), and we have zero
audio in the whole site [recon: NOTES.md §5.3 — "no sound design"], so
sound-as-signal is off the table entirely: every state change needs a visual
readout that a deaf visitor can follow. [party-fallback]

**Priya (senior Phaser 3.90 engineer).** Scope reality, from disk truth. The
site is ONE Phaser game: one config, one scene array (`main.ts:32`
`scene: [Boot, LevelSelect, Level]`), Scale.RESIZE, procedural art only,
no assets. An arcade game is a SCENE, not a project — so the integration is:
new scene classes + a registry + a menu path + `main.ts` scene array. That's
it. The v4 scaffold [v4ref] proves the shape: `GameDef {id,name,blurb,
accent,scene,snapshot?}` — I'd lift that pattern verbatim (it's engine-neutral)
but its v4 API calls don't transfer: `scene.isActive()` here is a scene method
(`this.scene.isActive("key")`), `container.list` and `__PHASER_GAME` already
work as-is [recon 7, 12]. One engineering landmine: the level-select harness
batteries (verify-deploy-b, verify-select-scroll, verify-two-keys) hardcode
card counts and layout breakpoints — adding a 5th card to the main select
TOUCHES those harnesses; that's the argument for NOT dumping six cards on the
main menu.

**Dev (skeptical playtester).** I'm the festival visitor with 90 seconds and a
nephew's finger on the screen. First problem I see: "Traffic Rush (train
routing)" and "Tetris" have the WORST touch stories of the six. Rotating
tetrominoes with a thumb is fine (tap left half = rotate… actually no, the
standard is: swipe left/right to move, tap to rotate, swipe down to drop) but
it's four gestures before anything fun happens. Train routing wants
drag-to-connect — doable, but "figure out the routing logic" is a thinking
game, not a feel game. Pac-Man wants 4-way d-pad movement — doable with
swipe-in-a-direction, and it's the one I'd actually queue for. My gut order:
bucket-catcher and piano tiles first — they're ONE gesture each, zero
tutorial, and both have a visible score climbing. Put anything harder
behind them.

**Rosa (learning science).** Keep the science-festival identity intact — this
is not a random slot-machine; it's "cell signalling, but playable in other
shapes". Two mechanisms matter for a 10–14 year-old festival crowd:
(a) **variable-ratio reinforcement** — the near-miss (bucket misses by a
pixel) is what makes players replay; every arcade game needs a near-miss that
is legible as "almost", so close-call feedback (swoosh, score bonus text)
matters more than high scores. (b) **self-efficacy ramp** — first 20 seconds
must contain a small success (first catch, first perfect-tile streak). A
Tetris board that starts empty and ends in game-over-within-90-seconds
teaches helplessness to a festival crowd that has never played. Every game
needs a 30-second "I can do this" window before difficulty bites.

## 5. Round 2 — menu architecture (the key design question)

**The question:** arcade games are full scenes, not heat-sim levels, so new
JSON levels won't fit. How do they integrate with the existing level-select?
Three candidates on the table:

**Option A — six more cards on the main level-select.**
- *Priya:* dead on arrival. The select's desktop-row mode fits 5×220 px cards
  (988 px, the verified 4-card behaviour [recon 6]) — 6 cards already forces
  the 180-px compact row; 10 cards would be a wall of shrunk icons on the
  festival's 1280×800 tablets. Worse: the main select's harness batteries
  hardcode counts and breakpoints [recon 12] — every arcade increment re-edits
  three suites. REJECTED.
- *June:* and thematically the site's main screen is a SCIENTIFIC story —
  "an invitation to feel how cells talk", 4 levels in an arc. Arcade games
  don't belong in the middle of that narrative. REJECTED.

**Option B — a single "The Arcade" card (order 5) on the main select →
ArcadeSelectScene submenu (grid of game cards).**
- *Priya:* my pick. The main select stays 5 cards: the four narrative levels
  + one visually distinct arcade card (different frame style: gold border,
  pixel-font-ish number chip "A1" instead of "05", marquee-style accent).
  Arcade games grow as cards in the submenu only — the harness blast radius
  of adding games #2..#6 is the NEW arcade suite alone, never the existing
  battery. The registry lives at `web/src/arcade/registry.ts` as a separate
  array from `LEVELS` — games are scenes, not LevelDefs, so no type pollution.
- *June:* agree with one condition: the arcade card must be OBVIOUSLY a
  different kind of thing (it's not "level 5"), with a blurb like "classic
  arcade loops — catch, tap, match, chase". One extra tap to reach any game,
  which is fine: festivals are about queuing, not speed. On tablets
  (landscape 1280×800) the submenu is a 2-column card grid; portrait/phone
  falls back to the existing ScrollPanel pattern — reuse, don't reinvent.
- *Marlo:* one arcade-floor objection: real arcades don't hide the machines
  behind a ticket. Mitigation: the arcade card gets the biggest visual
  presence on the main screen (it's the last card = most discoverable
  position in row and stack modes anyway) and a distinct animated marquee
  shimmer in the preview band.
- *Dev:* as long as the submenu cards are whole-card-tappable and the back
  button is a big "← Levels" in the top-left (same position as in-level
  "← Menu" [recon: NOTES.md §3]) I'm fine. One extra tap is nothing.

**Option C — a `type: "level" | "arcade"` field on the registry (LevelDef
union) and filter the main select to levels only, arcades in a section
below/after.**
- *Priya:* rejected. Forces every arcade game through the LevelDef schema
  (palette, sim, win/band, hints) — most fields are meaningless for a
  bucket-catcher — and couples the two content kinds in one data structure.
  The v4 scaffold already showed the cleaner split: a parallel
  `GameDef` registry [v4ref]. The only thing C buys — "one registry to
  audit" — is an illusion; they're different shapes.
- *Rosa:* C's "one row, two sections" is actually the best DISCOVERY story
  (children see both worlds), but that's a UI problem, not a data problem —
  Option B with a section divider INSIDE the arcade submenu ("reaction" /
  "puzzle" / "chase" rows as games accumulate) delivers the same browse
  value without schema coupling.

**CONVERGENCE (recorded, unanimous):** **Option B.** Main select = 4 level
cards + 1 distinct "The Arcade" card (order 5, always-unlocked). New
`ArcadeSelectScene` ("arcade-select"): header "THE ARCADE" + "← Levels" back
button, game-card grid (2 cols ≥640 px width, 1 col below — phone uses the
existing ScrollPanel when content overflows). New parallel registry
`web/src/arcade/registry.ts` with `GameDef` lifted from [v4ref] (id, name,
blurb, accent, scene, `snapshot?`). `main.ts` scene array appends
`ArcadeSelectScene` + arcade game scenes. `cardPreview.ts` gains ONE new
motif (the arcade card's marquee); each arcade game gets a motif in the
arcade card renderer instead (arcade cards use accent band + number, same as
the [v4ref] MenuScene cards — simpler, and the v4 scaffold's approach is
battle-tested there).

**Decision D-1 (menu architecture): Option B — Arcade card + submenu +
parallel registry. [party-converged, recorded for user confirmation]**

**Decision D-2 (theming/names):** re-skin, don't clone. Working names
(festival-safe, signalling-adjacent where it reads naturally):

| brief name | working name | skin |
|---|---|---|
| falling-objects bucket-catcher | **Drop Catch** | falling cells/molecules into a "receptor bucket" |
| piano tiles (reaction) | **Tap the Pulse** | black tiles = signal pulses down the board |
| Candy Crush (match-3) | **Sugar Match** | candy = glucose/cell shapes, colour+shape coded |
| Tetris | **Signal Blocks** | tetrominoes = signal fragments |
| Traffic Rush (train routing) | **Line Manager** | routes = signalling pathways, trains = signals |
| Pac-Man (maze chase) | **Chase!** | dot-maze = tissue, chaser = rogue signal |

Names are OQ-1 (human decision; these are defaults, easy to rename — they
only appear in the registry).

## 6. Round 3 — build order (my lean: bucket-catcher, piano tiles — panel argues)

**Marlo:** I actually push back on piano tiles at #2. The bucket-catcher is
the best cold-start game in the set — one finger, horizontal only, instant
read. But piano tiles' fun IS the reaction speed, and reaction games on
festival tablets with 30–60 fps touch latency play flatter than they should.
Give the bucket-catcher the #1 slot, then go to **Sugar Match** (match-3) —
it's the most "session-long" game (3–5 min play, replayable, the one
festival visitors will ask to play again) and it's where the science-skin
(colour+shape glucose tiles) pays off most.

**Dev:** I disagree with Marlo on #3, but I agree on #1 and #2 — and here's
why I'd take piano tiles at #2 over match-3: match-3 needs the player to
learn a rule (swap → 3 in a row → cascade) BEFORE any fun happens; piano
tiles need NO rule. A visitor who's never played match-3 stands there
thinking. A visitor who's never played piano tiles wins in 8 seconds because
"tap the falling block" is pre-trained by every music game ever. Match-3 is
a better GAME; piano tiles is a better 90-SECOND FLOOR GAME. For a festival
floor, floor wins.

**Rosa:** Dev is right on the self-efficacy ramp: piano tiles' first 20
seconds are structurally a success (tiles are spaced for a 60% success rate
before speed rises). Match-3's ramp is steeper (the swap rule + cascade
timing is two things to learn). BUT match-3 has the best NEAR-MISS design
in the set (a 4th tile that almost matched) and the best replay loop. So:
1 bucket, 2 piano, 3 match — the two of you converged on the user's lean
after all. Remaining three, in order of implementation cost × risk:
**Tetris** next (deterministic grid, easy to verify headless, the hardest
touch design of the three = build it early while we have slack), then
**Chase!** (Pac-Man: AI is the risk — a simple chase/flee state machine, no
pathfinding beyond local bias, keeps it fun without god-mode ghosts), then
**Line Manager** last (routing logic is the least "feel", the most "think";
it needs the most playtesting and the site will be most stable by then).

**Priya (cost/risk confirmation from disk truth):** all six are single scenes
+ procedural art; the engine gaps that actually differ:
- Drop Catch: timers + containers + pointer — trivial (placeholder.ts proves
  the pattern [v4ref]).
- Tap the Pulse: timers + 4-lane pointer — trivial.
- Sugar Match: swap animation + cascade resolve loop — medium; cascade
  timing must be frame-rate independent (headless 30 fps must behave like
  60).
- Signal Blocks: gravity step timer + line-clear — medium; collision is
  pure grid math (easiest to verify headless: read the grid array).
- Chase!: grid BFS-free ghost AI (local-bias chase, random on collision) —
  medium-high; must be deterministic enough to verify (seedable RNG via
  `Phaser.Math.RND` seeded per run).
- Line Manager: drag-connect on a small graph — medium-high; "is the route
  valid" is pure data, easy to verify.
**CONVERGENCE:** build order **1 Drop Catch → 2 Tap the Pulse → 3 Sugar
Match → 4 Signal Blocks → 5 Chase! → 6 Line Manager.** (User lean confirmed
for #1–2; panel justified #3–6.)

**Decision D-3 (build order): as above; one committed/deployed/verified
increment per game per the standing loop [skill]. L5 The Long Chase stays
parked for its own dedicated session — arcade work does not touch level
code, so no collision. [recorded; user's #1–2 lean upheld]**

## 7. Proposed spec — Game #1 "Drop Catch" (ready to implement)

**Concept (converged):** objects (molecules/cells — small procedural
circles with varied hues + a "bad" spiky type) fall from the top of a
fixed-width play column. The player drags a "receptor" bucket horizontally
along the bottom (finger x → bucket x, direct 1:1, no inertia). Catch the
good, avoid the bad. Life system: 3 misses = round over (classic, instant,
visible). Score = catches × (1 + streak/5); near-miss feedback: a catch
within 20 px of the bucket rim shows a "+2 edge!" bonus text (Rosa's
near-miss legibility rule). No timer — endless with rising fall speed and
spawn rate (speed = f(catches)); round over when lives run out. The 30-second
self-efficacy window: first 10 spawns are slow + wide spacing + zero bad
objects (Rosa: small success in first 20 s).

**Controls (touch-first, June's rules):**
- Drag anywhere on the canvas → bucket follows pointer x (clamped to
  column). One finger, whole canvas = hit area (≥44 px trivially).
- Tap (no drag) also nudges bucket toward tap x (lerp) — so "tap to move"
  players work identically.
- Keyboard convenience only: ←/→ move (5 px/frame), ESC → arcade select.
- No colour-only signalling: good = smooth circles (hues vary), bad =
  SPIKY star shapes (shape encodes type, colour is redundant cue).

**Scene structure (Priya, 3.90 conventions):**
- `web/src/arcade/types.ts` — `GameDef` (id, name, blurb, accent, scene,
  `snapshot?`) lifted from [v4ref], 3.90-typed.
- `web/src/arcade/registry.ts` — `GAMES: GameDef[]` (starts with Drop Catch
  only; each later game appends).
- `web/src/arcade/ArcadeSelectScene.ts` — scene key `arcade-select`;
  "THE ARCADE" header, "← Levels" back button (top-left, same slot as
  in-level "← Menu"), card grid: 2 cols when w ≥ 640, 1 col below; cards =
  accent band + name + blurb, whole-card tap → `scene.start(sceneKey,
  { gameId })`; 80 ms debounced resize rebuild (LevelSelectScene pattern).
- `web/src/arcade/games/DropCatchScene.ts` — scene key `arcade:drop-catch`;
  public state fields for the harness: `score, lives, catches, badHits,
  streak, state ("ready"|"running"|"over")`; `snapshot()` returns
  `{score, lives, catches, streak, state}`.
- `web/src/scenes/LevelSelectScene.ts` — ONE change: after the `LEVELS`
  cards, append the Arcade card (order chip "A1", name "The Arcade",
  marquee motif, distinct gold border, whole-card click →
  `scene.start("arcade-select")`). Layout math unchanged (count stays
  LEVELS.length + 1 = 5).
- `web/src/visuals/cardPreview.ts` — `case "arcade":` motif (marquee: dark
  band + bulb dots + "GAME" text) driven by the level's palette (the arcade
  card uses a pseudo-`LevelDef`? NO — cardPreview takes `LevelDef`; instead
  the arcade card is built inline in LevelSelectScene, and cardPreview is
  untouched. Revises D-1's "cardPreview motif" line: **arcade card art is
  in-scene graphics, cardPreview stays level-only.**)
- `web/src/main.ts` — scene array += ArcadeSelectScene + arcade game scenes
  (via `...GAMES.map(g => g.scene)`).

**Verification (increment 1, per [skill] loop):**
- New harness `play/verify-arcade.mjs` (TARGET_URL/SHOTDIR env, Playwright
  patterns from the existing battery):
  1. main select: 5 cards, 5th = "The Arcade" (distinct frame), tap →
     `scene.isActive("arcade-select")`.
  2. arcade select: "THE ARCADE" header + ≥1 card; back button →
     level-select active.
  3. launch Drop Catch: `arcade:drop-catch` active; snapshot state
     "running"; 0 page errors.
  4. pointer drag across canvas → bucket x follows (read bucket.x via
     evaluate, two drag positions, monotonic).
  5. scripted catches: harness state manipulation (place objects above
     bucket, advance) → `catches`/`score` increase; bad object in bucket →
     `lives` decrease; lives 0 → state "over" + round-over panel (frozen
     convention: manipulate scene state via evaluate — these arcade games
     DON'T have the heat-decay problem, so some organic checks ARE possible
     at 30 fps: objects fall on real time, a held bucket catches them; use
     both, record which is which).
  6. ESC back → arcade-select.
  7. Regression battery (existing 143) re-run locally + live — the
     5th-card change touches verify-deploy-b / verify-select-scroll /
     verify-two-keys card-count expectations; update them count-aware
     (5th card = "The Arcade") the same way the 4th-card update was done.
- Deploy `PLAYTIME_REMOTE=playtime-vps ./deploy.sh`, live integrity
  (version.txt + bundle sha256 local==remote), live suite.

## 8. Round 4 — critique of the proposed spec (fold-backs accepted into §7)

- **June:** the 1:1 finger-follow has the classic finger-occlusion problem.
  Verdict after arguing it: acceptable for a bottom-row catcher (objects are
  visible until contact; the finger sits above the catch line), bucket 96×28
  px, catch line at the bucket's TOP edge — [accepted as R2]. Bigger issue:
  the scene starts "running" the instant the card is tapped, so a festival
  visitor's first stray tap spawns falling objects at their face. **R1:**
  explicit `ready` state — the round only starts on the first tap inside the
  play area, and the ready overlay IS the 3-line tutorial ("Drag the
  receptor · Catch the round ones · Avoid the spiky ones").
- **Rosa:** clarify the life economy — it must be symmetrical and legible:
  missing a GOOD object = −1 life + streak reset; catching a BAD object =
  −1 life + streak reset. 3 lives. No second penalty for the bad catch
  beyond the life — festival players should never feel "double punished".
  [accepted, R3 part of the spawn table]
- **Dev:** endless speed-ramp needs a ceiling or the round collapses into
  "wall of dots". **R3 (numbers, final):** fall speed
  `min(120 + 2.2·catches, 420)` px/s; spawn interval
  `max(1.6 − 0.03·catches, 0.7)` s; first 10 spawns: 90 px/s, 1.8 s apart,
  zero bad objects (the self-efficacy window); then bad probability
  `min(0.15 + 0.005·catches, 0.35)`. Playable at 90 s and at 5 min.
- **Priya:** two implementation corrections. (a) §7's score formula
  "catches × (1 + streak/5)" is ambiguous — **R4:** +10 per good catch,
  +5 per 5-catch streak milestone, +2 edge catch (rim distance < 20 px)
  with floating "+2 edge!" text; streak resets on any miss/bad catch.
  (b) Verification without polluting the scene with test hooks: public
  state fields + a public `objects` array are enough — the harness spawns by
  pushing an object via `page.evaluate` and lets the REAL update loop fall
  it (organic, works at 30 fps; the heat-decay swamp does not apply to
  arcade scenes); game-over is reached via `lives = 1` + one bad spawn.
  [accepted, R5]
- **June (again):** round-over panel must match the site's result language
  (veil + card + two buttons: "Play Again" / "Arcade") — no new visual
  dialect. [accepted, R6]
- **Consistency note:** §7's "cardPreview gains an arcade motif" line is
  SUPERSEDED by R7 (stated in §7): `cardPreview.ts` stays level-only; the
  arcade card's marquee art is drawn inline in LevelSelectScene.

## 9. Open questions (human decisions — defaults in bold)

- **OQ-1 — game names.** Defaults: Drop Catch / Tap the Pulse / Sugar Match
  / Signal Blocks / Line Manager / Chase! (D-2 table). Renames are registry-
  only, any time. *Owner: user, before/after any game ships — defaults used
  in implementation unless told otherwise.*
- **OQ-2 — arcade card identity.** Default: gold border + marquee band +
  "A1" chip + blurb "classic arcade loops — catch, tap, match, chase"
  (Round 2). *Owner: user; visual sign-off from a screenshot after
  increment 1 deploys.*
- **OQ-3 — life system.** Default: 3 lives, no timer, endless speed-ramp
  with ceiling (R3). Alternative: 60-second timer rounds (more "arcade
  high-score" energy). *Owner: user.*
- **OQ-4 — persistence.** Default: NO high-score storage (site currently has
  zero persistence [handoff: BRAINSTORM Q4]; localStorage adds a privacy +
  kiosk-reset question). *Owner: user.*
- **OQ-5 — the demoted v4 scaffold.** Confirmed read-only; patterns mined
  (GameDef, MenuScene, smoke.mjs); NOT deleted (seed of the post-festival
  migration) [steer-260831]. *Owner: user (decision already made — recorded
  for the paper trail).*

## 10. Wrap-up

**Converged:** D-1 menu architecture (Option B: arcade card + submenu +
parallel registry), D-2 re-skin names (default, OQ-1), D-3 build order
(Drop Catch → Tap the Pulse → Sugar Match → Signal Blocks → Chase! →
Line Manager), §7 spec + R1–R7 fold-backs.
**Human-only:** OQ-1…OQ-4 (all have working defaults; implementation
proceeds on defaults, flagged at report time).
**Next actions (this session):** (1) commit this doc (increment 0); (2)
implement Drop Catch per §7 as increment 1 — build → local Playwright
verify → commit+push → deploy → live verify → HANDOFF append.
**Persona transparency note:** all five personas (Marlo, June, Priya, Dev,
Rosa) are STUBS simulated by a single agent in one session; no independent
agents, no external verification. Every factual claim about disk state
cites a command run in this session (§3 ledger); design judgments marked
[party-fallback] are domain priors, not verified findings.

— END OF PARTY DOC —
