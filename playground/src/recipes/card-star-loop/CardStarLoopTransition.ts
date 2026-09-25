import type { EffectContext } from 'phaser-vfx-effects'
import {
  AmbientSparklesEffect,
  LightBurstEffect,
  PulsingFrameEffect,
} from 'phaser-vfx-effects'

export type CardStarLoopFinishCallback = (loop: CardStarLoopTransition) => void

/** Crossfade handoff as a fraction of each burst's lifecycle (~900ms of 2000). */
const CHAIN_AT = 0.45

/**
 * Playground recipe: continuous magical card state.
 *
 * ```text
 * PulsingFrameEffect          — persistent inward-breathing border
 * AmbientSparklesEffect       — persistent ambient star detail
 * LightBurstEffect × 3        — finite actions chained via onProgress()
 * ```
 *
 * Composition only — visuals come from phaser-vfx-effects.
 * Not part of the package public API.
 *
 * Click again while active → `stop()` (chain cannot resurrect).
 */
export class CardStarLoopTransition {
  public readonly id = 'card-star-loop'
  public readonly name = 'Card Star Loop'
  public readonly description =
    'Recipe: pulsing frame + ambient sparkles + three Light Bursts crossfading.'

  private frame: PulsingFrameEffect
  private sparkles: AmbientSparklesEffect
  private burstA: LightBurstEffect
  private burstB: LightBurstEffect
  private burstC: LightBurstEffect
  private context: EffectContext | null = null
  private prepared = false
  /** True while the continuous loop should keep chaining. */
  private active = false
  private readonly unsubs: Array<() => void> = []
  private readonly finishListeners = new Set<CardStarLoopFinishCallback>()

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly cornerRadius: number,
  ) {
    this.frame = this.createFrame()
    this.sparkles = this.createSparkles()
    this.burstA = this.createBurst(0x4ec8ff, 1)
    this.burstB = this.createBurst(0x66ddff, 8731)
    this.burstC = this.createBurst(0x7ad8ff, 42042)
  }

  public enable(context: EffectContext): void {
    this.context = context
    this.clearUnsubs()
    this.active = false

    this.frame.destroy()
    this.sparkles.destroy()
    this.burstA.destroy()
    this.burstB.destroy()
    this.burstC.destroy()

    this.frame = this.createFrame()
    this.sparkles = this.createSparkles()
    this.burstA = this.createBurst(0x4ec8ff, 1)
    this.burstB = this.createBurst(0x66ddff, 8731)
    this.burstC = this.createBurst(0x7ad8ff, 42042)

    // Layer order on start is applied in run(). Mount bursts idle here.
    this.burstA.enable(context)
    this.burstB.enable(context)
    this.burstC.enable(context)

    // Register once per enable(); clearUnsubs prevents duplicates on re-enable.
    this.unsubs.push(
      this.burstA.onProgress(CHAIN_AT, () => {
        if (!this.active) {
          return
        }
        this.burstB.run()
      }),
    )
    this.unsubs.push(
      this.burstB.onProgress(CHAIN_AT, () => {
        if (!this.active) {
          return
        }
        this.burstC.run()
      }),
    )
    this.unsubs.push(
      this.burstC.onProgress(CHAIN_AT, () => {
        if (!this.active) {
          return
        }
        this.burstA.run()
      }),
    )

    this.prepared = true
  }

  /**
   * Starts the continuous loop, or stops it if already active.
   */
  public run(): this {
    if (!this.prepared || !this.context) {
      return this
    }

    if (this.active) {
      this.stop()
      return this
    }

    // Mount / remount layers: frame → bursts → sparkles on top.
    this.frame.enable(this.context)
    this.burstA.enable(this.context)
    this.burstB.enable(this.context)
    this.burstC.enable(this.context)
    this.sparkles.enable(this.context)

    this.active = true
    this.burstA.run()
    return this
  }

  public stop(): this {
    this.active = false
    this.burstA.stop()
    this.burstB.stop()
    this.burstC.stop()
    this.frame.disable()
    this.sparkles.disable()
    return this
  }

  public isRunning(): boolean {
    return this.active
  }

  public onFinish(callback: CardStarLoopFinishCallback): () => void {
    this.finishListeners.add(callback)
    return () => {
      this.finishListeners.delete(callback)
    }
  }

  public update(time: number, delta: number): void {
    if (!this.prepared) {
      return
    }

    this.frame.update?.(time, delta)
    this.sparkles.update?.(time, delta)
    this.burstA.update?.(time, delta)
    this.burstB.update?.(time, delta)
    this.burstC.update?.(time, delta)
  }

  public destroy(): void {
    this.stop()
    this.clearUnsubs()
    this.finishListeners.clear()
    this.frame.destroy()
    this.sparkles.destroy()
    this.burstA.destroy()
    this.burstB.destroy()
    this.burstC.destroy()
    this.context = null
    this.prepared = false
  }

  private createFrame(): PulsingFrameEffect {
    return new PulsingFrameEffect({
      width: this.width,
      height: this.height,
      cornerRadius: this.cornerRadius,
      // Cyan playground validation, slightly eased for composition balance.
      color: 0x4ec8ff,
      intensity: 1.15,
      opacity: 0.95,
      minOpacity: 0.15,
      maxOpacity: 1,
      frameWidth: 2.5,
      glowWidth: 28,
      glowIntensity: 1.05,
      // Explicit: preserve validated inward-only Star Loop look.
      glowDirection: 'inside',
      fadeInDuration: 900,
      fadeOutDuration: 1100,
      position: 'front',
    })
  }

  private createSparkles(): AmbientSparklesEffect {
    return new AmbientSparklesEffect({
      width: this.width,
      height: this.height,
      cornerRadius: this.cornerRadius,
      // Validated denser/larger playground tuning (card-1 ambient-sparkles).
      color: 0xc8f4ff,
      intensity: 1.05,
      opacity: 0.9,
      maxActiveSparkles: 6,
      minSpawnInterval: 140,
      maxSpawnInterval: 360,
      minLifetime: 550,
      maxLifetime: 1100,
      minSize: 8,
      maxSize: 22,
      startScale: 0.65,
      peakScale: 1,
      endScale: 1.05,
      horizontalScale: 1.2,
      verticalScale: 0.85,
      spawnRegion: 'mixed',
      outsideAllowance: 14,
      seed: 11,
      position: 'front',
    })
  }

  private createBurst(color: number, seed: number): LightBurstEffect {
    return new LightBurstEffect({
      width: this.width,
      height: this.height,
      cornerRadius: this.cornerRadius,
      color,
      // Slightly under progress-chain intensity so frame + sparkles stay readable.
      intensity: 0.68,
      rayCount: 10,
      rayLength: 90,
      rayWidth: 12,
      tipFlare: 3,
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
