import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import { ActionRunProgress } from '../../../core/ActionRunProgress'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  getStarFlareDurationMs,
  resolveStarFlareOptions,
  sampleStarFlareEnvelope,
  starFlareLocalOffset,
  type ResolvedStarFlareOptions,
  type StarFlareOptions,
} from './starFlareOptions'

export type {
  StarFlareLayerPosition,
  StarFlareOptions,
  StarFlareScaleMode,
} from './starFlareOptions'
export { STAR_FLARE_DEFAULTS } from './starFlareOptions'

export type StarFlareFinishCallback = (effect: StarFlareEffect) => void

/** Segments along each half-ray for soft tip fade. */
const RAY_SEGMENTS = 12

/**
 * Bright central magical flare with soft horizontal / vertical luminous streaks
 * (Action Effect). Anchored to a configurable normalized position — does not travel.
 * Idle and invisible after `enable()` — call `run()` to play one flare.
 */
export class StarFlareEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.starFlare
  public readonly name = 'Star Flare'
  public readonly description =
    'Flare central mágico sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: StarFlareOptions
  private options: ResolvedStarFlareOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private elapsedMs = 0
  private strength = 0
  private scale = 0.55
  private running = false
  private finishListeners = new Set<StarFlareFinishCallback>()
  private readonly runProgress = new ActionRunProgress(() => this)

  constructor(options?: StarFlareOptions) {
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
      ...(options as StarFlareOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one flare. Fires `onFinish` when it ends. */
  public run(): this {
    if (!this.options || !this.graphics) {
      return this
    }

    // Reset invisible before arming — avoids a stale full-intensity frame.
    this.running = false
    this.elapsedMs = 0
    this.strength = 0
    this.scale = this.options.startScale
    this.drawFlare()

    this.running = true
    this.runProgress.beginRun()
    return this
  }

  /** Stops immediately and hides the flare (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.runProgress.abort()
    this.elapsedMs = 0
    this.strength = 0
    this.scale = this.options?.startScale ?? 0.55
    this.drawFlare()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as StarFlareFinishCallback
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
    if (!this.options || !this.graphics) {
      return
    }

    if (!this.running) {
      if (this.strength !== 0) {
        this.strength = 0
        this.drawFlare()
      }
      return
    }

    // Sample before advancing so the first armed frame stays at elapsed=0 (invisible).
    const sample = sampleStarFlareEnvelope(this.elapsedMs, this.options)
    this.strength = sample.finished ? 0 : sample.strength
    this.scale = sample.scale
    this.drawFlare()

    if (sample.finished) {
      this.running = false
      this.elapsedMs = 0
      this.runProgress.complete()
      this.emitFinish()
      return
    }

    this.elapsedMs += Math.max(delta, 0)
    this.runProgress.notify(
      this.elapsedMs / getStarFlareDurationMs(this.options),
    )
  }

  public disable(): void {
    this.running = false
    this.runProgress.abort()
    this.clearVisuals()
    this.elapsedMs = 0
    this.strength = 0
    this.scale = 0.55
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
    this.options = resolveStarFlareOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.strength = 0
    this.scale = this.options.startScale

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}`)
    this.graphics.setBlendMode(this.options.blendMode)

    if (this.options.position === 'back') {
      context.target.addAt(this.graphics, 0)
    } else {
      context.target.add(this.graphics)
    }

    this.drawFlare()
  }

  private drawFlare(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()

    if (!this.running) {
      return
    }

    const peak = Math.min(
      this.options.intensity * this.options.opacity * this.strength,
      1.6,
    )
    if (peak < 0.004) {
      return
    }

    const { x, y } = starFlareLocalOffset(this.options)
    // Cohesive expansion: star, halo, and both ray axes share one scale.
    const growth = Math.max(this.scale, 0.05)
    const hHalf = (this.options.horizontalLength * growth) / 2
    const vHalf = (this.options.verticalLength * growth) / 2
    const hThick = this.options.horizontalThickness * growth
    const vThick = this.options.verticalThickness * growth
    const glow = this.options.glowRadius * growth
    const color = this.options.color
    const coreSize = glow * 0.58

    // Soft central halo — several rings so edges dissolve.
    this.fillSoftGlow(x, y, glow * 1.3, color, peak * 0.09)
    this.fillSoftGlow(x, y, glow, color, peak * 0.16)
    this.fillSoftGlow(x, y, glow * 0.5, color, peak * 0.26)

    // Vertical luminous streak (softer outer + brighter core).
    if (vHalf > 0.5) {
      this.drawAxisRay(
        x,
        y,
        0,
        1,
        vHalf,
        vThick * 1.2,
        color,
        peak * 0.2,
      )
      this.drawAxisRay(
        x,
        y,
        0,
        1,
        vHalf * 0.96,
        vThick * 0.48,
        color,
        peak * 0.55,
      )
    }

    // Horizontal luminous streak — typically dominant.
    if (hHalf > 0.5) {
      this.drawAxisRay(
        x,
        y,
        1,
        0,
        hHalf,
        hThick * 1.22,
        color,
        peak * 0.26,
      )
      this.drawAxisRay(
        x,
        y,
        1,
        0,
        hHalf * 0.97,
        hThick * 0.42,
        color,
        peak * 0.72,
      )
    }

    // Bright four-point star core (brightest element).
    this.fillFourPointStar(x, y, coreSize * 1.15, color, peak * 0.26)
    this.fillFourPointStar(x, y, coreSize, color, Math.min(peak * 1.05, 1))
    this.fillSoftGlow(x, y, coreSize * 0.26, color, Math.min(peak * 1.1, 1))
  }

  /**
   * Soft axis-aligned ray: thickest and brightest at the center, fades and
   * tapers toward both tips (segmented so it reads as emitted light).
   */
  private drawAxisRay(
    cx: number,
    cy: number,
    dirX: number,
    dirY: number,
    halfLength: number,
    halfThickness: number,
    color: number,
    peakAlpha: number,
  ): void {
    if (!this.graphics || peakAlpha < 0.004 || halfLength < 0.5) {
      return
    }

    const perpX = -dirY
    const perpY = dirX

    for (let i = 0; i < RAY_SEGMENTS; i += 1) {
      const t0 = i / RAY_SEGMENTS
      const t1 = (i + 1) / RAY_SEGMENTS
      // Strong near center, transparent at tips.
      const a0 = peakAlpha * Math.pow(1 - t0, 1.55)
      const a1 = peakAlpha * Math.pow(1 - t1, 1.55)
      const alpha = (a0 + a1) * 0.5
      if (alpha < 0.004) {
        continue
      }

      // Taper: full thickness at center → thin tip.
      const w0 = halfThickness * (1 - t0 * 0.9)
      const w1 = halfThickness * (1 - t1 * 0.9)

      // Both directions from center (±).
      for (const sign of [-1, 1] as const) {
        const x0 = cx + dirX * halfLength * t0 * sign
        const y0 = cy + dirY * halfLength * t0 * sign
        const x1 = cx + dirX * halfLength * t1 * sign
        const y1 = cy + dirY * halfLength * t1 * sign

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
  }

  private fillSoftGlow(
    x: number,
    y: number,
    radius: number,
    color: number,
    alpha: number,
  ): void {
    if (!this.graphics || alpha < 0.004 || radius < 0.5) {
      return
    }

    const layers = 5
    for (let i = 0; i < layers; i += 1) {
      const t = i / Math.max(layers - 1, 1)
      const r = radius * (1 - t * 0.72)
      const a = alpha * Math.pow(1 - t, 1.35)
      if (a < 0.01 || r < 0.4) {
        continue
      }
      this.graphics.fillStyle(color, a)
      this.graphics.fillCircle(x, y, r)
    }
  }

  private fillFourPointStar(
    x: number,
    y: number,
    size: number,
    color: number,
    alpha: number,
  ): void {
    if (!this.graphics || alpha < 0.004 || size < 0.4) {
      return
    }

    // Slightly thinner arms: longer tip, narrower waist.
    const tip = size * 0.58
    const waist = size * 0.09
    const n = { x, y: y - tip }
    const e = { x: x + tip, y }
    const s = { x, y: y + tip }
    const w = { x: x - tip, y }
    const ne = { x: x + waist, y: y - waist }
    const se = { x: x + waist, y: y + waist }
    const sw = { x: x - waist, y: y + waist }
    const nw = { x: x - waist, y: y - waist }

    this.graphics.fillStyle(color, alpha)
    this.graphics.fillTriangle(n.x, n.y, ne.x, ne.y, nw.x, nw.y)
    this.graphics.fillTriangle(e.x, e.y, ne.x, ne.y, se.x, se.y)
    this.graphics.fillTriangle(s.x, s.y, se.x, se.y, sw.x, sw.y)
    this.graphics.fillTriangle(w.x, w.y, sw.x, sw.y, nw.x, nw.y)
    this.graphics.fillTriangle(ne.x, ne.y, se.x, se.y, sw.x, sw.y)
    this.graphics.fillTriangle(ne.x, ne.y, sw.x, sw.y, nw.x, nw.y)
  }

  private clearVisuals(): void {
    this.graphics?.destroy()
    this.graphics = null
    this.options = null
  }
}
