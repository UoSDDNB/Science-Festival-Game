import Phaser from "phaser";
import { LevelDef } from "../types";
import { hexToInt } from "./palette";

/**
 * Procedural creature silhouettes. Stylised, flat, intentionally low-effort —
 * fits the festival aesthetic and lets us add levels without an art pipeline.
 *
 * Each creature exposes:
 *   - `container`: a Phaser Container holding the silhouette
 *   - `heart`: a glowing inner circle whose alpha + scale track heat (= "alive")
 *   - `ice`: optional overlay drawn over the creature for the Ice Age cocoon
 */
export interface CreatureVisual {
  container: Phaser.GameObjects.Container;
  setLifeSignal(t: number): void;
  iceDissolve(t: number): void;
  setThawed(thawed: boolean): void;
}

export function buildCreature(scene: Phaser.Scene, def: LevelDef): CreatureVisual {
  switch (def.creature.kind) {
    case "scrat":
      return buildScrat(scene, def);
    case "dragon":
      return buildDragon(scene, def);
    case "mast_cell":
      return buildMastCell(scene, def);
    case "sprite":
    default:
      return buildSprite(scene, def);
  }
}

function buildScrat(scene: Phaser.Scene, def: LevelDef): CreatureVisual {
  const c = scene.add.container(def.creature.x, def.creature.y);
  c.setDepth(6);
  const fur = hexToInt(def.palette.creature);
  const accent = hexToInt(def.palette.creatureAccent);
  const ice = 0xbfdcff;
  const s = def.creature.size;

  const g = scene.add.graphics();
  // Body
  g.fillStyle(fur, 1);
  g.fillEllipse(0, 10 * s, 90 * s, 110 * s);
  // Head
  g.fillEllipse(0, -45 * s, 78 * s, 70 * s);
  // Tail
  g.fillStyle(fur, 1);
  g.fillEllipse(55 * s, 30 * s, 36 * s, 90 * s);
  // Ears
  g.fillTriangle(-26 * s, -75 * s, -8 * s, -88 * s, -2 * s, -64 * s);
  g.fillTriangle(26 * s, -75 * s, 8 * s, -88 * s, 2 * s, -64 * s);
  // Belly
  g.fillStyle(accent, 1);
  g.fillEllipse(0, 16 * s, 48 * s, 70 * s);
  // Snout
  g.fillEllipse(0, -36 * s, 26 * s, 22 * s);
  // Two enormous front teeth (the Scrat signature)
  g.fillStyle(0xfff5dd, 1);
  g.fillRect(-7 * s, -28 * s, 5 * s, 22 * s);
  g.fillRect(2 * s, -28 * s, 5 * s, 22 * s);
  // Eyes
  g.fillStyle(0x0a0a14, 1);
  g.fillCircle(-15 * s, -52 * s, 5 * s);
  g.fillCircle(15 * s, -52 * s, 5 * s);
  // Acorn in arms
  g.fillStyle(0x8a5a2a, 1);
  g.fillEllipse(0, 45 * s, 26 * s, 30 * s);
  g.fillStyle(0x5a3a1a, 1);
  g.fillEllipse(0, 32 * s, 30 * s, 16 * s);
  c.add(g);

  // Heart / life signal
  const heart = scene.add.image(0, 5 * s, "glow-warm");
  heart.setBlendMode(Phaser.BlendModes.ADD);
  heart.setAlpha(0).setScale(0.4 * s);
  c.add(heart);

  // Ice encasing
  const iceLayer = scene.add.graphics();
  if (def.creature.encased) {
    iceLayer.fillStyle(ice, 0.55);
    iceLayer.fillRoundedRect(-90 * s, -110 * s, 180 * s, 220 * s, 30 * s);
    iceLayer.lineStyle(3 * s, 0xeaf6ff, 0.7);
    iceLayer.strokeRoundedRect(-90 * s, -110 * s, 180 * s, 220 * s, 30 * s);
    // Crystalline highlights
    iceLayer.fillStyle(0xffffff, 0.35);
    iceLayer.fillTriangle(-60 * s, -90 * s, -40 * s, -50 * s, -80 * s, -50 * s);
    iceLayer.fillTriangle(40 * s, 30 * s, 70 * s, 70 * s, 20 * s, 70 * s);
  }
  c.add(iceLayer);

  let heartBeat = 0;

  return {
    container: c,
    setLifeSignal: (t: number) => {
      heartBeat += 0.05;
      const alpha = clamp(t, 0, 1) * 0.9;
      const bpm = 0.5 + clamp(t, 0, 1) * 4;
      const pulse = Math.pow(Math.max(0, Math.sin(heartBeat * bpm)), 0.4);
      heart.setAlpha(alpha * (0.6 + 0.4 * pulse));
      heart.setScale(0.35 * s + pulse * 0.15 * s + t * 0.2 * s);
    },
    iceDissolve: (t: number) => {
      iceLayer.setAlpha(1 - clamp(t, 0, 1));
    },
    setThawed: (thawed: boolean) => {
      if (thawed) iceLayer.setAlpha(0);
    },
  };
}

function buildDragon(scene: Phaser.Scene, def: LevelDef): CreatureVisual {
  const c = scene.add.container(def.creature.x, def.creature.y);
  c.setDepth(6);
  const skin = hexToInt(def.palette.creature);
  const accent = hexToInt(def.palette.creatureAccent);
  const s = def.creature.size;

  const g = scene.add.graphics();
  // Coiled body
  g.fillStyle(skin, 1);
  g.fillEllipse(-30 * s, 30 * s, 180 * s, 120 * s);
  g.fillEllipse(40 * s, -10 * s, 140 * s, 90 * s);
  // Head
  g.fillEllipse(80 * s, -50 * s, 100 * s, 70 * s);
  // Belly scales
  g.fillStyle(accent, 1);
  for (let i = -3; i <= 3; i++) {
    g.fillEllipse(i * 22 * s, 50 * s, 18 * s, 24 * s);
  }
  // Snout
  g.fillStyle(skin, 1);
  g.fillTriangle(120 * s, -55 * s, 150 * s, -40 * s, 120 * s, -30 * s);
  // Eye
  g.fillStyle(0xffe060, 1);
  g.fillCircle(90 * s, -56 * s, 7 * s);
  g.fillStyle(0x0a0a14, 1);
  g.fillCircle(92 * s, -56 * s, 3 * s);
  // Horn
  g.fillStyle(accent, 1);
  g.fillTriangle(70 * s, -80 * s, 80 * s, -110 * s, 90 * s, -78 * s);
  // Wing tucked
  g.fillStyle(skin, 0.9);
  g.fillTriangle(-50 * s, -30 * s, -10 * s, -100 * s, 30 * s, -30 * s);
  c.add(g);

  const heart = scene.add.image(20 * s, 10 * s, "glow-warm");
  heart.setBlendMode(Phaser.BlendModes.ADD);
  heart.setAlpha(0).setScale(0.5 * s);
  c.add(heart);

  let heartBeat = 0;

  return {
    container: c,
    setLifeSignal: (t: number) => {
      heartBeat += 0.05;
      const alpha = clamp(t, 0, 1) * 0.9;
      const bpm = 0.5 + clamp(t, 0, 1) * 4;
      const pulse = Math.pow(Math.max(0, Math.sin(heartBeat * bpm)), 0.4);
      heart.setAlpha(alpha * (0.6 + 0.4 * pulse));
      heart.setScale(0.45 * s + pulse * 0.2 * s + t * 0.2 * s);
    },
    iceDissolve: () => {
      // dragon isn't iced
    },
    setThawed: () => {},
  };
}

function buildMastCell(scene: Phaser.Scene, def: LevelDef): CreatureVisual {
  const c = scene.add.container(def.creature.x, def.creature.y);
  c.setDepth(6);
  const skin = hexToInt(def.palette.creature);
  const granuleCol = hexToInt(def.palette.creatureAccent);
  const igeCol = 0xffe9ad;
  const s = def.creature.size;
  const cellRadius = 90 * s;

  // Cell body
  const cellG = scene.add.graphics();
  cellG.fillStyle(skin, 0.95);
  cellG.fillCircle(0, 0, cellRadius);
  cellG.lineStyle(3 * s, 0xffffff, 0.15);
  cellG.strokeCircle(0, 0, cellRadius);
  // Subtle membrane shimmer
  cellG.fillStyle(0xffffff, 0.08);
  cellG.fillEllipse(-cellRadius * 0.3, -cellRadius * 0.3, cellRadius * 1.1, cellRadius * 0.5);
  c.add(cellG);

  // Nucleus (offset)
  const nucleus = scene.add.graphics();
  nucleus.fillStyle(0x8a3550, 0.85);
  nucleus.fillEllipse(-cellRadius * 0.35, cellRadius * 0.2, cellRadius * 0.55, cellRadius * 0.5);
  nucleus.lineStyle(2 * s, 0x5a1a30, 0.7);
  nucleus.strokeEllipse(-cellRadius * 0.35, cellRadius * 0.2, cellRadius * 0.55, cellRadius * 0.5);
  c.add(nucleus);

  // IgE Y-shaped antibodies around perimeter — fixed positions
  const igeCount = 14;
  const igeG = scene.add.graphics();
  igeG.lineStyle(2.5 * s, igeCol, 0.95);
  for (let i = 0; i < igeCount; i++) {
    const ang = (i / igeCount) * Math.PI * 2;
    const baseX = Math.cos(ang) * cellRadius;
    const baseY = Math.sin(ang) * cellRadius;
    const tipX = Math.cos(ang) * (cellRadius + 22 * s);
    const tipY = Math.sin(ang) * (cellRadius + 22 * s);
    // Stem
    igeG.lineBetween(baseX, baseY, tipX, tipY);
    // Two arms of the Y, perpendicular spread
    const perp = ang + Math.PI / 2;
    const arm = 10 * s;
    const lx = tipX + Math.cos(perp) * arm;
    const ly = tipY + Math.sin(perp) * arm;
    const rx = tipX - Math.cos(perp) * arm;
    const ry = tipY - Math.sin(perp) * arm;
    igeG.lineBetween(tipX, tipY, lx, ly);
    igeG.lineBetween(tipX, tipY, rx, ry);
  }
  c.add(igeG);

  // Granules — small dots scattered inside the cell. Tracked so we can animate them on win.
  type Granule = { x: number; y: number; r: number; dot: Phaser.GameObjects.Graphics; baseGlow: number };
  const granules: Granule[] = [];
  for (let i = 0; i < 22; i++) {
    // Stable pseudo-random positions, avoiding the nucleus
    let gx = 0, gy = 0;
    let attempts = 0;
    while (attempts++ < 8) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * cellRadius * 0.78;
      gx = Math.cos(a) * r;
      gy = Math.sin(a) * r;
      const ndx = gx - -cellRadius * 0.35;
      const ndy = gy - cellRadius * 0.2;
      const ndist = Math.sqrt((ndx * ndx) / (cellRadius * 0.3 * cellRadius * 0.3) + (ndy * ndy) / (cellRadius * 0.27 * cellRadius * 0.27));
      if (ndist > 1.05) break;
    }
    const gr = (3 + Math.random() * 3) * s;
    const dot = scene.add.graphics();
    dot.fillStyle(granuleCol, 0.85);
    dot.fillCircle(0, 0, gr);
    dot.x = gx;
    dot.y = gy;
    c.add(dot);
    granules.push({ x: gx, y: gy, r: gr, dot, baseGlow: 0.85 });
  }

  // Glow ring that appears as Ca2+ rises
  const halo = scene.add.image(0, 0, "glow-warm");
  halo.setBlendMode(Phaser.BlendModes.ADD);
  halo.setAlpha(0).setScale(cellRadius * 0.025);
  c.add(halo);

  let beat = 0;
  let burst = false;

  return {
    container: c,
    setLifeSignal: (t: number) => {
      beat += 0.05;
      const tt = clamp(t, 0, 1);
      // Pulse the cell membrane
      const pulse = Math.sin(beat * (1.5 + tt * 4));
      cellG.setScale(1 + tt * 0.03 + pulse * 0.015 * tt);
      // Granules brighten & drift toward the membrane as Ca2+ rises
      const drift = tt * 0.18;
      for (const g of granules) {
        g.dot.setScale(1 + tt * 0.6 + pulse * 0.15 * tt);
        g.dot.x = g.x * (1 + drift);
        g.dot.y = g.y * (1 + drift);
        g.dot.setAlpha(g.baseGlow * (0.7 + tt * 0.3));
      }
      // Calcium-glow halo
      halo.setAlpha(tt * 0.55);
      halo.setScale(cellRadius * (0.022 + tt * 0.012));
    },
    iceDissolve: () => {
      // not relevant
    },
    setThawed: (thawed: boolean) => {
      if (!thawed || burst) return;
      burst = true;
      // Burst: granules fly outward, histamine particles spray, cell flashes
      const flash = scene.add.image(0, 0, "glow-hot");
      flash.setBlendMode(Phaser.BlendModes.ADD);
      flash.setScale(cellRadius * 0.025);
      flash.setAlpha(0);
      c.add(flash);
      scene.tweens.add({ targets: flash, alpha: 0.95, scale: cellRadius * 0.06, duration: 220, yoyo: true });

      for (const g of granules) {
        const dx = g.x;
        const dy = g.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        const throwDist = cellRadius * (1.6 + Math.random() * 1.2);
        scene.tweens.add({
          targets: g.dot,
          x: nx * throwDist,
          y: ny * throwDist,
          alpha: 0,
          scale: 0.2,
          duration: 700 + Math.random() * 400,
          ease: "Cubic.Out",
        });
      }

      // Histamine spray — small additive particles radiating outward from the cell.
      // Children of the container so the worldLayer transform applies cleanly.
      for (let i = 0; i < 36; i++) {
        const ang = Math.random() * Math.PI * 2;
        const speed = 200 + Math.random() * 300;
        const dot = scene.add.image(0, 0, "spark");
        dot.setBlendMode(Phaser.BlendModes.ADD);
        dot.setTint(0xff6a8a);
        dot.setScale(0.3 + Math.random() * 0.3);
        c.add(dot);
        const tx = Math.cos(ang) * speed;
        const ty = Math.sin(ang) * speed;
        scene.tweens.add({
          targets: dot,
          x: tx,
          y: ty,
          alpha: 0,
          duration: 900 + Math.random() * 600,
          ease: "Cubic.Out",
          onComplete: () => dot.destroy(),
        });
      }
    },
  };
}

function buildSprite(scene: Phaser.Scene, def: LevelDef): CreatureVisual {
  const c = scene.add.container(def.creature.x, def.creature.y);
  c.setDepth(6);
  const skin = hexToInt(def.palette.creature);
  const accent = hexToInt(def.palette.creatureAccent);
  const s = def.creature.size;

  const g = scene.add.graphics();
  g.fillStyle(skin, 1);
  g.fillCircle(0, 0, 60 * s);
  g.fillStyle(accent, 1);
  g.fillCircle(0, -20 * s, 35 * s);
  g.fillStyle(0x0a0a14, 1);
  g.fillCircle(-15 * s, -25 * s, 4 * s);
  g.fillCircle(15 * s, -25 * s, 4 * s);
  c.add(g);

  const heart = scene.add.image(0, 0, "glow-warm");
  heart.setBlendMode(Phaser.BlendModes.ADD);
  heart.setAlpha(0).setScale(0.5 * s);
  c.add(heart);

  let beat = 0;
  return {
    container: c,
    setLifeSignal: (t: number) => {
      beat += 0.05;
      const a = clamp(t, 0, 1) * 0.9;
      const p = Math.pow(Math.max(0, Math.sin(beat * (1 + t * 3))), 0.4);
      heart.setAlpha(a * (0.6 + 0.4 * p));
      heart.setScale(0.4 * s + p * 0.2 * s + t * 0.2 * s);
    },
    iceDissolve: () => {},
    setThawed: () => {},
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}
