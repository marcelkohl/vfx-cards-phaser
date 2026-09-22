import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  resolveFlashOptions,
  sampleFlashEnvelope,
  type FlashOptions,
  type ResolvedFlashOptions,
} from './flashOptions'

export type { FlashOptions } from './flashOptions'
export { FLASH_DEFAULTS } from './flashOptions'

export type FlashFinishCallback = (effect: FlashEffect) => void

/**
 * Brief full-frame light burst (Action Effect).
 * Idle and invisible after `enable()` — call `run()` to flash.
 */
export class FlashEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.flash
  public readonly name = 'Flash'
  public readonly description =
    'Flash branco intenso sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: FlashOptions
  private options: ResolvedFlashOptions | null = null
  private overlay: Phaser.GameObjects.Graphics | null = null
  private elapsedMs = 0
  private alpha = 0
  private running = false
  private finishListeners = new Set<FlashFinishCallback>()

  constructor(options?: FlashOptions) {
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
    const wasRunning = this.running
    this.inputOptions = {
      ...this.inputOptions,
      ...(options as FlashOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one flash. Fires `onFinish` when it ends. */
  public run(): this {
    if (!this.options || !this.overlay) {
      return this
    }

    this.running = true
    this.elapsedMs = 0
    this.alpha = 0
    this.drawOverlay()
    return this
  }

  /** Stops immediately and hides the overlay (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.elapsedMs = 0
    this.alpha = 0
    this.drawOverlay()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  /**
   * Registers a listener invoked when a `run()` pass completes naturally.
   * Returns an unsubscribe function.
   */
  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as FlashFinishCallback
    this.finishListeners.add(listener)
    return () => {
      this.finishListeners.delete(listener)
    }
  }

  public update(_time: number, delta: number): void {
    if (!this.options || !this.overlay) {
      return
    }

    if (!this.running) {
      if (this.alpha !== 0) {
        this.alpha = 0
        this.drawOverlay()
      }
      return
    }

    this.elapsedMs += delta
    const sample = sampleFlashEnvelope(this.elapsedMs, this.options)

    if (sample.finished) {
      this.running = false
      this.alpha = 0
      this.drawOverlay()
      this.emitFinish()
      return
    }

    this.alpha = sample.alpha
    this.drawOverlay()
  }

  public disable(): void {
    this.running = false
    this.clearVisuals()
    this.elapsedMs = 0
    this.alpha = 0
  }

  /** @deprecated Use `disable`. */
  public remove(): void {
    this.disable()
  }

  public destroy(): void {
    this.finishListeners.clear()
    this.disable()
  }

  private emitFinish(): void {
    for (const listener of [...this.finishListeners]) {
      listener(this)
    }
  }

  private rebuild(context: EffectContext): void {
    this.clearVisuals()
    this.options = resolveFlashOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.alpha = 0

    this.overlay = context.scene.add.graphics()
    this.overlay.setName(`effect:${this.id}`)
    this.overlay.setBlendMode(this.options.blendMode)
    context.target.add(this.overlay)
    this.drawOverlay()
  }

  private drawOverlay(): void {
    if (!this.overlay || !this.options) {
      return
    }

    this.overlay.clear()

    const peak = Math.min(this.options.intensity * this.alpha, 1)
    if (peak < 0.004) {
      return
    }

    const { width, height, cornerRadius, color } = this.options
    this.overlay.fillStyle(color, peak)
    this.overlay.fillRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      cornerRadius,
    )
  }

  private clearVisuals(): void {
    this.overlay?.destroy()
    this.overlay = null
    this.options = null
  }
}
