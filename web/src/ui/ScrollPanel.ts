import Phaser from "phaser";

/**
 * Lightweight scroll panel for the phone-scroll level-select mode.
 * Port of the production live bundle (sci-game-live/assets-index.js, class Jt):
 * drag + wheel scrolling with viewport culling of off-screen children.
 *
 * Scroll only starts when the pointer-down hit-tests to the panel itself
 * (content/root) — drags that land on a card's interactive elements
 * (PLAY button) are left to those objects.
 */
export class ScrollPanel {
  private items: Array<{ object: Phaser.GameObjects.Container; height: number }> = [];
  private viewportX = 0;
  private viewportY = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private scrollOffset = 0;
  private maxScroll = 0;
  private contentHeight = 0;
  private dragPointerId: number | null = null;
  private dragStartY = 0;
  private scrollAtDragStart = 0;
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly content: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0);
    this.content = scene.add.container(0, 0);
    this.root.add(this.content);
    scene.input.on("pointerdown", this.onPointerDown, this);
    scene.input.on("pointermove", this.onPointerMove, this);
    scene.input.on("pointerup", this.onPointerUp, this);
    scene.input.on("pointerupoutside", this.onPointerUp, this);
    scene.input.on("wheel", this.onWheel, this);
  }

  /** The outer root (add to the scene / a parent container once). */
  get container(): Phaser.GameObjects.Container {
    return this.root;
  }
  /** The inner content list (cards are added via add(), not directly). */
  get list(): Phaser.GameObjects.Container {
    return this.content;
  }

  setViewport(x: number, y: number, width: number, height: number): void {
    this.viewportX = x;
    this.viewportY = y;
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.root.setPosition(0, 0);
    this.updateScrollBounds();
  }

  setContentHeight(height: number): void {
    this.contentHeight = height;
    this.updateScrollBounds();
  }

  add(object: Phaser.GameObjects.Container, height: number): void {
    this.content.add(object);
    this.items.push({ object, height });
    this.updateChildVisibility();
  }

  destroy(): void {
    const inp = this.scene.input;
    inp.off("pointerdown", this.onPointerDown, this);
    inp.off("pointermove", this.onPointerMove, this);
    inp.off("pointerup", this.onPointerUp, this);
    inp.off("pointerupoutside", this.onPointerUp, this);
    inp.off("wheel", this.onWheel, this);
    this.items.length = 0;
    this.root.destroy(true);
  }

  private updateScrollBounds(): void {
    this.maxScroll = Math.max(0, this.contentHeight - this.viewportHeight);
    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, this.maxScroll);
    this.content.setPosition(this.viewportX, this.viewportY - this.scrollOffset);
    this.updateChildVisibility();
  }

  private setScroll(v: number): void {
    this.scrollOffset = Phaser.Math.Clamp(v, 0, this.maxScroll);
    this.content.setPosition(this.viewportX, this.viewportY - this.scrollOffset);
    this.updateChildVisibility();
  }

  private updateChildVisibility(): void {
    const top = this.viewportY;
    const bottom = this.viewportY + this.viewportHeight;
    for (const { object, height } of this.items) {
      const cy = this.content.y + object.y;
      const s = cy - height / 2;
      const e = cy + height / 2;
      object.setVisible(e > top && s < bottom);
    }
  }

  private isInsideViewport(p: Phaser.Input.Pointer): boolean {
    return (
      p.x >= this.viewportX &&
      p.x <= this.viewportX + this.viewportWidth &&
      p.y >= this.viewportY &&
      p.y <= this.viewportY + this.viewportHeight
    );
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (!this.isInsideViewport(p) || this.maxScroll <= 0) return;
    const hit = this.scene.input.hitTestPointer(p);
    if (hit.some((n) => n !== this.content && n !== this.root)) return;
    this.dragPointerId = p.id;
    this.dragStartY = p.y;
    this.scrollAtDragStart = this.scrollOffset;
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (this.dragPointerId !== p.id) return;
    this.setScroll(this.scrollAtDragStart - (p.y - this.dragStartY));
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    if (this.dragPointerId === p.id) this.dragPointerId = null;
  }

  private onWheel(_p: unknown, _o: unknown, _dx: number, dy: number): void {
    if (this.maxScroll > 0) this.setScroll(this.scrollOffset + dy * 0.4);
  }
}
