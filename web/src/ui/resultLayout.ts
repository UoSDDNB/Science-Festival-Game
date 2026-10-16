import Phaser from "phaser";

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

export interface ResultTexts {
  title: string;
  body: string;
  biology: string;
}

export interface ResultLayout {
  cardW: number;
  cardH: number;
  radius: number;
  titleSize: number;
  bodySize: number;
  bioSize: number;
  titleY: number;
  bodyY: number;
  bioY: number;
  btnY: number;
  btnY2: number;
  btnW: number;
  btnH: number;
  btnFontSize: number;
  stackButtons: boolean;
  /** wordWrap width for body / biology text */
  wrap: number;
}

const REF_W = 390;
const REF_H = 844;

function resultScale(w: number, h: number): number {
  const isShort = h < 520;
  let s = Math.min(w / REF_W, h / REF_H);
  if (isShort) s *= 0.88;
  return Phaser.Math.Clamp(s, 0.5, 1.45);
}

function measureTextBlock(
  scene: Phaser.Scene,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
  wrapWidth: number,
): { width: number; height: number } {
  const probe = scene.make.text({
    x: 0,
    y: 0,
    text,
    style: { ...style, wordWrap: { width: wrapWidth } },
  });
  probe.setVisible(false);
  const bounds = { width: probe.width, height: probe.height };
  probe.destroy();
  return bounds;
}

/**
 * Responsive result-panel layout. Sizes the card from measured copy on phones
 * and scales fonts/padding from the viewport.
 */
export function computeResultLayout(
  scene: Phaser.Scene,
  w: number,
  h: number,
  fail: boolean,
  texts: ResultTexts,
): ResultLayout {
  const s = resultScale(w, h);
  const isShort = h < 520;
  const hintScale = Phaser.Math.Clamp(s * 1.28, 0.72, 1.5);
  const hintSize = Math.max(18, Math.round((isShort ? 19 : 21) * hintScale));
  const margin = Math.round(12 * s);
  const padY = Math.round(22 * s);
  const gap = Math.round(12 * s);
  const cardW = Math.min(Math.round(760 * s), w - margin * 2);
  const wrap = cardW - Math.round(48 * s);
  const stackButtons = w < 420;

  let titleSize = Math.max(22, Math.round((isShort ? 24 : 28) * hintScale));
  let bodySize = hintSize;
  let bioSize = hintSize;

  const titleStyle = {
    fontFamily: "ui-sans-serif, system-ui",
    fontSize: `${titleSize}px`,
    fontStyle: "bold" as const,
  };
  const bodyStyle = {
    fontFamily: "ui-sans-serif, system-ui",
    fontSize: `${bodySize}px`,
    align: "center" as const,
  };
  const bioStyle = {
    fontFamily: "ui-sans-serif, system-ui",
    fontSize: `${bioSize}px`,
    fontStyle: "italic" as const,
    align: "center" as const,
  };

  let titleBlock = measureTextBlock(scene, texts.title, titleStyle, wrap);
  let bodyBlock = measureTextBlock(scene, texts.body, bodyStyle, wrap);
  let bioBlock = measureTextBlock(scene, texts.biology, bioStyle, wrap);

  const btnH = Math.max(38, Math.round(42 * s));
  const btnFontSize = Math.max(16, Math.round((isShort ? 17 : 19) * hintScale));
  const btnW = Math.max(104, Math.min(Math.round(148 * s), Math.round((cardW - 40 * s) / 2)));
  const btnBlockH = stackButtons ? btnH * 2 + gap : btnH;

  let contentH = padY + titleBlock.height + gap + bodyBlock.height + gap + bioBlock.height + gap + btnBlockH + padY;
  let cardH = Math.min(Math.round(560 * s), contentH, Math.round(h * 0.9));

  while (cardH > h * 0.9 && bioSize > 16) {
    bioSize -= 1;
    bioBlock = measureTextBlock(scene, texts.biology, { ...bioStyle, fontSize: `${bioSize}px` }, wrap);
    contentH = padY + titleBlock.height + gap + bodyBlock.height + gap + bioBlock.height + gap + btnBlockH + padY;
    cardH = Math.min(Math.round(560 * s), contentH, Math.round(h * 0.9));
  }
  while (cardH > h * 0.9 && bodySize > 16) {
    bodySize -= 1;
    bodyBlock = measureTextBlock(scene, texts.body, { ...bodyStyle, fontSize: `${bodySize}px` }, wrap);
    contentH = padY + titleBlock.height + gap + bodyBlock.height + gap + bioBlock.height + gap + btnBlockH + padY;
    cardH = Math.min(Math.round(560 * s), contentH, Math.round(h * 0.9));
  }

  let y = -cardH / 2 + padY;
  const titleY = y + titleBlock.height / 2;
  y += titleBlock.height + gap;
  const bodyY = y + bodyBlock.height / 2;
  y += bodyBlock.height + gap;
  const bioY = y + bioBlock.height / 2;
  y += bioBlock.height + gap;
  const btnY = y + btnH / 2;
  const btnY2 = btnY + btnH + gap;

  return {
    cardW,
    cardH,
    radius: Math.max(10, Math.round(16 * s)),
    wrap,
    titleSize,
    bodySize,
    bioSize,
    titleY,
    bodyY,
    bioY,
    btnY,
    btnY2,
    btnW,
    btnH,
    btnFontSize,
    stackButtons,
  };
}
