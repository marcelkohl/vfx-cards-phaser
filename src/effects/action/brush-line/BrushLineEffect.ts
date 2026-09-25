import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import { ActionRunProgress } from '../../../core/ActionRunProgress'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import { colorToRgb01 } from '../../../core/effectConfig'
import { BRUSH_LINE_FRAGMENT_SHADER } from './brushLine.frag'
import {
  BRUSH_LINE_OUTER_PAD,
  buildBrushLineTrails,
  getBrushLineDurationMs,
  resolveBrushLineOptions,
  sampleBrushLineEnvelope,
  type BrushLineOptions,
  type BrushLineTrail,
  type ResolvedBrushLineOptions,
} from './brushLineOptions'

export type { BrushLineOptions, BrushLinePosition } from './brushLineOptions'
export { BRUSH_LINE_DEFAULTS } from './brushLineOptions'

export type BrushLineFinishCallback = (effect: BrushLineEffect) => void

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
 * Luminous horizontal brush / scan front (Action Effect).
 * Travels bottom → top once per `run()`, dragging irregular vertical trails.
 * Idle and invisible after `enable()`.
 */
export class BrushLineEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.brushLine
  public readonly name = 'Brush Line'
  public readonly description =
    'Frente luminosa com trilhas verticais sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: BrushLineOptions
  private options: ResolvedBrushLineOptions | null = null
  private shader: Phaser.GameObjects.Shader | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private trails: BrushLineTrail[] = []
  private elapsedMs = 0
  private scanT = 0
  private strength = 0
  private frontStrength = 0
  private running = false
  private finishListeners = new Set<BrushLineFinishCallback>()
  private readonly runProgress = new ActionRunProgress(() => this)

  constructor(options?: BrushLineOptions) {
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
      ...(options as BrushLineOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one bottom→top brush sweep. */
  public run(): this {
    if (!this.options || (!this.shader && !this.graphics)) {
      return this
    }

    this.trails = buildBrushLineTrails(this.options, this.options.seed)

    this.running = false
    this.elapsedMs = 0
    this.scanT = 0
    this.strength = 0
    this.frontStrength = 0
    this.applyVisual()

    this.running = true
    this.runProgress.beginRun()
    return this
  }

  /** Stops immediately and hides all visuals (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.runProgress.abort()
    this.elapsedMs = 0
    this.scanT = 0
    this.strength = 0
    this.frontStrength = 0
    this.applyVisual()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as BrushLineFinishCallback
    this.finishListeners.add(listener)
    return () => {
      this.finishListeners.delete(listener)
    }
  }

  public onProgress(
    progress: number,
    callback: (effect: ActionEffect) => void,
  ): () => void {
    return this.runProgress.onProgress(progress, callback)
  }

  public update(_time: number, delta: number): void {
    if (!this.options || (!this.shader && !this.graphics)) {
      return
    }

    if (!this.running) {
      if (this.strength !== 0) {
        this.strength = 0
        this.frontStrength = 0
        this.applyVisual()
      }
      return
    }

    this.elapsedMs += delta
    const duration = getBrushLineDurationMs(this.options)
    this.runProgress.notify(this.elapsedMs / duration)
    const sample = sampleBrushLineEnvelope(this.elapsedMs, this.options)

    if (sample.finished) {
      this.running = false
      this.scanT = 0
      this.strength = 0
      this.frontStrength = 0
      this.applyVisual()
      this.runProgress.complete()
      this.emitFinish()
      return
    }

    this.scanT = sample.scanT
    this.strength = sample.strength
    this.frontStrength = sample.frontStrength
    this.applyVisual()
  }

  public disable(): void {
    this.running = false
    this.runProgress.abort()
    this.clearVisuals()
    this.elapsedMs = 0
    this.scanT = 0
    this.strength = 0
    this.frontStrength = 0
    this.trails = []
  }

  /** @deprecated Use `disable`. */
  public remove(): void {
    this.disable()
  }

  public destroy(): void {
    this.finishListeners.clear()
    this.runProgress.clear()
    this.disable()
  }

  private emitFinish(): void {
    for (const listener of [...this.finishListeners]) {
      listener(this)
    }
  }

  private rebuild(context: EffectContext): void {
    this.clearVisuals()
    this.options = resolveBrushLineOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.scanT = 0
    this.strength = 0
    this.frontStrength = 0
    this.trails = buildBrushLineTrails(this.options, this.options.seed)

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

    const { width, height, color, blendMode, position, glowWidth } =
      this.options
    const pad = BRUSH_LINE_OUTER_PAD + glowWidth * 0.35
    const quadWidth = Math.ceil(width + pad * 2)
    const quadHeight = Math.ceil(height + pad * 2)
    const rgb = colorToRgb01(color)
    const instanceId = ++shaderInstanceCount
    const effect = this

    this.shader = context.scene.add.shader(
      {
        name: `BrushLineShader-${instanceId}`,
        shaderName: 'BrushLineShader',
        fragmentSource: BRUSH_LINE_FRAGMENT_SHADER,
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          if (!effect.options) {
            return
          }

          const peak = effect.running ? 1 : 0
          setUniform('uResolution', [quadWidth, quadHeight])
          setUniform('uCardSize', [effect.options.width, effect.options.height])
          setUniform('uRadius', effect.options.cornerRadius)
          setUniform('uColor', rgb)
          setUniform('uScanT', effect.scanT)
          setUniform('uStrength', effect.strength * peak)
          setUniform('uFrontStrength', effect.frontStrength * peak)
          setUniform(
            'uIntensity',
            effect.options.intensity * effect.options.opacity,
          )
          setUniform('uOpacity', 1)
          setUniform('uLineHalf', effect.options.lineWidth)
          setUniform('uLineIntensity', effect.options.lineIntensity)
          setUniform('uGlowWidth', effect.options.glowWidth)
          setUniform('uTrailCount', effect.options.trailCount)
          setUniform('uMinTrailLength', effect.options.minTrailLength)
          setUniform('uMaxTrailLength', effect.options.maxTrailLength)
          setUniform('uMinTrailWidth', effect.options.minTrailWidth)
          setUniform('uMaxTrailWidth', effect.options.maxTrailWidth)
          setUniform('uTrailIntensity', effect.options.trailIntensity)
          setUniform('uSeed', effect.options.seed)
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

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}:fallback`)
    this.graphics.setBlendMode(this.options.blendMode)

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

    if (this.shader) {
      this.shader.setVisible(true)
      return
    }

    this.drawGraphicsFallback()
  }

  /**
   * Canvas approximation: soft horizontal front + irregular vertical sticks.
   */
  private drawGraphicsFallback(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()
    if (!this.running || this.strength < 0.004) {
      return
    }

    const {
      width,
      height,
      color,
      intensity,
      opacity,
      lineWidth,
      lineIntensity,
      glowWidth,
      trailIntensity,
    } = this.options

    const halfH = height * 0.5
    // Phaser Graphics: +Y down — bottom → top matches shader.
    const frontY = halfH + ( -halfH - halfH) * this.scanT
    const peak = intensity * opacity * this.strength

    // Bloom layers around the leading edge.
    const bloomLayers = 5
    for (let i = bloomLayers; i >= 1; i -= 1) {
      const t = i / bloomLayers
      const h = Math.max(lineWidth * 2, glowWidth * t)
      const a = peak * this.frontStrength * 0.12 * (1.1 - t)
      if (a < 0.01) {
        continue
      }
      this.graphics.fillStyle(color, Math.min(a, 1))
      this.graphics.fillRect(-width / 2 - 4, frontY - h * 0.5, width + 8, h)
    }

    // Hot core line.
    const coreA = Math.min(peak * this.frontStrength * lineIntensity * 0.95, 1)
    if (coreA > 0.02) {
      this.graphics.fillStyle(0xffffff, coreA * 0.55)
      this.graphics.fillRect(
        -width / 2 - 2,
        frontY - lineWidth,
        width + 4,
        lineWidth * 2,
      )
      this.graphics.fillStyle(color, coreA)
      this.graphics.fillRect(
        -width / 2 - 2,
        frontY - lineWidth * 0.55,
        width + 4,
        lineWidth * 1.1,
      )
    }

    // Vertical brush trails extending downward (behind upward travel).
    for (const trail of this.trails) {
      const a =
        peak * trailIntensity * trail.brightness * this.strength * 0.7
      if (a < 0.02) {
        continue
      }

      const len = trail.length
      const softLayers = 3
      for (let s = softLayers; s >= 1; s -= 1) {
        const st = s / softLayers
        const w = trail.halfWidth * 2 * (0.7 + st * 1.1)
        const layerA = a * (0.18 + (1 - st) * 0.35)
        // Soft length fade: stronger near the front.
        this.graphics.fillStyle(color, Math.min(layerA, 1))
        const top = frontY
        const bottom = Math.min(halfH + 6, frontY + len)
        const h = Math.max(bottom - top, 0)
        if (h < 1) {
          continue
        }
        this.graphics.fillRect(trail.x - w * 0.5, top, w, h)
      }
    }
  }

  private clearVisuals(): void {
    if (this.shader) {
      this.shader.destroy()
      this.shader = null
    }
    if (this.graphics) {
      this.graphics.destroy()
      this.graphics = null
    }
  }
}
