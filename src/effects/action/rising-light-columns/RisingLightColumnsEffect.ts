import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import { ActionRunProgress } from '../../../core/ActionRunProgress'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  buildRisingLightStreaks,
  getRisingLightColumnsDurationMs,
  resolveRisingLightColumnsOptions,
  sampleRisingLightStreak,
  type RisingLightColumnsOptions,
  type RisingLightStreak,
  type ResolvedRisingLightColumnsOptions,
} from './risingLightColumnsOptions'

export type {
  RisingLightColumnsOptions,
  RisingLightColumnsPosition,
} from './risingLightColumnsOptions'
export { RISING_LIGHT_COLUMNS_DEFAULTS } from './risingLightColumnsOptions'

export type RisingLightColumnsFinishCallback = (
  effect: RisingLightColumnsEffect,
) => void

/** Vertical segments per streak for the fading tail gradient. */
const TRAIL_SEGMENTS = 8

/**
 * Soft rising narrow vertical light streaks (Action Effect).
 *
 * Each streak TRANSLATES upward from the lower / lower-middle region.
 * Thin luminous cores dominate — no giant central wash, no downward growth,
 * no hard rectangular blocks.
 */
export class RisingLightColumnsEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.risingLightColumns
  public readonly name = 'Rising Light Columns'
  public readonly description =
    'Traços verticais estreitos sobem sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: RisingLightColumnsOptions
  private options: ResolvedRisingLightColumnsOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private streaks: RisingLightStreak[] = []
  private elapsedMs = 0
  private running = false
  private finishListeners = new Set<RisingLightColumnsFinishCallback>()
  private readonly runProgress = new ActionRunProgress(() => this)

  constructor(options?: RisingLightColumnsOptions) {
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
      ...(options as RisingLightColumnsOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one complete rising-streak pass. */
  public run(): this {
    if (!this.options || !this.graphics) {
      return this
    }

    this.streaks = buildRisingLightStreaks(this.options, this.options.seed)

    this.running = false
    this.elapsedMs = 0
    this.drawStreaks()

    this.running = true
    this.runProgress.beginRun()
    return this
  }

  /** Stops immediately and hides all streaks (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.runProgress.abort()
    this.elapsedMs = 0
    this.drawStreaks()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as RisingLightColumnsFinishCallback
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
      return
    }

    this.elapsedMs += delta
    const duration = getRisingLightColumnsDurationMs(this.options)
    this.runProgress.notify(this.elapsedMs / duration)

    if (this.elapsedMs >= duration) {
      this.running = false
      this.elapsedMs = duration
      this.drawStreaks()
      this.runProgress.complete()
      this.emitFinish()
      return
    }

    this.drawStreaks()
  }

  public disable(): void {
    this.running = false
    this.runProgress.abort()
    this.clearVisuals()
    this.elapsedMs = 0
    this.streaks = []
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
    this.options = resolveRisingLightColumnsOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.streaks = buildRisingLightStreaks(this.options, this.options.seed)

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}`)
    this.graphics.setBlendMode(this.options.blendMode)

    if (this.options.position === 'back') {
      context.target.addAt(this.graphics, 0)
      context.target.sendToBack(this.graphics)
    } else {
      context.target.add(this.graphics)
      context.target.bringToTop(this.graphics)
    }

    this.drawStreaks()
  }

  private drawStreaks(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()
    if (!this.running) {
      return
    }

    const { color, intensity, opacity, glowIntensity, topOverflow, height } =
      this.options
    const halfH = height * 0.5
    const topLimit = -halfH - topOverflow
    const peak = intensity * opacity

    for (const streak of this.streaks) {
      const sample = sampleRisingLightStreak(streak, this.elapsedMs)
      if (!sample.visible) {
        continue
      }

      const alpha = Math.min(sample.alpha * streak.brightness * peak, 0.72)
      if (alpha < 0.012) {
        continue
      }

      // Clip drawing to modest top overflow — fade is independent of this clip.
      const leadY = Math.max(sample.leadY, topLimit)
      const trailY = Math.min(sample.trailY, halfH + 8)
      if (trailY <= leadY || trailY < topLimit) {
        continue
      }

      this.drawStreakShaft(
        streak.x,
        leadY,
        trailY,
        streak.coreWidth,
        color,
        alpha,
        glowIntensity,
      )
    }
  }

  /**
   * Narrow shaft: soft bloom + bright core + vertical fade toward the trail.
   * Lead (top) is brightest; trail (bottom) dissolves — upward drag cue.
   */
  private drawStreakShaft(
    x: number,
    leadY: number,
    trailY: number,
    coreWidth: number,
    color: number,
    alpha: number,
    glowIntensity: number,
  ): void {
    if (!this.graphics) {
      return
    }

    const h = Math.max(trailY - leadY, 1)
    const segH = h / TRAIL_SEGMENTS

    for (let i = 0; i < TRAIL_SEGMENTS; i += 1) {
      const along = i / Math.max(TRAIL_SEGMENTS - 1, 1)
      // Bright near lead (0), fading toward trailing end (1).
      const fall = Math.pow(1 - along, 1.55)
      const y0 = leadY + segH * i
      const y1 = leadY + segH * (i + 1)

      // Soft bloom — local only, slightly stronger with fewer streaks.
      if (glowIntensity > 0.02) {
        const bloomW = coreWidth * (2.4 + glowIntensity * 1.6)
        const bloomA = alpha * glowIntensity * 0.28 * fall
        if (bloomA > 0.008) {
          this.graphics.fillStyle(color, Math.min(bloomA, 0.28))
          this.graphics.fillRect(x - bloomW * 0.5, y0, bloomW, y1 - y0 + 0.5)
        }
      }

      // Translucent cyan body — readable without becoming a slab.
      const bodyW = coreWidth * 1.45
      const bodyA = alpha * 0.55 * fall
      if (bodyA > 0.008) {
        this.graphics.fillStyle(color, Math.min(bodyA, 0.52))
        this.graphics.fillRect(x - bodyW * 0.5, y0, bodyW, y1 - y0 + 0.5)
      }

      // Narrow bright core (cyan-forward; not a full-length white bar).
      const coreA = alpha * 0.95 * fall
      if (coreA > 0.01) {
        this.graphics.fillStyle(color, Math.min(coreA, 0.72))
        this.graphics.fillRect(
          x - coreWidth * 0.5,
          y0,
          Math.max(coreWidth, 0.8),
          y1 - y0 + 0.5,
        )
      }
    }
  }

  private clearVisuals(): void {
    if (this.graphics) {
      this.graphics.destroy()
      this.graphics = null
    }
  }
}
