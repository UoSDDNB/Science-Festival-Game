import Phaser from "phaser";

/**
 * Sneeze cutscene — full-screen, procedurally drawn.
 * Plays on a successful mast-cell activation: face profile mid-sneeze,
 * mouth open, eyes shut, droplets flying out, big "ACHOO!" text.
 * Plays a quick zoom + screen flash, then opens the WinOverlay text panel.
 */
export class SneezeCutscene {
  private readonly scene: Phaser.Scene;
  private readonly veil: Phaser.GameObjects.Rectangle;
  private readonly container: Phaser.GameObjects.Container;
  private destroyed = false;

  constructor(scene: Phaser.Scene, onDone: () => void) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;

    // Quick white flash that fades to the cutscene
    const flash = scene.add
      .rectangle(0, 0, w, h, 0xffffff, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(2400);
    scene.tweens.add({ targets: flash, alpha: 0, duration: 350, onComplete: () => flash.destroy() });

    this.veil = scene.add
      .rectangle(0, 0, w, h, 0x150818, 0.6)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(2300);

    this.container = scene.add.container(w / 2, h / 2).setScrollFactor(0).setDepth(2310);
    this.container.setAlpha(0);

    // Build a stylised side-profile face mid-sneeze, sized to ~70% of viewport height.
    const scale = Math.min(w, h) / 1080 * 1.4;
    const face = scene.add.graphics();
    // Head outline
    face.fillStyle(0xf5d8c0, 1);
    face.fillEllipse(40, 0, 540 * scale, 720 * scale);
    face.fillEllipse(-120, -180 * scale, 200 * scale, 240 * scale); // forehead
    // Neck
    face.fillRect(-40 * scale, 320 * scale, 200 * scale, 200 * scale);
    // Nose
    face.beginPath();
    face.moveTo(-100 * scale, -40 * scale);
    face.lineTo(-260 * scale, 30 * scale);
    face.lineTo(-100 * scale, 90 * scale);
    face.lineTo(-60 * scale, 40 * scale);
    face.closePath();
    face.fillPath();
    // Nostril
    face.fillStyle(0x4a2030, 1);
    face.fillEllipse(-200 * scale, 60 * scale, 36 * scale, 24 * scale);
    // Mouth wide open
    face.fillStyle(0x3a0a18, 1);
    face.fillEllipse(-80 * scale, 220 * scale, 220 * scale, 180 * scale);
    // Inner mouth highlight (uvula hint)
    face.fillStyle(0xff6080, 0.85);
    face.fillEllipse(-80 * scale, 200 * scale, 40 * scale, 60 * scale);
    // Eyes squeezed shut — thick curves
    face.lineStyle(8 * scale, 0x4a2818, 1);
    face.beginPath();
    face.moveTo(50 * scale, -110 * scale);
    face.lineTo(170 * scale, -100 * scale);
    face.lineTo(50 * scale, -90 * scale); // V-shape squint
    face.strokePath();
    // Eyebrow furrowed
    face.fillStyle(0x4a2818, 1);
    face.beginPath();
    face.moveTo(60 * scale, -150 * scale);
    face.lineTo(180 * scale, -160 * scale);
    face.lineTo(190 * scale, -130 * scale);
    face.lineTo(70 * scale, -130 * scale);
    face.closePath();
    face.fillPath();
    // Hair / scalp
    face.fillStyle(0x3a2418, 1);
    face.fillEllipse(80 * scale, -260 * scale, 460 * scale, 220 * scale);
    face.fillEllipse(220 * scale, -180 * scale, 200 * scale, 200 * scale);

    // Motion lines around the head (sneeze shock)
    face.lineStyle(6 * scale, 0xfff5e0, 0.5);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i / 7) * Math.PI * 1.2;
      const r0 = 360 * scale;
      const r1 = 460 * scale + Math.random() * 40 * scale;
      face.lineBetween(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1);
    }
    this.container.add(face);

    // ACHOO! text floating out
    const text = scene.add.text(-320 * scale, -200 * scale, "AAA-CHOO!", {
      fontFamily: "ui-sans-serif, system-ui",
      fontSize: `${Math.round(64 * scale)}px`,
      color: "#ffe860",
      fontStyle: "bold",
      stroke: "#a00018",
      strokeThickness: Math.max(2, 6 * scale),
    }).setOrigin(0.5);
    text.setAngle(-12);
    this.container.add(text);

    // Droplet particle burst from the mouth/nose
    const dropOrigin = new Phaser.Math.Vector2(-200 * scale, 100 * scale);
    for (let i = 0; i < 24; i++) {
      const ang = -Math.PI + (Math.random() - 0.5) * Math.PI * 1.2;
      const dist = (220 + Math.random() * 380) * scale;
      const drop = scene.add.image(dropOrigin.x, dropOrigin.y, "spark");
      drop.setBlendMode(Phaser.BlendModes.ADD);
      drop.setTint(Math.random() < 0.5 ? 0xb8e0ff : 0xfff5d0);
      drop.setScale((0.4 + Math.random() * 0.5) * scale);
      this.container.add(drop);
      scene.tweens.add({
        targets: drop,
        x: dropOrigin.x + Math.cos(ang) * dist,
        y: dropOrigin.y + Math.sin(ang) * dist + Math.random() * 80 * scale,
        alpha: 0,
        duration: 800 + Math.random() * 600,
        ease: "Cubic.Out",
        onComplete: () => drop.destroy(),
      });
    }

    // Punch zoom-in then settle
    this.container.setScale(0.6);
    scene.tweens.add({ targets: this.container, alpha: 1, scale: 1, duration: 350, ease: "Back.Out" });

    // Subtle shake on the cutscene container
    let t = 0;
    const wobble = scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        t += 0.016;
        this.container.x = w / 2 + Math.sin(t * 30) * 4;
        this.container.y = h / 2 + Math.cos(t * 27) * 4;
      },
    });

    scene.time.delayedCall(900, () => {
      wobble.remove(false);
      if (!this.destroyed) onDone();
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.veil.destroy();
    this.container.destroy();
  }
}
