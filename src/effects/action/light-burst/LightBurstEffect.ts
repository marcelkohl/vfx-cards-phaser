import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  buildLightBurstRays,
  resolveLightBurstOptions,
  sampleLightBurstEnvelope,
  type LightBurstOptions,
  type LightBurstRay,
  type ResolvedLightBurstOptions,
} from './lightBurstOptions'

export type {
  LightBurstOptions,
  LightBurstPosition,
  LightBurstScaleMode,
} from './lightBurstOptions'
export { LIGHT_BURST_DEFAULTS } from './lightBurstOptions'

export type LightBurstFinishCallback = (effect: LightBurstEffect) => void

/** Segments per ray for length-wise fade + flare (higher = smoother). */
const RAY_SEGMENTS = 10

/**
 * Brief radial light-ray burst around a frame (Action Effect).
 * Idle and invisible after `enable()` — call `run()` to play.
 * Rays flare open toward the tips and fade out along their length.
 */
export class LightBurstEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.lightBurst
  public readonly name = 'Light Burst'
  public readonly description =
    'Raios de luz sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: LightBurstOptions
  private options: ResolvedLightBurstOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private rays: LightBurstRay[] = []
  private runSeed = 1
  private elapsedMs = 0
  private alpha = 0
  private scale = 1
  private running = false
  private finishListeners = new Set<LightBurstFinishCallback>()

  constructor(options?: LightBurstOptions) {
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
      ...(options as LightBurstOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one burst. Fires `onFinish` when it ends. */
  public run(): this {
    if (!this.options || !this.graphics) {
      return this
    }

    this.runSeed = (this.runSeed * 1103515245 + 12345) >>> 0
    this.rays = buildLightBurstRays(this.options, this.runSeed)
    // Reset invisible before arming — avoids a stale full-intensity frame.
    this.running = false
    this.elapsedMs = 0
    this.alpha = 0
    this.scale = this.options.startScale
    this.drawRays()

    this.running = true
    return this
  }

  /** Stops immediately and hides rays (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.elapsedMs = 0
    this.alpha = 0
    this.scale = this.options?.startScale ?? 1
    this.drawRays()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as LightBurstFinishCallback
    this.finishListeners.add(listener)
    return () => {
      this.finishListeners.delete(listener)
    }
  }

  public update(_time: number, delta: number): void {
    if (!this.options || !this.graphics) {
      return
    }

    if (!this.running) {
      if (this.alpha !== 0) {
        this.alpha = 0
        this.drawRays()
      }
      return
    }

    // Sample before advancing so the first armed frame stays at elapsed=0 (invisible).
    const sample = sampleLightBurstEnvelope(this.elapsedMs, this.options)
    this.alpha = sample.finished ? 0 : sample.alpha
    this.scale = sample.scale
    this.drawRays()

    if (sample.finished) {
      this.running = false
      this.elapsedMs = 0
      this.emitFinish()
      return
    }

    this.elapsedMs += Math.max(delta, 0)
  }

  public disable(): void {
    this.running = false
    this.clearVisuals()
    this.elapsedMs = 0
    this.alpha = 0
    this.scale = 1
    this.rays = []
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
    this.options = resolveLightBurstOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.alpha = 0
    this.scale = this.options.startScale
    this.rays = buildLightBurstRays(this.options, this.runSeed)

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}`)
    this.graphics.setBlendMode(this.options.blendMode)

    // Child order within the target container is the layering mechanism:
    // front = above artwork/border; back = under the opaque frame fill.
    if (this.options.position === 'back') {
      context.target.addAt(this.graphics, 0)
      context.target.sendToBack(this.graphics)
    } else {
      context.target.add(this.graphics)
      context.target.bringToTop(this.graphics)
    }

    this.drawRays()
  }

  private drawRays(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()

    const globalAlpha = Math.min(this.options.intensity * this.alpha, 1)
    if (globalAlpha < 0.004 || this.rays.length === 0) {
      return
    }

    const { width, height, rayLength, rayWidth, tipFlare, color, originInset } =
      this.options
    const growth = Math.max(this.scale, 0.05)
    const halfW = width / 2
    const halfH = height / 2

    for (const ray of this.rays) {
      const cos = Math.cos(ray.angle)
      const sin = Math.sin(ray.angle)
      const edgeDist = distanceToRectEdge(halfW, halfH, cos, sin)
      // originInset is a fraction of the center→edge distance (0 = at edge,
      // 0.5 = halfway to center). Bright bases therefore sit over artwork
      // when position is 'front', and are hidden under the frame when 'back'.
      const startDist = Math.max(edgeDist * (1 - originInset), 0)
      // Scale only the outward extension so rays open from a stable origin.
      const tipDist = edgeDist + rayLength * ray.lengthScale * growth

      const sx = cos * startDist
      const sy = sin * startDist
      const tipX = cos * tipDist
      const tipY = sin * tipDist

      const perpX = -sin
      const perpY = cos
      const halfBase = (rayWidth * ray.widthScale * Math.sqrt(growth)) / 2
      const halfTip = halfBase * tipFlare
      const peak = Math.min(globalAlpha * ray.alphaScale, 1)

      // Soft outer flare (wider, more transparent)
      this.drawFlaredRay(
        sx,
        sy,
        tipX,
        tipY,
        perpX,
        perpY,
        halfBase * 1.35,
        halfTip * 1.35,
        color,
        peak * 0.14,
      )

      // Brighter core (still translucent; open tip)
      this.drawFlaredRay(
        sx,
        sy,
        tipX,
        tipY,
        perpX,
        perpY,
        halfBase * 0.55,
        halfTip * 0.7,
        color,
        peak * 0.38,
      )
    }
  }

  /**
   * Trapezoid ray: narrow at the base, open/wide at the tip, alpha falls off
   * toward the tip so light disperses instead of reading as a hard star spike.
   */
  private drawFlaredRay(
    sx: number,
    sy: number,
    tipX: number,
    tipY: number,
    perpX: number,
    perpY: number,
    halfBase: number,
    halfTip: number,
    color: number,
    peakAlpha: number,
  ): void {
    if (!this.graphics || peakAlpha < 0.004) {
      return
    }

    const dx = tipX - sx
    const dy = tipY - sy

    for (let i = 0; i < RAY_SEGMENTS; i += 1) {
      const t0 = i / RAY_SEGMENTS
      const t1 = (i + 1) / RAY_SEGMENTS
      // Stronger near origin, soft / transparent at open tip.
      const a0 = peakAlpha * Math.pow(1 - t0, 1.65)
      const a1 = peakAlpha * Math.pow(1 - t1, 1.65)
      const alpha = (a0 + a1) * 0.5
      if (alpha < 0.004) {
        continue
      }

      const w0 = halfBase + (halfTip - halfBase) * t0
      const w1 = halfBase + (halfTip - halfBase) * t1

      const x0 = sx + dx * t0
      const y0 = sy + dy * t0
      const x1 = sx + dx * t1
      const y1 = sy + dy * t1

      const ax0 = x0 + perpX * w0
      const ay0 = y0 + perpY * w0
      const bx0 = x0 - perpX * w0
      const by0 = y0 - perpY * w0
      const ax1 = x1 + perpX * w1
      const ay1 = y1 + perpY * w1
      const bx1 = x1 - perpX * w1
      const by1 = y1 - perpY * w1

      this.graphics.fillStyle(color, alpha)
      this.graphics.fillTriangle(ax0, ay0, bx0, by0, ax1, ay1)
      this.graphics.fillTriangle(bx0, by0, ax1, ay1, bx1, by1)
    }
  }

  private clearVisuals(): void {
    this.graphics?.destroy()
    this.graphics = null
    this.options = null
  }
}

/** Ray–AABB distance from center to the rectangle boundary along (cos, sin). */
function distanceToRectEdge(
  halfW: number,
  halfH: number,
  cos: number,
  sin: number,
): number {
  const tx =
    Math.abs(cos) < 1e-6 ? Number.POSITIVE_INFINITY : halfW / Math.abs(cos)
  const ty =
    Math.abs(sin) < 1e-6 ? Number.POSITIVE_INFINITY : halfH / Math.abs(sin)
  return Math.min(tx, ty)
}
