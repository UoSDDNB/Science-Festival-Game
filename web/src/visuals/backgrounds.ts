import Phaser from "phaser";
import { LevelDef, WORLD_WIDTH, WORLD_HEIGHT } from "../types";
import { hexToInt } from "./palette";

/**
 * Procedural backgrounds — single-pass Graphics into a RenderTexture so the
 * background draws as one cheap sprite per frame. Each level has a distinct
 * silhouette built from layered shapes so the game still feels "designed"
 * without any external art.
 */
export function buildBackground(scene: Phaser.Scene, def: LevelDef): Phaser.GameObjects.GameObject {
  const worldW = def.worldWidth ?? WORLD_WIDTH;
  const key = `bg-${def.id}-${Math.random().toString(36).slice(2, 6)}`;
  const rt = scene.add.renderTexture(0, 0, worldW, WORLD_HEIGHT).setOrigin(0, 0);
  const g = scene.add.graphics();

  if (def.background === "nasal_journey") {
    drawNasalJourney(g, def, worldW);
  } else {
    drawSkyGradient(g, def, worldW);
    if (def.background === "ice_age") drawIceAge(g, def, worldW);
    else if (def.background === "norse") drawNorse(g, def, worldW);
    else if (def.background === "tissue") drawTissue(g, def, worldW);
    else drawEnchanted(g, def, worldW);
  }

  rt.draw(g);
  g.destroy();
  rt.setDepth(0);
  rt.setName(key);
  return rt;
}

function drawSkyGradient(g: Phaser.GameObjects.Graphics, def: LevelDef, worldW: number): void {
  // Fake vertical gradient with horizontal strips
  const top = hexToInt(def.palette.bgTop);
  const bot = hexToInt(def.palette.bgBottom);
  const strips = 80;
  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1);
    const col = lerpColor(top, bot, t);
    g.fillStyle(col, 1);
    g.fillRect(0, (i * WORLD_HEIGHT) / strips, worldW, WORLD_HEIGHT / strips + 1);
  }
}

function drawNasalJourney(g: Phaser.GameObjects.Graphics, def: LevelDef, worldW: number): void {
  // Three zones blended left-to-right:
  //   [0..1280]   garden — sky + grass + flower silhouettes
  //   [1280..2400] face profile — side silhouette of head, nose pointing left
  //   [2400..worldW] nasal interior — pink mucosa, mucus drips, narrowing tunnel
  const skyTop = hexToInt(def.palette.bgTop);
  const skyBot = hexToInt(def.palette.bgBottom);
  const grass = hexToInt(def.palette.ground);
  const grassAccent = hexToInt(def.palette.groundAccent);
  const skin = 0xe8b894;
  const skinDark = 0xb87c5a;
  const hair = 0x5a3a2a;
  const hairDark = 0x3a241a;
  const mucosa = 0xe88a96;
  const mucosaDark = 0xa05060;
  const innerTissue = 0x6a2a36;
  const lumen = 0xf3c2c8;

  // Background bands (calm, per-zone) — garden sky / face peach / interior tissue
  const bands = 60;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    g.fillStyle(lerpColor(skyTop, skyBot, t), 1);
    g.fillRect(0, (i * WORLD_HEIGHT) / bands, 1280, WORLD_HEIGHT / bands + 1);
  }
  // Face zone — calm near-uniform peach gradient (less busy → the face reads clearly)
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    g.fillStyle(lerpColor(0xf4dcc6, 0xe7c3a5, t), 1);
    g.fillRect(1280, (i * WORLD_HEIGHT) / bands, 1120, WORLD_HEIGHT / bands + 1);
  }
  // Interior zone — deeper body tissue
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    g.fillStyle(lerpColor(mucosaDark, innerTissue, t), 1);
    g.fillRect(2400, (i * WORLD_HEIGHT) / bands, worldW - 2400, WORLD_HEIGHT / bands + 1);
  }

  // --- Zone 1: Garden (kept calm — a few soft flowers, no busy specks) ---
  // Sun
  g.fillStyle(0xfff0a0, 0.9);
  g.fillCircle(220, 220, 70);
  g.fillStyle(0xfff0a0, 0.25);
  g.fillCircle(220, 220, 110);
  // Distant hills
  g.fillStyle(lerpColor(skyBot, grass, 0.55), 1);
  drawHills(g, 760, [0, 200, 480, 760, 1040, 1280], 80);
  // Grass foreground
  g.fillStyle(grass, 1);
  g.fillRect(0, 880, 1280, WORLD_HEIGHT - 880);
  // Grass blades
  g.fillStyle(grassAccent, 0.9);
  for (let i = 0; i < 40; i++) {
    const x = pseudo(i, 3) * 1280;
    const h = 12 + pseudo(i, 5) * 18;
    g.fillTriangle(x - 2, 880, x + 2, 880, x + pseudo(i, 7) * 4, 880 - h);
  }
  // A small, sparse flower cluster around the pollen source (x=380, y=720)
  drawFlower(g, 380, 720, 1.0, 0xffe060, 0xff9a30);
  drawFlower(g, 250, 780, 0.7, 0xffb0d0, 0xc04060);
  drawFlower(g, 540, 760, 0.65, 0xb0d0ff, 0x4060c0);

  // --- Zone 2: Face — a clear left-facing profile (nose → garden) ---
  // The head is the "outside world". An esophagus/nasal tube leaves the back
  // of the head and leads INTO the interior zone (x>2400) where the mast cell
  // sits — the player is "zooming in" to the inside of the body.
  //
  // Head silhouette: a large rounded head centred ~(2040, 470), with a
  // pronounced nose bridge + tip pointing LEFT at ~(1420, 540), a closed
  // eye, brow, cheek, lips, chin, and a neck going down to the collar.
  g.fillStyle(skin, 1);
  // Cranium / back of head (big round mass)
  g.fillEllipse(2080, 430, 760, 820);
  // Face front: forehead → nose bridge → nose tip → upper lip → chin
  g.beginPath();
  g.moveTo(1700, 120);            // top of forehead
  g.lineTo(1560, 240);            // brow ridge
  g.lineTo(1500, 360);            // nose bridge start
  g.lineTo(1420, 470);            // nose bridge (slanted)
  g.lineTo(1400, 545);            // NOSE TIP pointing left (the pollen entry)
  g.lineTo(1470, 590);            // under the nose
  g.lineTo(1470, 660);            // upper lip line
  g.lineTo(1500, 700);            // lips
  g.lineTo(1480, 780);            // chin front
  g.lineTo(1560, 880);            // chin bottom
  g.lineTo(1900, 960);            // under jaw
  g.lineTo(1900, 120);
  g.closePath();
  g.fillPath();
  // Neck
  g.fillRect(1980, 900, 320, WORLD_HEIGHT - 900);

  // Hair (covers the back/top of the cranium)
  g.fillStyle(hair, 1);
  g.beginPath();
  g.moveTo(1700, 120);
  qcurve(g, 1700, 120, 2100, 20, 2420, 300);
  g.lineTo(2440, 520);
  qcurve(g, 2440, 520, 2360, 420, 2260, 430);
  qcurve(g, 2260, 430, 2050, 380, 1900, 430);
  g.lineTo(1820, 260);
  g.lineTo(1700, 120);
  g.closePath();
  g.fillPath();
  // Hair sheen
  g.fillStyle(hairDark, 0.4);
  g.fillEllipse(2200, 300, 260, 120);

  // Nostril (the entry point for the pollen) — dark slit at the nose tip
  g.fillStyle(0x4a2030, 1);
  g.fillEllipse(1450, 560, 34, 22);

  // Eye — a clear open eye so it reads as a FACE (not a silhouette)
  // White of the eye + iris + pupil + upper lid + brow
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(1720, 400, 96, 54);
  g.fillStyle(0x6a4a2a, 1);
  g.fillCircle(1716, 402, 26);
  g.fillStyle(0x1a0f08, 1);
  g.fillCircle(1716, 402, 12);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(1724, 394, 5);
  // Upper lid (thick line over the eye)
  g.lineStyle(6, 0x2a1810, 0.9);
  g.beginPath();
  g.moveTo(1672, 384);
  qcurve(g, 1672, 384, 1720, 366, 1768, 384);
  g.strokePath();
  // Eyebrow
  g.fillStyle(0x3a2418, 1);
  g.beginPath();
  g.moveTo(1660, 344);
  qcurve(g, 1660, 344, 1720, 318, 1790, 340);
  g.lineTo(1786, 356);
  qcurve(g, 1786, 356, 1722, 336, 1668, 360);
  g.closePath();
  g.fillPath();

  // Cheek blush
  g.fillStyle(0xe89a80, 0.35);
  g.fillEllipse(1620, 560, 110, 70);

  // Lips
  g.fillStyle(0xb85a5a, 1);
  g.beginPath();
  g.moveTo(1480, 660);
  qcurve(g, 1480, 660, 1560, 650, 1640, 668);
  qcurve(g, 1640, 668, 1560, 700, 1486, 700);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, 0x5a2020, 0.5);
  g.beginPath();
  g.moveTo(1484, 672); g.lineTo(1640, 672); g.strokePath();

  // Ear
  g.fillStyle(skinDark, 0.5);
  g.fillEllipse(2300, 540, 56, 96);

  // Soft face shading (depth on the cheek/jaw)
  g.fillStyle(0x000000, 0.06);
  g.fillEllipse(2050, 760, 320, 240);

  // --- The esophagus / nasal tube: from the throat INTO the interior ---
  // A curved tube leaving the throat (behind the chin), dipping down, then
  // sweeping RIGHT into the interior zone (x>2400) to open on the mast cell
  // — the "zoom in": the outside face connects to the inside of the body.
  // Drawn as a thick stroked path (mucosal wall) + a lighter lumen inside.
  const tubePts = [
    [2100, 820], [2280, 920], [2480, 900], [2720, 760], [2930, 630],
  ];
  // Outer mucosal wall (thick)
  g.lineStyle(150, mucosaDark, 1);
  g.beginPath();
  g.moveTo(tubePts[0]![0], tubePts[0]![1]);
  for (let i = 1; i < tubePts.length; i++) g.lineTo(tubePts[i]![0], tubePts[i]![1]);
  g.strokePath();
  // Inner lumen (lighter, the open passage)
  g.lineStyle(92, lumen, 1);
  g.beginPath();
  g.moveTo(tubePts[0]![0], tubePts[0]![1]);
  for (let i = 1; i < tubePts.length; i++) g.lineTo(tubePts[i]![0], tubePts[i]![1]);
  g.strokePath();
  // Cilia bumps along the tube wall
  g.fillStyle(mucosa, 0.9);
  for (let i = 0; i < tubePts.length - 1; i++) {
    const [ax, ay] = tubePts[i]!;
    const [bx, by] = tubePts[i + 1]!;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    g.fillCircle(mx, my, 14);
  }

  // --- Zone 3: Nasal interior ---
  // A receding tunnel — upper and lower mucosa walls converging deeper.
  // Drawn as curved bands. The mast cell sits centred at (3050, 560).
  // Upper wall
  g.fillStyle(mucosaDark, 1);
  g.beginPath();
  g.moveTo(2400, 0);
  g.lineTo(worldW, 0);
  g.lineTo(worldW, 240);
  // Wavy lower edge of upper wall
  for (let x = worldW; x >= 2400; x -= 40) {
    const t = (x - 2400) / (worldW - 2400);
    const y = 360 - t * 80 + Math.sin(x * 0.012) * 14;
    g.lineTo(x, y);
  }
  g.lineTo(2400, 360);
  g.closePath();
  g.fillPath();
  // Lower wall
  g.fillStyle(mucosaDark, 1);
  g.beginPath();
  g.moveTo(2400, WORLD_HEIGHT);
  g.lineTo(worldW, WORLD_HEIGHT);
  g.lineTo(worldW, 880);
  for (let x = worldW; x >= 2400; x -= 40) {
    const t = (x - 2400) / (worldW - 2400);
    const y = 760 + t * 80 + Math.sin(x * 0.012 + 1.7) * 16;
    g.lineTo(x, y);
  }
  g.lineTo(2400, 760);
  g.closePath();
  g.fillPath();
  // Mucus glints
  g.fillStyle(0xfff0e0, 0.35);
  for (let i = 0; i < 18; i++) {
    const x = 2450 + pseudo(i, 23) * (worldW - 2500);
    const y = 380 + pseudo(i, 29) * 360;
    const r = 6 + pseudo(i, 31) * 10;
    g.fillCircle(x, y, r);
  }
  // Cilia hint along walls
  g.lineStyle(2, 0xfff0e0, 0.4);
  for (let x = 2420; x < worldW; x += 24) {
    g.lineBetween(x, 360 + Math.sin(x * 0.012) * 14, x + 2, 360 + Math.sin(x * 0.012) * 14 + 14);
    g.lineBetween(x, 760 + Math.sin(x * 0.012 + 1.7) * 16, x + 2, 760 + Math.sin(x * 0.012 + 1.7) * 16 - 14);
  }
  // Deep vignette at far end
  g.fillStyle(0x1a0510, 0.55);
  g.fillEllipse(worldW - 100, 540, 280, 400);
}

function drawFlower(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number, petalCol: number, centerCol: number): void {
  // Stem
  g.lineStyle(6 * scale, 0x3a7820, 0.95);
  g.lineBetween(x, y, x, y + 160 * scale);
  // Leaves
  g.fillStyle(0x4a8a30, 0.95);
  g.fillEllipse(x - 20 * scale, y + 90 * scale, 36 * scale, 14 * scale);
  g.fillEllipse(x + 22 * scale, y + 110 * scale, 32 * scale, 12 * scale);
  // Petals (6, around center)
  g.fillStyle(petalCol, 0.95);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.fillEllipse(x + Math.cos(a) * 22 * scale, y + Math.sin(a) * 22 * scale, 28 * scale, 18 * scale);
  }
  // Center
  g.fillStyle(centerCol, 1);
  g.fillCircle(x, y, 14 * scale);
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(x - 4 * scale, y - 4 * scale, 5 * scale);
}

function drawHills(g: Phaser.GameObjects.Graphics, baseY: number, xs: number[], peakHeight: number): void {
  g.beginPath();
  g.moveTo(xs[0]!, WORLD_HEIGHT);
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]!;
    const y = baseY - peakHeight + (pseudo(i, 41) - 0.5) * 30;
    if (i === 0) g.lineTo(x, y);
    else {
      const px = xs[i - 1]!;
      const midX = (px + x) / 2;
      const midY = baseY + (pseudo(i, 53) - 0.5) * 20;
      g.lineTo(midX, midY);
      g.lineTo(x, y);
    }
  }
  g.lineTo(xs[xs.length - 1]!, WORLD_HEIGHT);
  g.closePath();
  g.fillPath();
}

function drawIceAge(g: Phaser.GameObjects.Graphics, def: LevelDef, _worldW: number): void {
  const ground = hexToInt(def.palette.ground);
  const accent = hexToInt(def.palette.groundAccent);

  // Distant ice peaks
  g.fillStyle(lerpColor(hexToInt(def.palette.bgBottom), ground, 0.4), 1);
  drawMountainRow(g, 720, [0, 200, 480, 720, 1000, 1320, 1560, 1820, WORLD_WIDTH], 120, 30);

  g.fillStyle(lerpColor(hexToInt(def.palette.bgBottom), ground, 0.65), 1);
  drawMountainRow(g, 820, [0, 280, 600, 880, 1180, 1500, 1820, WORLD_WIDTH], 160, 60);

  // Foreground snow
  g.fillStyle(ground, 1);
  g.fillRect(0, 880, WORLD_WIDTH, WORLD_HEIGHT - 880);

  // Snow ripples
  g.fillStyle(accent, 0.35);
  for (let i = 0; i < 18; i++) {
    const x = (i / 18) * WORLD_WIDTH + Math.sin(i * 1.7) * 40;
    const y = 920 + Math.cos(i * 0.9) * 30;
    g.fillEllipse(x, y, 280, 24);
  }

  // Distant stars / cold flecks
  g.fillStyle(0xffffff, 0.4);
  for (let i = 0; i < 60; i++) {
    const x = pseudo(i, 11) * WORLD_WIDTH;
    const y = pseudo(i, 19) * 500;
    g.fillCircle(x, y, pseudo(i, 23) * 1.6 + 0.6);
  }
}

function drawNorse(g: Phaser.GameObjects.Graphics, def: LevelDef, _worldW: number): void {
  const ground = hexToInt(def.palette.ground);
  const accent = hexToInt(def.palette.groundAccent);
  const obstacleCol = hexToInt(def.palette.obstacle);

  // Distant fjord silhouettes
  g.fillStyle(lerpColor(hexToInt(def.palette.bgBottom), ground, 0.5), 1);
  drawMountainRow(g, 660, [0, 240, 520, 780, 1100, 1380, 1660, WORLD_WIDTH], 160, 80);

  g.fillStyle(lerpColor(hexToInt(def.palette.bgBottom), ground, 0.75), 1);
  drawMountainRow(g, 780, [0, 320, 660, 980, 1300, 1620, WORLD_WIDTH], 180, 90);

  // Rocky foreground
  g.fillStyle(ground, 1);
  g.fillRect(0, 920, WORLD_WIDTH, WORLD_HEIGHT - 920);
  g.fillStyle(accent, 0.4);
  for (let i = 0; i < 12; i++) {
    const x = (i / 12) * WORLD_WIDTH + Math.sin(i * 2.1) * 60;
    g.fillEllipse(x, 940 + Math.cos(i) * 10, 220, 30);
  }

  // Mythic runes / sparks (decorative only — the obstacle proper is drawn over the level)
  g.fillStyle(obstacleCol, 0.0); // reserved
}

function drawTissue(g: Phaser.GameObjects.Graphics, def: LevelDef, _worldW: number): void {
  drawTissueBackdrop(g, WORLD_WIDTH, WORLD_HEIGHT, {
    bgTop: def.palette.bgTop,
    bgBottom: def.palette.bgBottom,
    ground: def.palette.ground,
    groundAccent: def.palette.groundAccent,
  });
}

/**
 * Tissue backdrop usable without a LevelDef (Immune Rescue + Two Keys palette).
 * Draws a fleshy gradient, capillary curves, and sparse cellular flecks.
 */
export function drawTissueBackdrop(
  g: Phaser.GameObjects.Graphics,
  worldW: number,
  worldH: number,
  palette: { bgTop: string; bgBottom: string; ground: string; groundAccent: string },
): void {
  const top = hexToInt(palette.bgTop);
  const bot = hexToInt(palette.bgBottom);
  const ground = hexToInt(palette.ground);
  const accent = hexToInt(palette.groundAccent);

  for (let i = 0; i < 48; i++) {
    const t = i / 47;
    const col = lerpColor(top, bot, t);
    g.fillStyle(col, 1);
    g.fillRect(0, (i * worldH) / 48, worldW, worldH / 48 + 1);
  }

  // Soft, fleshy noise — overlapping translucent ellipses give a tissue look
  g.fillStyle(accent, 0.25);
  for (let i = 0; i < 30; i++) {
    const x = pseudo(i, 3) * worldW;
    const y = pseudo(i, 7) * worldH;
    const r = 120 + pseudo(i, 11) * 200;
    g.fillEllipse(x, y, r * 1.6, r);
  }

  // Faint capillary curves wandering across the scene
  g.lineStyle(6, 0xff4060, 0.18);
  for (let row = 0; row < 4; row++) {
    const baseY = 200 + row * 230 + pseudo(row, 5) * 60;
    g.beginPath();
    g.moveTo(0, baseY);
    for (let x = 0; x <= worldW; x += 60) {
      const y = baseY + Math.sin((x + row * 100) * 0.005) * 30 + pseudo(x + row, 17) * 6;
      g.lineTo(x, y);
    }
    g.strokePath();
  }

  // Subtle deep red wash at the bottom
  g.fillStyle(ground, 0.35);
  g.fillRect(0, worldH * 0.88, worldW, worldH * 0.12);

  // Sparse cellular flecks
  g.fillStyle(0xffffff, 0.07);
  for (let i = 0; i < 80; i++) {
    const x = pseudo(i, 19) * worldW;
    const y = pseudo(i, 29) * worldH;
    g.fillCircle(x, y, pseudo(i, 31) * 2 + 0.6);
  }
}

function drawEnchanted(g: Phaser.GameObjects.Graphics, def: LevelDef, _worldW: number): void {
  const ground = hexToInt(def.palette.ground);
  const accent = hexToInt(def.palette.groundAccent);

  g.fillStyle(lerpColor(hexToInt(def.palette.bgBottom), ground, 0.55), 1);
  drawMountainRow(g, 700, [0, 300, 620, 960, 1280, 1620, WORLD_WIDTH], 200, 80);

  g.fillStyle(ground, 1);
  g.fillRect(0, 900, WORLD_WIDTH, WORLD_HEIGHT - 900);

  // Whimsical flecks
  g.fillStyle(accent, 0.45);
  for (let i = 0; i < 40; i++) {
    const x = pseudo(i, 7) * WORLD_WIDTH;
    const y = pseudo(i, 13) * 600 + 100;
    g.fillCircle(x, y, pseudo(i, 31) * 4 + 1);
  }
}

function drawMountainRow(
  g: Phaser.GameObjects.Graphics,
  baseY: number,
  xs: number[],
  peakHeight: number,
  jitter: number,
): void {
  g.beginPath();
  g.moveTo(0, WORLD_HEIGHT);
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]!;
    const y = baseY - peakHeight + (pseudo(i, 41) - 0.5) * jitter * 2;
    if (i === 0) g.lineTo(x, y);
    else {
      const px = xs[i - 1]!;
      const midX = (px + x) / 2;
      const midY = baseY + (pseudo(i, 53) - 0.5) * jitter;
      g.lineTo(midX, midY);
      g.lineTo(x, y);
    }
  }
  g.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
  g.lineTo(0, WORLD_HEIGHT);
  g.closePath();
  g.fillPath();
}

/** Approximate a quadratic Bézier with sampled lineTo segments (Graphics here
 *  has no quadraticCurveTo). Appends points to the CURRENT path. */
function qcurve(g: Phaser.GameObjects.Graphics, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n = 12): void {
  for (let i = 1; i <= n; i++) {
    const t = i / n, mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
    g.lineTo(x, y);
  }
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

function pseudo(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
