import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import { colorToRgb01 } from '../../../core/effectConfig'
import { EDGE_GLOW_FRAGMENT_SHADER } from '../../persistent/edge-glow/edgeGlow.frag'
import {
  resolveConvergingFrameOptions,
  sampleConvergingFrameEnvelope,
  type ConvergingFrameOptions,
  type ResolvedConvergingFrameOptions,
} from './convergingFrameOptions'

export type {
  ConvergingFrameOptions,
  ConvergingFramePosition,
} from './convergingFrameOptions'
export { CONVERGING_FRAME_DEFAULTS } from './convergingFrameOptions'

export type ConvergingFrameFinishCallback = (
  effect: ConvergingFrameEffect,
) => void

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
 * Temporary Edge Glow-like luminous frame that starts larger than the target
 * and contracts inward once per `run()` (Action Effect).
 * Optional residual ghost fade keeps the frame at `endScale` while opacity
 * falls to zero. Idle after `enable()` — call `run()` to play one convergence.
 */
export class ConvergingFrameEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.convergingFrame
  public readonly name = 'Converging Frame'
  public readonly description =
    'Moldura luminosa que converge para o alvo; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: ConvergingFrameOptions
  private options: ResolvedConvergingFrameOptions | null = null
  private shader: Phaser.GameObjects.Shader | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private elapsedMs = 0
  private strength = 0
  private scale = 1
  private running = false
  private finishListeners = new Set<ConvergingFrameFinishCallback>()

  constructor(options?: ConvergingFrameOptions) {
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
    const wasRunning = this.running
    this.inputOptions = {
      ...this.inputOptions,
      ...(options as ConvergingFrameOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one inward convergence (+ optional ghost). Fires `onFinish` when it ends. */
  public run(): this {
    if (!this.options || (!this.shader && !this.graphics)) {
      return this
    }

    // Reset to invisible + start scale before arming — avoids a stale flash.
    // Also clears any in-progress ghost fade.
    this.running = false
    this.elapsedMs = 0
    this.strength = 0
    this.scale = this.options.startScale
    this.applyVisualState()

    this.running = true
    return this
  }

  /** Stops immediately and hides the frame (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.elapsedMs = 0
    this.strength = 0
    if (this.options) {
      this.scale = this.options.startScale
    }
    this.applyVisualState()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as ConvergingFrameFinishCallback
    this.finishListeners.add(listener)
    return () => {
      this.finishListeners.delete(listener)
    }
  }

  public update(_time: number, delta: number): void {
    if (!this.options || (!this.shader && !this.graphics)) {
      return
    }

    if (!this.running) {
      if (this.strength !== 0) {
        this.strength = 0
        this.applyVisualState()
      }
      return
    }

    // Advance first so late ghost-fade / true-zero samples are applied before
    // natural completion (avoids a visible pop when finishing).
    this.elapsedMs += Math.max(delta, 0)
    const sample = sampleConvergingFrameEnvelope(this.elapsedMs, this.options)
    this.strength = sample.strength
    this.scale = sample.scale
    this.applyVisualState()

    if (sample.finished) {
      this.running = false
      this.elapsedMs = 0
      this.emitFinish()
    }
  }

  private applyVisualState(): void {
    const strength = Math.min(Math.max(this.strength, 0), 1)
    const scale = Math.max(this.scale, 0.001)

    if (this.shader) {
      this.shader.setVisible(true)
      this.shader.setScale(scale)
    }
    if (this.graphics) {
      this.graphics.setVisible(strength > 0.004)
      this.graphics.setAlpha(strength > 0.004 ? strength : 0)
      this.graphics.setScale(scale)
    }
  }

  public disable(): void {
    this.running = false
    this.clearVisuals()
    this.elapsedMs = 0
    this.strength = 0
    this.scale = 1
  }

  /** @deprecated Use `disable`. */
  public remove(): void {
    this.disable()
  }

  public destroy(): void {
    this.finishListeners.clear()
    this.disable()
  }

  private emitFinish(): void {
    for (const listener of [...this.finishListeners]) {
      listener(this)
    }
  }

  private rebuild(context: EffectContext): void {
    this.clearVisuals()
    this.options = resolveConvergingFrameOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.strength = 0
    this.scale = this.options.startScale

    if (!isWebGLRenderer(context.scene)) {
      this.buildGraphicsFallback(context)
      this.applyVisualState()
      return
    }

    this.buildShader(context)
    this.applyVisualState()
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
      innerCoverage,
      intensity,
      softness,
      outerSpread,
      outerIntensity,
      cornerFocus,
      opacity,
      blendMode,
      position,
    } = this.options

    const pathWidth = Math.max(1, width)
    const pathHeight = Math.max(1, height)
    const minSide = Math.min(pathWidth, pathHeight)
    const innerDist =
      innerCoverage <= 0 ? 0 : Math.max(0.5, innerCoverage * minSide)
    const outerMargin =
      outerSpread > 0 && outerIntensity > 0 ? Math.ceil(outerSpread + 1) : 0
    const quadWidth = Math.ceil(pathWidth + outerMargin * 2)
    const quadHeight = Math.ceil(pathHeight + outerMargin * 2)
    const rgb = colorToRgb01(color)
    const instanceId = ++shaderInstanceCount
    const effect = this

    this.shader = context.scene.add.shader(
      {
        name: `ConvergingFrameShader-${instanceId}`,
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
          setUniform('uInnerIntensity', intensity)
          setUniform('uInnerSoftness', softness)
          setUniform('uOuterSpread', Math.max(outerSpread, 0.001))
          setUniform('uOuterIntensity', outerIntensity)
          // Drive visibility with the action envelope — scale is applied on the GO.
          setUniform(
            'uOpacity',
            opacity * Math.min(Math.max(effect.strength, 0), 1),
          )
          setUniform('uPulse', 1)
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
    this.shader.setScale(this.scale)

    if (position === 'back') {
      context.target.addAt(this.shader, 0)
    } else {
      context.target.add(this.shader)
    }
  }

  /**
   * Canvas / non-WebGL path — same corner-weighted rim idea as
   * Soft Glow Pulse / Edge Glow, with alpha + scale driven by the envelope.
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
      innerCoverage,
      intensity,
      softness,
      outerSpread,
      outerIntensity,
      cornerFocus,
      opacity,
      blendMode,
      position,
    } = this.options

    const pathWidth = Math.max(1, width)
    const pathHeight = Math.max(1, height)
    const minSide = Math.min(pathWidth, pathHeight)
    const innerDist =
      innerCoverage <= 0 ? 0 : Math.max(0.5, innerCoverage * minSide)
    const layers = Math.max(5, Math.round(6 + softness * 4))
    const focus = cornerFocus

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}:fallback`)
    this.graphics.setBlendMode(blendMode)

    if (innerDist > 0 && intensity > 0) {
      const edgeFloor = 1 - focus * 0.92
      for (let i = 0; i < layers; i += 1) {
        const t = i / Math.max(layers - 1, 1)
        const inset = innerDist * t * (0.5 + 0.5 * (1 - focus))
        const fade = Math.pow(1 - t, 1.4)
        const alpha = opacity * intensity * fade * edgeFloor * 0.22
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
            opacity *
            intensity *
            Math.pow(1 - t, 1.2) *
            (0.35 + focus * 0.35)
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
        const alpha =
          opacity * outerIntensity * (1 - t) * 0.15 * (0.2 + focus)
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

    this.graphics.setScale(this.scale)

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
  }
}
