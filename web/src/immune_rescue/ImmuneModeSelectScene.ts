import Phaser from "phaser";
import { ImmuneLaunchData, ImmuneMode } from "./types";
import { IMMUNE_PALETTE } from "./config";
import { hexToInt } from "../visuals/palette";
import { drawTissueBackdrop } from "../visuals/backgrounds";

/**
 * Mode picker shown immediately after the Immune Rescue home card.
 * Single Player → AI bacteria. Two Player → same-screen co-op/versus roles.
 */
export class ImmuneModeSelectScene extends Phaser.Scene {
  private uiRoot: Phaser.GameObjects.Container | null = null;

  constructor() {
    super("immune-mode-select");
  }

  create(): void {
    this.scale.on("resize", this.rebuild, this);
    this.rebuild();
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("level-select"));
  }

  shutdown(): void {
    this.scale.off("resize", this.rebuild, this);
  }

  private rebuild = (): void => {
    this.uiRoot?.destroy(true);
    const w = this.scale.width;
    const h = this.scale.height;
    this.uiRoot = this.add.container(0, 0);

    const bg = this.add.graphics();
    drawTissueBackdrop(bg, w, h, IMMUNE_PALETTE);
    this.uiRoot.add(bg);

    const veil = this.add.rectangle(w / 2, h / 2, w, h, 0x070b14, 0.35);
    this.uiRoot.add(veil);

    this.uiRoot.add(
      this.add
        .text(w / 2, h * 0.14, "IMMUNE RESCUE", {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: `${Math.max(22, Math.round(w * 0.045))}px`,
          color: "#4fd1c5",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
    this.uiRoot.add(
      this.add
        .text(w / 2, h * 0.22, "Choose how the neutrophil hunts infection", {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: "16px",
          color: "#cfd8e8",
          align: "center",
          wordWrap: { width: w * 0.85 },
        })
        .setOrigin(0.5),
    );

    const cardW = Math.min(340, w * 0.42);
    const cardH = Math.min(220, h * 0.38);
    const gap = 28;
    const y = h * 0.52;
    if (w < 700) {
      this.makeModeCard(w / 2, h * 0.42, Math.min(w * 0.86, 360), 150, "single", "Single Player", "You steer the neutrophil. Bacteria spread on their own.");
      this.makeModeCard(w / 2, h * 0.68, Math.min(w * 0.86, 360), 150, "two", "Two Player", "P1: neutrophil. P2: seed colonies & scent decoys.");
    } else {
      this.makeModeCard(w / 2 - cardW / 2 - gap / 2, y, cardW, cardH, "single", "Single Player", "You steer the neutrophil. Bacteria spread on their own.");
      this.makeModeCard(w / 2 + cardW / 2 + gap / 2, y, cardW, cardH, "two", "Two Player", "P1: neutrophil. P2: seed colonies & scent decoys.");
    }

    const back = this.add
      .text(24, 24, "← Menu", {
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: "16px",
        color: "#cfd8e8",
        backgroundColor: "#0006",
        padding: { x: 10, y: 6 },
      })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("level-select"));
    this.uiRoot.add(back);
  };

  private makeModeCard(
    cx: number,
    cy: number,
    cw: number,
    ch: number,
    mode: ImmuneMode,
    title: string,
    blurb: string,
  ): void {
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
          fontSize: "22px",
          color: "#e8eef8",
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: cw - 28 },
        })
        .setOrigin(0.5),
    );
    card.add(
      this.add
        .text(0, 0, blurb, {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: "14px",
          color: "#9fb5d8",
          align: "center",
          wordWrap: { width: cw - 36 },
        })
        .setOrigin(0.5, 0),
    );
    const play = this.add
      .rectangle(0, ch * 0.32, Math.min(160, cw * 0.55), 40, 0x4fd1c5, 0.95)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.startMode(mode));
    card.add(play);
    card.add(
      this.add
        .text(0, ch * 0.32, "PLAY", {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: "16px",
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
