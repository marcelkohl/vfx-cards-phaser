import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import { ActionRunProgress } from '../../../core/ActionRunProgress'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  buildRisingBubbleGroups,
  getRisingBubblesDurationMs,
  resolveRisingBubblesOptions,
  risingBubbleTintColor,
  sampleRisingBubbleGroup,
  type RisingBubble,
  type RisingBubbleGroup,
  type RisingBubblesOptions,
  type ResolvedRisingBubblesOptions,
} from './risingBubblesOptions'

export type {
  RisingBubblesOptions,
  RisingBubblesPosition,
  RisingBubblesBoundsMode,
} from './risingBubblesOptions'
export { RISING_BUBBLES_DEFAULTS } from './risingBubblesOptions'

export type RisingBubblesFinishCallback = (effect: RisingBubblesEffect) => void

/**
 * Translucent soap bubbles rising upward in singles and small clusters
 * (Action Effect). One `run()` is one finite emission — no built-in loop.
 */
export class RisingBubblesEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.risingBubbles
  public readonly name = 'Rising Bubbles'
  public readonly description =
    'Bolhas de sabão translúcidas sobem sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: RisingBubblesOptions
  private options: ResolvedRisingBubblesOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private groups: RisingBubbleGroup[] = []
  private elapsedMs = 0
  private running = false
  private finishListeners = new Set<RisingBubblesFinishCallback>()
  private readonly runProgress = new ActionRunProgress(() => this)

  constructor(options?: RisingBubblesOptions) {
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
      ...(options as RisingBubblesOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one complete rising-bubbles emission. */
  public run(): this {
    if (!this.options || !this.graphics) {
      return this
    }

    this.groups = buildRisingBubbleGroups(this.options, this.options.seed)

    this.running = false
    this.elapsedMs = 0
    this.drawGroups()

    this.running = true
    this.runProgress.beginRun()
    return this
  }

  /** Stops immediately and hides all bubbles (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.runProgress.abort()
    this.elapsedMs = 0
    this.drawGroups()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as RisingBubblesFinishCallback
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
    const duration = getRisingBubblesDurationMs(this.options)
    this.runProgress.notify(this.elapsedMs / duration)

    if (this.elapsedMs >= duration) {
      this.running = false
      this.elapsedMs = duration
      this.drawGroups()
      this.runProgress.complete()
      this.emitFinish()
      return
    }

    this.drawGroups()
  }

  public disable(): void {
    this.running = false
    this.runProgress.abort()
    this.clearVisuals()
    this.elapsedMs = 0
    this.groups = []
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
    this.options = resolveRisingBubblesOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.groups = buildRisingBubbleGroups(this.options, this.options.seed)

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

    this.drawGroups()
  }

  private drawGroups(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()
    if (!this.running) {
      return
    }

    const {
      color,
      intensity,
      opacity,
      glowIntensity,
      topOverflow,
      height,
      width,
      swaySpeed,
      boundsMode,
    } = this.options
    const halfH = height * 0.5
    const halfW = width * 0.5
    const contained = boundsMode === 'contained'
    // Contained: no top overflow margin. Overflow: existing topOverflow.
    const topLimit = contained ? -halfH : -halfH - topOverflow
    const sidePad = contained ? 0 : 24
    const peak = intensity * opacity

    for (const group of this.groups) {
      const sample = sampleRisingBubbleGroup(
        group,
        this.elapsedMs,
        swaySpeed,
      )
      if (!sample.visible) {
        continue
      }

      const groupAlpha = Math.min(
        sample.alpha * group.brightness * peak,
        0.95,
      )
      if (groupAlpha < 0.015) {
        continue
      }

      for (const bubble of group.bubbles) {
        const localT = Math.max(
          0,
          (this.elapsedMs - group.delayMs) / Math.max(group.lifeMs, 1),
        )
        const memberSway =
          Math.sin(
            localT * group.swayCycles * Math.PI * 2 +
              group.swayPhase +
              bubble.ox * 0.08,
          ) *
          group.swayAmp *
          0.18 *
          bubble.swayMul

        const scale =
          bubble.startScale +
          (bubble.endScale - bubble.startScale) *
            Math.min(Math.max(localT / 0.55, 0), 1)
        const r = bubble.radius * scale * sample.scale
        const cx = sample.x + bubble.ox * sample.scale + memberSway
        const cy = sample.y + bubble.oy * sample.scale

        if (contained) {
          // Skip if any visible extent would leave the frame (no half-sliced rims).
          const rim = r + 1.5
          if (
            cy - rim < -halfH ||
            cy + rim > halfH ||
            cx - rim < -halfW ||
            cx + rim > halfW
          ) {
            continue
          }
        } else {
          // Skip only if fully past overflow / far below.
          if (cy + r < topLimit || cy - r > halfH + 20) {
            continue
          }
          if (cx + r < -halfW - sidePad || cx - r > halfW + sidePad) {
            continue
          }
        }

        const tint = risingBubbleTintColor(color, bubble.tintShift)
        const alpha = Math.min(groupAlpha * bubble.brightness, 0.9)
        this.drawSoapBubble(
          cx,
          cy,
          r,
          tint,
          alpha,
          bubble,
          glowIntensity,
        )
      }
    }
  }

  /**
   * Hollow soap bubble: faint halo + thin circumference + highlight arc
   * + tiny specular. Interior stays transparent (no solid fill wash).
   */
  private drawSoapBubble(
    cx: number,
    cy: number,
    radius: number,
    color: number,
    alpha: number,
    bubble: RisingBubble,
    glowIntensity: number,
  ): void {
    if (!this.graphics || radius < 1.2) {
      return
    }

    const g = this.graphics

    // Extremely local soft halo — not a cloud.
    if (glowIntensity > 0.02) {
      const glowA = alpha * glowIntensity * 0.14
      if (glowA > 0.01) {
        g.lineStyle(Math.max(1.5, radius * 0.18), color, Math.min(glowA, 0.18))
        g.strokeCircle(cx, cy, radius + 1.2)
      }
    }

    // Very faint interior veil — keeps "bubble" volume without filling solid.
    g.fillStyle(color, Math.min(alpha * 0.045, 0.06))
    g.fillCircle(cx, cy, radius * 0.92)

    // Main delicate circumference (uneven brightness via second pass arcs).
    g.lineStyle(Math.max(1, radius * 0.08), color, Math.min(alpha * 0.55, 0.7))
    g.strokeCircle(cx, cy, radius)

    // Softer inner ring.
    g.lineStyle(
      Math.max(0.7, radius * 0.045),
      color,
      Math.min(alpha * 0.22, 0.3),
    )
    g.strokeCircle(cx, cy, radius * 0.9)

    // Bright highlight arc (upper region).
    const ha = bubble.highlightAngle
    const span = 0.85 + bubble.brightness * 0.35
    g.lineStyle(
      Math.max(1.1, radius * 0.1),
      color,
      Math.min(alpha * 0.85, 0.95),
    )
    g.beginPath()
    g.arc(cx, cy, radius, ha, ha + span, false)
    g.strokePath()

    // Secondary faint rim glimmer opposite the highlight.
    g.lineStyle(
      Math.max(0.8, radius * 0.06),
      color,
      Math.min(alpha * 0.28, 0.35),
    )
    g.beginPath()
    g.arc(cx, cy, radius, ha + Math.PI * 0.9, ha + Math.PI * 0.9 + 0.55, false)
    g.strokePath()

    // Tiny specular reflection near the highlight.
    const hx = cx + Math.cos(ha + 0.35) * radius * 0.42
    const hy = cy + Math.sin(ha + 0.35) * radius * 0.42
    const specR = Math.max(1.1, radius * 0.14)
    g.fillStyle(0xffffff, Math.min(alpha * 0.55, 0.65))
    g.fillCircle(hx, hy, specR)

    // Micro secondary glint.
    g.fillStyle(color, Math.min(alpha * 0.35, 0.4))
    g.fillCircle(
      cx + Math.cos(ha + 1.1) * radius * 0.55,
      cy + Math.sin(ha + 1.1) * radius * 0.55,
      Math.max(0.7, radius * 0.07),
    )
  }

  private clearVisuals(): void {
    if (this.graphics) {
      this.graphics.destroy()
      this.graphics = null
    }
  }
}
