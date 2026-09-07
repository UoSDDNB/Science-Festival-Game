import Phaser from "phaser";
import { LevelDef } from "../types";

/**
 * Living interior for the "inside of the body" (mast_cell level).
 * The static background (backgrounds.ts) paints the tissue + tunnel; this
 * module adds the MOVING parts, all procedural:
 *   - two lungs with a subtle breathing cycle (expand / contract)
 *   - bacteria / microbes drifting and wobbling through the tissue
 * Built only for the nasal_journey background (see LevelScene).
 */
export interface InteriorVisual {
  container: Phaser.GameObjects.Container;
  update(dt: number): void;
  destroy(): void;
}

interface Microbe {
  cont: Phaser.GameObjects.Container;
  baseX: number;
  baseY: number;
  ampX: number;
  ampY: number;
  speedX: number;
  speedY: number;
  phase: number;
  spin: number;
}

export function buildInterior(scene: Phaser.Scene, _def: LevelDef): InteriorVisual {
  const container = scene.add.container(0, 0);
  container.setDepth(1); // above the background texture, below heat overlay (2) + creatures (6)

  // --- Lungs (breathing) ---
  const lungs: Array<{ cont: Phaser.GameObjects.Container; phase: number }> = [];
  const lobe = (cx: number, cy: number, rx: number, ry: number, phase: number) => {
    const g = scene.add.graphics();
    g.fillStyle(0xe8a8a0, 0.92);
    g.fillEllipse(0, 0, rx * 2, ry * 2);
    g.lineStyle(3, 0x8a4a50, 0.4);
    g.strokeEllipse(0, 0, rx * 2, ry * 2);
    // bronchi hint
    g.lineStyle(3, 0x8a4a50, 0.3);
    g.lineBetween(0, -ry * 0.65, 0, ry * 0.7);
    g.lineBetween(0, -ry * 0.1, -rx * 0.55, -ry * 0.35);
    g.lineBetween(0, -ry * 0.1, rx * 0.55, -ry * 0.4);
    g.lineBetween(0, ry * 0.3, -rx * 0.4, ry * 0.55);
    g.lineBetween(0, ry * 0.3, rx * 0.4, ry * 0.55);
    const cont = scene.add.container(cx, cy);
    cont.add(g);
    container.add(cont);
    lungs.push({ cont, phase });
  };
  lobe(3350, 560, 150, 200, 0);
  lobe(3640, 600, 120, 170, 0.7);

  // --- Bacteria / microbes drifting in the tissue ---
  const microbes: Microbe[] = [];
  const spawnMicrobe = (baseX: number, baseY: number, kind: "rod" | "coccus" | "diplo", color: number) => {
    const g = scene.add.graphics();
    if (kind === "rod") {
      g.fillStyle(color, 0.8);
      g.fillRoundedRect(-14, -5, 28, 10, 5);
      g.fillStyle(0x2a4a3a, 0.5);
      g.fillCircle(4, 0, 3);
    } else if (kind === "coccus") {
      g.fillStyle(color, 0.8);
      g.fillCircle(0, 0, 8);
      g.fillStyle(0x2a4a3a, 0.5);
      g.fillCircle(2, -2, 2.5);
    } else {
      g.fillStyle(color, 0.8);
      g.fillCircle(-6, 0, 7);
      g.fillCircle(6, 0, 7);
      g.fillStyle(0x2a4a3a, 0.5);
      g.fillCircle(8, -2, 2.5);
    }
    const cont = scene.add.container(baseX, baseY);
    cont.add(g);
    container.add(cont);
    microbes.push({
      cont,
      baseX,
      baseY,
      ampX: 14 + Math.random() * 18,
      ampY: 10 + Math.random() * 16,
      speedX: 0.25 + Math.random() * 0.3,
      speedY: 0.3 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.6,
    });
  };
  // Positions stay inside the tissue tunnel (x 2500..3780, y ~330..800) and
  // clear of the mast cell at (3050, 560).
  spawnMicrobe(2540, 430, "rod", 0x8fd0a8);
  spawnMicrobe(2720, 690, "coccus", 0x7ac0b8);
  spawnMicrobe(2520, 620, "diplo", 0xa8d8b0);
  spawnMicrobe(2820, 380, "rod", 0x9ad0c0);
  spawnMicrobe(2950, 790, "coccus", 0x8fd0a8);
  spawnMicrobe(3500, 320, "diplo", 0x7ac0b8);
  spawnMicrobe(3720, 480, "rod", 0xa8d8b0);
  spawnMicrobe(3750, 760, "coccus", 0x9ad0c0);
  spawnMicrobe(2680, 500, "rod", 0x8fd0a8);

  let t = 0;
  const BREATH_PERIOD = 4.5; // seconds per full inhale+exhale

  return {
    container,
    update(dt: number) {
      t += dt;
      for (const l of lungs) {
        // Subtle breathing: ~4.5% scale, slightly out of phase per lobe
        const s = 1 + 0.045 * Math.sin((t / BREATH_PERIOD) * Math.PI * 2 + l.phase);
        l.cont.setScale(s);
      }
      for (const m of microbes) {
        m.cont.x = m.baseX + Math.sin(t * m.speedX + m.phase) * m.ampX;
        m.cont.y = m.baseY + Math.cos(t * m.speedY + m.phase * 1.3) * m.ampY;
        m.cont.rotation = Math.sin(t * m.spin + m.phase) * 0.5;
      }
    },
    destroy() {
      container.destroy(true);
    },
  };
}
