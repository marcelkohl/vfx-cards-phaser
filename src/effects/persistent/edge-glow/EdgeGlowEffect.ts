import Phaser from 'phaser'
import type { PersistentEffect } from '../../../core/PersistentEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import { colorToRgb01 } from '../../../core/effectConfig'
import { EDGE_GLOW_FRAGMENT_SHADER } from './edgeGlow.frag'
import { EdgeGlowGraphicsFallback } from './EdgeGlowGraphicsFallback'
import {
  resolveEdgeGlowOptions,
  type EdgeGlowOptions,
  type ResolvedEdgeGlowOptions,
} from './edgeGlowOptions'

export type { EdgeGlowOptions } from './edgeGlowOptions'
export { EDGE_GLOW_DEFAULTS } from './edgeGlowOptions'

let shaderInstanceCount = 0

function isWebGLRenderer(scene: Phaser.Scene): boolean {
  const renderer = scene.game.renderer
  return (
    renderer !== null &&
    typeof renderer === 'object' &&
    'gl' in renderer &&
    (renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl !== null
  )
}

/**
 * Soft colored light along the inner edge of a rounded-rect frame.
 * Geometry and style come only from options — no Card dependency.
 */
export class EdgeGlowEffect implements PersistentEffect {
  public readonly id = EFFECT_IDS.edgeGlow
  public readonly name = 'Edge Glow'
  public readonly description =
    'Iluminação suave nas bordas internas, avançando parcialmente sobre a superfície.'
  public readonly kind = 'persistent' as const

  private inputOptions: EdgeGlowOptions
  private options: ResolvedEdgeGlowOptions | null = null
  private shader: Phaser.GameObjects.Shader | null = null
  private fallback: EdgeGlowGraphicsFallback | null = null
  private pulsePhase = 0
  private pulseMultiplier = 1

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
    if (this.fallback) {
      this.fallback.update?.(_time, delta)
      return
    }

    if (!this.shader || !this.options) {
      return
    }

    if (!this.options.pulse) {
      this.pulseMultiplier = 1
      return
    }

    this.pulsePhase += delta / this.options.pulseSpeed
    this.pulseMultiplier =
      1 +
      Math.sin(this.pulsePhase * Math.PI * 2) * this.options.pulseAmount
  }

  public disable(): void {
    this.clearVisuals()
    this.pulsePhase = 0
    this.pulseMultiplier = 1
  }

  /** @deprecated Use `disable`. */
  public remove(): void {
    this.disable()
  }

  public destroy(): void {
    this.disable()
  }

  private rebuild(context: EffectContext): void {
    this.clearVisuals()
    this.options = resolveEdgeGlowOptions(this.inputOptions)

    if (!isWebGLRenderer(context.scene)) {
      this.fallback = new EdgeGlowGraphicsFallback(this.inputOptions)
      this.fallback.apply(context)
      return
    }

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

    // Keep the quad inside the frame when outer glow is off — no silhouette growth.
    const outerMargin =
      outerSpread > 0 && outerIntensity > 0 ? Math.ceil(outerSpread + 1) : 0
    const margin = Math.max(0, padding) + outerMargin
    const quadWidth = Math.ceil(pathWidth + margin * 2)
    const quadHeight = Math.ceil(pathHeight + margin * 2)
    const rgb = colorToRgb01(color)
    const instanceId = ++shaderInstanceCount
    const effect = this

    this.shader = context.scene.add.shader(
      {
        name: `EdgeGlowShader-${instanceId}`,
        shaderName: 'EdgeGlowShader',
        fragmentSource: EDGE_GLOW_FRAGMENT_SHADER,
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          if (!effect.options) {
            return
          }

          setUniform('uResolution', [quadWidth, quadHeight])
          setUniform('uCardSize', [pathWidth, pathHeight])
          setUniform('uRadius', cornerRadius)
          setUniform('uColor', rgb)
          setUniform('uInnerDist', Math.max(innerDist, 0.001))
          setUniform('uInnerIntensity', innerIntensity)
          setUniform('uInnerSoftness', innerSoftness)
          setUniform('uOuterSpread', Math.max(outerSpread, 0.001))
          setUniform('uOuterIntensity', outerIntensity)
          setUniform('uOpacity', opacity)
          setUniform('uPulse', effect.pulseMultiplier)
          setUniform('uCornerFocus', cornerFocus)
        },
      },
      0,
      0,
      quadWidth,
      quadHeight,
    )

    this.shader.setName(`effect:${this.id}`)
    this.shader.setOrigin(0.5, 0.5)
    this.shader.setBlendMode(blendMode)
    context.target.add(this.shader)
  }

  private clearVisuals(): void {
    this.fallback?.destroy()
    this.fallback = null
    this.shader?.destroy()
    this.shader = null
    this.options = null
  }
}
