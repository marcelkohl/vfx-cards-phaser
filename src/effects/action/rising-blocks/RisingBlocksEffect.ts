import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import { ActionRunProgress } from '../../../core/ActionRunProgress'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  buildRisingBlocks,
  getRisingBlocksDurationMs,
  resolveRisingBlocksOptions,
  risingBlockTintColor,
  sampleRisingBlock,
  type RisingBlock,
  type RisingBlocksOptions,
  type ResolvedRisingBlocksOptions,
} from './risingBlocksOptions'

export type {
  RisingBlocksOptions,
  RisingBlocksPosition,
} from './risingBlocksOptions'
export { RISING_BLOCKS_DEFAULTS } from './risingBlocksOptions'

export type RisingBlocksFinishCallback = (effect: RisingBlocksEffect) => void

/**
 * Discrete luminous rectangular fragments rising upward (Action Effect).
 *
 * Blocks TRANSLATE as whole rectangles — they do not stretch, fly outward,
 * or behave like light streaks. Sparse negative space is intentional.
 */
export class RisingBlocksEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.risingBlocks
  public readonly name = 'Rising Blocks'
  public readonly description =
    'Fragmentos retangulares luminosos sobem sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: RisingBlocksOptions
  private options: ResolvedRisingBlocksOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private blocks: RisingBlock[] = []
  private elapsedMs = 0
  private running = false
  private finishListeners = new Set<RisingBlocksFinishCallback>()
  private readonly runProgress = new ActionRunProgress(() => this)

  constructor(options?: RisingBlocksOptions) {
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
      ...(options as RisingBlocksOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one complete rising-blocks pass. */
  public run(): this {
    if (!this.options || !this.graphics) {
      return this
    }

    this.blocks = buildRisingBlocks(this.options, this.options.seed)

    this.running = false
    this.elapsedMs = 0
    this.drawBlocks()

    this.running = true
    this.runProgress.beginRun()
    return this
  }

  /** Stops immediately and hides all blocks (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.runProgress.abort()
    this.elapsedMs = 0
    this.drawBlocks()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as RisingBlocksFinishCallback
    this.finishListeners.add(listener)
    return () => {
      this.finishListeners.delete(listener)
    }
  }

  public onProgress(
    progress: number,
    callback: (effect: ActionEffect) => void,
  ): () => void {
    return this.runProgress.onProgress(progress, callback)
  }

  public update(_time: number, delta: number): void {
    if (!this.options || !this.graphics) {
      return
    }

    if (!this.running) {
      return
    }

    this.elapsedMs += delta
    const duration = getRisingBlocksDurationMs(this.options)
    this.runProgress.notify(this.elapsedMs / duration)

    if (this.elapsedMs >= duration) {
      this.running = false
      this.elapsedMs = duration
      this.drawBlocks()
      this.runProgress.complete()
      this.emitFinish()
      return
    }

    this.drawBlocks()
  }

  public disable(): void {
    this.running = false
    this.runProgress.abort()
    this.clearVisuals()
    this.elapsedMs = 0
    this.blocks = []
  }

  /** @deprecated Use `disable`. */
  public remove(): void {
    this.disable()
  }

  public destroy(): void {
    this.finishListeners.clear()
    this.runProgress.clear()
    this.disable()
  }

  private emitFinish(): void {
    for (const listener of [...this.finishListeners]) {
      listener(this)
    }
  }

  private rebuild(context: EffectContext): void {
    this.clearVisuals()
    this.options = resolveRisingBlocksOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.blocks = buildRisingBlocks(this.options, this.options.seed)

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}`)
    this.graphics.setBlendMode(this.options.blendMode)

    if (this.options.position === 'back') {
      context.target.addAt(this.graphics, 0)
      context.target.sendToBack(this.graphics)
    } else {
      context.target.add(this.graphics)
      context.target.bringToTop(this.graphics)
    }

    this.drawBlocks()
  }

  private drawBlocks(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()
    if (!this.running) {
      return
    }

    const { color, intensity, opacity, glowIntensity, topOverflow, height } =
      this.options
    const halfH = height * 0.5
    const topLimit = -halfH - topOverflow
    const peak = intensity * opacity

    for (const block of this.blocks) {
      const sample = sampleRisingBlock(block, this.elapsedMs)
      if (!sample.visible) {
        continue
      }

      const alpha = Math.min(sample.alpha * block.brightness * peak, 0.85)
      if (alpha < 0.015) {
        continue
      }

      const y = sample.y
      const bottom = y + block.height
      // Allow travel above the card; skip only if fully past overflow / below.
      if (bottom < topLimit || y > halfH + 12) {
        continue
      }

      const tint = risingBlockTintColor(color, block.tintShift)
      this.drawBlock(block.x, y, block.width, block.height, tint, alpha, glowIntensity)
    }
  }

  /**
   * Discrete rectangle: optional soft halo + body + slightly brighter core.
   * Glow stays local — never a full-card wash.
   */
  private drawBlock(
    cx: number,
    topY: number,
    width: number,
    height: number,
    color: number,
    alpha: number,
    glowIntensity: number,
  ): void {
    if (!this.graphics) {
      return
    }

    const x = cx - width * 0.5

    if (glowIntensity > 0.02) {
      const pad = 2 + glowIntensity * 3
      const glowA = alpha * glowIntensity * 0.22
      if (glowA > 0.01) {
        this.graphics.fillStyle(color, Math.min(glowA, 0.2))
        this.graphics.fillRect(
          x - pad,
          topY - pad,
          width + pad * 2,
          height + pad * 2,
        )
      }
    }

    this.graphics.fillStyle(color, Math.min(alpha, 0.8))
    this.graphics.fillRect(x, topY, width, height)

    // Brighter inner core — keeps silhouette readable without white mass.
    const insetX = Math.max(width * 0.18, 1)
    const insetY = Math.max(height * 0.18, 1)
    if (width > insetX * 2 + 1 && height > insetY * 2 + 1) {
      this.graphics.fillStyle(color, Math.min(alpha * 0.55, 0.55))
      this.graphics.fillRect(
        x + insetX,
        topY + insetY,
        width - insetX * 2,
        height - insetY * 2,
      )
    }
  }

  private clearVisuals(): void {
    if (this.graphics) {
      this.graphics.destroy()
      this.graphics = null
    }
  }
}
