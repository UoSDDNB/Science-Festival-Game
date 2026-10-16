import Phaser from "phaser";
import { ImmuneLaunchData, ImmuneMode } from "./types";
import { IMMUNE_PALETTE } from "./config";
import { hexToInt } from "../visuals/palette";
import { addTissueBackground, viewportSize } from "./assets";

/**
 * Mode picker shown immediately after the Immune Rescue home card.
 * Single Player → AI bacteria. Two Player → same-screen co-op/versus roles.
 */
export class ImmuneModeSelectScene extends Phaser.Scene {
  private uiRoot: Phaser.GameObjects.Container | null = null;
  private tissueBg: Phaser.GameObjects.Image | null = null;
  private resizeTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("immune-mode-select");
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
    this.rebuild();
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("level-select"));
  }

  shutdown(): void {
    this.scale.off("resize", this.scheduleRebuild, this);
    window.removeEventListener("orientationchange", this.onOrientationChange);
    this.resizeTimer?.remove(false);
  }

  private scheduleRebuild = (): void => {
    this.resizeTimer?.remove(false);
    this.resizeTimer = this.time.delayedCall(80, () => this.rebuild());
  };

  private rebuild = (): void => {
    this.uiRoot?.destroy(true);
    this.tissueBg?.destroy();
    const { w, h } = viewportSize(this);
    this.cameras.main.setSize(w, h);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);

    // Cover-zoom tissue to this device's screen; rebuilt on resize/rotate.
    this.tissueBg = addTissueBackground(this, null, w, h);
    this.tissueBg.setDepth(0);

    this.uiRoot = this.add.container(0, 0).setDepth(1);

    const veil = this.add.rectangle(w / 2, h / 2, w, h, 0x070b14, 0.35);
    this.uiRoot.add(veil);

    this.uiRoot.add(
      this.add
        .text(w / 2, h * 0.14, "IMMUNE RESCUE", {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: `${Math.max(26, Math.round(w * 0.05))}px`,
          color: "#4fd1c5",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
    this.uiRoot.add(
      this.add
        .text(w / 2, h * 0.22, "Choose how the neutrophil hunts infection", {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: "19px",
          color: "#cfd8e8",
          align: "center",
          wordWrap: { width: w * 0.85 },
        })
        .setOrigin(0.5),
    );

    this.layoutModeCards(w, h);

    const back = this.add
      .text(24, 24, "← Menu", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "19px",
        color: "#cfd8e8",
        backgroundColor: "#0006",
        padding: { x: 10, y: 6 },
      })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("level-select"));
    this.uiRoot.add(back);
  };

  /** Stack or side-by-side cards with guaranteed spacing on any viewport. */
  private layoutModeCards(w: number, h: number): void {
    const headerBottom = h * 0.22 + 36;
    const bottomPad = 32;
    const gap = Math.max(16, Math.min(28, h * 0.03));
    const availableH = Math.max(120, h - headerBottom - bottomPad);
    const cardW = Math.min(360, w - 48);
    const sideBySideMinW = cardW * 2 + gap + 48;
    const stack = w < sideBySideMinW || h < 520;

    const cardH = stack
      ? Math.min(168, Math.floor((availableH - gap) / 2))
      : Math.min(220, availableH - 8);

    const single = {
      mode: "single" as ImmuneMode,
      title: "Single Player",
      blurb: "You steer the neutrophil. Bacteria spread on their own.",
    };
    const two = {
      mode: "two" as ImmuneMode,
      title: "Two Player",
      blurb: "P1: neutrophil. P2: seed colonies & scent decoys.",
    };

    if (stack) {
      const blockH = cardH * 2 + gap;
      const firstCy = headerBottom + (availableH - blockH) / 2 + cardH / 2;
      this.makeModeCard(w / 2, firstCy, cardW, cardH, single.mode, single.title, single.blurb);
      this.makeModeCard(w / 2, firstCy + cardH + gap, cardW, cardH, two.mode, two.title, two.blurb);
      return;
    }

    const centerY = headerBottom + availableH / 2;
    const halfSpan = cardW + gap / 2;
    this.makeModeCard(w / 2 - halfSpan, centerY, cardW, cardH, single.mode, single.title, single.blurb);
    this.makeModeCard(w / 2 + halfSpan, centerY, cardW, cardH, two.mode, two.title, two.blurb);
  }

  private makeModeCard(
    cx: number,
    cy: number,
    cw: number,
    ch: number,
    mode: ImmuneMode,
    title: string,
    blurb: string,
  ): void {
    const titleSize = ch < 150 ? 21 : 26;
    const blurbSize = ch < 150 ? 15 : 17;
    const card = this.add.container(cx, cy);
    const g = this.add.graphics();
    g.fillStyle(0x111a2a, 0.9);
    g.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 14);
    g.lineStyle(2, hexToInt(IMMUNE_PALETTE.accent), 0.85);
    g.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 14);
    card.add(g);
    card.add(
      this.add
        .text(0, -ch * 0.28, title, {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: `${titleSize}px`,
          color: "#e8eef8",
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: cw - 28 },
        })
        .setOrigin(0.5),
    );
    card.add(
      this.add
        .text(0, -ch * 0.06, blurb, {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: `${blurbSize}px`,
          color: "#9fb5d8",
          align: "center",
          wordWrap: { width: cw - 36 },
        })
        .setOrigin(0.5, 0),
    );
    const playH = Math.min(36, ch * 0.22);
    const playW = Math.min(160, cw * 0.55);
    const playY = ch * 0.28;
    const play = this.add
      .rectangle(0, playY, playW, playH, 0x4fd1c5, 0.95)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => this.startMode(mode));
    card.add(play);
    card.add(
      this.add
        .text(0, playY, "PLAY", {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: `${Math.max(16, playH * 0.44)}px`,
          color: "#0a1208",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
    this.uiRoot!.add(card);
  }

  private startMode(mode: ImmuneMode): void {
    const data: ImmuneLaunchData = { mode };
    this.scene.start("immune-rescue", data);
  }
}
