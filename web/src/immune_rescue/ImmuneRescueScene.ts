import Phaser from "phaser";
import { ImmuneLaunchData, ImmuneMode } from "./types";
import { IMMUNE_CONFIG, IMMUNE_FAIL, IMMUNE_PALETTE, IMMUNE_WIN } from "./config";
import { ChemotaxisField } from "./ChemotaxisField";
import { NeutrophilController } from "./NeutrophilController";
import { BacterialSystem } from "./BacterialSystem";
import { TissueHud } from "./TissueHud";
import { ImmuneAssistant } from "./ImmuneAssistant";
import { HeatOverlay } from "../visuals/heatOverlay";
import { buildNeutrophilAt } from "../visuals/creature";
import { addTissueBackground, zoomTissueToFill, viewportSize } from "./assets";
import { FailOverlay } from "../ui/FailOverlay";
import { WinOverlay } from "../ui/WinOverlay";
import { LevelDef } from "../types";

/**
 * Main Immune Rescue gameplay: steer a neutrophil along chemical gradients,
 * engulf bacterial colonies, protect tissue integrity.
 */
export class ImmuneRescueScene extends Phaser.Scene {
  private mode: ImmuneMode = "single";
  private tissueBg!: Phaser.GameObjects.Image;
  private worldLayer!: Phaser.GameObjects.Container;
  private chemotaxis!: ChemotaxisField;
  private heatOverlay!: HeatOverlay;
  private neutrophil!: ReturnType<typeof buildNeutrophilAt>;
  private controller!: NeutrophilController;
  private bacteria!: BacterialSystem;
  private hud!: TissueHud;
  private assistant!: ImmuneAssistant;
  /** Uniform fit scale so the whole playfield stays on-screen. */
  private worldScale = 1;
  private resizeTimer: Phaser.Time.TimerEvent | null = null;
  private done = false;
  private winOverlay: WinOverlay | null = null;
  private failOverlay: FailOverlay | null = null;

  constructor() {
    super("immune-rescue");
  }

  private onOrientationChange = (): void => {
    window.setTimeout(() => {
      this.scale.refresh();
      this.scheduleResize();
    }, 150);
  };

  init(data: ImmuneLaunchData): void {
    this.mode = data?.mode === "two" ? "two" : "single";
    this.done = false;
  }

  create(): void {
    const { w, h } = viewportSize(this);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);

    // Cover-zoom tissue to the player's screen; updated on every resize/rotate.
    this.tissueBg = addTissueBackground(this, null, w, h);
    this.tissueBg.setDepth(0);

    this.worldLayer = this.add.container(0, 0);
    this.worldLayer.setDepth(1);

    this.chemotaxis = new ChemotaxisField(IMMUNE_CONFIG.worldWidth, IMMUNE_CONFIG.worldHeight);
    this.heatOverlay = new HeatOverlay(this, this.chemotaxis.field, IMMUNE_CONFIG.worldWidth, {
      mode: "chemokine",
    });
    this.worldLayer.add(this.heatOverlay.image);

    this.neutrophil = buildNeutrophilAt(
      this,
      420,
      IMMUNE_CONFIG.worldHeight / 2,
      1,
      IMMUNE_PALETTE.neutrophil,
      IMMUNE_PALETTE.neutrophilAccent,
    );
    this.worldLayer.add(this.neutrophil.container);

    this.bacteria = new BacterialSystem(
      this,
      this.chemotaxis,
      this.worldLayer,
      this.mode,
      (sx, sy) => this.screenToWorld(sx, sy),
    );
    this.controller = new NeutrophilController(
      this,
      this.neutrophil.container,
      this.chemotaxis,
      this.mode,
      (sx, sy) => this.screenToWorld(sx, sy),
    );
    this.hud = new TissueHud(this, this.mode);
    this.assistant = new ImmuneAssistant(this, this.worldLayer);

    this.makeBackButton();
    this.scale.on("resize", this.scheduleResize, this);
    window.addEventListener("orientationchange", this.onOrientationChange);
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("level-select"));
    this.handleResize();
  }

  update(_time: number, deltaMs: number): void {
    if (this.done) return;
    const dt = Math.min(0.05, deltaMs / 1000);

    this.controller.update(dt);
    this.bacteria.update(dt, this.controller.x, this.controller.y);
    this.chemotaxis.update(dt);
    this.heatOverlay.update();

    const signal = this.chemotaxis.getSignal(this.controller.x, this.controller.y);
    this.neutrophil.setLifeSignal(Math.min(1, signal / 60));

    this.bacteria.tryEngulf(
      this.controller.x,
      this.controller.y,
      IMMUNE_CONFIG.neutrophilRadius,
    );

    this.hud.applyDamage(this.bacteria.infectionPressure() * dt);
    this.hud.setEngulfed(
      this.bacteria.engulfedCount,
      this.bacteria.winTarget,
      this.bacteria.colonyCount,
    );

    this.assistant.update(this.controller.x, this.controller.y, this.bacteria.listColonies());

    if (this.bacteria.engulfedCount >= IMMUNE_CONFIG.winEngulfCount) {
      this.handleWin();
    } else if (this.hud.tissueIntegrity <= 0) {
      this.handleFail();
    }
  }

  shutdown(): void {
    this.scale.off("resize", this.scheduleResize, this);
    window.removeEventListener("orientationchange", this.onOrientationChange);
    this.resizeTimer?.remove(false);
    this.controller?.destroy();
    this.bacteria?.destroy();
    this.hud?.destroy();
    this.assistant?.destroy();
    this.heatOverlay?.destroy();
    this.chemotaxis?.destroy();
    this.winOverlay?.destroy();
    this.failOverlay?.destroy();
  }

  private scheduleResize = (): void => {
    this.resizeTimer?.remove(false);
    this.resizeTimer = this.time.delayedCall(80, () => this.handleResize());
  };

  private handleResize = (): void => {
    const { w, h } = viewportSize(this);
    this.cameras.main.setSize(w, h);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);

    // Re-zoom tissue to cover whatever screen the player is on.
    zoomTissueToFill(this.tissueBg, w, h);

    // Fit the 1920×1080 playfield inside the screen (letterbox if needed).
    this.worldScale = Math.min(w / IMMUNE_CONFIG.worldWidth, h / IMMUNE_CONFIG.worldHeight);
    const ox = (w - IMMUNE_CONFIG.worldWidth * this.worldScale) / 2;
    const oy = (h - IMMUNE_CONFIG.worldHeight * this.worldScale) / 2;
    this.worldLayer.setScale(this.worldScale);
    this.worldLayer.setPosition(ox, oy);
  };

  private screenToWorld(sx: number, sy: number): [number, number] {
    const wx = (sx - this.worldLayer.x) / this.worldScale;
    const wy = (sy - this.worldLayer.y) / this.worldScale;
    return [wx, wy];
  }

  /** Expose for BacterialSystem two-player taps after camera transform. */
  getWorldPoint(sx: number, sy: number): [number, number] {
    return this.screenToWorld(sx, sy);
  }

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
          fontSize: "16px",
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
    this.chemotaxis.field.frozen = true;
    const fakeDef = this.overlayDef(IMMUNE_WIN.title, IMMUNE_WIN.body, IMMUNE_WIN.biologyLine);
    this.winOverlay = new WinOverlay(
      this,
      fakeDef,
      () => this.scene.start("immune-mode-select"),
      () => this.scene.start("level-select"),
    );
  }

  private handleFail(): void {
    if (this.done) return;
    this.done = true;
    this.chemotaxis.field.frozen = true;
    this.failOverlay = new FailOverlay(
      this,
      {
        triggerSeconds: 0,
        title: IMMUNE_FAIL.title,
        body: IMMUNE_FAIL.body,
        biologyLine: IMMUNE_FAIL.biologyLine,
      },
      () => this.scene.start("immune-rescue", { mode: this.mode } satisfies ImmuneLaunchData),
      () => this.scene.start("level-select"),
    );
  }

  private overlayDef(title: string, body: string, biologyLine: string): LevelDef {
    return {
      id: "immune_rescue",
      name: "Immune Rescue",
      order: 99,
      unlocked: true,
      background: "tissue",
      palette: {
        bgTop: IMMUNE_PALETTE.bgTop,
        bgBottom: IMMUNE_PALETTE.bgBottom,
        ground: IMMUNE_PALETTE.ground,
        groundAccent: IMMUNE_PALETTE.groundAccent,
        fire: IMMUNE_PALETTE.accent,
        fireHot: "#a8fff0",
        obstacle: "#804050",
        creature: IMMUNE_PALETTE.neutrophil,
        creatureAccent: IMMUNE_PALETTE.neutrophilAccent,
        accent: IMMUNE_PALETTE.accent,
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
