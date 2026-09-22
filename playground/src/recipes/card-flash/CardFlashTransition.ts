import type { EffectContext } from 'phaser-vfx-effects'
import {
  ExpandingFrameEffect,
  LightBurstEffect,
  RadialGlowEffect,
  StreakBurstEffect,
  Transition,
} from 'phaser-vfx-effects'
import {
  resolveCardFlashOptions,
  type CardFlashOptions,
  type ResolvedCardFlashOptions,
} from './cardFlashOptions'

export type { CardFlashOptions } from './cardFlashOptions'
export {
  CARD_FLASH_DEFAULTS,
  CARD_FLASH_EXPANDING_FRAME_DEFAULTS,
  CARD_FLASH_LIGHT_BURST_DEFAULTS,
  CARD_FLASH_RADIAL_GLOW_DEFAULTS,
  CARD_FLASH_STREAK_BURST_DEFAULTS,
} from './cardFlashOptions'

export type CardFlashFinishCallback = (transition: CardFlashTransition) => void

/**
 * Playground recipe: Expanding Frame flash + Radial Glow + Light Burst + Streak Burst.
 *
 * Composition only — visuals come from phaser-vfx-effects Action Effects.
 * Educational example; not part of the package public API.
 *
 * Distinct from `Card Flash Burst` (Flash + Light Burst + Bloom Fade).
 */
export class CardFlashTransition {
  public readonly id = 'card-flash'
  public readonly name = 'Card Flash'
  public readonly description =
    'Recipe: cyan frame flash + halo + subtle rays + outward streaks.'

  private readonly inputOptions: CardFlashOptions
  private options: ResolvedCardFlashOptions
  private expandingFrame: ExpandingFrameEffect
  private radialGlow: RadialGlowEffect
  private lightBurst: LightBurstEffect
  private streakBurst: StreakBurstEffect
  private readonly timeline = new Transition()
  private context: EffectContext | null = null
  private prepared = false
  private finishUnsub: (() => void) | null = null
  private readonly finishListeners = new Set<CardFlashFinishCallback>()

  constructor(options?: CardFlashOptions) {
    this.inputOptions = { ...options }
    this.options = resolveCardFlashOptions(this.inputOptions)
    this.expandingFrame = this.createExpandingFrame()
    this.radialGlow = this.createRadialGlow()
    this.lightBurst = this.createLightBurst()
    this.streakBurst = this.createStreakBurst()
    this.wireTimeline()
  }

  public enable(context: EffectContext): void {
    this.context = context
    this.options = resolveCardFlashOptions(this.inputOptions)

    this.finishUnsub?.()
    this.finishUnsub = null
    this.timeline.clear()

    this.expandingFrame.destroy()
    this.radialGlow.destroy()
    this.lightBurst.destroy()
    this.streakBurst.destroy()

    this.expandingFrame = this.createExpandingFrame()
    this.radialGlow = this.createRadialGlow()
    this.lightBurst = this.createLightBurst()
    this.streakBurst = this.createStreakBurst()

    // Back → front: halo behind, then rays, frame fill, streaks on top.
    this.radialGlow.enable(context)
    this.lightBurst.enable(context)
    this.expandingFrame.enable(context)
    this.streakBurst.enable(context)

    this.wireTimeline()
    this.prepared = true
  }

  public run(): this {
    if (!this.prepared || !this.context) {
      return this
    }

    this.expandingFrame.stop()
    this.radialGlow.stop()
    this.lightBurst.stop()
    this.streakBurst.stop()

    this.timeline.run()
    return this
  }

  public stop(): this {
    this.timeline.stop()
    this.expandingFrame.stop()
    this.radialGlow.stop()
    this.lightBurst.stop()
    this.streakBurst.stop()
    return this
  }

  public isRunning(): boolean {
    return this.timeline.isRunning()
  }

  public onFinish(callback: CardFlashFinishCallback): () => void {
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
    this.expandingFrame.update?.(time, delta)
    this.radialGlow.update?.(time, delta)
    this.lightBurst.update?.(time, delta)
    this.streakBurst.update?.(time, delta)
  }

  public destroy(): void {
    this.stop()
    this.finishUnsub?.()
    this.finishUnsub = null
    this.finishListeners.clear()
    this.timeline.clear()
    this.expandingFrame.destroy()
    this.radialGlow.destroy()
    this.lightBurst.destroy()
    this.streakBurst.destroy()
    this.context = null
    this.prepared = false
  }

  private createExpandingFrame(): ExpandingFrameEffect {
    const { width, height, cornerRadius, expandingFrame } = this.options
    return new ExpandingFrameEffect({
      width,
      height,
      cornerRadius,
      ...expandingFrame,
    })
  }

  private createRadialGlow(): RadialGlowEffect {
    const { width, height, radialGlow } = this.options
    return new RadialGlowEffect({
      width,
      height,
      ...radialGlow,
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

  private createStreakBurst(): StreakBurstEffect {
    const { width, height, streakBurst } = this.options
    return new StreakBurstEffect({
      width,
      height,
      ...streakBurst,
    })
  }

  private wireTimeline(): void {
    this.finishUnsub?.()
    this.finishUnsub = null
    this.timeline.clear()

    this.timeline
      .add({ at: this.options.expandingFrameAt, effect: this.expandingFrame })
      .add({ at: this.options.radialGlowAt, effect: this.radialGlow })
      .add({ at: this.options.lightBurstAt, effect: this.lightBurst })
      .add({ at: this.options.streakBurstAt, effect: this.streakBurst })

    this.finishUnsub = this.timeline.onFinish(() => {
      for (const listener of [...this.finishListeners]) {
        listener(this)
      }
    })
  }
}
