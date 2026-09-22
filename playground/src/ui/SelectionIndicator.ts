import Phaser from 'phaser'
import type { Card } from '../cards/Card'

const ARROW_COLOR = 0xffe566
const BASE_OFFSET_Y = 28
const BOB_DISTANCE = 8
const BOB_DURATION_MS = 650

export class SelectionIndicator {
  private readonly arrow: Phaser.GameObjects.Triangle
  private readonly bobProxy = { offset: 0 }
  private bobTween: Phaser.Tweens.Tween | null = null
  private target: Card | null = null

  constructor(private readonly scene: Phaser.Scene) {
    // Points down toward the selected card.
    this.arrow = scene.add.triangle(0, 0, 0, 0, 32, 0, 16, 18, ARROW_COLOR)
    this.arrow.setOrigin(0.5, 1)
    this.arrow.setVisible(false)
    this.arrow.setDepth(1000)
    this.arrow.setScrollFactor(0)
  }

  public setTarget(card: Card | null): void {
    this.target = card

    if (!card) {
      this.stopBob()
      this.arrow.setVisible(false)
      return
    }

    this.arrow.setVisible(true)
    this.startBob()
    this.syncPosition()
  }

  public getTarget(): Card | null {
    return this.target
  }

  public update(): void {
    if (!this.target || !this.arrow.visible) {
      return
    }

    this.syncPosition()
  }

  public destroy(): void {
    this.stopBob()
    this.arrow.destroy()
    this.target = null
  }

  private syncPosition(): void {
    if (!this.target) {
      return
    }

    const topY =
      this.target.y - (this.target.cardHeight / 2) * this.target.scaleY

    this.arrow.setPosition(
      this.target.x,
      topY - BASE_OFFSET_Y + this.bobProxy.offset,
    )
  }

  private startBob(): void {
    if (this.bobTween) {
      return
    }

    this.bobProxy.offset = 0
    this.bobTween = this.scene.tweens.add({
      targets: this.bobProxy,
      offset: -BOB_DISTANCE,
      duration: BOB_DURATION_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    })
  }

  private stopBob(): void {
    if (this.bobTween) {
      this.bobTween.stop()
      this.bobTween.remove()
      this.bobTween = null
    }

    this.bobProxy.offset = 0
  }
}
