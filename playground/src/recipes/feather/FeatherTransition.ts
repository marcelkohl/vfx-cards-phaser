import type { EffectContext } from 'phaser-vfx-effects'
import {
  FragmentBurstEffect,
  RisingStarEffect,
  SoftGlowPulseEffect,
  SparkleBurstEffect,
  Transition,
} from 'phaser-vfx-effects'
import {
  resolveFeatherOptions,
  type FeatherOptions,
  type ResolvedFeatherOptions,
} from './featherOptions'

export type { FeatherOptions } from './featherOptions'
export {
  FEATHER_AURA_DEFAULTS,
  FEATHER_DEFAULTS,
  FEATHER_FRAGMENT_DEFAULTS,
  FEATHER_RISING_STAR_DEFAULTS,
  FEATHER_RISING_STAR_LATE_DEFAULTS,
  FEATHER_SPARKLE_DEFAULTS,
} from './featherOptions'

export type FeatherFinishCallback = (transition: FeatherTransition) => void

/**
 * Playground recipe: Soft Glow Pulse (aura) + Fragment Burst + Sparkle Burst
 * + Rising Star waves.
 *
 * Composition only — visuals come from phaser-vfx-effects Action Effects.
 * Educational example; not part of the package public API.
 */
export class FeatherTransition {
  public readonly id = 'feather'
  public readonly name = 'Feather'
  public readonly description =
    'Recipe: aura + fragments + sparkles + rising stars (magical reveal).'

  private readonly inputOptions: FeatherOptions
  private options: ResolvedFeatherOptions
  private aura: SoftGlowPulseEffect
  private fragmentBurst: FragmentBurstEffect
  private sparkleBurst: SparkleBurstEffect
  private risingStar: RisingStarEffect
  private risingStarLate: RisingStarEffect
  private readonly timeline = new Transition()
  private context: EffectContext | null = null
  private prepared = false
  private finishUnsub: (() => void) | null = null
  private readonly finishListeners = new Set<FeatherFinishCallback>()

  constructor(options?: FeatherOptions) {
    this.inputOptions = { ...options }
    this.options = resolveFeatherOptions(this.inputOptions)
    this.aura = this.createAura()
    this.fragmentBurst = this.createFragmentBurst()
    this.sparkleBurst = this.createSparkleBurst()
    this.risingStar = this.createRisingStar()
    this.risingStarLate = this.createRisingStarLate()
    this.wireTimeline()
  }

  public enable(context: EffectContext): void {
    this.context = context
    this.options = resolveFeatherOptions(this.inputOptions)

    this.finishUnsub?.()
    this.finishUnsub = null
    this.timeline.clear()

    this.aura.destroy()
    this.fragmentBurst.destroy()
    this.sparkleBurst.destroy()
    this.risingStar.destroy()
    this.risingStarLate.destroy()

    this.aura = this.createAura()
    this.fragmentBurst = this.createFragmentBurst()
    this.sparkleBurst = this.createSparkleBurst()
    this.risingStar = this.createRisingStar()
    this.risingStarLate = this.createRisingStarLate()

    // Aura first so later bursts draw above the soft edge glow.
    this.aura.enable(context)
    this.fragmentBurst.enable(context)
    this.sparkleBurst.enable(context)
    this.risingStar.enable(context)
    this.risingStarLate.enable(context)

    this.wireTimeline()
    this.prepared = true
  }

  public run(): this {
    if (!this.prepared || !this.context) {
      return this
    }

    this.aura.stop()
    this.fragmentBurst.stop()
    this.sparkleBurst.stop()
    this.risingStar.stop()
    this.risingStarLate.stop()

    this.timeline.run()
    return this
  }

  public stop(): this {
    this.timeline.stop()
    this.aura.stop()
    this.fragmentBurst.stop()
    this.sparkleBurst.stop()
    this.risingStar.stop()
    this.risingStarLate.stop()
    return this
  }

  public isRunning(): boolean {
    return this.timeline.isRunning()
  }

  public onFinish(callback: FeatherFinishCallback): () => void {
    this.finishListeners.add(callback)
    return () => {
      this.finishListeners.delete(callback)
    }
  }

  public update(time: number, delta: number): void {
    if (!this.prepared) {
      return
    }

    this.timeline.update(time, delta)
    this.aura.update?.(time, delta)
    this.fragmentBurst.update?.(time, delta)
    this.sparkleBurst.update?.(time, delta)
    this.risingStar.update?.(time, delta)
    this.risingStarLate.update?.(time, delta)
  }

  public destroy(): void {
    this.stop()
    this.finishUnsub?.()
    this.finishUnsub = null
    this.finishListeners.clear()
    this.timeline.clear()
    this.aura.destroy()
    this.fragmentBurst.destroy()
    this.sparkleBurst.destroy()
    this.risingStar.destroy()
    this.risingStarLate.destroy()
    this.context = null
    this.prepared = false
  }

  private createAura(): SoftGlowPulseEffect {
    const { width, height, cornerRadius, aura } = this.options
    return new SoftGlowPulseEffect({
      width,
      height,
      cornerRadius,
      ...aura,
    })
  }

  private createFragmentBurst(): FragmentBurstEffect {
    const { width, height, cornerRadius, fragmentBurst } = this.options
    return new FragmentBurstEffect({
      width,
      height,
      cornerRadius,
      ...fragmentBurst,
    })
  }

  private createSparkleBurst(): SparkleBurstEffect {
    const { width, height, cornerRadius, sparkleBurst } = this.options
    return new SparkleBurstEffect({
      width,
      height,
      cornerRadius,
      ...sparkleBurst,
    })
  }

  private createRisingStar(): RisingStarEffect {
    const { width, height, cornerRadius, risingStar } = this.options
    return new RisingStarEffect({
      width,
      height,
      cornerRadius,
      ...risingStar,
    })
  }

  private createRisingStarLate(): RisingStarEffect {
    const { width, height, cornerRadius, risingStarLate } = this.options
    return new RisingStarEffect({
      width,
      height,
      cornerRadius,
      ...risingStarLate,
    })
  }

  private wireTimeline(): void {
    this.finishUnsub?.()
    this.finishUnsub = null
    this.timeline.clear()

    this.timeline
      .add({ at: this.options.auraAt, effect: this.aura })
      .add({ at: this.options.fragmentAt, effect: this.fragmentBurst })
      .add({ at: this.options.sparkleAt, effect: this.sparkleBurst })
      .add({ at: this.options.risingStarAt, effect: this.risingStar })
      .add({ at: this.options.risingStarLateAt, effect: this.risingStarLate })

    this.finishUnsub = this.timeline.onFinish(() => {
      for (const listener of [...this.finishListeners]) {
        listener(this)
      }
    })
  }
}
