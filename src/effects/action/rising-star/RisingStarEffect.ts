import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  buildRisingStars,
  resolveRisingStarOptions,
  sampleRisingStar,
  sampleRisingStarFinished,
  type ResolvedRisingStarOptions,
  type RisingStarInstance,
  type RisingStarOptions,
} from './risingStarOptions'

export type {
  RisingStarDirection,
  RisingStarOptions,
  RisingStarPosition,
  RisingStarSpawnRegion,
} from './risingStarOptions'
export { RISING_STAR_DEFAULTS } from './risingStarOptions'

export type RisingStarFinishCallback = (effect: RisingStarEffect) => void

/**
 * Directional magical sparkle streak (Action Effect).
 * Idle and invisible after `enable()` — call `run()` to play.
 * Bright four-point star + independent vertical/horizontal streaks.
 */
export class RisingStarEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.risingStar
  public readonly name = 'Rising Star'
  public readonly description =
    'Estrela direcional sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: RisingStarOptions
  private options: ResolvedRisingStarOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private stars: RisingStarInstance[] = []
  private elapsedMs = 0
  private running = false
  private finishListeners = new Set<RisingStarFinishCallback>()

  constructor(options?: RisingStarOptions) {
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
      ...(options as RisingStarOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one rising-star pass. Fires `onFinish` when it ends. */
  public run(): this {
    if (!this.options || !this.graphics) {
      return this
    }

    this.stars = buildRisingStars(this.options, this.options.seed)
    this.running = true
    this.elapsedMs = 0
    this.drawStars()
    return this
  }

  /** Stops immediately and hides stars (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.elapsedMs = 0
    this.drawStars()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as RisingStarFinishCallback
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
      return
    }

    this.elapsedMs += delta

    if (sampleRisingStarFinished(this.elapsedMs, this.options)) {
      this.running = false
      this.elapsedMs = this.options.duration
      this.drawStars()
      this.emitFinish()
      return
    }

    this.drawStars()
  }

  public disable(): void {
    this.running = false
    this.clearVisuals()
    this.elapsedMs = 0
    this.stars = []
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
    this.options = resolveRisingStarOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.stars = buildRisingStars(this.options, this.options.seed)

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}`)
    this.graphics.setBlendMode(this.options.blendMode)

    if (this.options.position === 'back') {
      context.target.addAt(this.graphics, 0)
    } else {
      context.target.add(this.graphics)
    }

    this.drawStars()
  }

  private drawStars(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()

    if (!this.running || this.stars.length === 0) {
      return
    }

    const { color, intensity, opacity } = this.options
    const globalPeak = Math.min(intensity * opacity, 2)

    for (const star of this.stars) {
      const sample = sampleRisingStar(star, this.elapsedMs)
      if (!sample.visible) {
        continue
      }

      const alpha = Math.min(sample.alpha * globalPeak, 1)
      if (alpha < 0.004) {
        continue
      }

      const size = star.size * sample.scale
      this.drawRisingStarShape(star, sample.x, sample.y, size, sample.scale, color, alpha)
    }
  }

  private drawRisingStarShape(
    star: RisingStarInstance,
    x: number,
    y: number,
    size: number,
    scale: number,
    color: number,
    alpha: number,
  ): void {
    if (!this.graphics || alpha < 0.004 || size < 0.4) {
      return
    }

    const verticalHalf = Math.max(star.verticalLength * scale * 0.5, 0)
    const horizontalHalf = Math.max(star.horizontalLength * scale * 0.5, 0)
    const halo = size * star.haloScale
    const beamThickness = Math.max(size * 0.09, 0.55)

    // Soft outer halo (diamond-ish glow around the core).
    this.fillSoftHalo(x, y, halo, color, alpha * 0.16)

    // Vertical streak (local Y) — tip to tip = verticalLength.
    if (verticalHalf > 0.3) {
      this.fillVerticalStreak(
        x,
        y,
        verticalHalf,
        beamThickness,
        color,
        alpha * 0.28,
      )
      this.fillVerticalStreak(
        x,
        y,
        verticalHalf * 0.92,
        Math.max(beamThickness * 0.5, 0.3),
        color,
        alpha * 0.72,
      )
    }

    // Horizontal streak (local X) — tip to tip = horizontalLength.
    if (horizontalHalf > 0.3) {
      this.fillHorizontalGlint(
        x,
        y,
        horizontalHalf,
        Math.max(size * 0.05, 0.3),
        color,
        alpha * 0.55,
      )
    }

    // Bright four-point star core.
    this.fillFourPointStar(x, y, size * 1.15, color, alpha * 0.22)
    this.fillFourPointStar(x, y, size, color, alpha * 0.9)
  }

  private fillSoftHalo(
    x: number,
    y: number,
    radius: number,
    color: number,
    alpha: number,
  ): void {
    if (!this.graphics || alpha < 0.004) {
      return
    }
    const r = radius
    const n = { x, y: y - r }
    const e = { x: x + r * 0.72, y }
    const s = { x, y: y + r }
    const w = { x: x - r * 0.72, y }
    this.graphics.fillStyle(color, alpha)
    this.graphics.fillTriangle(n.x, n.y, e.x, e.y, w.x, w.y)
    this.graphics.fillTriangle(s.x, s.y, e.x, e.y, w.x, w.y)
  }

  private fillVerticalStreak(
    x: number,
    y: number,
    halfLength: number,
    halfWidth: number,
    color: number,
    alpha: number,
  ): void {
    if (!this.graphics || alpha < 0.004) {
      return
    }
    // Tapered beam: wider near center, thin at tips.
    const tipW = halfWidth * 0.15
    const midW = halfWidth
    const top = y - halfLength
    const bot = y + halfLength
    const midY = y

    this.graphics.fillStyle(color, alpha)
    // Upper half
    this.graphics.fillTriangle(x, top, x - tipW, top, x - midW, midY)
    this.graphics.fillTriangle(x, top, x + tipW, top, x + midW, midY)
    this.graphics.fillTriangle(x, top, x - midW, midY, x + midW, midY)
    // Lower half
    this.graphics.fillTriangle(x, bot, x - tipW, bot, x - midW, midY)
    this.graphics.fillTriangle(x, bot, x + tipW, bot, x + midW, midY)
    this.graphics.fillTriangle(x, bot, x - midW, midY, x + midW, midY)
  }

  private fillHorizontalGlint(
    x: number,
    y: number,
    halfLength: number,
    halfWidth: number,
    color: number,
    alpha: number,
  ): void {
    if (!this.graphics || alpha < 0.004) {
      return
    }
    const tipH = halfWidth * 0.2
    const midH = halfWidth
    const left = x - halfLength
    const right = x + halfLength

    this.graphics.fillStyle(color, alpha)
    this.graphics.fillTriangle(left, y, left, y - tipH, x, y - midH)
    this.graphics.fillTriangle(left, y, left, y + tipH, x, y + midH)
    this.graphics.fillTriangle(left, y, x, y - midH, x, y + midH)
    this.graphics.fillTriangle(right, y, right, y - tipH, x, y - midH)
    this.graphics.fillTriangle(right, y, right, y + tipH, x, y + midH)
    this.graphics.fillTriangle(right, y, x, y - midH, x, y + midH)
  }

  private fillFourPointStar(
    x: number,
    y: number,
    size: number,
    color: number,
    alpha: number,
  ): void {
    if (!this.graphics || alpha < 0.004) {
      return
    }
    const tip = size * 0.55
    const waist = size * 0.12
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
