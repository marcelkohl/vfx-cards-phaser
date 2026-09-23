import Phaser from 'phaser'
import type { PersistentEffect } from '../../../core/PersistentEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import { colorToRgb01 } from '../../../core/effectConfig'
import { PULSING_FRAME_FRAGMENT_SHADER } from './pulsingFrame.frag'
import {
  resolvePulsingFrameOptions,
  samplePulsingFrameStrength,
  type PulsingFrameOptions,
  type ResolvedPulsingFrameOptions,
} from './pulsingFrameOptions'

export type {
  PulsingFrameOptions,
  PulsingFramePosition,
} from './pulsingFrameOptions'
export { PULSING_FRAME_DEFAULTS } from './pulsingFrameOptions'

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
 * Stationary luminous rounded-rect contour that calmly breathes
 * (Persistent Effect). Geometry never scales or moves — only luminosity pulses.
 *
 * Distinct from Edge Glow / Soft Glow Pulse (corner-weighted surface aura)
 * and from Converging / Expanding Frame (one-shot scale Action Effects).
 */
export class PulsingFrameEffect implements PersistentEffect {
  public readonly id = EFFECT_IDS.pulsingFrame
  public readonly name = 'Pulsing Frame'
  public readonly description =
    'Contorno luminoso arredondado que pulsa continuamente.'
  public readonly kind = 'persistent' as const

  private inputOptions: PulsingFrameOptions
  private options: ResolvedPulsingFrameOptions | null = null
  private shader: Phaser.GameObjects.Shader | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private elapsedMs = 0
  private strength = 0
  private enabled = false

  constructor(options?: PulsingFrameOptions) {
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
      ...(options as PulsingFrameOptions),
    }
    this.rebuild(context)
  }

  public update(_time: number, delta: number): void {
    if (!this.enabled || !this.options) {
      return
    }

    this.elapsedMs += Math.max(delta, 0)
    this.strength = samplePulsingFrameStrength(this.elapsedMs, this.options)
    this.applyStrength()
  }

  public disable(): void {
    this.enabled = false
    this.clearVisuals()
    this.elapsedMs = 0
    this.strength = 0
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
    this.options = resolvePulsingFrameOptions(this.inputOptions)
    // Start at the low of the cycle — no first-frame flash.
    this.elapsedMs = 0
    this.strength = samplePulsingFrameStrength(0, this.options)

    if (isWebGLRenderer(context.scene)) {
      this.buildShader(context)
    } else {
      this.buildGraphicsFallback(context)
    }

    this.enabled = true
    this.applyStrength()
  }

  private applyStrength(): void {
    if (!this.options) {
      return
    }

    const peak = Math.min(
      this.strength * this.options.intensity * this.options.opacity,
      1.4,
    )

    if (this.shader) {
      this.shader.setVisible(true)
      // Strength is applied via uPulse in setupUniforms.
    }

    if (this.graphics) {
      const visible = peak > 0.004
      this.graphics.setVisible(visible)
      this.graphics.setAlpha(visible ? peak : 0)
    }
  }

  private buildShader(context: EffectContext): void {
    if (!this.options) {
      return
    }

    const {
      width,
      height,
      cornerRadius,
      color,
      frameWidth,
      glowWidth,
      glowIntensity,
      blendMode,
      position,
    } = this.options

    // Glow falls inward — only a thin AA margin is needed outside the card.
    const margin = Math.ceil(frameWidth + 2)
    const quadWidth = Math.ceil(width + margin * 2)
    const quadHeight = Math.ceil(height + margin * 2)
    const rgb = colorToRgb01(color)
    const instanceId = ++shaderInstanceCount
    const effect = this

    this.shader = context.scene.add.shader(
      {
        name: `PulsingFrameShader-${instanceId}`,
        shaderName: 'PulsingFrameShader',
        fragmentSource: PULSING_FRAME_FRAGMENT_SHADER,
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          if (!effect.options) {
            return
          }

          const pulse = Math.min(
            effect.strength *
              effect.options.intensity *
              effect.options.opacity,
            1.4,
          )

          setUniform('uResolution', [quadWidth, quadHeight])
          setUniform('uCardSize', [width, height])
          setUniform('uRadius', cornerRadius)
          setUniform('uColor', rgb)
          setUniform('uFrameHalf', Math.max(frameWidth * 0.5, 0.35))
          setUniform('uGlowWidth', Math.max(glowWidth, 0.001))
          setUniform('uGlowIntensity', glowIntensity)
          setUniform('uOpacity', 1)
          setUniform('uPulse', pulse)
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

    if (position === 'back') {
      context.target.addAt(this.shader, 0)
    } else {
      context.target.add(this.shader)
    }
  }

  /**
   * Canvas / non-WebGL: bright contour + inset strokes for inward glow.
   * Absolute alpha is driven by `setAlpha` from the pulse envelope.
   */
  private buildGraphicsFallback(context: EffectContext): void {
    if (!this.options) {
      return
    }

    const {
      width,
      height,
      cornerRadius,
      color,
      frameWidth,
      glowWidth,
      glowIntensity,
      blendMode,
      position,
    } = this.options

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}:fallback`)
    this.graphics.setBlendMode(blendMode)

    // Inward glow: strokes along inset contours so soft light stays inside.
    if (glowWidth > 0.5 && glowIntensity > 0.01) {
      const glowLayers = 7
      for (let i = 1; i <= glowLayers; i += 1) {
        const t = i / glowLayers
        const strokeW = Math.max(1.2, (glowWidth / glowLayers) * 1.7)
        // Keep the stroke's outer half inside the frame edge.
        const inset = Math.max(glowWidth * t, strokeW * 0.5)
        if (inset * 2 >= width - 2 || inset * 2 >= height - 2) {
          continue
        }
        const alpha = glowIntensity * Math.pow(1 - t, 1.15) * 0.42
        if (alpha < 0.012) {
          continue
        }
        this.graphics.lineStyle(strokeW, color, alpha)
        this.graphics.strokeRoundedRect(
          -width / 2 + inset,
          -height / 2 + inset,
          width - inset * 2,
          height - inset * 2,
          Math.max(0, cornerRadius - inset),
        )
      }
    }

    // Bright core contour on the frame edge.
    this.graphics.lineStyle(Math.max(1, frameWidth), color, 1)
    this.graphics.strokeRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      cornerRadius,
    )

    // Slight inward core density (still on / just inside the contour).
    this.graphics.lineStyle(Math.max(0.8, frameWidth * 0.5), color, 0.65)
    this.graphics.strokeRoundedRect(
      -width / 2 + frameWidth * 0.35,
      -height / 2 + frameWidth * 0.35,
      width - frameWidth * 0.7,
      height - frameWidth * 0.7,
      Math.max(0, cornerRadius - frameWidth * 0.35),
    )

    if (position === 'back') {
      context.target.addAt(this.graphics, 0)
    } else {
      context.target.add(this.graphics)
    }
  }

  private clearVisuals(): void {
    this.shader?.destroy()
    this.shader = null
    this.graphics?.destroy()
    this.graphics = null
    this.options = null
    this.enabled = false
  }
}
