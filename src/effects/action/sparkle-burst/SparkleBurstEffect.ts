import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  buildSparkleBurstSparkles,
  resolveSparkleBurstOptions,
  sampleSparkleBurstFinished,
  sampleSparkleBurstSparkle,
  type ResolvedSparkleBurstOptions,
  type SparkleBurstOptions,
  type SparkleBurstSparkle,
} from './sparkleBurstOptions'

export type {
  SparkleBurstOptions,
  SparkleBurstPosition,
  SparkleBurstShape,
  SparkleBurstSpawnRegion,
} from './sparkleBurstOptions'
export { SPARKLE_BURST_DEFAULTS } from './sparkleBurstOptions'

export type SparkleBurstFinishCallback = (effect: SparkleBurstEffect) => void

/**
 * Tiny magical star burst around a frame (Action Effect).
 * Idle and invisible after `enable()` — call `run()` to play.
 * Procedural JRPG-style sparkles (not rising stars, not debris).
 */
export class SparkleBurstEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.sparkleBurst
  public readonly name = 'Sparkle Burst'
  public readonly description =
    'Estrelinhas mágicas sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: SparkleBurstOptions
  private options: ResolvedSparkleBurstOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private sparkles: SparkleBurstSparkle[] = []
  private elapsedMs = 0
  private running = false
  private finishListeners = new Set<SparkleBurstFinishCallback>()

  constructor(options?: SparkleBurstOptions) {
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
      ...(options as SparkleBurstOptions),
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

    this.sparkles = buildSparkleBurstSparkles(this.options, this.options.seed)
    this.running = true
    this.elapsedMs = 0
    this.drawSparkles()
    return this
  }

  /** Stops immediately and hides sparkles (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.elapsedMs = 0
    this.drawSparkles()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as SparkleBurstFinishCallback
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

    if (sampleSparkleBurstFinished(this.elapsedMs, this.options)) {
      this.running = false
      this.elapsedMs = this.options.duration
      this.drawSparkles()
      this.emitFinish()
      return
    }

    this.drawSparkles()
  }

  public disable(): void {
    this.running = false
    this.clearVisuals()
    this.elapsedMs = 0
    this.sparkles = []
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
    this.options = resolveSparkleBurstOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.sparkles = buildSparkleBurstSparkles(this.options, this.options.seed)

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}`)
    this.graphics.setBlendMode(this.options.blendMode)

    if (this.options.position === 'back') {
      context.target.addAt(this.graphics, 0)
    } else {
      context.target.add(this.graphics)
    }

    this.drawSparkles()
  }

  private drawSparkles(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()

    if (!this.running || this.sparkles.length === 0) {
      return
    }

    const { color, intensity, opacity } = this.options
    const globalPeak = Math.min(intensity * opacity, 2)

    for (const sparkle of this.sparkles) {
      const sample = sampleSparkleBurstSparkle(sparkle, this.elapsedMs)
      if (!sample.visible) {
        continue
      }

      const alpha = Math.min(sample.alpha * globalPeak, 1)
      if (alpha < 0.004) {
        continue
      }

      const size = sparkle.size * sample.scale

      // Soft halo then bright core — classic fantasy sparkle read.
      this.drawSparkleShape(
        sparkle,
        sample.x,
        sample.y,
        sample.rotation,
        size * 1.35,
        color,
        alpha * 0.18,
      )
      this.drawSparkleShape(
        sparkle,
        sample.x,
        sample.y,
        sample.rotation,
        size,
        color,
        alpha * 0.85,
      )
    }
  }

  private drawSparkleShape(
    sparkle: SparkleBurstSparkle,
    x: number,
    y: number,
    rotation: number,
    size: number,
    color: number,
    alpha: number,
  ): void {
    if (!this.graphics || alpha < 0.004 || size < 0.4) {
      return
    }

    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const tx = (lx: number, ly: number): { x: number; y: number } => ({
      x: x + lx * cos - ly * sin,
      y: y + lx * sin + ly * cos,
    })

    this.graphics.fillStyle(color, alpha)

    switch (sparkle.shape) {
      case 'diamond':
        this.fillDiamond(tx, size)
        break
      case 'cross':
        this.fillCross(tx, size)
        break
      case 'flare':
        this.fillFlare(tx, size)
        break
      case 'star':
      default:
        this.fillFourPointStar(tx, size)
        break
    }
  }

  private fillFourPointStar(
    tx: (lx: number, ly: number) => { x: number; y: number },
    size: number,
  ): void {
    if (!this.graphics) {
      return
    }
    const tip = size * 0.55
    const waist = size * 0.12
    const n = tx(0, -tip)
    const e = tx(tip, 0)
    const s = tx(0, tip)
    const w = tx(-tip, 0)
    const ne = tx(waist, -waist)
    const se = tx(waist, waist)
    const sw = tx(-waist, waist)
    const nw = tx(-waist, -waist)

    this.graphics.fillTriangle(n.x, n.y, ne.x, ne.y, nw.x, nw.y)
    this.graphics.fillTriangle(e.x, e.y, ne.x, ne.y, se.x, se.y)
    this.graphics.fillTriangle(s.x, s.y, se.x, se.y, sw.x, sw.y)
    this.graphics.fillTriangle(w.x, w.y, sw.x, sw.y, nw.x, nw.y)
    this.graphics.fillTriangle(ne.x, ne.y, se.x, se.y, sw.x, sw.y)
    this.graphics.fillTriangle(ne.x, ne.y, sw.x, sw.y, nw.x, nw.y)
  }

  private fillDiamond(
    tx: (lx: number, ly: number) => { x: number; y: number },
    size: number,
  ): void {
    if (!this.graphics) {
      return
    }
    const tip = size * 0.5
    const mid = size * 0.28
    const n = tx(0, -tip)
    const e = tx(mid, 0)
    const s = tx(0, tip)
    const w = tx(-mid, 0)
    this.graphics.fillTriangle(n.x, n.y, e.x, e.y, w.x, w.y)
    this.graphics.fillTriangle(s.x, s.y, e.x, e.y, w.x, w.y)
  }

  private fillCross(
    tx: (lx: number, ly: number) => { x: number; y: number },
    size: number,
  ): void {
    if (!this.graphics) {
      return
    }
    const arm = size * 0.52
    const half = size * 0.09
    const n = tx(0, -arm)
    const s = tx(0, arm)
    const e = tx(arm, 0)
    const w = tx(-arm, 0)
    const nL = tx(-half, -half * 0.4)
    const nR = tx(half, -half * 0.4)
    const sL = tx(-half, half * 0.4)
    const sR = tx(half, half * 0.4)
    const eT = tx(half * 0.4, -half)
    const eB = tx(half * 0.4, half)
    const wT = tx(-half * 0.4, -half)
    const wB = tx(-half * 0.4, half)

    this.graphics.fillTriangle(n.x, n.y, nL.x, nL.y, nR.x, nR.y)
    this.graphics.fillTriangle(s.x, s.y, sL.x, sL.y, sR.x, sR.y)
    this.graphics.fillTriangle(e.x, e.y, eT.x, eT.y, eB.x, eB.y)
    this.graphics.fillTriangle(w.x, w.y, wT.x, wT.y, wB.x, wB.y)
    this.graphics.fillTriangle(nL.x, nL.y, nR.x, nR.y, sR.x, sR.y)
    this.graphics.fillTriangle(nL.x, nL.y, sR.x, sR.y, sL.x, sL.y)
  }

  private fillFlare(
    tx: (lx: number, ly: number) => { x: number; y: number },
    size: number,
  ): void {
    if (!this.graphics) {
      return
    }
    // Long horizontal + short vertical spikes (lens-flare sparkle).
    const long = size * 0.65
    const short = size * 0.32
    const thin = size * 0.06
    const mid = size * 0.1

    const e = tx(long, 0)
    const w = tx(-long, 0)
    const n = tx(0, -short)
    const s = tx(0, short)
    const eT = tx(mid, -thin)
    const eB = tx(mid, thin)
    const wT = tx(-mid, -thin)
    const wB = tx(-mid, thin)
    const nL = tx(-thin, -mid)
    const nR = tx(thin, -mid)
    const sL = tx(-thin, mid)
    const sR = tx(thin, mid)

    this.graphics.fillTriangle(e.x, e.y, eT.x, eT.y, eB.x, eB.y)
    this.graphics.fillTriangle(w.x, w.y, wT.x, wT.y, wB.x, wB.y)
    this.graphics.fillTriangle(n.x, n.y, nL.x, nL.y, nR.x, nR.y)
    this.graphics.fillTriangle(s.x, s.y, sL.x, sL.y, sR.x, sR.y)
    this.graphics.fillTriangle(eT.x, eT.y, eB.x, eB.y, wB.x, wB.y)
    this.graphics.fillTriangle(eT.x, eT.y, wB.x, wB.y, wT.x, wT.y)
  }

  private clearVisuals(): void {
    this.graphics?.destroy()
    this.graphics = null
    this.options = null
  }
}
