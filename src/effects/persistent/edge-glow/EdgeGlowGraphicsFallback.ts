import Phaser from 'phaser'
import type { PersistentEffect } from '../../../core/PersistentEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  resolveEdgeGlowOptions,
  type EdgeGlowOptions,
  type ResolvedEdgeGlowOptions,
} from './edgeGlowOptions'

/**
 * Approximate corner-weighted Edge Glow with Graphics.
 * Dense corner blooms + faint mid-edge residual when cornerFocus is high.
 */
export class EdgeGlowGraphicsFallback implements PersistentEffect {
  public readonly id = EFFECT_IDS.edgeGlow
  public readonly name = 'Edge Glow'
  public readonly description =
    'Fallback Graphics do brilho interno nas bordas.'
  public readonly kind = 'persistent' as const

  private inputOptions: EdgeGlowOptions
  private options: ResolvedEdgeGlowOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private pulsePhase = 0

  constructor(options?: EdgeGlowOptions) {
    this.inputOptions = { ...options }
  }

  public enable(context: EffectContext): void {
    this.rebuild(context)
  }

  /** @deprecated Use `enable`. */
  public apply(context: EffectContext): void {
    this.enable(context)
  }

  public reconfigure(
    options: Record<string, unknown>,
    context: EffectContext,
  ): void {
    this.inputOptions = {
      ...this.inputOptions,
      ...(options as EdgeGlowOptions),
    }
    this.rebuild(context)
  }

  public update(_time: number, delta: number): void {
    if (!this.graphics || !this.options?.pulse) {
      return
    }

    this.pulsePhase += delta / this.options.pulseSpeed
    const wave =
      1 +
      Math.sin(this.pulsePhase * Math.PI * 2) * this.options.pulseAmount
    this.graphics.setAlpha(Math.max(0, wave))
  }

  public disable(): void {
    this.graphics?.destroy()
    this.graphics = null
    this.options = null
    this.pulsePhase = 0
  }

  /** @deprecated Use `disable`. */
  public remove(): void {
    this.disable()
  }

  public destroy(): void {
    this.disable()
  }

  private rebuild(context: EffectContext): void {
    this.graphics?.destroy()
    this.graphics = null

    this.options = resolveEdgeGlowOptions(this.inputOptions)
    const {
      width,
      height,
      cornerRadius,
      color,
      innerCoverage,
      innerIntensity,
      innerSoftness,
      outerSpread,
      outerIntensity,
      cornerFocus,
      opacity,
      padding,
      blendMode,
    } = this.options

    const pathWidth = Math.max(1, width + padding * 2)
    const pathHeight = Math.max(1, height + padding * 2)
    const minSide = Math.min(pathWidth, pathHeight)
    const innerDist =
      innerCoverage <= 0 ? 0 : Math.max(0.5, innerCoverage * minSide)
    const layers = Math.max(5, Math.round(6 + innerSoftness * 4))
    const focus = cornerFocus

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}:fallback`)
    this.graphics.setBlendMode(blendMode)

    if (innerDist > 0 && innerIntensity > 0) {
      // Quiet residual along the full rim (almost gone when cornerFocus is high).
      const edgeFloor = 1 - focus * 0.92
      for (let i = 0; i < layers; i += 1) {
        const t = i / Math.max(layers - 1, 1)
        const inset = innerDist * t * (0.5 + 0.5 * (1 - focus))
        const fade = Math.pow(1 - t, 1.4)
        const alpha =
          opacity * innerIntensity * fade * edgeFloor * 0.22
        if (alpha < 0.015) {
          continue
        }

        const w = Math.max(1, pathWidth - inset * 2)
        const h = Math.max(1, pathHeight - inset * 2)
        this.graphics.lineStyle(
          Math.max(0.8, innerDist / layers),
          color,
          alpha,
        )
        this.graphics.strokeRoundedRect(
          -w / 2,
          -h / 2,
          w,
          h,
          Math.max(0, cornerRadius - inset),
        )
      }

      // Dense corner blooms — primary look of the reference.
      const cornerInset = Math.min(cornerRadius, minSide * 0.22)
      const cornerPositions: Array<[number, number]> = [
        [-pathWidth / 2 + cornerInset, -pathHeight / 2 + cornerInset],
        [pathWidth / 2 - cornerInset, -pathHeight / 2 + cornerInset],
        [-pathWidth / 2 + cornerInset, pathHeight / 2 - cornerInset],
        [pathWidth / 2 - cornerInset, pathHeight / 2 - cornerInset],
      ]
      const bloomLayers = Math.max(4, Math.round(5 + focus * 3))
      const bloomRadius = innerDist * (0.85 + focus * 0.55)

      for (const [cx, cy] of cornerPositions) {
        for (let i = 0; i < bloomLayers; i += 1) {
          const t = i / Math.max(bloomLayers - 1, 1)
          const r = bloomRadius * (1 - t * 0.72)
          const alpha =
            opacity * innerIntensity * Math.pow(1 - t, 1.2) * (0.35 + focus * 0.35)
          if (alpha < 0.02 || r < 0.5) {
            continue
          }
          this.graphics.fillStyle(color, alpha)
          this.graphics.fillCircle(cx, cy, r)
        }
      }
    }

    if (outerSpread > 0 && outerIntensity > 0) {
      const outerLayers = 3
      for (let i = 1; i <= outerLayers; i += 1) {
        const t = i / outerLayers
        const expand = outerSpread * t
        const alpha = opacity * outerIntensity * (1 - t) * 0.15 * (0.2 + focus)
        this.graphics.lineStyle(1.2, color, alpha)
        this.graphics.strokeRoundedRect(
          -pathWidth / 2 - expand,
          -pathHeight / 2 - expand,
          pathWidth + expand * 2,
          pathHeight + expand * 2,
          Math.min(
            cornerRadius + expand,
            Math.min(pathWidth + expand * 2, pathHeight + expand * 2) / 2,
          ),
        )
      }
    }

    context.target.add(this.graphics)
  }
}
