---
title: 'Technical Specification — Norse Onboarding Level + Start Menu'
version: '1.0'
date: '2026-03-20'
engine: 'Godot 4.x'
renderer: 'Compatibility (WebGL 2)'
export: 'HTML5 / Web'
status: 'ready-for-implementation'
---

# Technical Specification: Norse Onboarding Level + Start Menu

## 1. Project Setup

### 1.1 Godot Configuration
- **Engine:** Godot 4.x (latest stable)
- **Renderer:** Compatibility (OpenGL ES 3.0 / WebGL 2) — required for web export
- **Reference Resolution:** 1920 x 1080
- **Orientation:** Landscape-first
- **Stretch Mode:** `canvas_items`
- **Stretch Aspect:** `expand`
- **Export Target:** HTML5 (WebAssembly)

### 1.2 Project Structure
```
project.godot
├── scenes/
│   ├── main.tscn                    # Root scene, manages scene transitions
│   ├── start_menu/
│   │   └── start_menu.tscn          # Skin selection menu
│   ├── narrative/
│   │   └── narrative_interlude.tscn # Pre-level story card
│   └── levels/
│       └── norse_onboarding.tscn    # Norse onboarding level
├── scripts/
│   ├── main.gd                      # Scene manager, global state
│   ├── start_menu/
│   │   └── start_menu.gd
│   ├── narrative/
│   │   └── narrative_interlude.gd
│   ├── core/
│   │   ├── heat_simulation.gd       # Zone-based diffusion engine
│   │   ├── input_handler.gd         # Touch gesture recognition
│   │   ├── zone.gd                  # Zone data class (heat state, shape)
│   │   ├── channel.gd               # Channel data class (conductivity)
│   │   └── win_detector.gd          # Win/fail condition logic
│   └── levels/
│       └── norse_onboarding.gd      # Level-specific orchestration
├── assets/
│   ├── art/
│   │   ├── menu/                    # Start menu backgrounds, skin previews
│   │   ├── norse/                   # Norse level art (cavern, runes, aurora)
│   │   └── creature/               # Creature layers (silhouette, biosystems)
│   ├── audio/
│   │   ├── ambient/                 # Norse drone, wind, cave echo
│   │   ├── sfx/                     # Fire, ice, heartbeat, damage, triumph
│   │   └── music/                   # (reserved for future)
│   └── particles/                   # Fire embers, steam, ice crystals
└── resources/
    └── level_data/
        └── norse_onboarding.tres    # Zone topology, channel connections, constants
```

---

## 2. Scene Architecture

### 2.1 Main Scene (`main.tscn`)
```
Main (Node)
├── SceneManager (script: main.gd)
└── CurrentScene (placeholder — swaps between menu, narrative, level)
```

**Responsibilities:**
- Transition between StartMenu → NarrativeInterlude → GameLevel
- Hold minimal global state (selected skin, level progress)
- Simple fade transition between scenes

### 2.2 Start Menu (`start_menu.tscn`)
```
StartMenu (Control)
├── Background (TextureRect — full-screen atmospheric art)
├── Title (Label — game title, styled)
├── SkinSelector (HBoxContainer)
│   ├── NorseSkinCard (TextureButton — active, glowing border)
│   │   ├── PreviewArt (TextureRect)
│   │   └── SkinLabel (Label — "Fire Meets Ice")
│   ├── PlayfulSkinCard (TextureButton — locked, dimmed)
│   │   ├── PreviewArt (TextureRect)
│   │   ├── SkinLabel (Label — "Ice Age")
│   │   └── ComingSoon (Label — "Coming Soon")
│   └── EnchantedSkinCard (TextureButton — locked, dimmed)
│       ├── PreviewArt (TextureRect)
│       ├── SkinLabel (Label — "Enchanted")
│       └── ComingSoon (Label — "Coming Soon")
└── PlayButton (Button — "Enter" — visible after Norse selected)
```

**Behavior:**
- Norse card is selectable, glows on hover/touch
- Locked cards show preview art but are dimmed with "Coming Soon" overlay
- Selecting Norse → PlayButton appears/activates
- PlayButton → transition to NarrativeInterlude
- Architecture: SkinCard is a reusable component — adding new skins = adding new card instances with different textures

### 2.3 Narrative Interlude (`narrative_interlude.tscn`)
```
NarrativeInterlude (Control)
├── Background (TextureRect — illustrated Niflheim scene)
├── TextPanel (PanelContainer — semi-transparent, bottom third)
│   └── NarrativeText (RichTextLabel)
└── BeginButton (Button — "Awaken" or "Begin")
```

**Norse Text (v1):**
> *In the frozen heart of Niflheim, where no warmth has reached for an age, something stirs beneath the ice. The primordial fire of Muspelheim answers your call. Guide it carefully — too little and the ice reclaims its prize. Too much and you may destroy what you seek to save.*

**Behavior:**
- Text appears with a gentle fade-in (no animation, just alpha tween)
- BeginButton → transition to norse_onboarding level

### 2.4 Game Level (`norse_onboarding.tscn`)
```
NorseOnboarding (Node2D)
├── Background (ParallaxBackground)
│   ├── CavernLayer (Sprite2D — dark rock cavern)
│   └── AuroraLayer (Sprite2D — subtle northern lights shimmer, slow UV scroll)
├── FireSource (Node2D)
│   ├── FireSprite (AnimatedSprite2D — crackling bonfire)
│   ├── EmberParticles (GPUParticles2D — embers rising)
│   └── FireGlow (PointLight2D — warm orange, pulses gently)
├── IceField (Node2D)
│   ├── IceZone1 (Polygon2D — near fire, thin ice)
│   ├── IceZone2 (Polygon2D — junction zone)
│   ├── IceZone3 (Polygon2D — thick ice, left path)
│   ├── IceZone4 (Polygon2D — thin ice, right path — risky)
│   ├── IceZone5 (Polygon2D — deep ice, near creature)
│   ├── ChannelCracks (Line2D array — visual cracks between zones)
│   └── SteamParticles (GPUParticles2D — activated on zone warming)
├── Creature (Node2D)
│   ├── Silhouette (Sprite2D — dark outline, always visible through ice)
│   ├── HeartGlow (PointLight2D — pulses at heartbeat tempo)
│   ├── BioVeins (Sprite2D — bioluminescent vein overlay, alpha tied to heat)
│   ├── Eyes (Sprite2D — closed initially, opens at heat 60+)
│   └── DamageOverlay (Sprite2D — red cracks, visible at heat 70+)
├── HeatSimulation (Node — script: heat_simulation.gd)
├── InputHandler (Node — script: input_handler.gd)
├── WinDetector (Node — script: win_detector.gd)
├── AudioManager (Node)
│   ├── AmbientPlayer (AudioStreamPlayer — Norse drone loop)
│   ├── FireSFX (AudioStreamPlayer — crackle, layered)
│   ├── IceSFX (AudioStreamPlayer — crack sounds)
│   ├── HeartbeatSFX (AudioStreamPlayer — thump, variable tempo)
│   ├── DamageSFX (AudioStreamPlayer — sizzle)
│   └── TriumphSFX (AudioStreamPlayer — swell + cry)
└── PostRescueUI (Control — hidden until win)
    ├── TriumphOverlay (ColorRect — brief golden flash)
    ├── RevealCard (PanelContainer)
    │   ├── RevealText (RichTextLabel)
    │   ├── ContinueButton (Button — "Level 2" — disabled)
    │   └── PlayAgainButton (Button — "Play Again")
    └── StatsPanel (VBoxContainer — optional: time, efficiency, damage)
```

---

## 3. Core Systems

### 3.1 Heat Simulation (`heat_simulation.gd`)

**Data Structures:**
```gdscript
class Zone:
    var id: int
    var heat: float = 0.0          # 0-100
    var polygon: Polygon2D         # visual representation
    var conductivity_modifier: float = 1.0  # thick ice = 0.5, thin ice = 1.5
    var is_source: bool = false
    var is_target: bool = false

class Channel:
    var zone_a: int                # zone id
    var zone_b: int                # zone id
    var conductivity: float        # 0.0-1.0 (wide crack = high, thin = low)
    var visual: Line2D             # crack visual
```

**Simulation Loop (runs every tick):**
```
TICK_INTERVAL = 0.1 seconds

Each tick:
  1. DISSIPATION
     For each zone (except source):
       zone.heat -= zone.heat * DISSIPATION_RATE
       DISSIPATION_RATE = 0.02

  2. DIFFUSION
     For each channel:
       delta = zone_a.heat - zone_b.heat
       flow = delta * channel.conductivity * FLOW_RATE * delta_time
       FLOW_RATE = 0.15
       zone_a.heat -= flow
       zone_b.heat += flow

  3. CLAMP
     All zones: clamp(heat, 0.0, 100.0)

  4. EMIT signal "heat_updated" with all zone states
```

**Tunable Constants (exported vars for in-editor adjustment):**

| Constant | Starting Value | Purpose |
|----------|---------------|---------|
| `TICK_INTERVAL` | 0.1s | Simulation speed |
| `DISSIPATION_RATE` | 0.02 | How fast heat fades per tick |
| `FLOW_RATE` | 0.15 | How fast heat transfers between zones |
| `TAP_HEAT` | 20.0 | Heat added on tap to source zone |
| `DRAG_HEAT` | 10.0 | Heat added per zone crossed during drag |
| `HOLD_HEAT` | 5.0 | Heat added per tick during sustained hold |
| `HOLD_THRESHOLD` | 0.4s | Duration before tap becomes hold |

### 3.2 Input Handler (`input_handler.gd`)

**Gesture Recognition:**
```
State machine with states:
  IDLE → TOUCH_DOWN → TAP | HOLD | DRAG

TOUCH_DOWN:
  Record touch position and time

  If touch moves > DRAG_THRESHOLD (20px):
    → DRAG state
    Track path, emit "drag_path" with array of positions

  If touch duration > HOLD_THRESHOLD (400ms) and hasn't moved:
    → HOLD state
    Emit "hold_start" with position
    Continue emitting "hold_tick" each frame until release

  If touch released < HOLD_THRESHOLD and hasn't moved:
    → TAP
    Emit "tap" with position

On release:
  If in HOLD → emit "hold_end"
  If in DRAG → emit "drag_end"
  → IDLE
```

**Implementation Note:** Godot's built-in `_unhandled_input(event)` with `InputEventScreenTouch` and `InputEventScreenDrag` handles most of the heavy lifting. Use these native events as the foundation rather than building from scratch. Consider the open-source "Godot Touch Input Manager" plugin to accelerate gesture detection if needed.

**Multi-touch Architecture:**
- Track up to 10 touch points via `InputEventScreenTouch.index`
- Level 1 uses only touch index 0
- Infrastructure ready for pinch/spread detection (level 2):
  - Two-point distance tracking
  - Pinch = distance decreasing, Spread = distance increasing

**Zone Hit Detection:**
- Each zone's `Polygon2D` has a corresponding `Area2D` with `CollisionPolygon2D`
- Input handler performs point-in-polygon test to determine which zone was touched
- Drag path snaps to nearest channel for visual feedback

### 3.3 Visual Feedback System

**Zone Rendering:**
Each zone's `Polygon2D` color updates based on heat value:

**Implementation:** Use a `Gradient` resource (`heat_gradient.tres`) sampled by normalized heat:
```gdscript
polygon.color = heat_gradient.sample(zone.heat / 100.0)
```
This allows color tweaking in the Godot editor without code changes.

| Heat Range | Gradient Stop | Visual Effect |
|-----------|--------------|---------------|
| 0-20 | Deep blue `#1a3a5c` → ice blue `#4a8ab5` | Frost particles, solid ice |
| 20-40 | Ice blue → white `#e8f0ff` | Frost fading, translucency increasing |
| 40-60 | White → warm amber `#f5c842` | Steam particles begin, ice cracking sounds |
| 60-70 | Warm amber → soft orange `#e88a30` | TARGET ZONE — golden glow, gentle pulse |
| 70-85 | Orange → hot red `#d44a20` | Warning pulse, heat shimmer effect |
| 85-100 | Bright red `#ff2020` | Damage particles, creature flinch |

**Channel (Crack) Rendering:**
- `Line2D` with width proportional to conductivity
- Color follows heat of hottest adjacent zone
- Heat flowing through channel → animated dashes / particle trail along line

**Fire Source:**
- Base animation: 4-frame crackling loop
- Responds to player input: tap → flare, hold → intensify, idle → gentle
- Ember particles increase with player interaction intensity

### 3.4 Creature Reveal System

**Layered reveal driven by creature zone (Zone 5) heat:**

```gdscript
func update_creature(heat: float):
    # Silhouette always visible
    silhouette.modulate.a = remap(heat, 0, 60, 0.3, 1.0)

    # Bioluminescent veins fade in 20-60
    bio_veins.modulate.a = remap(heat, 20, 60, 0.0, 0.8)

    # Heartbeat tempo
    heartbeat_bpm = remap(heat, 0, 70, 30, 90)

    # Eyes open at 60+
    eyes.visible = heat >= 60
    eyes.modulate.a = remap(heat, 60, 70, 0.0, 1.0)

    # Damage overlay at 70+
    damage_overlay.visible = heat > 70
    damage_overlay.modulate.a = remap(heat, 70, 100, 0.0, 1.0)
```

### 3.5 Win/Fail Detection (`win_detector.gd`)

**Win Condition:**
```
creature_zone.heat in [50, 70] sustained for 3.0 seconds
→ emit "level_won"
→ freeze simulation
→ trigger triumph sequence
```

**Fail Condition (soft):**
```
creature_zone.heat > 85:
  → emit "damage_tick"
  → creature flinch animation
  → damage_sizzle SFX
  → heat naturally dissipates back down (no special penalty, just lost time)

No game-over state. Player always recovers.
```

**Triumph Sequence:**
1. Simulation freezes
2. Camera subtle zoom toward creature (0.5s tween)
3. Ice around creature shatters (particle burst)
4. Creature stretches, all biosystems illuminate
5. Triumph SFX plays
6. 2-second hold on revealed creature
7. PostRescueUI fades in

### 3.6 Audio Manager

**Sound Design Spec:**

| Sound | Type | Trigger | Notes |
|-------|------|---------|-------|
| Norse drone | Loop | Level start, continuous | Low, atmospheric, subtle. Volume ~30% |
| Wind/cave | Loop | Layered with drone | Spatial variation, gentle |
| Fire crackle | One-shot / loop | Tap → burst, Hold → sustained loop | Pitch varies with heat intensity |
| Ice crack | One-shot | Zone crosses heat threshold (20, 40, 60) | Pitch-shifted per zone, satisfying snap |
| Heartbeat | Rhythmic loop | Always playing, tempo tied to creature heat | Deep thump, grows louder with heat |
| Damage sizzle | One-shot | Creature zone > 85 | Short, alarming, not punishing |
| Triumph | One-shot | Win triggered | 3-4 second swell: creature call + chord resolution |

**Volume Strategy (festival context):**
- Master volume moderate by default
- No sudden loud sounds
- All SFX are short and layered, not persistent
- Ambient drone is the baseline — quiet enough for adjacent players

---

## 4. Level Data: Norse Onboarding

### 4.1 Zone Topology
```
Zone 0 (Fire Source):
  - Position: bottom center
  - Shape: small irregular polygon around bonfire
  - is_source: true
  - Starting heat: 50 (always warm, replenished)

Zone 1 (Near Fire):
  - Position: just above fire
  - Shape: wide, thin ice region
  - conductivity_modifier: 1.2 (thin ice, warms easily)

Zone 2 (Junction):
  - Position: center of ice field
  - Shape: medium, where paths diverge
  - conductivity_modifier: 1.0

Zone 3 (Left Path — Thick Ice):
  - Position: upper-left
  - Shape: large, dense region
  - conductivity_modifier: 0.5 (thick ice, slow to warm, slow to overshoot)

Zone 4 (Right Path — Thin Ice):
  - Position: upper-right
  - Shape: narrow, translucent region
  - conductivity_modifier: 1.5 (thin ice, fast but risky)

Zone 5 (Creature):
  - Position: top center, beneath creature
  - Shape: medium, surrounding creature
  - is_target: true
  - conductivity_modifier: 1.0
```

### 4.2 Channel Connections
```
Channel 0→1: conductivity 0.8  (fire to near-fire, wide crack)
Channel 1→2: conductivity 0.7  (near-fire to junction)
Channel 2→3: conductivity 0.4  (junction to thick ice — narrow crack)
Channel 2→4: conductivity 0.9  (junction to thin ice — wide crack)
Channel 3→5: conductivity 0.5  (thick ice to creature — slow safe path)
Channel 4→5: conductivity 0.8  (thin ice to creature — fast risky path)
```

### 4.3 Strategic Dynamics
- **Left path (3):** Slow to warm, but thick ice absorbs heat → low overshoot risk at creature
- **Right path (4):** Fast, heat rushes through → high overshoot risk, need precise timing
- **Both paths:** Player can warm both for combined effect, but managing two heat fronts is harder
- **Optimal play:** Use right path for speed, pull back (stop input) as creature approaches target, let dissipation stabilize

---

## 5. Post-Rescue UI

### 5.1 Reveal Card
**Text:**
> *You guided primordial fire through frozen pathways to awaken what lay dormant. Scientists do something remarkably similar — they send signals through biological pathways to activate cells. Next, you'll do it with real biology.*

### 5.2 Stats (optional, displayed below reveal text)
- **Time:** seconds elapsed
- **Efficiency:** % of heat that reached creature vs. total heat generated
- **Damage:** number of damage ticks (lower is better)

### 5.3 Buttons
- **"Continue →"** — disabled, label: "Level 2 — Coming Soon"
- **"Play Again"** — reloads norse_onboarding scene
- **"Menu"** — returns to start menu

---

## 6. Implementation Order

### Phase 1: Skeleton
1. Create Godot project with correct settings (resolution, renderer, stretch)
2. Create `main.tscn` with scene transition logic
3. Create `start_menu.tscn` — placeholder art, Norse card selectable, others locked
4. Create `narrative_interlude.tscn` — static screen with text and Begin button
5. Wire scene flow: Menu → Narrative → Level → PostRescue → Menu

### Phase 2: Core Simulation
6. Implement `heat_simulation.gd` — zones, channels, diffusion loop
7. Implement `input_handler.gd` — tap, drag, hold gesture recognition
8. Create placeholder zone polygons (colored rectangles) to test simulation
9. Wire input to simulation: tap adds heat, drag traces path, hold sustains
10. Implement win/fail detection

### Phase 3: Visual Polish
11. Replace placeholder zones with irregular ice polygons
12. Implement zone color gradient based on heat
13. Add fire source animation and ember particles
14. Add ice crack visuals on channels (Line2D)
15. Implement creature reveal layers (silhouette → veins → eyes → damage)
16. Add steam/heat particles on warming zones

### Phase 4: Audio
17. Add ambient Norse drone loop
18. Add fire crackle SFX (tap burst + hold loop)
19. Add ice crack SFX (threshold-triggered)
20. Add heartbeat (tempo-variable)
21. Add damage sizzle and triumph swell

### Phase 5: Polish & Tune
22. Tune all simulation constants via playtesting
23. Add post-rescue triumph sequence (camera zoom, ice shatter, creature animation)
24. Add post-rescue UI with reveal card, stats, buttons
25. Test web export early — optimize WASM size
26. Touch-test on actual tablet and phone browsers
    **Note:** Godot 4 web exports can have audio stuttering on mobile browsers (especially Safari/iOS) due to browser audio context policies. The StartMenu tap naturally solves this — the first user interaction initializes the audio context before any game audio plays. Test this flow explicitly on iOS Safari.

---

## 7. Future Extension Points

| Extension | How the architecture supports it |
|-----------|----------------------------------|
| New skins (Playful, Enchanted) | New scene inheriting same HeatSimulation + InputHandler, different art/audio |
| Level 2+ (biological) | Same diffusion engine, zones = cells, channels = pathways, new visual layer |
| Pinch/spread gestures | InputHandler already tracks multi-touch, add distance-based detection |
| AI mentor view | Overlay scene with precomputed constellation data, toggled by two-finger hold |
| Leaderboard | Stats already captured, add server submission on win |
| Sound themes per skin | AudioManager loads different asset folder per skin |
| Narrative animations | Replace static TextureRect in NarrativeInterlude with AnimationPlayer sequence |
