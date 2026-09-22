import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import { colorToRgb01 } from '../../../core/effectConfig'
import { RADIAL_GLOW_FRAGMENT_SHADER } from './radialGlow.frag'
import {
  radialGlowLocalOffset,
  radialGlowOuterPadFactor,
  radialGlowRadiiAtScale,
  radialGlowRingHalfNorm,
  resolveRadialGlowOptions,
  sampleRadialGlowEnvelope,
  type ResolvedRadialGlowOptions,
  type RadialGlowOptions,
} from './radialGlowOptions'

export type {
  RadialGlowOptions,
  RadialGlowPosition,
} from './radialGlowOptions'
export { RADIAL_GLOW_DEFAULTS } from './radialGlowOptions'

export type RadialGlowFinishCallback = (effect: RadialGlowEffect) => void

let shaderInstanceCount = 0

/** Soft inner trail layers (Canvas) — continuous gradient, not discrete rings. */
const FALLBACK_INNER_LAYERS = 8
/** Soft outer glow layers (Canvas). */
const FALLBACK_OUTER_LAYERS = 3

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
 * Soft luminous circular / elliptical expanding halo (Action Effect).
 * Thin dense current rim + long soft inner ghost trail + short outer glow.
 * Opacity: fade-in → hold → fade-out; expansion continues independently.
 * Idle and invisible after `enable()` — call `run()` to play one glow.
 */
export class RadialGlowEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.radialGlow
  public readonly name = 'Radial Glow'
  public readonly description =
    'Halo circular suave sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: RadialGlowOptions
  private options: ResolvedRadialGlowOptions | null = null
  private shader: Phaser.GameObjects.Shader | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private elapsedMs = 0
  private strength = 0
  private scale = 0.7
  private running = false
  private finishListeners = new Set<RadialGlowFinishCallback>()

  constructor(options?: RadialGlowOptions) {
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
      ...(options as RadialGlowOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one radial glow. Fires `onFinish` when it ends. */
  public run(): this {
    if (!this.options || (!this.shader && !this.graphics)) {
      return this
    }

    // Reset invisible before arming — avoids a stale full-intensity frame.
    this.running = false
    this.elapsedMs = 0
    this.strength = 0
    this.scale = this.options.startScale
    this.applyVisual()

    this.running = true
    return this
  }

  /** Stops immediately and hides the glow (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.elapsedMs = 0
    this.strength = 0
    this.scale = this.options?.startScale ?? 0.7
    this.applyVisual()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as RadialGlowFinishCallback
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
        this.applyVisual()
      }
      return
    }

    // Advance first so large deltas sample the post-delta envelope (including
    // late fade-out / true zero) instead of replaying a stale high-opacity frame.
    this.elapsedMs += Math.max(delta, 0)
    const sample = sampleRadialGlowEnvelope(this.elapsedMs, this.options)
    this.strength = sample.strength
    this.scale = sample.scale
    this.applyVisual()

    if (sample.finished) {
      // strength is already 0 from the finished sample — opacity removed the
      // ring before natural completion hides/resets.
      this.running = false
      this.elapsedMs = 0
      this.emitFinish()
    }
  }

  public disable(): void {
    this.running = false
    this.clearVisuals()
    this.elapsedMs = 0
    this.strength = 0
    this.scale = 0.7
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
    this.options = resolveRadialGlowOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.strength = 0
    this.scale = this.options.startScale

    if (isWebGLRenderer(context.scene)) {
      this.buildShader(context)
    } else {
      this.buildGraphicsFallback(context)
    }

    this.applyVisual()
  }

  private buildShader(context: EffectContext): void {
    if (!this.options) {
      return
    }

    const { color, blendMode, position, endScale } = this.options
    const maxRadii = radialGlowRadiiAtScale(this.options, endScale)
    const pad = radialGlowOuterPadFactor(this.options)
    // Quad fits the expanded ring + short outer glow beyond the circumference.
    const quadWidth = Math.ceil(maxRadii.radiusX * 2 * pad)
    const quadHeight = Math.ceil(maxRadii.radiusY * 2 * pad)
    const rgb = colorToRgb01(color)
    const offset = radialGlowLocalOffset(this.options)
    const instanceId = ++shaderInstanceCount
    const effect = this

    this.shader = context.scene.add.shader(
      {
        name: `RadialGlowShader-${instanceId}`,
        shaderName: 'RadialGlowShader',
        fragmentSource: RADIAL_GLOW_FRAGMENT_SHADER,
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          if (!effect.options) {
            return
          }

          const radii = radialGlowRadiiAtScale(effect.options, effect.scale)
          const strength = effect.running ? effect.strength : 0
          const peak = Math.min(
            effect.options.intensity * effect.options.opacity * strength,
            1.5,
          )

          setUniform('uResolution', [quadWidth, quadHeight])
          setUniform('uRadii', [radii.radiusX, radii.radiusY])
          setUniform('uColor', rgb)
          setUniform('uIntensity', peak)
          setUniform('uOpacity', 1)
          setUniform('uSoftness', effect.options.softness)
          setUniform(
            'uRingHalf',
            radialGlowRingHalfNorm(effect.options, effect.scale),
          )
          setUniform('uRimIntensity', effect.options.rimIntensity)
          setUniform('uInnerTrail', effect.options.innerTrail)
          setUniform('uOuterGlow', effect.options.outerGlow)
        },
      },
      offset.x,
      offset.y,
      quadWidth,
      quadHeight,
    )

    this.shader.setName(`effect:${this.id}`)
    this.shader.setOrigin(0.5, 0.5)
    this.shader.setBlendMode(blendMode)
    this.shader.setVisible(true)

    if (position === 'back') {
      context.target.addAt(this.shader, 0)
      context.target.sendToBack(this.shader)
    } else {
      context.target.add(this.shader)
      context.target.bringToTop(this.shader)
    }
  }

  private buildGraphicsFallback(context: EffectContext): void {
    if (!this.options) {
      return
    }

    const offset = radialGlowLocalOffset(this.options)
    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}:fallback`)
    this.graphics.setBlendMode(this.options.blendMode)
    this.graphics.setPosition(offset.x, offset.y)

    if (this.options.position === 'back') {
      context.target.addAt(this.graphics, 0)
      context.target.sendToBack(this.graphics)
    } else {
      context.target.add(this.graphics)
      context.target.bringToTop(this.graphics)
    }
  }

  private applyVisual(): void {
    if (!this.options) {
      return
    }

    // WebGL: setupUniforms reads strength/scale each draw — keep shader present.
    if (this.shader) {
      this.shader.setVisible(true)
      return
    }

    this.drawGraphicsFallback()
  }

  /**
   * Approximate the asymmetric wave-front profile with soft strokes.
   * Thin dense rim + faint increasing inner trail + short outer glow.
   * Soft haze around the rim is separate from the thin core width.
   */
  private drawGraphicsFallback(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()

    if (!this.running) {
      return
    }

    const peak = Math.min(
      this.options.intensity * this.options.opacity * this.strength,
      1.5,
    )
    if (peak < 0.004) {
      return
    }

    const { radiusX, radiusY } = radialGlowRadiiAtScale(
      this.options,
      this.scale,
    )
    const soft = this.options.softness
    const color = this.options.color
    const meanR = Math.max((radiusX + radiusY) * 0.5, 1)
    const rimCore = Math.max(
      this.options.ringWidth * Math.max(this.scale, 0.05),
      0.5,
    )
    // Soft optical haze around the thin core — not tied to ringWidth.
    const softWing = meanR * mix(0.012, 0.028, soft)
    const trailStroke = meanR * mix(0.018, 0.032, soft)
    const innerPx = meanR * this.options.innerTrail
    const outerPx = meanR * this.options.outerGlow
    const rimBoost = this.options.rimIntensity

    // Inner trail: farthest first, progressively stronger toward the rim.
    for (let i = 0; i < FALLBACK_INNER_LAYERS; i += 1) {
      const t = (i + 1) / FALLBACK_INNER_LAYERS
      const inward = (1 - t) * innerPx * mix(0.95, 1.15, soft)
      const rx = Math.max(radiusX - inward, 2)
      const ry = Math.max(radiusY - inward, 2)
      const fall = Math.pow(t, mix(1.6, 2.4, soft))
      const alpha = peak * fall * mix(0.04, 0.09, soft) * (0.75 + soft * 0.2)
      const lineW = Math.max(trailStroke * (0.55 + t * 0.55), 1.2)
      if (alpha < 0.008) {
        continue
      }
      this.graphics.lineStyle(lineW, color, Math.min(alpha, 1))
      this.graphics.strokeEllipse(0, 0, rx * 2, ry * 2)
    }

    // Soft haze immediately around the rim (keeps thin core from looking hard).
    const hazeAlpha = peak * 0.16 * (0.85 + soft * 0.15)
    this.graphics.lineStyle(
      Math.max(softWing * 1.4, 1.2),
      color,
      Math.min(hazeAlpha, 1),
    )
    this.graphics.strokeEllipse(0, 0, radiusX * 2, radiusY * 2)

    // Thin dense current rim — core only.
    const rimAlpha = peak * 0.48 * rimBoost * (0.9 + soft * 0.1)
    this.graphics.lineStyle(rimCore, color, Math.min(rimAlpha, 1))
    this.graphics.strokeEllipse(0, 0, radiusX * 2, radiusY * 2)

    // Short outer glow — fewer, weaker layers.
    for (let i = 0; i < FALLBACK_OUTER_LAYERS; i += 1) {
      const t = (i + 1) / FALLBACK_OUTER_LAYERS
      const outward = t * outerPx * mix(0.9, 1.2, soft)
      const rx = radiusX + outward
      const ry = radiusY + outward
      const fall = Math.pow(1 - t, mix(1.2, 1.9, soft))
      const alpha = peak * fall * mix(0.07, 0.12, soft)
      const lineW = Math.max(softWing * (1.1 - t * 0.35), 1)
      if (alpha < 0.01) {
        continue
      }
      this.graphics.lineStyle(lineW, color, Math.min(alpha, 1))
      this.graphics.strokeEllipse(0, 0, rx * 2, ry * 2)
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

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
