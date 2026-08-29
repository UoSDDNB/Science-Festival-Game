import Phaser from "phaser";
import { LEVELS } from "../levels";
import { LevelDef } from "../types";
import { hexToInt } from "../visuals/palette";
import { drawCardMotif, lerpHex } from "../visuals/cardPreview";
import { ScrollPanel } from "../ui/ScrollPanel";

/**
 * Card-based level select — responsive port of the production live build
 * (sci-game-live/assets-index.js) + semantic card previews (drawCardMotif).
 *
 * Three layout modes:
 *   desktop-row    — wide viewports: cards side by side. With many levels the
 *                    cards shrink (180 px floor) and switch to the compact icon
 *                    preview instead of the 56 px band.
 *   desktop-stack  — narrow-but-not-phone: cards stacked vertically; when the
 *                    stack overflows the viewport the cards live in a
 *                    ScrollPanel (same drag+wheel component as phone mode) —
 *                    this FIXES the pre-existing "last card clipped, no scroll"
 *                    known issue, which became unavoidable once the level count
 *                    grew past 3 (SESSION 7, 2026-08-28).
 *   phone-scroll   — tall portrait: vertical scrolling card list inside a
 *                    ScrollPanel (drag + wheel, off-screen cards culled).
 *
 * Rebuilds on resize / orientationchange (80 ms debounce).
 */

const DESKTOP_ROW_MIN_W = 700;
const SHORT_MIN = 520; // live: min(w,h) < 520 → phone-scroll (tall portrait OR short landscape)
const PHONE_CARD_H = 132;
const PHONE_GAP = 12;
const ROW_GAP = 36;
const ROW_CARD_MIN = 220;
const STACK_CARD_H = 360;
const STACK_GAP = 24;

interface CardMetrics {
  swatchSize: number;
  swatchY: number;
  nameY: number;
  playY: number;
  showBlurb: boolean;
  buttonWidth: number;
  buttonHeight: number;
  nameSize: number;
  blurbSize: number;
  orderSize: number;
}

interface CardLayout {
  mode: "desktop-row" | "desktop-stack" | "phone-scroll";
  cardWidth: number;
  cardHeight: number;
  gap: number;
  compact: boolean;
  headerHeight: number;
  titleY: number;
  subtitleY: number;
  titleSize: number;
  subtitleSize: number;
  showSubtitle: boolean;
  scrollAreaTop: number;
  scrollAreaHeight: number;
  contentHeight: number;
  positions: Array<{ x: number; y: number }>;
}

/** Responsive px helper (the live build's B()): value at 1920 width, scaled by
 *  the viewport, then floored for readability (the raw live port undersized
 *  phone text — the approved fix keeps a hard floor per element). */
function responsive(v: number, w: number, compact: boolean, floor: number): number {
  const k = Phaser.Math.Clamp(w / 1920, compact ? 0.34 : 0.42, 1);
  return Math.max(floor, Math.round(v * k));
}

function computeLayout(w: number, h: number, count: number): CardLayout {
  const short = Math.min(w, h) < SHORT_MIN;
  const narrow = w < DESKTOP_ROW_MIN_W;
  const compact = short || narrow;
  const titleSize = responsive(compact ? 48 : 72, w, compact, compact ? 16 : 30);
  const subtitleSize = responsive(16, w, compact, 10);
  const showSubtitle = !short || h > 420;
  const headerTop = short ? titleSize * 0.75 : w * 0.12;
  const titleY = headerTop + titleSize * 0.55;
  const subtitleY = showSubtitle ? titleY + subtitleSize + (short ? 10 : 24) : headerTop + titleSize * 0.5 + (short ? 12 : 24);

  // phone-scroll — full-width landscape cards in a ScrollPanel (live geometry:
  // cardWidth = clamp(w-24, 260, w-16), cardHeight = 132)
  if (short) {
    const cw = Phaser.Math.Clamp(w - 24, 260, w - 16);
    const ch = PHONE_CARD_H;
    const gap = PHONE_GAP;
    const headerH = showSubtitle ? titleY + subtitleSize + 10 : titleY + titleSize * 0.5 + 12;
    const areaH = Math.max(120, h - headerH - 8);
    const contentHeight = count * ch + (count - 1) * gap;
    // Phone cards ALWAYS live in the ScrollPanel (content anchored at x=12):
    // positions are SCREEN coords (card centre = w/2); rebuild subtracts the
    // panel's viewport x (12) when adding them.
    const positions = Array.from({ length: count }, (_, i) => ({ x: w / 2, y: i * (ch + gap) + ch / 2 }));
    return {
      mode: "phone-scroll", cardWidth: cw, cardHeight: ch, gap, compact: true,
      headerHeight: headerH, titleY, subtitleY,
      titleSize, subtitleSize, showSubtitle,
      scrollAreaTop: headerH, scrollAreaHeight: areaH, contentHeight, positions,
    };
  }

  // desktop-row — wide enough that all cards fit side by side at the 220 px
  // width (few levels: full 56 px band previews, non-compact).
  const rowTotal = count * ROW_CARD_MIN + (count - 1) * ROW_GAP;
  if (w >= rowTotal && w >= DESKTOP_ROW_MIN_W) {
    const cw = Phaser.Math.Clamp((w - ROW_GAP * (count - 1) - 48) / count, 220, 320);
    const ch = Phaser.Math.Clamp(h * 0.44, 300, 360);
    const total = count * cw + (count - 1) * ROW_GAP;
    const startX = (w - total) / 2;
    const y = h * 0.55;
    const positions = Array.from({ length: count }, (_, i) => ({ x: startX + i * (cw + ROW_GAP) + cw / 2, y }));
    return {
      mode: "desktop-row", cardWidth: cw, cardHeight: ch, gap: ROW_GAP, compact: false,
      headerHeight: 0, titleY, subtitleY,
      titleSize, subtitleSize, showSubtitle: true,
      scrollAreaTop: 0, scrollAreaHeight: h, contentHeight: h, positions,
    };
  }

  // desktop-row with more cards than fit at 220 — many levels (>= 6): shrink
  // to the 180 px compact floor (icon previews) in a single row, but ONLY when
  // the floor-width row actually fits the viewport; otherwise fall through to
  // the scrollable stack below. (At <= 5 levels the pre-existing behavior is
  // preserved exactly: 220-min row, else stack.)
  if (count >= 6 && w >= DESKTOP_ROW_MIN_W) {
    const floorTotal = count * 180 + (count - 1) * 12;
    if (w >= floorTotal) {
      const cw = 180;
      const gap = 12;
      const ch = Phaser.Math.Clamp(h * 0.44, 300, 360);
      const total = count * cw + (count - 1) * gap;
      const startX = (w - total) / 2;
      const y = h * 0.55;
      const positions = Array.from({ length: count }, (_, i) => ({ x: startX + i * (cw + gap) + cw / 2, y }));
      return {
        mode: "desktop-row", cardWidth: cw, cardHeight: ch, gap, compact: true,
        headerHeight: 0, titleY, subtitleY,
        titleSize, subtitleSize, showSubtitle: true,
        scrollAreaTop: 0, scrollAreaHeight: h, contentHeight: h, positions,
      };
    }
  }

  // desktop-stack — narrow but not phone. The scroll area starts under the
  // header; when the stacked cards overflow it they go into a ScrollPanel so
  // the bottom cards are reachable by drag/wheel (fixes the pre-existing
  // desktop-stack clip, HANDOFF known issue #1 — the fix became necessary
  // once the level count grew past 3).
  const sw = Phaser.Math.Clamp(w * 0.88, 260, 340);
  const sh = STACK_CARD_H;
  const headerH = showSubtitle ? titleY + subtitleSize + 16 : titleY + 16;
  const areaH = Math.max(160, h - headerH - 12);
  const contentHeight = count * sh + (count - 1) * STACK_GAP;
  const overflow = contentHeight > areaH;
  // Positions are SCREEN coords (centre = w/2). In the non-overflow case the
  // cards sit in uiRoot below the header; in the overflow case they enter the
  // ScrollPanel (content anchored at x=12, y=scrollAreaTop) and rebuild
  // subtracts the panel offsets.
  const positions = Array.from({ length: count }, (_, i) => ({ x: w / 2, y: (overflow ? 0 : headerH) + i * (sh + STACK_GAP) + sh / 2 }));
  return {
    mode: "desktop-stack", cardWidth: sw, cardHeight: sh, gap: STACK_GAP, compact,
    headerHeight: headerH, titleY, subtitleY,
    titleSize, subtitleSize, showSubtitle: true,
    scrollAreaTop: headerH, scrollAreaHeight: areaH, contentHeight, positions,
  };
}

function cardMetrics(w: number, h: number, viewW: number, compact: boolean): CardMetrics {
  const pad = compact ? 10 : 16;
  const swatchSize = compact ? Phaser.Math.Clamp(Math.round(h * 0.26), 22, 30) : Phaser.Math.Clamp(Math.round(w * 0.13), 32, 44);
  const playH = compact ? 30 : 40;
  const buttonWidth = compact ? Phaser.Math.Clamp(Math.round(w * 0.32), 84, 112) : Phaser.Math.Clamp(Math.round(w * 0.44), 120, 160);
  const nameSize = responsive(compact ? 20 : 28, viewW, compact, 16);
  const blurbSize = responsive(compact ? 13 : 18, viewW, compact, 10);
  const orderSize = responsive(compact ? 13 : 18, viewW, compact, 10);
  const top = -h / 2;
  const swatchY = top + pad;
  const nameY = top + pad + swatchSize + 8;
  const playY = top + h - pad - playH / 2;
  return {
    swatchSize, swatchY, nameY, playY,
    showBlurb: !compact && h >= 240,
    buttonWidth, buttonHeight: playH,
    nameSize, blurbSize, orderSize,
  };
}

export class LevelSelectScene extends Phaser.Scene {
  private uiRoot: Phaser.GameObjects.Container | null = null;
  private scrollPanel: ScrollPanel | null = null;
  private resizeTimer: Phaser.Time.TimerEvent | null = null;
  private layout: CardLayout | null = null;

  constructor() {
    super("level-select");
  }

  private onOrientationChange = (): void => {
    window.setTimeout(() => {
      this.scale.refresh();
      this.scheduleRebuild();
    }, 150);
  };

  create(): void {
    this.scale.on("resize", this.scheduleRebuild, this);
    window.addEventListener("orientationchange", this.onOrientationChange);
    this.rebuildLayout();
    // Quick-start first level on Enter
    this.input.keyboard?.on("keydown-ENTER", () => {
      this.launch(LEVELS[0]!);
    });
  }

  shutdown(): void {
    this.scale.off("resize", this.scheduleRebuild, this);
    window.removeEventListener("orientationchange", this.onOrientationChange);
    this.resizeTimer?.remove(false);
    this.scrollPanel?.destroy();
    this.scrollPanel = null;
  }

  private scheduleRebuild(): void {
    this.resizeTimer?.remove(false);
    this.resizeTimer = this.time.delayedCall(80, () => this.rebuildLayout());
  }

  private rebuildLayout(): void {
    this.scrollPanel?.destroy();
    this.scrollPanel = null;
    if (this.uiRoot) this.uiRoot.destroy(true);
    const w = this.scale.width;
    const h = this.scale.height;
    this.layout = computeLayout(w, h, LEVELS.length);

    this.uiRoot = this.add.container(0, 0);

    // Backdrop: deep blue vertical gradient
    const bg = this.add.graphics();
    const top = 0x080d1c;
    const bot = 0x18253c;
    for (let i = 0; i < 60; i++) {
      const t = i / 59;
      const col = lerpHex(top, bot, t);
      bg.fillStyle(col, 1);
      bg.fillRect(0, (i * h) / 60, w, h / 60 + 1);
    }
    this.uiRoot.add(bg);

    // Title
    this.uiRoot.add(
      this.add
        .text(w / 2, this.layout.titleY, "PLAYTIME", { fontFamily: "ui-sans-serif, system-ui", fontSize: `${this.layout.titleSize}px`, color: "#ffd86a", fontStyle: "bold" })
        .setOrigin(0.5),
    );
    if (this.layout.showSubtitle) {
      this.uiRoot.add(
        this.add
          .text(w / 2, this.layout.subtitleY, "an invitation to feel how cells talk", { fontFamily: "ui-sans-serif, system-ui", fontSize: `${this.layout.subtitleSize}px`, color: "#9fb5d8", fontStyle: "italic", align: "center", wordWrap: { width: w * 0.9 } })
          .setOrigin(0.5),
      );
    }

    // Phone + overflow-stack modes: cards go into a ScrollPanel
    const scrollMode = this.layout.mode === "phone-scroll" || (this.layout.mode === "desktop-stack" && this.layout.contentHeight > this.layout.scrollAreaHeight);
    const host = scrollMode ? this.createScrollParent(this.layout) : this.uiRoot;
    const wholeCardClickable = !scrollMode;

    LEVELS.forEach((lvl, i) => {
      const pos = this.layout!.positions[i]!;
      // Panel-hosted cards: positions are screen coords, the panel content is
      // anchored at x=12, y=scrollAreaTop — subtract the x offset so cards
      // stay centred on w/2 on screen.
      const cardX = scrollMode ? pos.x - 12 : pos.x;
      const card = this.makeCard(cardX, pos.y, this.layout!.cardWidth, this.layout!.cardHeight, this.layout!.compact, lvl, wholeCardClickable);
      if (scrollMode && this.scrollPanel) {
        this.scrollPanel.add(card, this.layout!.cardHeight);
      } else {
        host.add(card);
      }
    });
  }

  /** Subtle translucent deep-blue scroll backdrop (approved deviation from
   *  the live build's 0x00A120 debug-green rectangle). */
  private createScrollParent(L: CardLayout): Phaser.GameObjects.Container {
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x0a1424, 0.6);
    backdrop.fillRoundedRect(12, L.scrollAreaTop, this.scale.width - 24, L.scrollAreaHeight, 12);
    this.uiRoot!.add(backdrop);
    this.scrollPanel = new ScrollPanel(this);
    this.scrollPanel.setViewport(12, L.scrollAreaTop, this.scale.width - 24, L.scrollAreaHeight);
    this.scrollPanel.setContentHeight(L.contentHeight);
    this.uiRoot!.add(this.scrollPanel.container);
    return this.scrollPanel.list;
  }

  private makeCard(
    cx: number, cy: number, w: number, h: number,
    compact: boolean, lvl: LevelDef, wholeCardClickable: boolean,
  ): Phaser.GameObjects.Container {
    const tint = hexToInt(lvl.palette.fire);
    const card = this.add.container(cx, cy);
    const r = compact ? 12 : 16;

    const g = this.add.graphics();
    g.fillStyle(0x111a2a, 0.85);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.lineStyle(2, tint, 0.65);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    card.add(g);

    const m = cardMetrics(w, h, this.scale.width, compact);

    // Semantic preview: full band on desktop cards, 36 px icon (replacing the
    // old palette-swatch row) on compact phone cards. Palette-driven.
    if (compact) {
      const icon = this.add.graphics();
      drawCardMotif(icon, lvl, -w / 2 + 14, -h / 2 + 10, 36, 36, 8, 8);
      card.add(icon);
    } else {
      const band = this.add.graphics();
      drawCardMotif(band, lvl, -w / 2, -h / 2, w, 56, r, 0);
      card.add(band);
    }

    // Order number on a small dark chip (readable over any preview colour)
    const chip = this.add.graphics();
    chip.fillStyle(0x0a0f1a, 0.72);
    chip.fillRoundedRect(w / 2 - 14 - 40, -h / 2 + 8, 40, 22, 6);
    card.add(chip);
    const order = this.add
      .text(w / 2 - 14 - 20, -h / 2 + 19, `0${lvl.order}`, { fontFamily: "ui-monospace, monospace", fontSize: `${m.orderSize}px`, color: "#c9d6ea" })
      .setOrigin(0.5);
    card.add(order);

    // Name — compact floor 16 px (approved: the live build's ~7 px phone name was a bug)
    const nameSize = Math.max(16, m.nameSize);
    const nameY = compact ? -h / 2 + 52 : -h / 2 + 56 + 14;
    const name = this.add
      .text(0, nameY, lvl.name, { fontFamily: "ui-sans-serif, system-ui", fontSize: `${nameSize}px`, color: "#e8eef8", fontStyle: "bold", align: "center", wordWrap: { width: w - 28 } })
      .setOrigin(0.5, 0);
    card.add(name);

    if (m.showBlurb) {
      const blurb = this.add
        .text(0, nameY + nameSize + 8, lvl.win.biologyLine, { fontFamily: "ui-sans-serif, system-ui", fontSize: `${m.blurbSize}px`, color: "#8fb6ff", fontStyle: "italic", align: "center", wordWrap: { width: w - 36 } })
        .setOrigin(0.5, 0);
      card.add(blurb);
    }

    if (lvl.unlocked) {
      const play = this.makePlayButton(0, m.playY, "PLAY", m.buttonWidth, m.buttonHeight, () => this.launch(lvl));
      card.add(play);
      if (wholeCardClickable) {
        // Invisible full-card launch rect (desktop modes only)
        const hit = this.add
          .rectangle(0, 0, w, h, 0xffffff, 0.001)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => this.launch(lvl));
        card.addAt(hit, 0);
      }
    } else {
      const locked = this.add
        .text(0, m.playY, "Coming Soon", { fontFamily: "ui-sans-serif, system-ui", fontSize: "14px", color: "#5a6a80" })
        .setOrigin(0.5);
      card.add(locked);
    }
    return card;
  }

  private makePlayButton(
    x: number, y: number, label: string, bw: number, bh: number, cb: () => void,
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();
    const paint = (col: number, a: number): void => {
      bg.clear();
      bg.fillStyle(col, a);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    };
    paint(0xffd060, 0.95);
    c.add(bg);
    const t = this.add
      .text(0, 0, label, { fontFamily: "ui-sans-serif, system-ui", fontSize: `${Math.max(13, Math.round(bh * 0.42))}px`, color: "#1a1208", fontStyle: "bold" })
      .setOrigin(0.5);
    c.add(t);
    const hit = this.add
      .rectangle(0, 0, bw, bh, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (e: unknown) => {
        // Don't let the whole-card click rect (desktop) fire too
        const ev = e as { event?: { stopPropagation?: () => void } };
        ev.event?.stopPropagation?.();
        cb();
      })
      .on("pointerover", () => paint(0xffe79a, 1))
      .on("pointerout", () => paint(0xffd060, 0.95));
    c.add(hit);
    return c;
  }

  private launch(lvl: LevelDef): void {
    this.scene.start("level", { levelId: lvl.id });
  }
}
