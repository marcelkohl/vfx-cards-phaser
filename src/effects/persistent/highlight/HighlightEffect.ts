import Phaser from 'phaser'
import type { PersistentEffect } from '../../../core/PersistentEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  resolveHighlightOptions,
  type HighlightEffectOptions,
  type ResolvedHighlightEffectOptions,
} from './highlightOptions'

export type { HighlightEffectOptions } from './highlightOptions'
export { HIGHLIGHT_EFFECT_DEFAULTS } from './highlightOptions'

export class HighlightEffect implements PersistentEffect {
  public readonly id = EFFECT_IDS.highlight
  public readonly name = 'Highlight'
  public readonly description = 'Adiciona um contorno ao redor da carta.'
  public readonly kind = 'persistent' as const

  private inputOptions: HighlightEffectOptions
  private outline: Phaser.GameObjects.Graphics | null = null
  private resolved: ResolvedHighlightEffectOptions | null = null

  constructor(options?: HighlightEffectOptions) {
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
    this.inputOptions = {
      ...this.inputOptions,
      ...(options as HighlightEffectOptions),
    }
    this.rebuild(context)
  }

  public disable(): void {
    this.outline?.destroy()
    this.outline = null
    this.resolved = null
  }

  /** @deprecated Use `disable`. */
  public remove(): void {
    this.disable()
  }

  public destroy(): void {
    this.disable()
  }

  private rebuild(context: EffectContext): void {
    this.outline?.destroy()
    this.outline = null

    this.resolved = resolveHighlightOptions(this.inputOptions)
    const { width, height, color, alpha, lineWidth, outerPadding, cornerRadius } =
      this.resolved

    const left = -width / 2 - outerPadding
    const top = -height / 2 - outerPadding

    this.outline = context.scene.add.graphics()
    this.outline.lineStyle(lineWidth, color, alpha)
    this.outline.strokeRoundedRect(
      left,
      top,
      width + outerPadding * 2,
      height + outerPadding * 2,
      cornerRadius,
    )
    this.outline.setName(`effect:${this.id}`)
    context.target.addAt(this.outline, 0)
  }
}
