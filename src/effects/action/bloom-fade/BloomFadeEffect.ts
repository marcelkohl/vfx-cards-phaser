import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  resolveBloomFadeOptions,
  sampleBloomFadeEnvelope,
  type BloomFadeOptions,
  type ResolvedBloomFadeOptions,
} from './bloomFadeOptions'

export type { BloomFadeOptions, BloomFadePosition, BloomFadeShape } from './bloomFadeOptions'
export { BLOOM_FADE_DEFAULTS } from './bloomFadeOptions'

export type BloomFadeFinishCallback = (effect: BloomFadeEffect) => void

/** Soft ellipse steps per edge-center lobe (merge into mist, not bands). */
const LOBE_STEPS = 10
/** Soft dots along the perimeter to keep mist continuous. */
const EDGE_DOTS = 48
/** Soft circle steps per perimeter sample. */
const DOT_STEPS = 5

/**
 * Soft luminous bloom around a frame that fades calmly (Action Effect).
 * Idle and invisible after `enable()` — call `run()` to play.
 * Independent of Flash / Light Burst; meant as residual energy after a hit.
 *
 * Shape: wider / stronger at edge midpoints, thinner / weaker at corners
 * (organic mist — not a uniform rounded-rect stroke).
 */
export class BloomFadeEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.bloomFade
  public readonly name = 'Bloom Fade'
  public readonly description =
    'Bloom residual suave sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: BloomFadeOptions
  private options: ResolvedBloomFadeOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private elapsedMs = 0
  private alpha = 0
  private expand = 0
  private running = false
  private finishListeners = new Set<BloomFadeFinishCallback>()

  constructor(options?: BloomFadeOptions) {
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
      ...(options as BloomFadeOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one bloom fade. Fires `onFinish` when it ends. */
  public run(): this {
    if (!this.options || !this.graphics) {
      return this
    }

    this.running = true
    this.elapsedMs = 0
    this.alpha = 0
    this.expand = 0
    this.drawBloom()
    return this
  }

  /** Stops immediately and hides the bloom (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.elapsedMs = 0
    this.alpha = 0
    this.expand = 0
    this.drawBloom()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as BloomFadeFinishCallback
    this.finishListeners.add(listener)
    return () => {
      this.finishListeners.delete(listener)
    }
  }

  public update(_time: number, delta: number): void {
    if (!this.options || !this.graphics) {
      return
    }

    if (!this.running) {
      if (this.alpha !== 0) {
        this.alpha = 0
        this.expand = 0
        this.drawBloom()
      }
      return
    }

    this.elapsedMs += delta
    const sample = sampleBloomFadeEnvelope(this.elapsedMs, this.options)

    if (sample.finished) {
      this.running = false
      this.alpha = 0
      this.expand = 0
      this.drawBloom()
      this.emitFinish()
      return
    }

    this.alpha = sample.alpha
    this.expand = sample.expand
    this.drawBloom()
  }

  public disable(): void {
    this.running = false
    this.clearVisuals()
    this.elapsedMs = 0
    this.alpha = 0
    this.expand = 0
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
    this.options = resolveBloomFadeOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.alpha = 0
    this.expand = 0

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}`)
    this.graphics.setBlendMode(this.options.blendMode)

    if (this.options.position === 'front') {
      context.target.add(this.graphics)
    } else {
      // Behind artwork / frame so only the overhanging mist is visible.
      context.target.addAt(this.graphics, 0)
    }

    this.drawBloom()
  }

  private drawBloom(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()

    const peak = Math.min(this.options.intensity * this.alpha, 1)
    if (peak < 0.003) {
      return
    }

    const { width, height, cornerRadius, color, padding, expansion, shape } =
      this.options
    const reach = Math.max((padding + expansion) * this.expand, 1)
    const halfW = width / 2
    const halfH = height / 2
    const radius = Math.min(cornerRadius, halfW, halfH)

    if (shape === 'rounded-rect') {
      this.drawRoundedRectMist(width, height, radius, reach, color, peak)
      return
    }

    // Organic: wider at edge centers, thinner / quieter at corners.
    this.drawEdgeLobes(halfW, halfH, reach, color, peak)
    this.drawPerimeterMist(halfW, halfH, radius, reach, color, peak)
  }

  /** Uniform soft rings via strokeRoundedRect (configurable `shape`). */
  private drawRoundedRectMist(
    width: number,
    height: number,
    cornerRadius: number,
    reach: number,
    color: number,
    peak: number,
  ): void {
    if (!this.graphics) {
      return
    }

    const steps = 22
    const stroke = Math.max((reach / steps) * 2.4, 2)

    for (let i = 0; i < steps; i += 1) {
      const t = i / (steps - 1)
      const falloff = Math.exp(-t * t * 5.2)
      const layerAlpha = peak * 0.09 * falloff
      if (layerAlpha < 0.002) {
        continue
      }

      const dist = reach * t
      const w = width + dist * 2
      const h = height + dist * 2
      const r = Math.min(
        Math.max(0, cornerRadius + dist * 0.9),
        Math.min(w, h) / 2,
      )
      const lineW = stroke * (1 - t * 0.35)

      this.graphics.lineStyle(lineW, color, layerAlpha)
      this.graphics.strokeRoundedRect(-w / 2, -h / 2, w, h, r)
    }
  }

  /**
   * Four soft elliptical lobes centered on top / bottom / left / right.
   * Each lobe extends outward; corners receive little coverage.
   */
  private drawEdgeLobes(
    halfW: number,
    halfH: number,
    reach: number,
    color: number,
    peak: number,
  ): void {
    if (!this.graphics) {
      return
    }

    const lobes: ReadonlyArray<{
      cx: number
      cy: number
      rx: number
      ry: number
      ox: number
      oy: number
    }> = [
      // Top — wide horizontal, short outward
      {
        cx: 0,
        cy: -halfH,
        rx: halfW * 0.72,
        ry: reach * 0.95,
        ox: 0,
        oy: -1,
      },
      // Bottom
      {
        cx: 0,
        cy: halfH,
        rx: halfW * 0.72,
        ry: reach * 0.95,
        ox: 0,
        oy: 1,
      },
      // Left — tall vertical, short outward
      {
        cx: -halfW,
        cy: 0,
        rx: reach * 0.95,
        ry: halfH * 0.62,
        ox: -1,
        oy: 0,
      },
      // Right
      {
        cx: halfW,
        cy: 0,
        rx: reach * 0.95,
        ry: halfH * 0.62,
        ox: 1,
        oy: 0,
      },
    ]

    for (const lobe of lobes) {
      for (let i = 0; i < LOBE_STEPS; i += 1) {
        const t = i / (LOBE_STEPS - 1)
        const falloff = Math.exp(-t * t * 3.6)
        const alpha = peak * 0.075 * falloff
        if (alpha < 0.002) {
          continue
        }

        // Grow outward from the edge; keep the inner side near the frame.
        const push = reach * (0.12 + t * 0.55)
        const sx = 1 + t * 0.55
        const sy = 1 + t * 0.7
        const x = lobe.cx + lobe.ox * push
        const y = lobe.cy + lobe.oy * push

        this.graphics.fillStyle(color, alpha)
        this.graphics.fillEllipse(x, y, lobe.rx * sx * 2, lobe.ry * sy * 2)
      }
    }
  }

  /**
   * Soft dots along the rounded-rect perimeter.
   * `midness` is 1 at edge centers and ~0 at corners → thinner corner mist.
   */
  private drawPerimeterMist(
    halfW: number,
    halfH: number,
    cornerRadius: number,
    reach: number,
    color: number,
    peak: number,
  ): void {
    if (!this.graphics) {
      return
    }

    for (let i = 0; i < EDGE_DOTS; i += 1) {
      const t = i / EDGE_DOTS
      const sample = sampleRoundedRectEdge(halfW, halfH, cornerRadius, t)
      const midness = edgeMidness(sample.nx, sample.ny)
      // Corners stay quiet; mid-edges carry most of the mist.
      const strength = 0.12 + 0.88 * midness * midness
      const baseR = reach * (0.22 + 0.78 * midness)

      for (let s = 0; s < DOT_STEPS; s += 1) {
        const u = s / (DOT_STEPS - 1)
        const falloff = Math.exp(-u * u * 4.2)
        const alpha = peak * 0.045 * strength * falloff
        if (alpha < 0.002) {
          continue
        }

        const r = baseR * (0.35 + u * 0.9)
        const x = sample.x + sample.nx * reach * u * 0.55
        const y = sample.y + sample.ny * reach * u * 0.55

        this.graphics.fillStyle(color, alpha)
        this.graphics.fillCircle(x, y, r)
      }
    }
  }

  private clearVisuals(): void {
    this.graphics?.destroy()
    this.graphics = null
    this.options = null
  }
}

/**
 * How “mid-edge” vs “corner” a perimeter normal is.
 * 1 = axis-aligned edge center; 0 = 45° corner diagonal.
 */
function edgeMidness(nx: number, ny: number): number {
  const angle = Math.atan2(ny, nx)
  const quarter = Math.PI / 2
  const folded = Math.abs((((angle % quarter) + quarter) % quarter) - Math.PI / 4)
  return Phaser.Math.Clamp(folded / (Math.PI / 4), 0, 1)
}

/**
 * Point + outward normal on a centered rounded-rect perimeter.
 * `t` in [0, 1) walks clockwise starting at the top of the left edge.
 */
function sampleRoundedRectEdge(
  halfW: number,
  halfH: number,
  cornerRadius: number,
  t: number,
): { x: number; y: number; nx: number; ny: number } {
  const r = Math.max(0, Math.min(cornerRadius, halfW, halfH))
  const innerW = Math.max(halfW - r, 0)
  const innerH = Math.max(halfH - r, 0)
  const straightH = Math.max(innerH * 2, 1e-6)
  const straightW = Math.max(innerW * 2, 1e-6)
  const arc = Math.max((Math.PI / 2) * r, 0)
  const lengths = [
    straightH,
    arc,
    straightW,
    arc,
    straightH,
    arc,
    straightW,
    arc,
  ]
  const total = lengths.reduce((sum, len) => sum + Math.max(len, 0), 0) || 1
  let d = (((t % 1) + 1) % 1) * total

  for (let i = 0; i < lengths.length; i += 1) {
    const len = Math.max(lengths[i], 0)
    if (d > len && i < lengths.length - 1) {
      d -= len
      continue
    }

    const p = len <= 1e-8 ? 0 : d / len

    switch (i) {
      case 0: // left edge, top → bottom
        return { x: -halfW, y: -innerH + p * straightH, nx: -1, ny: 0 }
      case 1: {
        // bottom-left arc
        const a = Math.PI - p * (Math.PI / 2)
        return {
          x: -innerW + Math.cos(a) * r,
          y: innerH + Math.sin(a) * r,
          nx: Math.cos(a),
          ny: Math.sin(a),
        }
      }
      case 2: // bottom edge, left → right
        return { x: -innerW + p * straightW, y: halfH, nx: 0, ny: 1 }
      case 3: {
        // bottom-right arc
        const a = Math.PI / 2 - p * (Math.PI / 2)
        return {
          x: innerW + Math.cos(a) * r,
          y: innerH + Math.sin(a) * r,
          nx: Math.cos(a),
          ny: Math.sin(a),
        }
      }
      case 4: // right edge, bottom → top
        return { x: halfW, y: innerH - p * straightH, nx: 1, ny: 0 }
      case 5: {
        // top-right arc
        const a = 0 - p * (Math.PI / 2)
        return {
          x: innerW + Math.cos(a) * r,
          y: -innerH + Math.sin(a) * r,
          nx: Math.cos(a),
          ny: Math.sin(a),
        }
      }
      case 6: // top edge, right → left
        return { x: innerW - p * straightW, y: -halfH, nx: 0, ny: -1 }
      default: {
        // top-left arc
        const a = -Math.PI / 2 - p * (Math.PI / 2)
        return {
          x: -innerW + Math.cos(a) * r,
          y: -innerH + Math.sin(a) * r,
          nx: Math.cos(a),
          ny: Math.sin(a),
        }
      }
    }
  }

  return { x: 0, y: -halfH, nx: 0, ny: -1 }
}
