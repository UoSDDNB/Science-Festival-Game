/**
 * Shared layout math + depth ladder for the result overlays (WinOverlay,
 * FailOverlay).
 *
 * DEPTH LADDER (Phaser: higher = rendered in front). Result panels MUST stay
 * above the sneeze cutscene — the LevelScene also destroys the cutscene
 * before opening the panel, but the ladder is the hard guarantee:
 *
 *   1000/1001   thermometer (+ label 1002)
 *   1100        hint label
 *   1300        over-heat red flash
 *   1500        "← Menu" button
 *   2300        sneeze cutscene veil
 *   2310        sneeze face + "AAA-CHOO!" + droplets
 *   2400        sneeze white flash (one-shot, 350 ms)
 *   2600        RESULT PANEL VEIL        (PANEL_VEIL)
 *   2610        RESULT PANEL CONTENT     (PANEL_CONTENT)
 */
export const PANEL_VEIL = 2600;
export const PANEL_CONTENT = 2610;

export interface ResultLayout {
  cardW: number;
  cardH: number;
  titleSize: number;
  bodySize: number;
  bioSize: number;
  titleY: number;
  bodyY: number;
  bioY: number;
  btnY: number;
  btnW: number;
  btnH: number;
  /** wordWrap width for body / biology text */
  wrap: number;
}

/**
 * Responsive result-panel layout. Card width = min(720, w-48); fonts clamped
 * so narrow (phone) viewports stay readable. Both WinOverlay and FailOverlay
 * use the same geometry, different colours.
 */
export function computeResultLayout(w: number, h: number, fail = false): ResultLayout {
  const cardW = Math.min(720, w - 48);
  const cardH = Math.min(420, Math.max(320, Math.round(h * 0.62)));
  const wrap = cardW - 56;
  return {
    cardW,
    cardH,
    wrap,
    titleSize: fail
      ? Math.max(26, Math.min(48, Math.round(w * 0.07)))
      : Math.max(24, Math.min(44, Math.round(w * 0.062))),
    bodySize: Math.max(14, Math.min(20, Math.round(w * 0.038))),
    bioSize: Math.max(12, Math.min(18, Math.round(w * 0.034))),
    titleY: -cardH * 0.34,
    bodyY: -cardH * 0.02,
    bioY: cardH * 0.26,
    btnY: cardH * 0.4,
    btnW: Math.max(110, Math.min(150, Math.round((cardW - 72) / 2))),
    btnH: 44,
  };
}
