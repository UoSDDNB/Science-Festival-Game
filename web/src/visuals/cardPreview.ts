import Phaser from "phaser";
import { LevelDef } from "../types";
import { hexToInt } from "./palette";

/**
 * Semantic card previews for the level select. Each level id gets a motif
 * drawn ENTIRELY with Graphics primitives from lvl.palette colours (no
 * external image assets). The motif communicates the level content at a
 * glance:
 *
 *   ice_age    — ice block + snowflakes + acorn
 *   norse      — campfire + boulder + sleeping (coiled) dragon
 *   mast_cell  — nasal passage + pollen grains + granule-filled mast cell
 *
 * Used in two modes:
 *   band — full preview band across the top of a desktop/stack card
 *          (top corners rounded to match the card, bottom corners square).
 *   icon — small 36 px preview replacing the old palette-swatch row on
 *          compact (phone) cards (all four corners rounded).
 */

/** Horizontal lerp of two hex colours. */
export function lerpHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

/**
 * Vertical gradient fill of a box with independently rounded top/bottom
 * corners. Graphics has no clipping, so the gradient is painted as 1 px rows
 * whose width is inset by the corner-arc offset at each row — exact at the
 * rounded corners, no spill outside the card outline.
 */
function fillBox(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  top: string, bottom: string,
  rTop = 0, rBottom = 0,
): void {
  const tCol = hexToInt(top);
  const bCol = hexToInt(bottom);
  const insetAt = (r: number, d: number): number =>
    r - Math.sqrt(Math.max(0, r * r - (r - d) * (r - d)));
  for (let i = 0; i < h; i++) {
    let inset = 0;
    if (rTop > 0 && i < rTop) inset = Math.max(inset, insetAt(rTop, i));
    const dBot = h - (i + 1);
    if (rBottom > 0 && dBot < rBottom) inset = Math.max(inset, insetAt(rBottom, Math.max(0, dBot)));
    g.fillStyle(lerpHex(tCol, bCol, h > 1 ? i / (h - 1) : 0), 1);
    g.fillRect(x + inset, y + i, Math.max(0, w - inset * 2), 1.4);
  }
}

function drawIceAge(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  pal: LevelDef["palette"], rTop: number, rBottom: number,
): void {
  fillBox(g, x, y, w, h, pal.bgTop, pal.bgBottom, rTop, rBottom);
  // Snowflakes — small crosses
  g.lineStyle(Math.max(1.5, h * 0.014), 0xffffff, 0.85);
  const fl = Math.max(2.5, Math.min(w, h) * 0.055);
  const flakes: Array<[number, number]> = [
    [0.18, 0.2], [0.42, 0.12], [0.68, 0.24], [0.88, 0.14],
    [0.3, 0.4], [0.82, 0.46], [0.12, 0.44],
  ];
  for (const [fx, fy] of flakes) {
    const cx = x + fx * w, cy = y + fy * h;
    g.lineBetween(cx - fl, cy, cx + fl, cy);
    g.lineBetween(cx, cy - fl, cx, cy + fl);
    g.lineBetween(cx - fl * 0.6, cy - fl * 0.6, cx + fl * 0.6, cy + fl * 0.6);
  }
  // Ice block (Scrat's shell)
  const bx = x + w * 0.25, by = y + h * 0.48, bw = w * 0.5, bh = h * 0.48;
  g.fillStyle(hexToInt(pal.groundAccent), 0.4);
  g.fillRoundedRect(bx, by, bw, bh, 6);
  g.lineStyle(2, 0xffffff, 0.55);
  g.strokeRoundedRect(bx, by, bw, bh, 6);
  g.lineStyle(1.5, 0xffffff, 0.35);
  g.lineBetween(bx + bw * 0.25, by + bh * 0.15, bx + bw * 0.45, by + bh * 0.5);
  // Acorn: tan nut + dark cap + stem
  const ax = x + w * 0.5, ay = y + h * 0.72;
  const s = Math.min(w, h) * 0.13;
  g.fillStyle(hexToInt(pal.creatureAccent), 1);
  g.fillEllipse(ax, ay + s * 0.35, s * 1.05, s * 1.25);
  g.fillStyle(hexToInt(pal.creature), 1);
  g.fillEllipse(ax, ay - s * 0.28, s * 1.45, s * 0.75);
  g.fillRect(ax - s * 0.09, ay - s * 0.78, s * 0.18, s * 0.42);
}

function drawNorse(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  pal: LevelDef["palette"], rTop: number, rBottom: number,
): void {
  fillBox(g, x, y, w, h, pal.bgTop, pal.bgBottom, rTop, rBottom);
  // Ground strip
  g.fillStyle(hexToInt(pal.ground), 1);
  g.fillRect(x, y + h * 0.8, w, h * 0.2);
  const m = Math.min(w, h);
  // Campfire (left): logs + layered flame plume
  const fx = x + w * 0.2, fy = y + h * 0.8;
  const fs = m * 0.34;
  g.fillStyle(hexToInt(pal.obstacle), 1);
  g.fillRoundedRect(fx - fs * 0.55, fy - fs * 0.14, fs * 1.1, fs * 0.2, fs * 0.1);
  g.fillRoundedRect(fx - fs * 0.45, fy - fs * 0.28, fs * 0.9, fs * 0.18, fs * 0.09);
  const flame = (hh: number, col: number, a: number): void => {
    g.fillStyle(col, a);
    g.beginPath();
    g.moveTo(fx - hh * 0.42, fy);
    g.lineTo(fx, fy - hh);
    g.lineTo(fx + hh * 0.42, fy);
    g.closePath();
    g.fillPath();
  };
  flame(fs, hexToInt(pal.fire), 0.95);
  flame(fs * 0.62, hexToInt(pal.fireHot), 0.95);
  flame(fs * 0.32, hexToInt(pal.accent), 1);
  // Boulder wall (centre): three rocks the fire must route around —
  // mirrors the in-level `obstacles` geometry.
  const boulders: Array<[number, number, number]> = [
    [0.44, 0.34, 0.115],
    [0.52, 0.62, 0.135],
    [0.40, 0.82, 0.115],
  ];
  for (const [bx, by, br] of boulders) {
    g.fillStyle(hexToInt(pal.obstacle), 1);
    g.fillCircle(x + w * bx, y + h * by, m * br);
    g.fillStyle(0xffffff, 0.14);
    g.fillCircle(x + w * bx - m * br * 0.2, y + h * by - m * br * 0.25, m * br * 0.5);
  }
  // Sleeping coiled dragon (right)
  const dx = x + w * 0.8, dy = y + h * 0.7;
  const ds = m * 0.2;
  g.lineStyle(ds * 0.48, hexToInt(pal.creature), 1);
  g.beginPath();
  g.arc(dx, dy, ds * 0.72, 0.4, Math.PI * 1.85);
  g.strokePath();
  g.fillStyle(hexToInt(pal.creature), 1);
  g.fillCircle(dx + ds * 0.62, dy - ds * 0.4, ds * 0.42);
  // Snout
  g.beginPath();
  g.moveTo(dx + ds * 0.9, dy - ds * 0.55);
  g.lineTo(dx + ds * 1.35, dy - ds * 0.38);
  g.lineTo(dx + ds * 0.9, dy - ds * 0.2);
  g.closePath();
  g.fillPath();
  // Closed eye (sleeping)
  g.lineStyle(Math.max(1.5, ds * 0.1), hexToInt(pal.creatureAccent), 0.9);
  g.lineBetween(dx + ds * 0.55, dy - ds * 0.45, dx + ds * 0.78, dy - ds * 0.4);
  // Small folded wing
  g.fillStyle(hexToInt(pal.creatureAccent), 0.5);
  g.beginPath();
  g.moveTo(dx - ds * 0.35, dy - ds * 0.75);
  g.lineTo(dx + ds * 0.15, dy - ds * 1.15);
  g.lineTo(dx + ds * 0.25, dy - ds * 0.6);
  g.closePath();
  g.fillPath();
}
function drawMastCell(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  pal: LevelDef["palette"], rTop: number, rBottom: number,
): void {
  fillBox(g, x, y, w, h, pal.bgTop, pal.bgBottom, rTop, rBottom);
  const m = Math.min(w, h);
  // Nasal passage tube along the bottom (mucosal wall + lumen)
  const ty = y + h * 0.58, th = h * 0.3;
  g.fillStyle(hexToInt(pal.obstacle), 0.9);
  g.fillRoundedRect(x + w * 0.04, ty, w * 0.92, th, th / 2);
  g.fillStyle(hexToInt(pal.creature), 0.55);
  g.fillRoundedRect(x + w * 0.08, ty + th * 0.3, w * 0.84, th * 0.4, th * 0.2);
  // Mucosal bumps
  g.fillStyle(hexToInt(pal.accent), 0.8);
  for (let i = 0; i < 4; i++) {
    g.fillCircle(x + w * (0.18 + i * 0.2), ty + th * 0.18, Math.max(1.5, th * 0.1));
  }
  // Pollen grains (top-left): disc + radial spikes
  const pollen = (px: number, py: number, r: number): void => {
    g.lineStyle(Math.max(1, r * 0.28), hexToInt(pal.fireHot), 0.95);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.lineBetween(px + Math.cos(a) * r, py + Math.sin(a) * r, px + Math.cos(a) * r * 1.8, py + Math.sin(a) * r * 1.8);
    }
    g.fillStyle(hexToInt(pal.fire), 0.95);
    g.fillCircle(px, py, r);
  };
  pollen(x + w * 0.2, y + h * 0.24, m * 0.075);
  pollen(x + w * 0.4, y + h * 0.12, m * 0.05);
  // Mast cell (right): blob + granules + nucleus
  const cx = x + w * 0.72, cy = y + h * 0.33;
  const cs = m * 0.17;
  g.fillStyle(hexToInt(pal.creature), 0.95);
  g.fillCircle(cx, cy, cs);
  g.lineStyle(Math.max(1.5, cs * 0.09), hexToInt(pal.creatureAccent), 0.9);
  g.strokeCircle(cx, cy, cs);
  g.fillStyle(hexToInt(pal.creatureAccent), 0.9);
  const grains: Array<[number, number]> = [
    [0.45, 2.2], [0.3, 4.4], [0.5, 0.6], [0.25, 3.5],
    [0.45, 5.2], [0.35, 1.6], [0.5, 2.9],
  ];
  for (const [rr, a] of grains) {
    g.fillCircle(cx + Math.cos(a) * cs * rr, cy + Math.sin(a) * cs * rr, Math.max(1, cs * 0.13));
  }
  g.fillStyle(hexToInt(pal.accent), 0.85);
  g.fillEllipse(cx, cy, cs * 0.62, cs * 0.45);
}

/**
 * Two Keys — two spiky pollen grains (top-left + bottom-left) with a dashed
 * "link" between them, pointing at a granule mast cell (right). The dashed
 * line reads as "both must cross" — the bivalency requirement at a glance.
 */
function drawTwoKeys(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  pal: LevelDef["palette"], rTop: number, rBottom: number,
): void {
  fillBox(g, x, y, w, h, pal.bgTop, pal.bgBottom, rTop, rBottom);
  const m = Math.min(w, h);
  // Pollen grain motif (disc + radial spikes)
  const pollen = (px: number, py: number, r: number): void => {
    g.lineStyle(Math.max(1, r * 0.28), hexToInt(pal.fireHot), 0.95);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.lineBetween(px + Math.cos(a) * r, py + Math.sin(a) * r, px + Math.cos(a) * r * 1.8, py + Math.sin(a) * r * 1.8);
    }
    g.fillStyle(hexToInt(pal.fire), 0.95);
    g.fillCircle(px, py, r);
  };
  const ax = x + w * 0.16, ay = y + h * 0.26;
  const bx = x + w * 0.16, by = y + h * 0.74;
  pollen(ax, ay, m * 0.085);
  pollen(bx, by, m * 0.085);
  // Dashed crosslink between the two grains
  g.lineStyle(Math.max(1.5, m * 0.02), hexToInt(pal.accent), 0.8);
  const segs = 5;
  for (let i = 0; i < segs; i += 2) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    g.lineBetween(ax + (bx - ax) * t0, ay + (by - ay) * t0, ax + (bx - ax) * t1, ay + (by - ay) * t1);
  }
  // Mast cell (right): blob + granules + nucleus
  const cx = x + w * 0.72, cy = y + h * 0.5;
  const cs = m * 0.17;
  g.fillStyle(hexToInt(pal.creature), 0.95);
  g.fillCircle(cx, cy, cs);
  g.lineStyle(Math.max(1.5, cs * 0.09), hexToInt(pal.creatureAccent), 0.9);
  g.strokeCircle(cx, cy, cs);
  g.fillStyle(hexToInt(pal.creatureAccent), 0.9);
  const grains: Array<[number, number]> = [
    [0.45, 2.2], [0.3, 4.4], [0.5, 0.6], [0.25, 3.5], [0.45, 5.2],
  ];
  for (const [rr, a] of grains) {
    g.fillCircle(cx + Math.cos(a) * cs * rr, cy + Math.sin(a) * cs * rr, Math.max(1, cs * 0.13));
  }
  g.fillStyle(hexToInt(pal.accent), 0.85);
  g.fillEllipse(cx, cy, cs * 0.62, cs * 0.45);
  // Little arrows from each grain to the cell
  g.lineStyle(Math.max(1, m * 0.014), hexToInt(pal.fireHot), 0.5);
  g.lineBetween(ax + m * 0.1, ay, cx - cs - m * 0.06, cy - m * 0.08);
  g.lineBetween(bx + m * 0.1, by, cx - cs - m * 0.06, cy + m * 0.08);
}

/**
 * Draw the semantic preview for `lvl` into a w×h box whose TOP-LEFT is (x, y).
 * `rTop`/`rBottom` are the corner radii of the enclosing card (top corners
 * rounded for the desktop band; all four for the 36 px phone icon). Shapes
 * scale with min(w, h), so the same motif works for a band or a small icon.
 */
export function drawCardMotif(
  g: Phaser.GameObjects.Graphics,
  lvl: LevelDef,
  x: number, y: number, w: number, h: number,
  rTop: number, rBottom: number,
): void {
  switch (lvl.id) {
    case "ice_age":
      drawIceAge(g, x, y, w, h, lvl.palette, rTop, rBottom);
      break;
    case "norse":
      drawNorse(g, x, y, w, h, lvl.palette, rTop, rBottom);
      break;
    case "mast_cell":
      drawMastCell(g, x, y, w, h, lvl.palette, rTop, rBottom);
      break;
    case "two_keys":
      drawTwoKeys(g, x, y, w, h, lvl.palette, rTop, rBottom);
      break;
    default:
      fillBox(g, x, y, w, h, lvl.palette.bgTop, lvl.palette.bgBottom, rTop, rBottom);
  }
}

/**
 * Home-card motif for Immune Rescue (not a LevelDef): tissue wash, neutrophil
 * blob, and green bacterial dots with a faint scent ring.
 */
export function drawImmuneRescueMotif(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  rTop: number, rBottom: number,
): void {
  fillBox(g, x, y, w, h, "#3a1220", "#7a2a3a", rTop, rBottom);
  const m = Math.min(w, h);
  const cx = x + w * 0.38;
  const cy = y + h * 0.55;
  g.fillStyle(hexToInt("#d8e8f8"), 0.95);
  g.fillEllipse(cx, cy, m * 0.42, m * 0.36);
  g.fillStyle(hexToInt("#4a6a9a"), 0.9);
  g.fillEllipse(cx - m * 0.08, cy, m * 0.14, m * 0.1);
  g.fillEllipse(cx + m * 0.06, cy + m * 0.04, m * 0.12, m * 0.09);
  g.fillStyle(hexToInt("#5ad07a"), 0.95);
  g.fillCircle(x + w * 0.72, y + h * 0.35, m * 0.08);
  g.fillCircle(x + w * 0.82, y + h * 0.58, m * 0.06);
  g.fillCircle(x + w * 0.68, y + h * 0.7, m * 0.05);
  g.lineStyle(Math.max(1, m * 0.02), hexToInt("#4fd1c5"), 0.55);
  g.strokeCircle(cx, cy, m * 0.32);
}
