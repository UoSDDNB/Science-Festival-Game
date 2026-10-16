import Phaser from "phaser";
import { ANS_COPY } from "./config";
import { computeResultLayout, PANEL_CONTENT, PANEL_VEIL } from "../ui/resultLayout";
import type { DuelOutcome } from "./types";

/** End-of-round overlay — bradycardia, tachycardia, or homeostasis draw. */
export class AutonomicResultOverlay {
  private readonly root: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    outcome: DuelOutcome,
    onPlayAgain: () => void,
    onMenu: () => void,
  ) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const copy = outcomeCopy(outcome);
    const layout = computeResultLayout(scene, w, h, false, copy);

    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(PANEL_VEIL);
    const veil = scene.add.rectangle(w / 2, h / 2, w, h, 0x050810, 0.82);
    this.root.add(veil);

    const card = scene.add.container(w / 2, h / 2).setDepth(PANEL_CONTENT);
    const bg = scene.add.graphics();
    bg.fillStyle(0x111827, 0.96);
    bg.fillRoundedRect(-layout.cardW / 2, -layout.cardH / 2, layout.cardW, layout.cardH, layout.radius);
    bg.lineStyle(2, outcome === "p2_win" ? 0xff8a4a : outcome === "p1_win" ? 0x4fd1c5 : 0xc084fc, 0.8);
    bg.strokeRoundedRect(-layout.cardW / 2, -layout.cardH / 2, layout.cardW, layout.cardH, layout.radius);
    card.add(bg);

    card.add(
      scene.add
        .text(0, layout.titleY, copy.title, {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: `${layout.titleSize}px`,
          color: "#ffd86a",
          fontStyle: "bold",
          align: "center",
        })
        .setOrigin(0.5),
    );
    card.add(
      scene.add
        .text(0, layout.bodyY, copy.body, {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: `${layout.bodySize}px`,
          color: "#d8e8f8",
          align: "center",
          wordWrap: { width: layout.wrap },
        })
        .setOrigin(0.5),
    );
    card.add(
      scene.add
        .text(0, layout.bioY, copy.biology, {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: `${layout.bioSize}px`,
          color: "#9fb5d8",
          fontStyle: "italic",
          align: "center",
          wordWrap: { width: layout.wrap },
        })
        .setOrigin(0.5),
    );

    const againBtn = makeButton(scene, "Play Again", layout.btnW, layout.btnH, layout.btnFontSize, onPlayAgain);
    againBtn.setPosition(0, layout.btnY);
    card.add(againBtn);

    const menuBtn = makeButton(scene, "Menu", layout.btnW, layout.btnH, layout.btnFontSize, onMenu);
    menuBtn.setPosition(0, layout.stackButtons ? layout.btnY2 : layout.btnY + layout.btnH + 16);
    card.add(menuBtn);

    this.root.add(card);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}

function outcomeCopy(outcome: DuelOutcome): { title: string; body: string; biology: string } {
  switch (outcome) {
    case "p1_win":
      return { title: ANS_COPY.p1WinTitle, body: ANS_COPY.p1WinBody, biology: ANS_COPY.p1Biology };
    case "p2_win":
      return { title: ANS_COPY.p2WinTitle, body: ANS_COPY.p2WinBody, biology: ANS_COPY.p2Biology };
    default:
      return { title: ANS_COPY.drawTitle, body: ANS_COPY.drawBody, biology: ANS_COPY.drawBiology };
  }
}

function makeButton(
  scene: Phaser.Scene,
  label: string,
  w: number,
  h: number,
  fontSize: number,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const btn = scene.add.container(0, 0);
  const bg = scene.add.rectangle(0, 0, w, h, 0x18253c, 0.95);
  bg.setStrokeStyle(2, 0x4fd1c5, 0.6);
  bg.setInteractive({ useHandCursor: true });
  bg.on("pointerup", onClick);
  const txt = scene.add
    .text(0, 0, label, {
      fontFamily: "ui-sans-serif, system-ui",
      fontSize: `${fontSize}px`,
      color: "#ffffff",
    })
    .setOrigin(0.5);
  btn.add([bg, txt]);
  return btn;
}
