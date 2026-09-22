import Phaser from 'phaser'
import type { PersistentEffect } from '../../../core/PersistentEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import { wrap01 } from '../../../core/effectConfig'
import {
  resolveRimLineGraphicsOptions,
  type ResolvedRimLineGraphicsOptions,
  type RimLineGraphicsOptions,
} from './rimLineGraphicsOptions'

export type { RimLineGraphicsOptions as CardRimLineEffectOptions } from './rimLineGraphicsOptions'
export { RIM_LINE_GRAPHICS_DEFAULTS } from './rimLineGraphicsOptions'

interface PathSegment {
  length: number
  pointAt(d: number, out: Phaser.Math.Vector2): void
}

export class CardRimLineEffect implements PersistentEffect {
  public readonly id = EFFECT_IDS.cardRimLine
  public readonly name = 'Card Rim Line'
  public readonly description =
    'Linha luminosa que percorre continuamente o contorno da carta.'
  public readonly kind = 'persistent' as const

  private inputOptions: RimLineGraphicsOptions
  private options: ResolvedRimLineGraphicsOptions | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private segments: PathSegment[] = []
  private perimeter = 0
  private progress = 0
  private samplePoints: Phaser.Math.Vector2[] = []

  constructor(options?: RimLineGraphicsOptions) {
    this.inputOptions = { ...options }
  }

  public enable(context: EffectContext): void {
    this.rebuild(context, false)
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
      ...(options as RimLineGraphicsOptions),
    }
    this.rebuild(context, true)
  }

  public update(_time: number, delta: number): void {
    if (!this.graphics || !this.options || this.perimeter <= 0) {
      return
    }

    this.progress = wrap01(
      this.progress + (this.options.direction * delta) / this.options.loopDuration,
    )
    this.drawSegment()
  }

  public disable(): void {
    this.clearVisuals()
    this.progress = 0
  }

  /** @deprecated Use `disable`. */
  public remove(): void {
    this.disable()
  }

  public destroy(): void {
    this.disable()
  }

  private rebuild(context: EffectContext, preserveProgress: boolean): void {
    const savedProgress = this.progress
    this.clearVisuals()

    this.options = resolveRimLineGraphicsOptions(this.inputOptions)
    this.samplePoints = Array.from(
      { length: this.options.sampleCount + 1 },
      () => new Phaser.Math.Vector2(),
    )
    this.buildPath(this.options.width, this.options.height)
    this.progress = preserveProgress ? savedProgress : 0

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}`)
    context.target.add(this.graphics)
    this.drawSegment()
  }

  private clearVisuals(): void {
    this.graphics?.destroy()
    this.graphics = null
    this.segments = []
    this.perimeter = 0
    this.options = null
    this.samplePoints = []
  }

  private buildPath(width: number, height: number): void {
    if (!this.options) {
      return
    }

    const { outerPadding, cornerRadius } = this.options
    const left = -width / 2 - outerPadding
    const top = -height / 2 - outerPadding
    const right = width / 2 + outerPadding
    const bottom = height / 2 + outerPadding
    const radius = cornerRadius

    const straightW = Math.max(right - left - radius * 2, 0)
    const straightH = Math.max(bottom - top - radius * 2, 0)
    const arcLen = (Math.PI / 2) * radius

    this.segments = [
      createLine(left + radius, top, right - radius, top, straightW),
      createArc(right - radius, top + radius, radius, -Math.PI / 2, 0, arcLen),
      createLine(right, top + radius, right, bottom - radius, straightH),
      createArc(right - radius, bottom - radius, radius, 0, Math.PI / 2, arcLen),
      createLine(right - radius, bottom, left + radius, bottom, straightW),
      createArc(left + radius, bottom - radius, radius, Math.PI / 2, Math.PI, arcLen),
      createLine(left, bottom - radius, left, top + radius, straightH),
      createArc(left + radius, top + radius, radius, Math.PI, (Math.PI * 3) / 2, arcLen),
    ]

    this.perimeter = this.segments.reduce((sum, segment) => sum + segment.length, 0)
  }

  private drawSegment(): void {
    const graphics = this.graphics
    const options = this.options

    if (!graphics || !options || this.perimeter <= 0) {
      return
    }

    const segmentLength = this.perimeter * options.segmentLength
    const tailDistance = this.progress * this.perimeter - segmentLength
    const layers = [
      { color: options.color, widthScale: 4.2, alphaScale: 0.09 },
      { color: options.color, widthScale: 2.6, alphaScale: 0.16 },
      { color: options.color, widthScale: 1.4, alphaScale: 0.5 },
      { color: options.coreColor, widthScale: 0.55, alphaScale: 0.95 },
    ]

    for (let i = 0; i <= options.sampleCount; i += 1) {
      const distance = tailDistance + (segmentLength * i) / options.sampleCount
      this.pointAt(distance, this.samplePoints[i])
    }

    graphics.clear()

    for (const layer of layers) {
      for (let i = 0; i < options.sampleCount; i += 1) {
        const intensity = intensityAt(
          (i + 0.5) / options.sampleCount,
          options.headFade,
          options.tailFalloff,
        )

        if (intensity < 0.02) {
          continue
        }

        const from = this.samplePoints[i]
        const to = this.samplePoints[i + 1]

        graphics.lineStyle(
          options.lineWidth * layer.widthScale * (0.6 + 0.4 * intensity),
          layer.color,
          layer.alphaScale * intensity * options.glowStrength,
        )
        graphics.beginPath()
        graphics.moveTo(from.x, from.y)
        graphics.lineTo(to.x, to.y)
        graphics.strokePath()
      }
    }
  }

  private pointAt(distance: number, out: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    let remaining = ((distance % this.perimeter) + this.perimeter) % this.perimeter

    for (const segment of this.segments) {
      if (remaining <= segment.length) {
        segment.pointAt(remaining, out)
        return out
      }

      remaining -= segment.length
    }

    const last = this.segments[this.segments.length - 1]
    last.pointAt(last.length, out)
    return out
  }
}

function intensityAt(t: number, headFade: number, tailFalloff: number): number {
  const tail = Math.pow(Phaser.Math.Clamp(t, 0, 1), tailFalloff)
  const head = Phaser.Math.Clamp((1 - t) / headFade, 0, 1)
  return tail * Phaser.Math.Easing.Sine.Out(head)
}

function createLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  length: number,
): PathSegment {
  return {
    length,
    pointAt(d, out) {
      const t = length === 0 ? 0 : Phaser.Math.Clamp(d / length, 0, 1)
      out.set(Phaser.Math.Linear(x1, x2, t), Phaser.Math.Linear(y1, y2, t))
    },
  }
}

function createArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  length: number,
): PathSegment {
  return {
    length,
    pointAt(d, out) {
      if (radius <= 0 || length <= 0) {
        out.set(cx, cy)
        return
      }

      const t = Phaser.Math.Clamp(d / length, 0, 1)
      const angle = Phaser.Math.Linear(startAngle, endAngle, t)
      out.set(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
    },
  }
}
