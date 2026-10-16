import Phaser from "phaser";
import type { ProteinLayout } from "./types";

const REF_W = 390;
const REF_H = 844;

function scaleFactor(w: number, h: number): number {
  const isShort = h < 520;
  let s = Math.min(w / REF_W, h / REF_H);
  if (isShort) s *= 0.88;
  return Phaser.Math.Clamp(s, 0.52, 1.5);
}

/** Three-panel layout: top-left structure, top-right AlphaFold, bottom playfield. */
export function computeProteinLayout(w: number, h: number): ProteinLayout {
  const s = scaleFactor(w, h);
  const margin = Math.round(10 * s);
  const gap = Math.round(8 * s);
  const hintH = Math.round(Math.max(72, Math.min(120, h * 0.11)));
  const innerH = h - hintH - margin * 2 - gap;
  const topH = Math.round(innerH * 0.5);
  const playTop = margin + topH + gap;
  const playH = innerH - topH;
  const halfW = (w - margin * 2 - gap) / 2;
  const ribosomeStripH = Math.round(Math.max(56, Math.min(96, playH * 0.18)));

  return {
    structure: {
      left: margin,
      top: margin,
      width: halfW,
      height: topH,
    },
    alphaFold: {
      left: margin + halfW + gap,
      top: margin,
      width: halfW,
      height: topH,
    },
    play: {
      left: margin,
      top: playTop,
      width: w - margin * 2,
      height: Math.max(120, playH),
    },
    ribosomeStripH,
    hintBox: {
      left: margin,
      top: h - margin - hintH,
      width: w - margin * 2,
      height: hintH,
    },
  };
}
