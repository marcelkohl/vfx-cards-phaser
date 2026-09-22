import Phaser from 'phaser'
import type { EffectContext } from '../../../core/EffectContext'
import {
  resolveDissolveRevealOptions,
  type DissolveRevealOptions,
  type ResolvedDissolveRevealOptions,
} from './dissolveRevealOptions'

/**
 * Limited Canvas fallback: opaque rounded veil that fades with progress,
 * plus a soft edge stroke. Not as organic as the WebGL FBM dissolve.
 */
export class DissolveRevealGraphicsFallback {
  private inputOptions: DissolveRevealOptions
  private options: ResolvedDissolveRevealOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private progress = 1
  private active = false

  constructor(options?: DissolveRevealOptions) {
    this.inputOptions = { ...options }
  }

  public apply(context: EffectContext): void {
    this.rebuild(context)
  }

  public setVisualState(progress: number, active: boolean): void {
    this.progress = progress
    this.active = active
    this.draw()
  }

  public destroy(): void {
    this.graphics?.destroy()
    this.graphics = null
    this.options = null
    this.progress = 1
    this.active = false
  }

  private rebuild(context: EffectContext): void {
    this.destroy()
    this.options = resolveDissolveRevealOptions(this.inputOptions)
    this.progress = 1
    this.active = false

    this.graphics = context.scene.add.graphics()
    this.graphics.setName('effect:dissolve-reveal:fallback')
    this.graphics.setBlendMode(Phaser.BlendModes.NORMAL)
    context.target.add(this.graphics)
    this.draw()
  }

  private draw(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()
    if (!this.active || this.progress >= 0.999) {
      return
    }

    const { width, height, cornerRadius, coverColor, coverOpacity, edgeColor } =
      this.options
    const veil = (1 - this.progress) * coverOpacity
    if (veil > 0.004) {
      this.graphics.fillStyle(coverColor, veil)
      this.graphics.fillRoundedRect(
        -width / 2,
        -height / 2,
        width,
        height,
        cornerRadius,
      )
    }

    const edgeAlpha =
      Math.sin(this.progress * Math.PI) * 0.45 * this.options.edgeIntensity
    if (edgeAlpha > 0.01) {
      const inset = 2 + this.progress * 6
      this.graphics.lineStyle(3, edgeColor, edgeAlpha)
      this.graphics.strokeRoundedRect(
        -width / 2 + inset,
        -height / 2 + inset,
        width - inset * 2,
        height - inset * 2,
        Math.max(0, cornerRadius - inset * 0.35),
      )
    }
  }
}
