import Phaser from "phaser";
import { AMINO_ACIDS, PROTEIN_CONFIG } from "./config";
import {
  displaySizeFromWidth,
  playAaTextureKey,
  rebuildPlayAaTextures,
} from "./assets";
import type { ChainController } from "./ChainController";
import type { AminoAcidCode, PlayBounds, SpawnedAcid } from "./types";

/** Three floating amino acid choices — target plus two decoys. */
export class AminoAcidSpawner {
  private readonly scene: Phaser.Scene;
  private readonly chain: ChainController;
  private readonly frame: Phaser.GameObjects.Graphics;
  private acids: SpawnedAcid[] = [];
  private labels: Map<number, Phaser.GameObjects.Text> = new Map();
  private nextId = 1;
  private playBounds: PlayBounds = { left: 0, top: 0, width: 100, height: 100 };
  private zoneTop = 0;
  private zoneH = 100;
  private spriteW = 56;
  private targetCode: AminoAcidCode | null = null;

  constructor(scene: Phaser.Scene, chain: ChainController) {
    this.scene = scene;
    this.chain = chain;
    this.frame = scene.add.graphics().setScrollFactor(0).setDepth(1050);
  }

  setTarget(code: AminoAcidCode | null): void {
    this.targetCode = code;
    this.refreshHighlights();
  }

  setChoiceSpriteWidth(width: number): void {
    const nextW = Math.round(Math.max(8, Math.min(120, width || 56)));
    const resized = nextW !== this.spriteW;
    this.spriteW = nextW;
    if (resized) {
      rebuildPlayAaTextures(this.scene, this.spriteW);
    }
    for (const acid of this.acids) {
      this.applyChoiceTexture(acid);
      this.syncLabel(acid);
    }
    this.refreshHighlights();
  }

  refreshRound(): void {
    this.clearAll();
    if (!this.targetCode) return;
    rebuildPlayAaTextures(this.scene, this.spriteW);

    const slots = this.choiceSlots();
    const codes: AminoAcidCode[] = [this.targetCode];
    while (codes.length < PROTEIN_CONFIG.maxFloating) {
      codes.push(randomDecoy(this.targetCode, codes));
    }
    Phaser.Utils.Array.Shuffle(codes);

    codes.forEach((code, i) => {
      const slot = slots[i]!;
      this.spawnAt(code, slot.x, slot.y);
    });
    this.refreshHighlights();
  }

  refillToThree(): void {
    if (!this.targetCode) return;
    rebuildPlayAaTextures(this.scene, this.spriteW);
    while (this.acids.length < PROTEIN_CONFIG.maxFloating) {
      const existing = this.acids.map((a) => a.code);
      const code = this.acids.some((a) => a.code === this.targetCode)
        ? randomDecoy(this.targetCode!, existing)
        : this.targetCode!;
      const slot = this.randomOpenSlot();
      this.spawnAt(code, slot.x, slot.y);
    }
    this.refreshHighlights();
  }

  layout(play: PlayBounds, zoneTop: number, zoneH: number): void {
    this.playBounds = play;
    this.zoneTop = zoneTop;
    this.zoneH = zoneH;
    this.frame.clear();
    this.frame.fillStyle(0x0a1424, 0.35);
    this.frame.fillRoundedRect(play.left, zoneTop, play.width, zoneH, 10);
    this.frame.lineStyle(1.5, 0x4fd1c5, 0.25);
    this.frame.strokeRoundedRect(play.left, zoneTop, play.width, zoneH, 10);
    this.relayoutAcids();
  }

  update(_dt: number): void {
    for (const acid of this.acids) {
      this.syncSpritePosition(acid, _dt);
      this.applyChoiceTexture(acid);
      this.syncLabel(acid);
    }
  }

  list(): readonly SpawnedAcid[] {
    return this.acids;
  }

  remove(id: number): void {
    const idx = this.acids.findIndex((a) => a.id === id);
    if (idx < 0) return;
    this.labels.get(id)?.destroy();
    this.labels.delete(id);
    this.acids[idx]!.sprite.destroy();
    this.acids.splice(idx, 1);
  }

  popWrong(id: number): void {
    const acid = this.acids.find((a) => a.id === id);
    if (!acid) return;
    const label = this.labels.get(id);
    this.scene.tweens.add({
      targets: label ? [acid.sprite, label] : acid.sprite,
      alpha: 0,
      duration: 220,
      onComplete: () => {
        this.remove(id);
        this.refillToThree();
      },
    });
  }

  destroy(): void {
    this.clearAll();
    this.frame.destroy();
  }

  private clearAll(): void {
    for (const label of this.labels.values()) label.destroy();
    this.labels.clear();
    this.acids.length = 0;
    this.chain.clearChoices();
  }

  private choiceSlots(): Array<{ x: number; y: number }> {
    const size = displaySizeFromWidth(this.spriteW);
    const padX = size.w * 0.65;
    const yMid = this.zoneTop + this.zoneH * 0.5;
    const left = this.playBounds.left + this.playBounds.width * 0.48;
    const right = this.playBounds.left + this.playBounds.width - padX;
    const mid = (left + right) / 2;
    return [
      { x: left, y: yMid - this.zoneH * 0.16 },
      { x: mid, y: yMid + this.zoneH * 0.12 },
      { x: right, y: yMid - this.zoneH * 0.12 },
    ];
  }

  private randomOpenSlot(): { x: number; y: number } {
    const slots = this.choiceSlots();
    const used = this.acids.map((a) => ({ x: a.worldX, y: a.worldY }));
    for (const slot of Phaser.Utils.Array.Shuffle([...slots])) {
      if (!used.some((u) => Math.hypot(u.x - slot.x, u.y - slot.y) < this.spriteW)) {
        return slot;
      }
    }
    return slots[this.acids.length % slots.length]!;
  }

  private relayoutAcids(): void {
    const slots = this.choiceSlots();
    this.acids.forEach((acid, i) => {
      const slot = slots[i] ?? slots[slots.length - 1]!;
      acid.worldX = slot.x;
      acid.worldY = slot.y;
      this.applyChoiceTexture(acid);
      this.applyWorldPosition(acid);
      this.syncLabel(acid);
    });
  }

  /** Pre-baked play texture at scale 1 — same pixel size as M. */
  private spawnAt(code: AminoAcidCode, worldX: number, worldY: number): void {
    if (this.acids.length >= PROTEIN_CONFIG.maxFloating) return;
    const key = playAaTextureKey(code, this.spriteW);
    const img = this.scene.make.image({
      x: 0,
      y: 0,
      key,
      origin: 0.5,
      add: false,
    });
    this.chain.getChoiceLayer().add(img);
    img.setScale(1);
    const size = displaySizeFromWidth(this.spriteW);
    const label = this.scene.add
      .text(worldX, worldY + size.h * 0.48, code, {
        fontFamily: "ui-monospace, monospace",
        fontSize: `${Math.max(12, Math.round(size.w * 0.26))}px`,
        color: "#ffd86a",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1119);
    const speed = Phaser.Math.Between(8, 18);
    const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const id = this.nextId++;
    const acid: SpawnedAcid = {
      id,
      code,
      sprite: img,
      worldX,
      worldY,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
    };
    this.acids.push(acid);
    this.labels.set(id, label);
    this.applyWorldPosition(acid);
    this.styleAcid(id);
  }

  private refreshHighlights(): void {
    for (const acid of this.acids) this.styleAcid(acid.id);
  }

  private styleAcid(id: number): void {
    const acid = this.acids.find((a) => a.id === id);
    if (!acid) return;
    const isTarget = acid.code === this.targetCode;
    acid.sprite.setTint(isTarget ? 0xffffff : 0x9aa3b2);
    this.applyChoiceTexture(acid);
    const label = this.labels.get(id);
    label?.setColor(isTarget ? "#5ad07a" : "#cfd8e8");
  }

  private applyChoiceTexture(acid: SpawnedAcid): void {
    const key = playAaTextureKey(acid.code, this.spriteW);
    if (this.scene.textures.exists(key) && acid.sprite.texture.key !== key) {
      acid.sprite.setTexture(key);
    }
    acid.sprite.setScale(1);
  }

  private applyWorldPosition(acid: SpawnedAcid): void {
    const local = this.chain.worldToLocal(acid.worldX, acid.worldY);
    acid.sprite.setPosition(local.x, local.y);
  }

  private syncSpritePosition(acid: SpawnedAcid, dt: number): void {
    const size = displaySizeFromWidth(this.spriteW);
    const padX = size.w * 0.55;
    const padY = size.h * 0.55;
    const minX = this.playBounds.left + padX;
    const maxX = this.playBounds.left + this.playBounds.width - padX;
    const minY = this.zoneTop + padY;
    const maxY = this.zoneTop + this.zoneH - padY;

    acid.worldX += acid.vx * dt;
    acid.worldY += acid.vy * dt;
    if (acid.worldX < minX || acid.worldX > maxX) acid.vx *= -1;
    if (acid.worldY < minY || acid.worldY > maxY) acid.vy *= -1;
    acid.worldX = Phaser.Math.Clamp(acid.worldX, minX, maxX);
    acid.worldY = Phaser.Math.Clamp(acid.worldY, minY, maxY);
    this.applyWorldPosition(acid);
  }

  private syncLabel(acid: SpawnedAcid): void {
    const label = this.labels.get(acid.id);
    if (!label) return;
    const size = displaySizeFromWidth(this.spriteW);
    label.setFontSize(`${Math.max(12, Math.round(size.w * 0.26))}px`);
    label.setPosition(acid.worldX, acid.worldY + size.h * 0.48);
  }
}

function randomDecoy(target: AminoAcidCode, existing: AminoAcidCode[]): AminoAcidCode {
  let code = AMINO_ACIDS[Phaser.Math.Between(0, AMINO_ACIDS.length - 1)]!;
  let guard = 0;
  while ((code === target || existing.includes(code)) && guard++ < 24) {
    code = AMINO_ACIDS[Phaser.Math.Between(0, AMINO_ACIDS.length - 1)]!;
  }
  return code;
}
