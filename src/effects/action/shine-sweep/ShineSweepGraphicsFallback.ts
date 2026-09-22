import Phaser from 'phaser'
import type { EffectContext } from '../../../core/EffectContext'
import {
  resolveShineSweepOptions,
  type ResolvedShineSweepOptions,
  type ShineSweepOptions,
} from './shineSweepOptions'

/**
 * Canvas / non-WebGL band drawer. Playback is driven by ShineSweepEffect.
 */
export class ShineSweepGraphicsFallback {
  private inputOptions: ShineSweepOptions
  private options: ResolvedShineSweepOptions | null = null
  private band: Phaser.GameObjects.Graphics | null = null
  private clip: Phaser.GameObjects.Graphics | null = null
  private progress = 0
  private sweepActive = false

  constructor(options?: ShineSweepOptions) {
    this.inputOptions = { ...options }
  }

  public apply(context: EffectContext): void {
    this.rebuild(context)
  }

  public setVisualState(progress: number, active: boolean): void {
    this.progress = progress
    this.sweepActive = active
    this.drawBand()
  }

  public destroy(): void {
    this.band?.clearMask(true)
    this.band?.destroy()
    this.band = null
    this.clip?.destroy()
    this.clip = null
    this.options = null
    this.progress = 0
    this.sweepActive = false
  }

  private rebuild(context: EffectContext): void {
    this.destroy()
    this.options = resolveShineSweepOptions(this.inputOptions)

    const { width, height, cornerRadius, padding, blendMode } = this.options
    const pathWidth = Math.max(1, width + padding * 2)
    const pathHeight = Math.max(1, height + padding * 2)

    this.clip = context.scene.make.graphics(undefined, false)
    this.clip.fillStyle(0xffffff, 1)
    this.clip.fillRoundedRect(
      -pathWidth / 2,
      -pathHeight / 2,
      pathWidth,
      pathHeight,
      cornerRadius,
    )

    this.band = context.scene.add.graphics()
    this.band.setName('effect:shine-sweep:fallback')
    this.band.setBlendMode(blendMode)
    this.band.setMask(this.clip.createGeometryMask())
    context.target.add(this.band)
    this.drawBand()
  }

  private drawBand(): void {
    if (!this.band || !this.options) {
      return
    }

    this.band.clear()
    if (!this.sweepActive) {
      return
    }

    const {
      width,
      height,
      padding,
      bandWidth,
      color,
      intensity,
      opacity,
      softness,
      dispersion,
      dirX,
      dirY,
    } = this.options
    const pathWidth = Math.max(1, width + padding * 2)
    const pathHeight = Math.max(1, height + padding * 2)
    const halfW = pathWidth / 2
    const halfH = pathHeight / 2
    const extent =
      Math.abs(halfW * Math.abs(dirX) + halfH * Math.abs(dirY)) +
      bandWidth * 1.35
    const head = -extent + this.progress * extent * 2
    const layers = Math.max(6, Math.round(7 + softness * 4))
    const coreHold = Math.min(dispersion, 0.98)

    const perpX = -dirY
    const perpY = dirX

    for (let i = 0; i < layers; i += 1) {
      const t = i / Math.max(layers - 1, 1)
      const sideT = Math.abs(t - 0.5) * 2
      let fade: number
      if (sideT <= coreHold) {
        fade = 1
      } else {
        const u = (sideT - coreHold) / Math.max(1 - coreHold, 1e-4)
        const power = 1.75 - softness * 0.85
        fade = Math.pow(Math.max(1 - u, 0), power)
      }
      const alpha = opacity * intensity * fade * 0.28
      if (alpha < 0.01) {
        continue
      }

      const offset = (t - 0.5) * bandWidth * 2
      const cx = head * dirX + offset * perpX
      const cy = head * dirY + offset * perpY
      const len = extent * 2.2

      this.band.lineStyle(
        Math.max(1.2, (bandWidth / layers) * 1.6),
        color,
        alpha,
      )
      this.band.beginPath()
      this.band.moveTo(cx - dirX * len, cy - dirY * len)
      this.band.lineTo(cx + dirX * len, cy + dirY * len)
      this.band.strokePath()
    }
  }
}
