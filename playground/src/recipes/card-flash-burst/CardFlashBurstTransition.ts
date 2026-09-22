import type { EffectContext } from 'phaser-vfx-effects'
import {
  BloomFadeEffect,
  FlashEffect,
  LightBurstEffect,
  Transition,
} from 'phaser-vfx-effects'
import {
  resolveCardFlashBurstOptions,
  type CardFlashBurstOptions,
  type ResolvedCardFlashBurstOptions,
} from './cardFlashBurstOptions'

export type { CardFlashBurstOptions } from './cardFlashBurstOptions'
export {
  CARD_FLASH_BURST_BLOOM_DEFAULTS,
  CARD_FLASH_BURST_DEFAULTS,
} from './cardFlashBurstOptions'

export type CardFlashBurstFinishCallback = (
  transition: CardFlashBurstTransition,
) => void

/**
 * Playground recipe: Flash → Light Burst → Bloom Fade.
 * Composition only — visuals come from phaser-vfx-effects Action Effects.
 */
export class CardFlashBurstTransition {
  public readonly id = 'card-flash-burst'
  public readonly name = 'Card Flash Burst'
  public readonly description =
    'Recipe: flash + light burst + bloom fade em sequência sobreposta.'

  private readonly inputOptions: CardFlashBurstOptions
  private options: ResolvedCardFlashBurstOptions
  private flash: FlashEffect
  private lightBurst: LightBurstEffect
  private bloomFade: BloomFadeEffect
  private readonly timeline = new Transition()
  private context: EffectContext | null = null
  private prepared = false
  private finishUnsub: (() => void) | null = null
  private readonly finishListeners = new Set<CardFlashBurstFinishCallback>()

  constructor(options?: CardFlashBurstOptions) {
    this.inputOptions = { ...options }
    this.options = resolveCardFlashBurstOptions(this.inputOptions)
    this.flash = this.createFlash()
    this.lightBurst = this.createLightBurst()
    this.bloomFade = this.createBloomFade()
    this.wireTimeline()
  }

  public enable(context: EffectContext): void {
    this.context = context
    this.options = resolveCardFlashBurstOptions(this.inputOptions)

    this.finishUnsub?.()
    this.finishUnsub = null
    this.timeline.clear()

    this.flash.destroy()
    this.lightBurst.destroy()
    this.bloomFade.destroy()

    this.flash = this.createFlash()
    this.lightBurst = this.createLightBurst()
    this.bloomFade = this.createBloomFade()

    this.flash.enable(context)
    this.lightBurst.enable(context)
    this.bloomFade.enable(context)

    this.wireTimeline()
    this.prepared = true
  }

  public run(): this {
    if (!this.prepared || !this.context) {
      return this
    }

    this.timeline.run()
    return this
  }

  public stop(): this {
    this.timeline.stop()
    this.flash.stop()
    this.lightBurst.stop()
    this.bloomFade.stop()
    return this
  }

  public isRunning(): boolean {
    return this.timeline.isRunning()
  }

  public onFinish(callback: CardFlashBurstFinishCallback): () => void {
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
    this.flash.update?.(time, delta)
    this.lightBurst.update?.(time, delta)
    this.bloomFade.update?.(time, delta)
  }

  public destroy(): void {
    this.stop()
    this.finishUnsub?.()
    this.finishUnsub = null
    this.finishListeners.clear()
    this.timeline.clear()
    this.flash.destroy()
    this.lightBurst.destroy()
    this.bloomFade.destroy()
    this.context = null
    this.prepared = false
  }

  private createFlash(): FlashEffect {
    const { width, height, cornerRadius, flash } = this.options
    return new FlashEffect({
      width,
      height,
      cornerRadius,
      ...flash,
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

  private createBloomFade(): BloomFadeEffect {
    const { width, height, cornerRadius, bloomFade } = this.options
    return new BloomFadeEffect({
      width,
      height,
      cornerRadius,
      ...bloomFade,
    })
  }

  private wireTimeline(): void {
    this.finishUnsub?.()
    this.finishUnsub = null
    this.timeline.clear()

    this.timeline
      .add({ at: this.options.flashAt, effect: this.flash })
      .add({ at: this.options.lightBurstAt, effect: this.lightBurst })
      .add({ at: this.options.bloomFadeAt, effect: this.bloomFade })

    this.finishUnsub = this.timeline.onFinish(() => {
      for (const listener of [...this.finishListeners]) {
        listener(this)
      }
    })
  }
}
