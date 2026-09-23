import type { EffectContext } from 'phaser-vfx-effects'
import { LightBurstEffect } from 'phaser-vfx-effects'

export type LightBurstProgressChainFinishCallback = (
  demo: LightBurstProgressChain,
) => void

/** Crossfade handoff as a fraction of each burst's lifecycle. */
const CHAIN_AT = 0.45

/**
 * Playground-only validation of ActionEffect `onProgress()` as a visual crossfade.
 *
 * Three independent Light Burst instances chain at 45% so the next pattern is
 * already growing while the previous is still strong — without restarting an
 * active instance (two instances would collide at ~1800ms into a 2000ms life).
 *
 * ```text
 * A ──────────────────── 2000
 *          B ────────────────────
 *                   C ────────────────────
 *                            A ────────────────────
 * ```
 *
 * Click again while running → `stop()` all (chain ends cleanly).
 * Not Card Star Loop — development/validation only.
 */
export class LightBurstProgressChain {
  public readonly id = 'light-burst-progress-chain'
  public readonly name = 'Light Burst Progress Chain'
  public readonly description =
    'Validation: three Light Bursts crossfade via onProgress(0.45).'

  private burstA: LightBurstEffect
  private burstB: LightBurstEffect
  private burstC: LightBurstEffect
  private context: EffectContext | null = null
  private prepared = false
  private chaining = false
  private readonly unsubs: Array<() => void> = []
  private readonly finishListeners =
    new Set<LightBurstProgressChainFinishCallback>()
  private progressLog: string[] = []

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly cornerRadius: number,
  ) {
    this.burstA = this.createBurst(0x66ddff, 1)
    this.burstB = this.createBurst(0xc8f4ff, 8731)
    this.burstC = this.createBurst(0xa8e8ff, 42042)
  }

  public enable(context: EffectContext): void {
    this.context = context
    this.clearUnsubs()

    this.burstA.destroy()
    this.burstB.destroy()
    this.burstC.destroy()
    this.burstA = this.createBurst(0x66ddff, 1)
    this.burstB = this.createBurst(0xc8f4ff, 8731)
    this.burstC = this.createBurst(0xa8e8ff, 42042)

    this.burstA.enable(context)
    this.burstB.enable(context)
    this.burstC.enable(context)

    // Crossfade chain: next starts before previous peak (~1000ms).
    this.unsubs.push(
      this.burstA.onProgress(CHAIN_AT, () => {
        if (!this.chaining) {
          return
        }
        this.burstB.run()
      }),
    )
    this.unsubs.push(
      this.burstB.onProgress(CHAIN_AT, () => {
        if (!this.chaining) {
          return
        }
        this.burstC.run()
      }),
    )
    this.unsubs.push(
      this.burstC.onProgress(CHAIN_AT, () => {
        if (!this.chaining) {
          return
        }
        this.burstA.run()
      }),
    )

    // Secondary validation: multiple thresholds on A (once per A run).
    this.unsubs.push(
      this.burstA.onProgress(0.25, () => {
        this.progressLog.push('A@0.25')
      }),
    )
    this.unsubs.push(
      this.burstA.onProgress(0.5, () => {
        this.progressLog.push('A@0.50')
      }),
    )
    this.unsubs.push(
      this.burstA.onProgress(0.75, () => {
        this.progressLog.push('A@0.75')
      }),
    )
    this.unsubs.push(
      this.burstA.onFinish(() => {
        this.progressLog.push('A@finish')
      }),
    )

    this.prepared = true
  }

  /**
   * Starts the chain, or stops it if already running.
   * Stop validates that pending progress callbacks do not continue.
   */
  public run(): this {
    if (!this.prepared || !this.context) {
      return this
    }

    if (this.isRunning()) {
      this.stop()
      return this
    }

    this.progressLog = []
    this.chaining = true
    this.burstA.run()
    return this
  }

  public stop(): this {
    this.chaining = false
    this.burstA.stop()
    this.burstB.stop()
    this.burstC.stop()
    return this
  }

  public isRunning(): boolean {
    return (
      this.chaining &&
      (this.burstA.isRunning() ||
        this.burstB.isRunning() ||
        this.burstC.isRunning())
    )
  }

  /** Test helper — ordered progress markers from burst A. */
  public getProgressLog(): readonly string[] {
    return this.progressLog
  }

  public onFinish(callback: LightBurstProgressChainFinishCallback): () => void {
    this.finishListeners.add(callback)
    return () => {
      this.finishListeners.delete(callback)
    }
  }

  public update(time: number, delta: number): void {
    if (!this.prepared) {
      return
    }
    this.burstA.update?.(time, delta)
    this.burstB.update?.(time, delta)
    this.burstC.update?.(time, delta)

    if (
      this.chaining &&
      !this.burstA.isRunning() &&
      !this.burstB.isRunning() &&
      !this.burstC.isRunning()
    ) {
      this.chaining = false
      for (const listener of [...this.finishListeners]) {
        listener(this)
      }
    }
  }

  public destroy(): void {
    this.stop()
    this.clearUnsubs()
    this.finishListeners.clear()
    this.burstA.destroy()
    this.burstB.destroy()
    this.burstC.destroy()
    this.context = null
    this.prepared = false
  }

  private createBurst(color: number, seed: number): LightBurstEffect {
    return new LightBurstEffect({
      width: this.width,
      height: this.height,
      cornerRadius: this.cornerRadius,
      color,
      intensity: 0.75,
      rayCount: 10,
      rayLength: 90,
      rayWidth: 12,
      tipFlare: 3,
      // Slow ambient envelope for this validation only (~2s).
      duration: 2000,
      originInset: 0.28,
      position: 'front',
      scaleMode: 'continuous',
      startScale: 0.5,
      endScale: 1.3,
      peakAt: 0.5,
      seed,
    })
  }

  private clearUnsubs(): void {
    for (const unsub of this.unsubs) {
      unsub()
    }
    this.unsubs.length = 0
  }
}
