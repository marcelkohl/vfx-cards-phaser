import Phaser from 'phaser'
import type { PersistentEffect } from '../../../core/PersistentEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import { colorToRgb01, wrap01 } from '../../../core/effectConfig'
import { CARD_RIM_LINE_DOUBLE_FRAGMENT_SHADER } from './cardRimLineDoubleShader.frag'
import { CardRimLineDoubleGraphicsFallback } from './CardRimLineDoubleGraphicsFallback'
import {
  resolveRimLineDoubleOptions,
  type ResolvedRimLineDoubleOptions,
  type RimLineDoubleOptions,
} from './rimLineDoubleOptions'

export type { RimLineDoubleOptions as CardRimLineDoubleEffectOptions } from './rimLineDoubleOptions'
export { RIM_LINE_DOUBLE_DEFAULTS } from './rimLineDoubleOptions'

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

export class CardRimLineDoubleEffect implements PersistentEffect {
  public readonly id = EFFECT_IDS.rimLineDouble
  public readonly name = 'Rim Line Double'
  public readonly description =
    'Dois segmentos luminosos opostos percorrendo o contorno da carta.'
  public readonly kind = 'persistent' as const

  private inputOptions: RimLineDoubleOptions
  private options: ResolvedRimLineDoubleOptions | null = null
  private shader: Phaser.GameObjects.Shader | null = null
  private fallback: CardRimLineDoubleGraphicsFallback | null = null
  private progress = 0

  constructor(options?: RimLineDoubleOptions) {
    this.inputOptions = { ...options }
  }

  public enable(context: EffectContext): void {
    this.rebuild(context, false)
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
      ...(options as RimLineDoubleOptions),
    }
    this.rebuild(context, true)
  }

  public update(_time: number, delta: number): void {
    if (this.fallback) {
      this.fallback.update?.(_time, delta)
      return
    }

    if (!this.shader || !this.options) {
      return
    }

    this.progress = wrap01(
      this.progress + (this.options.direction * delta) / this.options.loopDuration,
    )
  }

  public disable(): void {
    this.clearVisuals()
    this.progress = 0
  }

  /** @deprecated Use `disable`. */
  public remove(): void {
    this.disable()
  }

  public destroy(): void {
    this.disable()
  }

  private rebuild(context: EffectContext, preserveProgress: boolean): void {
    const savedProgress = this.progress
    this.clearVisuals()

    this.options = resolveRimLineDoubleOptions(this.inputOptions)
    this.progress = preserveProgress ? savedProgress : 0

    if (!isWebGLRenderer(context.scene)) {
      this.fallback = new CardRimLineDoubleGraphicsFallback(this.inputOptions)
      this.fallback.apply(context)
      return
    }

    const {
      width,
      height,
      glowPadding,
      outerPadding,
      cornerRadius,
      segmentLength,
      coreWidth,
      glowWidth,
      intensity,
      oppositeOffset,
    } = this.options
    const quadWidth = width + glowPadding * 2
    const quadHeight = height + glowPadding * 2
    const instanceId = ++shaderInstanceCount
    const lineRgb = colorToRgb01(this.options.color)
    const coreRgb = colorToRgb01(this.options.coreColor)
    const effect = this

    this.shader = context.scene.add.shader(
      {
        name: `CardRimLineDoubleShader-${instanceId}`,
        shaderName: 'CardRimLineDoubleShader',
        fragmentSource: CARD_RIM_LINE_DOUBLE_FRAGMENT_SHADER,
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          if (!effect.options) {
            return
          }

          setUniform('uResolution', [quadWidth, quadHeight])
          setUniform('uCardSize', [
            effect.options.width + outerPadding * 2,
            effect.options.height + outerPadding * 2,
          ])
          setUniform('uRadius', cornerRadius)
          setUniform('uProgress', effect.progress)
          setUniform('uSegment', segmentLength)
          setUniform('uCoreWidth', coreWidth)
          setUniform('uGlowWidth', glowWidth)
          setUniform('uIntensity', intensity)
          setUniform('uOppositeOffset', oppositeOffset)
          setUniform('uLineColor', lineRgb)
          setUniform('uCoreColor', coreRgb)
        },
      },
      0,
      0,
      quadWidth,
      quadHeight,
    )

    this.shader.setName(`effect:${this.id}`)
    this.shader.setOrigin(0.5, 0.5)
    this.shader.setBlendMode(Phaser.BlendModes.ADD)
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
