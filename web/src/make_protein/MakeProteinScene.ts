import Phaser from "phaser";
import { PROTEIN_CONFIG, PROTEIN_FAIL, PROTEIN_PALETTE, PROTEIN_WIN, TARGET_SEQUENCE } from "./config";
import { viewportSize, playSpriteMetrics, rebuildPlayAaTextures } from "./assets";
import { computeProteinLayout } from "./layout";
import { ProteinIntroOverlay } from "./ProteinIntroOverlay";
import { ProteinHud, computeSeqBarBounds, proteinHudMetrics } from "./ProteinHud";
import { StructurePanel } from "./StructurePanel";
import { AlphaFoldPanel } from "./AlphaFoldPanel";
import { RibosomeStrip } from "./RibosomeStrip";
import { ChainController } from "./ChainController";
import { AminoAcidSpawner } from "./AminoAcidSpawner";
import { FailOverlay } from "../ui/FailOverlay";
import { WinOverlay } from "../ui/WinOverlay";
import { LevelDef } from "../types";
import type { AminoAcidCode } from "./types";

/**
 * Make that protein! — build insulin guided by AlphaFold predictions.
 */
export class MakeProteinScene extends Phaser.Scene {
  private bg!: Phaser.GameObjects.Graphics;
  private playFrame!: Phaser.GameObjects.Graphics;
  private structure!: StructurePanel;
  private alphaFold!: AlphaFoldPanel;
  private ribosome!: RibosomeStrip;
  private spawner!: AminoAcidSpawner;
  private chain!: ChainController;
  private hud!: ProteinHud;
  private intro: ProteinIntroOverlay | null = null;
  private pausedForIntro = true;
  private done = false;
  private winOverlay: WinOverlay | null = null;
  private failOverlay: FailOverlay | null = null;
  private sequence = "M";
  private nextIndex = 0;
  private wrongCount = 0;
  private collectRadius = 40;
  private playSpriteW = 56;
  private resizeTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("make-protein");
  }

  private onOrientationChange = (): void => {
    window.setTimeout(() => {
      this.scale.refresh();
      this.scheduleResize();
    }, 150);
  };

  create(): void {
    this.done = false;
    this.winOverlay = null;
    this.failOverlay = null;
    this.sequence = "M";
    this.nextIndex = 0;
    this.wrongCount = 0;
    this.pausedForIntro = true;

    this.bg = this.add.graphics().setScrollFactor(0).setDepth(0);
    this.playFrame = this.add.graphics().setScrollFactor(0).setDepth(1040);

    this.structure = new StructurePanel(this);
    this.alphaFold = new AlphaFoldPanel(this);
    this.ribosome = new RibosomeStrip(this);
    this.chain = new ChainController(this);
    this.spawner = new AminoAcidSpawner(this, this.chain);
    this.hud = new ProteinHud(this);
    this.chain.setInputBlocked(() => this.pausedForIntro || this.done);

    this.intro = new ProteinIntroOverlay(this, () => {
      this.pausedForIntro = false;
      this.intro = null;
      this.beginRound();
    });

    this.makeBackButton();
    this.scale.on("resize", this.scheduleResize, this);
    window.addEventListener("orientationchange", this.onOrientationChange);
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("level-select"));
    this.handleResize();
  }

  update(_time: number, deltaMs: number): void {
    if (this.done || this.pausedForIntro) return;
    const dt = Math.min(0.05, deltaMs / 1000);
    this.chain.update(dt);
    this.spawner.update(dt);
    this.tryCollect();
  }

  shutdown(): void {
    this.scale.off("resize", this.scheduleResize, this);
    window.removeEventListener("orientationchange", this.onOrientationChange);
    this.resizeTimer?.remove(false);
    this.intro?.destroy();
    this.structure?.destroy();
    this.alphaFold?.destroy();
    this.ribosome?.destroy();
    this.spawner?.destroy();
    this.chain?.destroy();
    this.hud?.destroy();
    this.winOverlay?.destroy();
    this.failOverlay?.destroy();
  }

  private beginRound(): void {
    this.sequence = "M";
    this.nextIndex = 0;
    this.wrongCount = 0;
    this.syncUi();
    const layout = computeProteinLayout(viewportSize(this).w, viewportSize(this).h);
    const zoneTop = layout.play.top + 8;
    const zoneH = Math.max(80, layout.play.height - layout.ribosomeStripH - 8);
    this.applyPlaySpriteLayout(layout.play, zoneTop, zoneH);
    this.chain.centerInZone();
    this.spawner.setChoiceSpriteWidth(this.playSpriteW);
    this.spawner.refreshRound();
  }

  /** Keep M and floating choices on one shared play-field sprite size. */
  private applyPlaySpriteLayout(
    play: { left: number; top: number; width: number; height: number },
    zoneTop: number,
    zoneH: number,
  ): void {
    const spriteMetrics = playSpriteMetrics(play.width, zoneH);
    this.playSpriteW = spriteMetrics.spriteW;
    this.collectRadius = spriteMetrics.collectRadius;
    rebuildPlayAaTextures(this, this.playSpriteW);
    this.spawner.layout(play, zoneTop, zoneH);
    this.chain.layout({
      play,
      zoneTop,
      zoneH,
      headSpriteW: this.playSpriteW,
    });
    this.spawner.setChoiceSpriteWidth(this.playSpriteW);
  }

  /** Re-sync floating choice size from M before spawning a new set. */
  private syncChoiceSizeFromChain(): void {
    this.spawner.setChoiceSpriteWidth(this.chain.getHeadSpriteW());
  }

  private syncUi(): void {
    this.hud.setSequence(this.sequence);
    this.hud.setWrong(this.wrongCount, PROTEIN_CONFIG.maxWrong);
    this.structure.setSequence(this.sequence);
    this.alphaFold.setNextIndex(this.nextIndex);
    this.ribosome.setSequence(this.sequence);
    this.chain.setSequence(this.sequence);
    this.spawner.setTarget(this.currentTarget());
  }

  private syncUiWithoutChain(): void {
    this.hud.setSequence(this.sequence);
    this.hud.setWrong(this.wrongCount, PROTEIN_CONFIG.maxWrong);
    this.structure.setSequence(this.sequence);
    this.alphaFold.setNextIndex(this.nextIndex);
    this.ribosome.setSequence(this.sequence);
    this.spawner.setTarget(this.currentTarget());
  }

  private currentTarget(): AminoAcidCode | null {
    if (this.nextIndex >= TARGET_SEQUENCE.length) return null;
    return TARGET_SEQUENCE[this.nextIndex] as AminoAcidCode;
  }

  private tryCollect(): void {
    if (!this.chain.isPlayerDragging()) return;
    const target = this.currentTarget();
    if (!target) return;
    const radius = this.collectRadius;
    for (const acid of this.spawner.list()) {
      const dx = acid.worldX - this.chain.x;
      const dy = acid.worldY - this.chain.y;
      if (Math.hypot(dx, dy) > radius) continue;

      if (acid.code === target) {
        this.spawner.remove(acid.id);
        this.sequence += acid.code;
        this.nextIndex += 1;
        this.ribosome.playAddAnimation();
        if (this.nextIndex >= TARGET_SEQUENCE.length) {
          this.syncUi();
          this.handleWin();
        } else {
          this.chain.setSequence(this.sequence);
          this.spawner.setChoiceSpriteWidth(this.chain.getHeadSpriteW());
          this.spawner.refreshRound();
          this.syncUiWithoutChain();
        }
      } else {
        this.wrongCount += 1;
        this.hud.setWrong(this.wrongCount, PROTEIN_CONFIG.maxWrong);
        this.spawner.popWrong(acid.id);
        this.cameras.main.flash(120, 80, 20, 20, false);
        if (this.wrongCount >= PROTEIN_CONFIG.maxWrong) {
          this.handleFail();
        }
      }
      break;
    }
  }

  private scheduleResize = (): void => {
    this.resizeTimer?.remove(false);
    this.resizeTimer = this.time.delayedCall(80, () => this.handleResize());
  };

  private handleResize = (): void => {
    const { w, h } = viewportSize(this);
    this.cameras.main.setSize(w, h);

    this.bg.clear();
    const top = 0x080d1c;
    const bot = 0x18253c;
    for (let i = 0; i < 40; i++) {
      const t = i / 39;
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(top),
        Phaser.Display.Color.ValueToColor(bot),
        39,
        i,
      );
      this.bg.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1);
      this.bg.fillRect(0, (i * h) / 40, w, h / 40 + 1);
    }

    const layout = computeProteinLayout(w, h);
    const metrics = proteinHudMetrics(w, h);
    const panelTitle = metrics.labelSize;
    const panelSub = Math.max(12, Math.round(metrics.labelSize * 0.78));

    this.structure.layout(layout.structure, panelTitle, panelSub);
    this.alphaFold.layout(layout.alphaFold, panelTitle, panelSub);

    this.playFrame.clear();
    this.playFrame.fillStyle(0x0a1424, 0.5);
    this.playFrame.fillRoundedRect(layout.play.left, layout.play.top, layout.play.width, layout.play.height, 12);
    this.playFrame.lineStyle(2, 0x4fd1c5, 0.35);
    this.playFrame.strokeRoundedRect(layout.play.left, layout.play.top, layout.play.width, layout.play.height, 12);

    this.ribosome.layout(layout.play, layout.ribosomeStripH);
    const zoneTop = layout.play.top + 8;
    const zoneH = Math.max(80, layout.play.height - layout.ribosomeStripH - 8);
    this.applyPlaySpriteLayout(layout.play, zoneTop, zoneH);

    const seqBar = computeSeqBarBounds(w, h, layout.play.top);
    this.hud.applyLayout(seqBar, layout.hintBox, metrics);
  };

  private makeBackButton(): void {
    const btn = this.add.container(80, 40).setScrollFactor(0).setDepth(1500);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(-60, -20, 120, 40, 8);
    g.lineStyle(1, 0xffffff, 0.25);
    g.strokeRoundedRect(-60, -20, 120, 40, 8);
    btn.add(g);
    btn.add(
      this.add
        .text(0, 0, "← Menu", {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: "20px",
          color: "#cfd8e8",
        })
        .setOrigin(0.5),
    );
    btn.add(
      this.add
        .rectangle(0, 0, 120, 40, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.scene.start("level-select")),
    );
  }

  private handleWin(): void {
    if (this.done) return;
    this.done = true;
    this.winOverlay = new WinOverlay(
      this,
      this.overlayDef(PROTEIN_WIN.title, PROTEIN_WIN.body, PROTEIN_WIN.biologyLine),
      () => this.scene.restart(),
      () => this.scene.start("level-select"),
    );
  }

  private handleFail(): void {
    if (this.done) return;
    this.done = true;
    this.failOverlay = new FailOverlay(
      this,
      {
        triggerSeconds: 0,
        title: PROTEIN_FAIL.title,
        body: PROTEIN_FAIL.body,
        biologyLine: PROTEIN_FAIL.biologyLine,
      },
      () => this.scene.restart(),
      () => this.scene.start("level-select"),
    );
  }

  private overlayDef(title: string, body: string, biologyLine: string): LevelDef {
    return {
      id: "make_protein",
      name: "Make that protein!",
      order: 100,
      unlocked: true,
      background: "tissue",
      palette: {
        bgTop: PROTEIN_PALETTE.bgTop,
        bgBottom: PROTEIN_PALETTE.bgBottom,
        ground: "#1a2538",
        groundAccent: "#2a3548",
        fire: PROTEIN_PALETTE.accent,
        fireHot: "#a8fff0",
        obstacle: "#804050",
        creature: "#d8e8f8",
        creatureAccent: "#4a6a9a",
        accent: PROTEIN_PALETTE.accent,
      },
      fire: { x: 0, y: 0, tapRadius: 1 },
      creature: { x: 0, y: 0, kind: "neutrophil", size: 1 },
      sim: {
        diffusion: 0.08,
        dissipation: 0.01,
        sourceHeat: 0,
        targetRadius: 2,
        tapHeat: 0,
        dragHeat: 0,
        decayPerSec: 0,
      },
      win: {
        minHeat: 0,
        maxHeat: 100,
        dangerHeat: 100,
        sustainSeconds: 0,
        title,
        body,
        biologyLine,
      },
      hints: { drag: "" },
    };
  }
}
