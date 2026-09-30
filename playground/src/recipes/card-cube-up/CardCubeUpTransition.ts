import type { EffectContext } from 'phaser-vfx-effects'
import {
  BloomFadeEffect,
  FlashEffect,
  RisingBlocksEffect,
  RisingLightColumnsEffect,
  Transition,
} from 'phaser-vfx-effects'
import {
  resolveCardCubeUpOptions,
  type CardCubeUpOptions,
  type ResolvedCardCubeUpOptions,
} from './cardCubeUpOptions'

export type { CardCubeUpOptions } from './cardCubeUpOptions'
export {
  CARD_CUBE_UP_BLOOM_DEFAULTS,
  CARD_CUBE_UP_BLOCKS_DEFAULTS,
  CARD_CUBE_UP_COLUMNS_DEFAULTS,
  CARD_CUBE_UP_DEFAULTS,
  CARD_CUBE_UP_FLASH_DEFAULTS,
} from './cardCubeUpOptions'

export type CardCubeUpFinishCallback = (
  transition: CardCubeUpTransition,
) => void

/**
 * Playground recipe: cyan ignition → rising light columns → rising blocks.
 *
 * ```text
 * FlashEffect                 — short full-card surface wash
 * BloomFadeEffect             — subtle exterior atmosphere
 * RisingLightColumnsEffect    — long vertical trails rising / dissolving
 * RisingBlocksEffect          — discrete rectangular fragments rising
 * ```
 *
 * Composition only — visuals come from phaser-vfx-effects Action Effects.
 * Educational example; not part of the package public API.
 *
 * Does not use ExpandingFrameEffect — Flash + Bloom Fade own the ignition.
 */
export class CardCubeUpTransition {
  public readonly id = 'card-cube-up'
  public readonly name = 'Card Cube Up'
  public readonly description =
    'Recipe: cyan flash + bloom ignition → rising light columns → rising blocks.'

  private readonly inputOptions: CardCubeUpOptions
  private options: ResolvedCardCubeUpOptions
  private flash: FlashEffect
  private bloomFade: BloomFadeEffect
  private risingLightColumns: RisingLightColumnsEffect
  private risingBlocks: RisingBlocksEffect
  private readonly timeline = new Transition()
  private context: EffectContext | null = null
  private prepared = false
  private finishUnsub: (() => void) | null = null
  private readonly finishListeners = new Set<CardCubeUpFinishCallback>()

  constructor(options?: CardCubeUpOptions) {
    this.inputOptions = { ...options }
    this.options = resolveCardCubeUpOptions(this.inputOptions)
    this.flash = this.createFlash()
    this.bloomFade = this.createBloomFade()
    this.risingLightColumns = this.createRisingLightColumns()
    this.risingBlocks = this.createRisingBlocks()
    this.wireTimeline()
  }

  public enable(context: EffectContext): void {
    this.context = context
    this.options = resolveCardCubeUpOptions(this.inputOptions)

    this.finishUnsub?.()
    this.finishUnsub = null
    this.timeline.clear()

    this.flash.destroy()
    this.bloomFade.destroy()
    this.risingLightColumns.destroy()
    this.risingBlocks.destroy()

    this.flash = this.createFlash()
    this.bloomFade = this.createBloomFade()
    this.risingLightColumns = this.createRisingLightColumns()
    this.risingBlocks = this.createRisingBlocks()

    // Back → front: exterior bloom, surface flash, columns, blocks on top.
    this.bloomFade.enable(context)
    this.flash.enable(context)
    this.risingLightColumns.enable(context)
    this.risingBlocks.enable(context)

    this.wireTimeline()
    this.prepared = true
  }

  public run(): this {
    if (!this.prepared || !this.context) {
      return this
    }

    this.flash.stop()
    this.bloomFade.stop()
    this.risingLightColumns.stop()
    this.risingBlocks.stop()

    this.timeline.run()
    return this
  }

  public stop(): this {
    this.timeline.stop()
    this.flash.stop()
    this.bloomFade.stop()
    this.risingLightColumns.stop()
    this.risingBlocks.stop()
    return this
  }

  public isRunning(): boolean {
    return this.timeline.isRunning()
  }

  public onFinish(callback: CardCubeUpFinishCallback): () => void {
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
    this.bloomFade.update?.(time, delta)
    this.risingLightColumns.update?.(time, delta)
    this.risingBlocks.update?.(time, delta)
  }

  public destroy(): void {
    this.stop()
    this.finishUnsub?.()
    this.finishUnsub = null
    this.finishListeners.clear()
    this.timeline.clear()
    this.flash.destroy()
    this.bloomFade.destroy()
    this.risingLightColumns.destroy()
    this.risingBlocks.destroy()
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

  private createBloomFade(): BloomFadeEffect {
    const { width, height, cornerRadius, bloomFade } = this.options
    return new BloomFadeEffect({
      width,
      height,
      cornerRadius,
      ...bloomFade,
    })
  }

  private createRisingLightColumns(): RisingLightColumnsEffect {
    const { width, height, risingLightColumns } = this.options
    return new RisingLightColumnsEffect({
      width,
      height,
      ...risingLightColumns,
    })
  }

  private createRisingBlocks(): RisingBlocksEffect {
    const { width, height, risingBlocks } = this.options
    return new RisingBlocksEffect({
      width,
      height,
      ...risingBlocks,
    })
  }

  private wireTimeline(): void {
    this.finishUnsub?.()
    this.finishUnsub = null
    this.timeline.clear()

    this.timeline
      .add({ at: this.options.flashAt, effect: this.flash })
      .add({ at: this.options.bloomFadeAt, effect: this.bloomFade })
      .add({
        at: this.options.risingLightColumnsAt,
        effect: this.risingLightColumns,
      })
      .add({ at: this.options.risingBlocksAt, effect: this.risingBlocks })

    this.finishUnsub = this.timeline.onFinish(() => {
      for (const listener of [...this.finishListeners]) {
        listener(this)
      }
    })
  }
}
