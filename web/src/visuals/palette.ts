export const COLOR_GOLD = 0xffd060;
export const COLOR_GOLD_DIM = 0xb89030;
export const COLOR_DANGER = 0xff3a2a;
export const COLOR_COLD = 0x4a7cc4;
export const COLOR_INK = 0x070b14;
export const COLOR_PARCHMENT = 0xd8e0ee;

/** 5-stop heat gradient sampled to a CSS-style colour. */
export function sampleHeat(t: number): number {
  // t in [0..1]
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [0.10, 0.22, 0.55]], // cold blue
    [0.25, [0.45, 0.30, 0.80]], // purple
    [0.5, [1.0, 0.45, 0.10]], // orange
    [0.75, [1.0, 0.75, 0.20]], // yellow-orange
    [1.0, [1.0, 0.95, 0.85]], // white-hot
  ];
  const tt = Math.max(0, Math.min(1, t));
  let lo = stops[0]!;
  let hi = stops[stops.length - 1]!;
  for (let i = 0; i < stops.length - 1; i++) {
    if (tt >= stops[i]![0] && tt <= stops[i + 1]![0]) {
      lo = stops[i]!;
      hi = stops[i + 1]!;
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const k = (tt - lo[0]) / span;
  const r = lo[1][0] + (hi[1][0] - lo[1][0]) * k;
  const g = lo[1][1] + (hi[1][1] - lo[1][1]) * k;
  const b = lo[1][2] + (hi[1][2] - lo[1][2]) * k;
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

export function rgbaBytes(t: number): [number, number, number, number] {
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [0.10, 0.22, 0.55]],
    [0.25, [0.45, 0.30, 0.80]],
    [0.5, [1.0, 0.45, 0.10]],
    [0.75, [1.0, 0.75, 0.20]],
    [1.0, [1.0, 0.95, 0.85]],
  ];
  const tt = Math.max(0, Math.min(1, t));
  let lo = stops[0]!;
  let hi = stops[stops.length - 1]!;
  for (let i = 0; i < stops.length - 1; i++) {
    if (tt >= stops[i]![0] && tt <= stops[i + 1]![0]) {
      lo = stops[i]!;
      hi = stops[i + 1]!;
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const k = (tt - lo[0]) / span;
  const r = lo[1][0] + (hi[1][0] - lo[1][0]) * k;
  const g = lo[1][1] + (hi[1][1] - lo[1][1]) * k;
  const b = lo[1][2] + (hi[1][2] - lo[1][2]) * k;
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255];
}

export function hexToInt(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}
