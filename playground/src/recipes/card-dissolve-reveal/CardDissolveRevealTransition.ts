import type { EffectContext } from 'phaser-vfx-effects'
import {
  BloomFadeEffect,
  DissolveRevealEffect,
  FlashEffect,
  Transition,
} from 'phaser-vfx-effects'
import {
  resolveCardDissolveRevealOptions,
  type CardDissolveRevealOptions,
  type ResolvedCardDissolveRevealOptions,
} from './cardDissolveRevealOptions'

export type {
  CardDissolveRevealOptions,
  CardDissolveRevealTransitionOptions,
} from './cardDissolveRevealOptions'
export {
  CARD_DISSOLVE_REVEAL_BLOOM_DEFAULTS,
  CARD_DISSOLVE_REVEAL_DEFAULTS,
  CARD_DISSOLVE_REVEAL_FLASH_DEFAULTS,
} from './cardDissolveRevealOptions'

export type CardDissolveRevealFinishCallback = (
  transition: CardDissolveRevealTransition,
) => void

/**
 * Playground recipe: Flash + Dissolve Reveal in parallel, then Bloom Fade.
 * Composition only — visuals come from phaser-vfx-effects Action Effects.
 *
 * Flash and dissolve start together; flash finishes around mid-dissolve,
 * then dissolve continues alone into bloom.
 */
export class CardDissolveRevealTransition {
  public readonly id = 'card-dissolve-reveal'
  public readonly name = 'Card Dissolve Reveal'
  public readonly description =
    'Recipe: flash + dissolve em paralelo; flash termina na metade do dissolve.'

  private readonly inputOptions: CardDissolveRevealOptions
  private options: ResolvedCardDissolveRevealOptions
  private flash: FlashEffect
  private dissolve: DissolveRevealEffect
  private bloomFade: BloomFadeEffect
  private readonly timeline = new Transition()
  private context: EffectContext | null = null
  private prepared = false
  private finishUnsub: (() => void) | null = null
  private readonly finishListeners = new Set<CardDissolveRevealFinishCallback>()

  constructor(options?: CardDissolveRevealOptions) {
    this.inputOptions = { ...options }
    this.options = resolveCardDissolveRevealOptions(this.inputOptions)
    this.flash = this.createFlash()
    this.dissolve = this.createDissolve()
    this.bloomFade = this.createBloomFade()
    this.wireTimeline()
  }

  public enable(context: EffectContext): void {
    this.context = context
    this.options = resolveCardDissolveRevealOptions(this.inputOptions)

    this.finishUnsub?.()
    this.finishUnsub = null
    this.timeline.clear()

    this.flash.destroy()
    this.dissolve.destroy()
    this.bloomFade.destroy()

    this.flash = this.createFlash()
    this.dissolve = this.createDissolve()
    this.bloomFade = this.createBloomFade()

    this.bloomFade.enable(context)
    this.dissolve.enable(context)
    this.flash.enable(context)

    this.wireTimeline()
    this.prepared = true
  }

  public run(): this {
    if (!this.prepared || !this.context) {
      return this
    }

    this.flash.stop()
    this.dissolve.stop()
    this.bloomFade.stop()

    this.timeline.run()
    return this
  }

  public stop(): this {
    this.timeline.stop()
    this.flash.stop()
    this.dissolve.stop()
    this.bloomFade.stop()
    return this
  }

  public isRunning(): boolean {
    return this.timeline.isRunning()
  }

  public onFinish(callback: CardDissolveRevealFinishCallback): () => void {
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
    this.dissolve.update?.(time, delta)
    this.bloomFade.update?.(time, delta)
  }

  public destroy(): void {
    this.stop()
    this.finishUnsub?.()
    this.finishUnsub = null
    this.finishListeners.clear()
    this.timeline.clear()
    this.flash.destroy()
    this.dissolve.destroy()
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

  private createDissolve(): DissolveRevealEffect {
    const { width, height, cornerRadius, dissolveReveal } = this.options
    return new DissolveRevealEffect({
      width,
      height,
      cornerRadius,
      ...dissolveReveal,
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
      .add({ at: this.options.dissolveAt, effect: this.dissolve })
      .add({ at: this.options.bloomAt, effect: this.bloomFade })

    this.finishUnsub = this.timeline.onFinish(() => {
      for (const listener of [...this.finishListeners]) {
        listener(this)
      }
    })
  }
}
