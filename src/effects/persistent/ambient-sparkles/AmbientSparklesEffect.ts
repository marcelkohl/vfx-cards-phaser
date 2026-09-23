import Phaser from 'phaser'
import type { PersistentEffect } from '../../../core/PersistentEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  ambientHash01,
  resolveAmbientSparklesOptions,
  sampleAmbientSparkle,
  spawnAmbientPoint,
  type AmbientSparkleSlot,
  type AmbientSparklesOptions,
  type ResolvedAmbientSparklesOptions,
} from './ambientSparklesOptions'

export type {
  AmbientSparklesOptions,
  AmbientSparklesPosition,
  AmbientSparklesSpawnRegion,
} from './ambientSparklesOptions'
export { AMBIENT_SPARKLES_DEFAULTS } from './ambientSparklesOptions'

/** Segments per half-ray for soft tip fade. */
const RAY_SEGMENTS = 6

/**
 * Sparse ambient four-point sparkles that appear, brighten, and fade in place
 * (Persistent Effect). Continues until `disable()`.
 *
 * Independent of StarFlareEffect and SparkleBurstEffect — local rendering only.
 */
export class AmbientSparklesEffect implements PersistentEffect {
  public readonly id = EFFECT_IDS.ambientSparkles
  public readonly name = 'Ambient Sparkles'
  public readonly description =
    'Estrelinhas mágicas esparsas e estacionárias em loop contínuo.'
  public readonly kind = 'persistent' as const

  private inputOptions: AmbientSparklesOptions
  private options: ResolvedAmbientSparklesOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private pool: AmbientSparkleSlot[] = []
  private spawnCooldownMs = 0
  private spawnIndex = 0
  private enabled = false

  constructor(options?: AmbientSparklesOptions) {
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
      ...(options as AmbientSparklesOptions),
    }
    this.rebuild(context)
  }

  public update(_time: number, delta: number): void {
    if (!this.enabled || !this.options || !this.graphics) {
      return
    }

    const dt = Math.max(delta, 0)
    this.advanceSparkles(dt)
    this.trySpawn(dt)
    this.drawSparkles()
  }

  /**
   * Stops spawning and immediately clears all sparkles (package Persistent
   * Effect convention — no lingering frozen stars).
   */
  public disable(): void {
    this.enabled = false
    this.clearVisuals()
    this.spawnCooldownMs = 0
    this.spawnIndex = 0
  }

  /** @deprecated Use `disable`. */
  public remove(): void {
    this.disable()
  }

  public destroy(): void {
    this.disable()
  }

  private rebuild(context: EffectContext): void {
    this.clearVisuals()
    this.options = resolveAmbientSparklesOptions(this.inputOptions)
    this.spawnIndex = 0
    this.pool = Array.from({ length: this.options.maxActiveSparkles }, () =>
      this.createIdleSlot(),
    )

    // First sparkle arrives quickly — avoid a long dead period after enable.
    this.spawnCooldownMs =
      40 + ambientHash01(this.options.seed, 901) * 100

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}`)
    this.graphics.setBlendMode(this.options.blendMode)

    if (this.options.position === 'back') {
      context.target.addAt(this.graphics, 0)
    } else {
      context.target.add(this.graphics)
    }

    this.enabled = true
    this.drawSparkles()
  }

  private createIdleSlot(): AmbientSparkleSlot {
    return {
      active: false,
      x: 0,
      y: 0,
      size: 0,
      lifetime: 0,
      age: 0,
      alphaScale: 1,
      horizontalScale: 1,
      verticalScale: 1,
    }
  }

  private advanceSparkles(delta: number): void {
    if (!this.options) {
      return
    }

    for (const slot of this.pool) {
      if (!slot.active) {
        continue
      }

      slot.age += delta
      const sample = sampleAmbientSparkle(slot.age, slot.lifetime, this.options)
      if (sample.finished) {
        slot.active = false
        slot.age = 0
      }
    }
  }

  private trySpawn(delta: number): void {
    if (!this.options) {
      return
    }

    this.spawnCooldownMs -= delta
    if (this.spawnCooldownMs > 0) {
      return
    }

    const free = this.pool.find((slot) => !slot.active)
    if (!free) {
      // Cap reached — retry soon without advancing the spawn sequence.
      this.spawnCooldownMs = 40
      return
    }

    this.activateSlot(free)
    this.spawnIndex += 1

    const span = Math.max(
      this.options.maxSpawnInterval - this.options.minSpawnInterval,
      0,
    )
    this.spawnCooldownMs =
      this.options.minSpawnInterval +
      ambientHash01(this.options.seed, this.spawnIndex * 97 + 11) * span
  }

  private activateSlot(slot: AmbientSparkleSlot): void {
    if (!this.options) {
      return
    }

    const seed = this.options.seed
    const index = this.spawnIndex
    const origin = spawnAmbientPoint(this.options, seed, index)
    const sizeSpan = Math.max(this.options.maxSize - this.options.minSize, 0)
    const lifeSpan = Math.max(
      this.options.maxLifetime - this.options.minLifetime,
      0,
    )

    // Bias toward smaller stars; occasional larger ones for rhythm.
    const sizeRoll = ambientHash01(seed, index * 101 + 21)
    const sizeT = sizeRoll * sizeRoll * (0.55 + sizeRoll * 0.45)

    slot.active = true
    slot.x = origin.x
    slot.y = origin.y
    slot.size = this.options.minSize + sizeT * sizeSpan
    slot.lifetime =
      this.options.minLifetime +
      ambientHash01(seed, index * 101 + 22) * lifeSpan
    slot.age = 0
    slot.alphaScale = 0.7 + ambientHash01(seed, index * 101 + 23) * 0.3
    slot.horizontalScale =
      this.options.horizontalScale *
      (0.88 + ambientHash01(seed, index * 101 + 24) * 0.24)
    slot.verticalScale =
      this.options.verticalScale *
      (0.88 + ambientHash01(seed, index * 101 + 25) * 0.24)
  }

  private drawSparkles(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()

    if (!this.enabled) {
      return
    }

    const { color, intensity, opacity } = this.options
    const globalPeak = Math.min(intensity * opacity, 2)

    for (const slot of this.pool) {
      if (!slot.active) {
        continue
      }

      const sample = sampleAmbientSparkle(slot.age, slot.lifetime, this.options)
      const alpha = Math.min(sample.alpha * slot.alphaScale * globalPeak, 1.35)
      if (alpha < 0.004) {
        continue
      }

      this.drawSparkle(
        slot.x,
        slot.y,
        slot.size * sample.scale,
        slot.horizontalScale,
        slot.verticalScale,
        color,
        alpha,
      )
    }
  }

  /**
   * Small luminous four-point flare: soft halo + H/V streaks + bright core.
   * Local implementation — does not call StarFlareEffect.
   */
  private drawSparkle(
    x: number,
    y: number,
    size: number,
    hScale: number,
    vScale: number,
    color: number,
    peak: number,
  ): void {
    if (!this.graphics || peak < 0.004 || size < 0.5) {
      return
    }

    const glow = size * 0.95
    const hHalf = size * hScale * 0.72
    const vHalf = size * vScale * 0.72
    const hThick = size * 0.14
    const vThick = size * 0.12
    const core = size * 0.42

    this.fillSoftGlow(x, y, glow * 1.35, color, peak * 0.1)
    this.fillSoftGlow(x, y, glow, color, peak * 0.18)
    this.fillSoftGlow(x, y, glow * 0.45, color, peak * 0.28)

    if (vHalf > 0.5) {
      this.drawAxisRay(x, y, 0, 1, vHalf, vThick * 1.15, color, peak * 0.22)
      this.drawAxisRay(x, y, 0, 1, vHalf * 0.95, vThick * 0.45, color, peak * 0.55)
    }

    if (hHalf > 0.5) {
      this.drawAxisRay(x, y, 1, 0, hHalf, hThick * 1.2, color, peak * 0.28)
      this.drawAxisRay(x, y, 1, 0, hHalf * 0.96, hThick * 0.4, color, peak * 0.72)
    }

    this.fillFourPointStar(x, y, core * 1.1, color, peak * 0.3)
    this.fillFourPointStar(x, y, core, color, Math.min(peak * 1.05, 1))
    // Near-white core via ADD + high alpha on a tiny disc.
    this.fillSoftGlow(x, y, core * 0.22, color, Math.min(peak * 1.15, 1))
  }

  private drawAxisRay(
    cx: number,
    cy: number,
    dirX: number,
    dirY: number,
    halfLength: number,
    halfThickness: number,
    color: number,
    peakAlpha: number,
  ): void {
    if (!this.graphics || peakAlpha < 0.004 || halfLength < 0.5) {
      return
    }

    const perpX = -dirY
    const perpY = dirX

    for (let i = 0; i < RAY_SEGMENTS; i += 1) {
      const t0 = i / RAY_SEGMENTS
      const t1 = (i + 1) / RAY_SEGMENTS
      const a0 = peakAlpha * Math.pow(1 - t0, 1.55)
      const a1 = peakAlpha * Math.pow(1 - t1, 1.55)
      const alpha = (a0 + a1) * 0.5
      if (alpha < 0.004) {
        continue
      }

      const w0 = halfThickness * (1 - t0 * 0.9)
      const w1 = halfThickness * (1 - t1 * 0.9)

      for (const sign of [-1, 1] as const) {
        const x0 = cx + dirX * halfLength * t0 * sign
        const y0 = cy + dirY * halfLength * t0 * sign
        const x1 = cx + dirX * halfLength * t1 * sign
        const y1 = cy + dirY * halfLength * t1 * sign

        const ax0 = x0 + perpX * w0
        const ay0 = y0 + perpY * w0
        const bx0 = x0 - perpX * w0
        const by0 = y0 - perpY * w0
        const ax1 = x1 + perpX * w1
        const ay1 = y1 + perpY * w1
        const bx1 = x1 - perpX * w1
        const by1 = y1 - perpY * w1

        this.graphics.fillStyle(color, alpha)
        this.graphics.fillTriangle(ax0, ay0, bx0, by0, ax1, ay1)
        this.graphics.fillTriangle(bx0, by0, ax1, ay1, bx1, by1)
      }
    }
  }

  private fillSoftGlow(
    x: number,
    y: number,
    radius: number,
    color: number,
    alpha: number,
  ): void {
    if (!this.graphics || alpha < 0.004 || radius < 0.4) {
      return
    }

    const layers = 4
    for (let i = 0; i < layers; i += 1) {
      const t = i / Math.max(layers - 1, 1)
      const r = radius * (1 - t * 0.7)
      const a = alpha * Math.pow(1 - t, 1.35)
      if (a < 0.008 || r < 0.35) {
        continue
      }
      this.graphics.fillStyle(color, a)
      this.graphics.fillCircle(x, y, r)
    }
  }

  private fillFourPointStar(
    x: number,
    y: number,
    size: number,
    color: number,
    alpha: number,
  ): void {
    if (!this.graphics || alpha < 0.004 || size < 0.35) {
      return
    }

    const tip = size * 0.58
    const waist = size * 0.09
    const n = { x, y: y - tip }
    const e = { x: x + tip, y }
    const s = { x, y: y + tip }
    const w = { x: x - tip, y }
    const ne = { x: x + waist, y: y - waist }
    const se = { x: x + waist, y: y + waist }
    const sw = { x: x - waist, y: y + waist }
    const nw = { x: x - waist, y: y - waist }

    this.graphics.fillStyle(color, alpha)
    this.graphics.fillTriangle(n.x, n.y, ne.x, ne.y, nw.x, nw.y)
    this.graphics.fillTriangle(e.x, e.y, ne.x, ne.y, se.x, se.y)
    this.graphics.fillTriangle(s.x, s.y, se.x, se.y, sw.x, sw.y)
    this.graphics.fillTriangle(w.x, w.y, sw.x, sw.y, nw.x, nw.y)
    this.graphics.fillTriangle(ne.x, ne.y, se.x, se.y, sw.x, sw.y)
    this.graphics.fillTriangle(ne.x, ne.y, sw.x, sw.y, nw.x, nw.y)
  }

  private clearVisuals(): void {
    this.graphics?.destroy()
    this.graphics = null
    this.options = null
    this.pool = []
    this.enabled = false
  }
}
