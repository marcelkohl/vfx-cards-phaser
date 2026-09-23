import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import { ActionRunProgress } from '../../../core/ActionRunProgress'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  buildStreakBurstStreaks,
  getStreakBurstLifetimeMs,
  resolveStreakBurstOptions,
  sampleStreakBurstFinished,
  sampleStreakBurstStreak,
  type ResolvedStreakBurstOptions,
  type StreakBurstOptions,
  type StreakBurstStreak,
} from './streakBurstOptions'

export type {
  StreakBurstOptions,
  StreakBurstPosition,
  StreakBurstSpawnRegion,
} from './streakBurstOptions'
export { STREAK_BURST_DEFAULTS } from './streakBurstOptions'

export type StreakBurstFinishCallback = (effect: StreakBurstEffect) => void

/**
 * Thin luminous streaks expelled radially from around a target (Action Effect).
 * Idle and invisible after `enable()` — call `run()` to play one finite burst.
 * Procedural Graphics only — no textures, no physics.
 */
export class StreakBurstEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.streakBurst
  public readonly name = 'Streak Burst'
  public readonly description =
    'Traços luminosos sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: StreakBurstOptions
  private options: ResolvedStreakBurstOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private streaks: StreakBurstStreak[] = []
  private elapsedMs = 0
  private running = false
  private finishListeners = new Set<StreakBurstFinishCallback>()
  private readonly runProgress = new ActionRunProgress(() => this)

  constructor(options?: StreakBurstOptions) {
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
      ...(options as StreakBurstOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one burst. Fires `onFinish` when the last streak ends. */
  public run(): this {
    if (!this.options || !this.graphics) {
      return this
    }

    this.streaks = buildStreakBurstStreaks(this.options, this.options.seed)
    this.running = true
    this.elapsedMs = 0
    this.drawStreaks()
    this.runProgress.beginRun()
    return this
  }

  /** Stops immediately and hides streaks (does not fire onFinish). */
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
    const listener = callback as StreakBurstFinishCallback
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

    this.elapsedMs += Math.max(delta, 0)
    const duration = getStreakBurstLifetimeMs(this.options, this.streaks)
    this.runProgress.notify(this.elapsedMs / duration)
    this.drawStreaks()

    if (sampleStreakBurstFinished(this.elapsedMs, this.options, this.streaks)) {
      this.running = false
      this.elapsedMs = 0
      this.drawStreaks()
      this.runProgress.complete()
      this.emitFinish()
    }
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
    this.options = resolveStreakBurstOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.streaks = buildStreakBurstStreaks(this.options, this.options.seed)

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}`)
    this.graphics.setBlendMode(this.options.blendMode)

    if (this.options.position === 'back') {
      context.target.addAt(this.graphics, 0)
    } else {
      context.target.add(this.graphics)
    }

    this.drawStreaks()
  }

  private drawStreaks(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()

    if (!this.running || this.streaks.length === 0) {
      return
    }

    const { color, intensity, opacity } = this.options
    const peak = Math.min(intensity * opacity, 1.6)

    for (const streak of this.streaks) {
      const sample = sampleStreakBurstStreak(streak, this.elapsedMs)
      if (!sample.visible) {
        continue
      }

      const alpha = Math.min(sample.alpha * peak, 1)
      if (alpha < 0.004) {
        continue
      }

      this.drawStreak(
        sample.x,
        sample.y,
        sample.angle,
        streak.length,
        streak.thickness,
        color,
        alpha,
      )
    }
  }

  /**
   * Soft glow + thin bright tapered core. Long axis aligned with travel.
   */
  private drawStreak(
    x: number,
    y: number,
    angle: number,
    length: number,
    thickness: number,
    color: number,
    alpha: number,
  ): void {
    if (!this.graphics) {
      return
    }

    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    // Soft outer glow — thicker, softer.
    this.fillTaperedStick(
      x,
      y,
      cos,
      sin,
      length * 1.05,
      thickness * 2.6,
      color,
      alpha * 0.16,
    )
    // Mid glow.
    this.fillTaperedStick(
      x,
      y,
      cos,
      sin,
      length * 0.96,
      thickness * 1.35,
      color,
      alpha * 0.38,
    )
    // Bright thin core.
    this.fillTaperedStick(
      x,
      y,
      cos,
      sin,
      length * 0.88,
      thickness * 0.48,
      color,
      Math.min(alpha * 0.98, 1),
    )
  }

  /** Diamond-tapered luminous baton in world space. */
  private fillTaperedStick(
    x: number,
    y: number,
    cos: number,
    sin: number,
    length: number,
    thickness: number,
    color: number,
    alpha: number,
  ): void {
    if (!this.graphics || alpha < 0.004 || length < 1 || thickness < 0.2) {
      return
    }

    const hl = length * 0.5
    const hw = thickness * 0.5
    // Tip → right mid → back tip → left mid (tapered diamond).
    const local: Array<[number, number]> = [
      [hl, 0],
      [0, hw],
      [-hl, 0],
      [0, -hw],
    ]
    const world = local.map(([lx, ly]) => ({
      x: x + lx * cos - ly * sin,
      y: y + lx * sin + ly * cos,
    }))

    this.graphics.fillStyle(color, Math.min(alpha, 1))
    this.graphics.fillTriangle(
      world[0]!.x,
      world[0]!.y,
      world[1]!.x,
      world[1]!.y,
      world[3]!.x,
      world[3]!.y,
    )
    this.graphics.fillTriangle(
      world[2]!.x,
      world[2]!.y,
      world[1]!.x,
      world[1]!.y,
      world[3]!.x,
      world[3]!.y,
    )
  }

  private clearVisuals(): void {
    this.graphics?.destroy()
    this.graphics = null
    this.options = null
  }
}
