import Phaser from 'phaser'
import type { PersistentEffect } from '../../../core/PersistentEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import { colorToRgb01, wrap01 } from '../../../core/effectConfig'
import { CardRimLineEffect } from './CardRimLineEffect'
import { CARD_RIM_LINE_FRAGMENT_SHADER } from './cardRimLineShader.frag'
import {
  resolveRimLineShaderOptions,
  toGraphicsFallbackOptions,
  type ResolvedRimLineShaderOptions,
  type RimLineShaderOptions,
} from './rimLineShaderOptions'

export type { RimLineShaderOptions as CardRimLineShaderEffectOptions } from './rimLineShaderOptions'
export { RIM_LINE_SHADER_DEFAULTS } from './rimLineShaderOptions'

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

export class CardRimLineShaderEffect implements PersistentEffect {
  public readonly id = EFFECT_IDS.cardRimLineShader
  public readonly name = 'Card Rim Line Shader'
  public readonly description =
    'Versão com shader de uma linha luminosa que percorre o contorno da carta.'
  public readonly kind = 'persistent' as const

  private inputOptions: RimLineShaderOptions
  private options: ResolvedRimLineShaderOptions | null = null
  private shader: Phaser.GameObjects.Shader | null = null
  private fallback: CardRimLineEffect | null = null
  private progress = 0

  constructor(options?: RimLineShaderOptions) {
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
      ...(options as RimLineShaderOptions),
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

    this.options = resolveRimLineShaderOptions(this.inputOptions)
    this.progress = preserveProgress ? savedProgress : 0

    if (!isWebGLRenderer(context.scene)) {
      this.fallback = new CardRimLineEffect(toGraphicsFallbackOptions(this.options))
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
    } = this.options
    const quadWidth = width + glowPadding * 2
    const quadHeight = height + glowPadding * 2
    const instanceId = ++shaderInstanceCount
    const lineRgb = colorToRgb01(this.options.color)
    const coreRgb = colorToRgb01(this.options.coreColor)
    const effect = this

    this.shader = context.scene.add.shader(
      {
        name: `CardRimLineShader-${instanceId}`,
        shaderName: 'CardRimLineShader',
        fragmentSource: CARD_RIM_LINE_FRAGMENT_SHADER,
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
