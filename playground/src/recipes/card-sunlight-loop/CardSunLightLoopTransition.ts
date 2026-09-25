import type { EffectContext } from 'phaser-vfx-effects'
import {
  AmbientSparklesEffect,
  LightBurstEffect,
  PulsingFrameEffect,
  RadialGlowEffect,
} from 'phaser-vfx-effects'

export type CardSunLightLoopFinishCallback = (
  loop: CardSunLightLoopTransition,
) => void

/** Light Burst crossfade handoff (~900ms of 2000). */
const BURST_CHAIN_AT = 0.45

/**
 * Radial Glow handoff as a fraction of each wave's lifecycle.
 * With duration 1600ms and two instances: next reuse of A ≈ 1760ms > 1600
 * so A has finished before it is triggered again.
 */
const RADIAL_CHAIN_AT = 0.55

/** First radial wave starts ~440ms into the opening Light Burst (desync). */
const RADIAL_START_AT = 0.22

/**
 * Playground recipe: brighter continuous magical card state.
 *
 * ```text
 * PulsingFrameEffect          — persistent border (glow both sides)
 * AmbientSparklesEffect       — persistent ambient star detail
 * LightBurstEffect × 3        — richer ray crossfade via onProgress()
 * RadialGlowEffect × 2        — successive expanding optical waves
 * ```
 *
 * Composition only — visuals come from phaser-vfx-effects.
 * Not part of the package public API. Independent of Card Star Loop.
 *
 * Click again while active → `stop()` (chains cannot resurrect).
 */
export class CardSunLightLoopTransition {
  public readonly id = 'card-sunlight-loop'
  public readonly name = 'Card SunLight Loop'
  public readonly description =
    'Recipe: pulsing frame + sparkles + Light Burst × 3 + Radial Glow × 2 waves.'

  private frame: PulsingFrameEffect
  private sparkles: AmbientSparklesEffect
  private burstA: LightBurstEffect
  private burstB: LightBurstEffect
  private burstC: LightBurstEffect
  private radialA: RadialGlowEffect
  private radialB: RadialGlowEffect
  private context: EffectContext | null = null
  private prepared = false
  /** True while the continuous loop should keep chaining. */
  private active = false
  /** True after the first Radial Glow has been kickstarted this run. */
  private radialKickstarted = false
  private readonly unsubs: Array<() => void> = []
  private readonly finishListeners = new Set<CardSunLightLoopFinishCallback>()

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly cornerRadius: number,
  ) {
    this.frame = this.createFrame()
    this.sparkles = this.createSparkles()
    this.burstA = this.createBurst(0x4ec8ff, 101)
    this.burstB = this.createBurst(0x66ddff, 9091)
    this.burstC = this.createBurst(0x7ad8ff, 55055)
    this.radialA = this.createRadial()
    this.radialB = this.createRadial()
  }

  public enable(context: EffectContext): void {
    this.context = context
    this.clearUnsubs()
    this.active = false
    this.radialKickstarted = false

    this.frame.destroy()
    this.sparkles.destroy()
    this.burstA.destroy()
    this.burstB.destroy()
    this.burstC.destroy()
    this.radialA.destroy()
    this.radialB.destroy()

    this.frame = this.createFrame()
    this.sparkles = this.createSparkles()
    this.burstA = this.createBurst(0x4ec8ff, 101)
    this.burstB = this.createBurst(0x66ddff, 9091)
    this.burstC = this.createBurst(0x7ad8ff, 55055)
    this.radialA = this.createRadial()
    this.radialB = this.createRadial()

    this.burstA.enable(context)
    this.burstB.enable(context)
    this.burstC.enable(context)
    this.radialA.enable(context)
    this.radialB.enable(context)

    // Register once per enable(); clearUnsubs prevents duplicates on re-enable.
    this.unsubs.push(
      this.burstA.onProgress(BURST_CHAIN_AT, () => {
        if (!this.active) {
          return
        }
        this.burstB.run()
      }),
    )
    this.unsubs.push(
      this.burstB.onProgress(BURST_CHAIN_AT, () => {
        if (!this.active) {
          return
        }
        this.burstC.run()
      }),
    )
    this.unsubs.push(
      this.burstC.onProgress(BURST_CHAIN_AT, () => {
        if (!this.active) {
          return
        }
        this.burstA.run()
      }),
    )

    // Offset radial rhythm from the ray field (~440ms into first burst).
    this.unsubs.push(
      this.burstA.onProgress(RADIAL_START_AT, () => {
        if (!this.active || this.radialKickstarted) {
          return
        }
        this.radialKickstarted = true
        this.radialA.run()
      }),
    )

    this.unsubs.push(
      this.radialA.onProgress(RADIAL_CHAIN_AT, () => {
        if (!this.active) {
          return
        }
        this.radialB.run()
      }),
    )
    this.unsubs.push(
      this.radialB.onProgress(RADIAL_CHAIN_AT, () => {
        if (!this.active) {
          return
        }
        this.radialA.run()
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

    // Mount / remount layers: frame → radials → bursts → sparkles on top.
    this.frame.enable(this.context)
    this.radialA.enable(this.context)
    this.radialB.enable(this.context)
    this.burstA.enable(this.context)
    this.burstB.enable(this.context)
    this.burstC.enable(this.context)
    this.sparkles.enable(this.context)

    this.active = true
    this.radialKickstarted = false
    this.burstA.run()
    return this
  }

  public stop(): this {
    this.active = false
    this.radialKickstarted = false
    this.burstA.stop()
    this.burstB.stop()
    this.burstC.stop()
    this.radialA.stop()
    this.radialB.stop()
    this.frame.disable()
    this.sparkles.disable()
    return this
  }

  public isRunning(): boolean {
    return this.active
  }

  public onFinish(callback: CardSunLightLoopFinishCallback): () => void {
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
    this.radialA.update?.(time, delta)
    this.radialB.update?.(time, delta)
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
    this.radialA.destroy()
    this.radialB.destroy()
    this.context = null
    this.prepared = false
  }

  private createFrame(): PulsingFrameEffect {
    return new PulsingFrameEffect({
      width: this.width,
      height: this.height,
      cornerRadius: this.cornerRadius,
      // Bright cyan contour; both-side glow for surrounding illumination.
      color: 0x4ec8ff,
      intensity: 1.2,
      opacity: 0.95,
      minOpacity: 0.18,
      maxOpacity: 1,
      frameWidth: 2.2,
      glowWidth: 36,
      glowIntensity: 1.05,
      glowDirection: 'both',
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
      // Validated denser/larger playground tuning (same family as Card Star Loop).
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
      seed: 19,
      position: 'front',
    })
  }

  private createBurst(color: number, seed: number): LightBurstEffect {
    return new LightBurstEffect({
      width: this.width,
      height: this.height,
      cornerRadius: this.cornerRadius,
      color,
      // Moderately richer than Card Star Loop — soft overlap, not opaque field.
      intensity: 0.82,
      rayCount: 11,
      rayLength: 105,
      rayWidth: 13,
      tipFlare: 3.2,
      duration: 2000,
      originInset: 0.26,
      position: 'front',
      scaleMode: 'continuous',
      startScale: 0.5,
      endScale: 1.35,
      peakAt: 0.5,
      seed,
    })
  }

  private createRadial(): RadialGlowEffect {
    return new RadialGlowEffect({
      width: this.width,
      height: this.height,
      // Optical ring from near-card to well beyond; long soft fade-out.
      color: 0x66ddff,
      intensity: 0.32,
      opacity: 0.8,
      radius: 125,
      aspect: 1.08,
      ringWidth: 1.5,
      rimIntensity: 2.35,
      innerTrail: 0.48,
      outerGlow: 0.09,
      positionX: 0.5,
      positionY: 0.5,
      startScale: 0.55,
      endScale: 1.9,
      fadeInDuration: 220,
      holdDuration: 180,
      fadeOutDuration: 1200,
      softness: 0.7,
      position: 'front',
    })
  }

  private clearUnsubs(): void {
    for (const unsub of this.unsubs) {
      unsub()
    }
    this.unsubs.length = 0
  }
}
