import Phaser from "phaser";

/**
 * Progressive hint system. Stays silent unless the player gets stuck.
 * Each hint shown at most once and dismissed the moment the gesture is performed.
 */
export class HintSystem {
  private readonly scene: Phaser.Scene;
  private readonly label: Phaser.GameObjects.Text;
  private dragHintText = "Drag from the fire toward the creature";
  private tapHintText = "Tap the fire";
  private holdHintText = "Swirl around the fire to stoke it";
  private pinchHintText = "Spread two fingers (or press +) to boost heat";

  private elapsed = 0;
  private maxHeatSeen = 0;
  private hasTapped = false;
  private hasDragged = false;
  private hasHeld = false;
  private hasPinched = false;
  private hidden = true;
  private current: string | null = null;
  private shown = new Set<string>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.label = scene.add.text(scene.scale.width / 2, scene.scale.height * 0.78, "", {
      fontFamily: "ui-sans-serif, system-ui",
      fontSize: "26px",
      color: "#ffd5a0",
      align: "center",
      shadow: { offsetX: 0, offsetY: 2, color: "#000", blur: 6, fill: true },
    });
    this.label.setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(1100);
  }

  setDragHint(text: string): void {
    this.dragHintText = text;
  }
  setTapHint(text: string): void { this.tapHintText = text; }
  setHoldHint(text: string): void { this.holdHintText = text; }
  setPinchHint(text: string): void { this.pinchHintText = text; }

  notifyTap(): void { this.hasTapped = true; if (this.current === "tap") this.hide(); }
  notifyDrag(): void { this.hasDragged = true; if (this.current === "drag") this.hide(); }
  notifyHold(): void { this.hasHeld = true; if (this.current === "hold") this.hide(); }
  notifyPinch(): void { this.hasPinched = true; if (this.current === "pinch") this.hide(); }

  updateMaxHeat(h: number): void {
    if (h > this.maxHeatSeen) this.maxHeatSeen = h;
  }

  showWarning(text: string, color = "#ff5a44"): void {
    this.label.setColor(color);
    this.show("warn", text, 1500);
  }

  showEncouragement(text: string): void {
    this.label.setColor("#ffd86a");
    this.show("encourage", text, 1800);
  }

  resize(width: number, height: number): void {
    this.label.setPosition(width / 2, height * 0.78);
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (!this.hidden) return;

    if (!this.hasTapped && this.elapsed > 4 && !this.shown.has("tap")) {
      this.label.setColor("#ffd5a0");
      if (this.tapHintText) this.show("tap", this.tapHintText, 4500);
    } else if (this.hasTapped && !this.hasHeld && this.elapsed > 8 && !this.shown.has("hold")) {
      this.label.setColor("#ffd5a0");
      if (this.holdHintText) this.show("hold", this.holdHintText, 4500);
    } else if (this.hasTapped && !this.hasDragged && this.elapsed > 15 && !this.shown.has("drag")) {
      this.label.setColor("#ffd5a0");
      this.show("drag", this.dragHintText, 5000);
    } else if (this.hasDragged && this.maxHeatSeen < 35 && this.elapsed > 25 && !this.shown.has("pinch")) {
      this.label.setColor("#ffd5a0");
      if (this.pinchHintText) this.show("pinch", this.pinchHintText, 5000);
    }
  }

  destroy(): void {
    this.label.destroy();
  }

  private show(id: string, text: string, autoHideMs: number): void {
    this.shown.add(id);
    this.current = id;
    this.hidden = false;
    this.label.setText(text);
    this.scene.tweens.add({ targets: this.label, alpha: 1, duration: 350 });
    this.scene.time.delayedCall(autoHideMs, () => {
      if (this.current === id) this.hide();
    });
  }

  private hide(): void {
    this.hidden = true;
    this.current = null;
    this.scene.tweens.add({ targets: this.label, alpha: 0, duration: 300 });
  }
}
