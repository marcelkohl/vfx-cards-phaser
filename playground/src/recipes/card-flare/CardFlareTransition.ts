import type { EffectContext } from 'phaser-vfx-effects'
import {
  ConvergingFrameEffect,
  LightBurstEffect,
  StarFlareEffect,
  Transition,
} from 'phaser-vfx-effects'
import {
  resolveCardFlareOptions,
  type CardFlareOptions,
  type ResolvedCardFlareOptions,
} from './cardFlareOptions'

export type { CardFlareOptions } from './cardFlareOptions'
export {
  CARD_FLARE_DEFAULTS,
  CARD_FLARE_FRAME1_DEFAULTS,
  CARD_FLARE_FRAME2_DEFAULTS,
  CARD_FLARE_FRAME3_DEFAULTS,
  CARD_FLARE_LIGHT_BURST_DEFAULTS,
  CARD_FLARE_STAR_FLARE_DEFAULTS,
} from './cardFlareOptions'

export type CardFlareFinishCallback = (transition: CardFlareTransition) => void

/**
 * Playground recipe: 3× Converging Frame (tunnel) → Star Flare + Light Burst (impact).
 *
 * Composition only — visuals come from phaser-vfx-effects Action Effects.
 * Educational example; not part of the package public API.
 *
 * Three separate ConvergingFrameEffect instances are required because
 * Transition starts each ActionEffect instance at most once per run().
 *
 * Pacing: anticipation (overlapping frames) first; impact enters later near
 * the end of the tunnel; Light Burst outlives Star Flare in the decay.
 */
export class CardFlareTransition {
  public readonly id = 'card-flare'
  public readonly name = 'Card Flare'
  public readonly description =
    'Recipe: blue tunnel frames → delayed star + burst impact → expanding decay.'

  private readonly inputOptions: CardFlareOptions
  private options: ResolvedCardFlareOptions
  private frame1: ConvergingFrameEffect
  private frame2: ConvergingFrameEffect
  private frame3: ConvergingFrameEffect
  private lightBurst: LightBurstEffect
  private starFlare: StarFlareEffect
  private readonly timeline = new Transition()
  private context: EffectContext | null = null
  private prepared = false
  private finishUnsub: (() => void) | null = null
  private readonly finishListeners = new Set<CardFlareFinishCallback>()

  constructor(options?: CardFlareOptions) {
    this.inputOptions = { ...options }
    this.options = resolveCardFlareOptions(this.inputOptions)
    this.frame1 = this.createFrame(this.options.frame1)
    this.frame2 = this.createFrame(this.options.frame2)
    this.frame3 = this.createFrame(this.options.frame3)
    this.lightBurst = this.createLightBurst()
    this.starFlare = this.createStarFlare()
    this.wireTimeline()
  }

  public enable(context: EffectContext): void {
    this.context = context
    this.options = resolveCardFlareOptions(this.inputOptions)

    this.finishUnsub?.()
    this.finishUnsub = null
    this.timeline.clear()

    this.frame1.destroy()
    this.frame2.destroy()
    this.frame3.destroy()
    this.lightBurst.destroy()
    this.starFlare.destroy()

    this.frame1 = this.createFrame(this.options.frame1)
    this.frame2 = this.createFrame(this.options.frame2)
    this.frame3 = this.createFrame(this.options.frame3)
    this.lightBurst = this.createLightBurst()
    this.starFlare = this.createStarFlare()

    // Frames first, then burst, then star on top as the focal hit.
    this.frame1.enable(context)
    this.frame2.enable(context)
    this.frame3.enable(context)
    this.lightBurst.enable(context)
    this.starFlare.enable(context)

    this.wireTimeline()
    this.prepared = true
  }

  public run(): this {
    if (!this.prepared || !this.context) {
      return this
    }

    this.frame1.stop()
    this.frame2.stop()
    this.frame3.stop()
    this.lightBurst.stop()
    this.starFlare.stop()

    this.timeline.run()
    return this
  }

  public stop(): this {
    this.timeline.stop()
    this.frame1.stop()
    this.frame2.stop()
    this.frame3.stop()
    this.lightBurst.stop()
    this.starFlare.stop()
    return this
  }

  public isRunning(): boolean {
    return this.timeline.isRunning()
  }

  public onFinish(callback: CardFlareFinishCallback): () => void {
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
    this.frame1.update?.(time, delta)
    this.frame2.update?.(time, delta)
    this.frame3.update?.(time, delta)
    this.lightBurst.update?.(time, delta)
    this.starFlare.update?.(time, delta)
  }

  public destroy(): void {
    this.stop()
    this.finishUnsub?.()
    this.finishUnsub = null
    this.finishListeners.clear()
    this.timeline.clear()
    this.frame1.destroy()
    this.frame2.destroy()
    this.frame3.destroy()
    this.lightBurst.destroy()
    this.starFlare.destroy()
    this.context = null
    this.prepared = false
  }

  private createFrame(
    frameOptions: ResolvedCardFlareOptions['frame1'],
  ): ConvergingFrameEffect {
    const { width, height, cornerRadius } = this.options
    return new ConvergingFrameEffect({
      width,
      height,
      cornerRadius,
      ...frameOptions,
    })
  }

  private createLightBurst(): LightBurstEffect {
    const { width, height, cornerRadius, lightBurst } = this.options
    return new LightBurstEffect({
      width,
      height,
      cornerRadius,
      ...lightBurst,
    })
  }

  private createStarFlare(): StarFlareEffect {
    const { width, height, starFlare } = this.options
    return new StarFlareEffect({
      width,
      height,
      ...starFlare,
    })
  }

  private wireTimeline(): void {
    this.finishUnsub?.()
    this.finishUnsub = null
    this.timeline.clear()

    this.timeline
      .add({ at: this.options.frame1At, effect: this.frame1 })
      .add({ at: this.options.frame2At, effect: this.frame2 })
      .add({ at: this.options.frame3At, effect: this.frame3 })
      .add({ at: this.options.lightBurstAt, effect: this.lightBurst })
      .add({ at: this.options.starFlareAt, effect: this.starFlare })

    this.finishUnsub = this.timeline.onFinish(() => {
      for (const listener of [...this.finishListeners]) {
        listener(this)
      }
    })
  }
}
