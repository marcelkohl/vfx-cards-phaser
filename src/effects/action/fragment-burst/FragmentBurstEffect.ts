import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import { ActionRunProgress } from '../../../core/ActionRunProgress'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import {
  buildFragmentBurstFragments,
  resolveFragmentBurstOptions,
  sampleFragmentBurstFinished,
  sampleFragmentBurstFragment,
  type FragmentBurstFragment,
  type FragmentBurstOptions,
  type ResolvedFragmentBurstOptions,
} from './fragmentBurstOptions'

export type {
  FragmentBurstOptions,
  FragmentBurstPosition,
  FragmentBurstShape,
  FragmentBurstSpawnRegion,
} from './fragmentBurstOptions'
export { FRAGMENT_BURST_DEFAULTS } from './fragmentBurstOptions'

export type FragmentBurstFinishCallback = (effect: FragmentBurstEffect) => void

/**
 * Soft feather / shard burst around a frame (Action Effect).
 * Idle and invisible after `enable()` — call `run()` to play.
 * Procedural shapes by default; optional scene texture keys supported.
 */
export class FragmentBurstEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.fragmentBurst
  public readonly name = 'Fragment Burst'
  public readonly description =
    'Fragmentos leves sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: FragmentBurstOptions
  private options: ResolvedFragmentBurstOptions | null = null
  private context: EffectContext | null = null
  private graphics: Phaser.GameObjects.Graphics | null = null
  private sprites: Array<Phaser.GameObjects.Image | null> = []
  private fragments: FragmentBurstFragment[] = []
  private elapsedMs = 0
  private running = false
  private finishListeners = new Set<FragmentBurstFinishCallback>()
  private readonly runProgress = new ActionRunProgress(() => this)

  constructor(options?: FragmentBurstOptions) {
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
      ...(options as FragmentBurstOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one burst. Fires `onFinish` when it ends. */
  public run(): this {
    if (!this.options || !this.graphics || !this.context) {
      return this
    }

    this.fragments = buildFragmentBurstFragments(this.options, this.options.seed)
    this.ensureSprites()
    this.running = true
    this.elapsedMs = 0
    this.drawFragments()
    this.runProgress.beginRun()
    return this
  }

  /** Stops immediately and hides fragments (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.runProgress.abort()
    this.elapsedMs = 0
    this.hideSprites()
    this.drawFragments()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as FragmentBurstFinishCallback
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
    const duration = Math.max(this.options.duration, 1)
    this.runProgress.notify(this.elapsedMs / duration)

    if (sampleFragmentBurstFinished(this.elapsedMs, this.options)) {
      this.running = false
      this.elapsedMs = this.options.duration
      this.hideSprites()
      this.drawFragments()
      this.runProgress.complete()
      this.emitFinish()
      return
    }

    this.drawFragments()
  }

  public disable(): void {
    this.running = false
    this.runProgress.abort()
    this.clearVisuals()
    this.elapsedMs = 0
    this.fragments = []
    this.context = null
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
    this.context = context
    this.options = resolveFragmentBurstOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.fragments = buildFragmentBurstFragments(this.options, this.options.seed)

    this.graphics = context.scene.add.graphics()
    this.graphics.setName(`effect:${this.id}`)
    this.graphics.setBlendMode(this.options.blendMode)

    if (this.options.position === 'back') {
      context.target.addAt(this.graphics, 0)
    } else {
      context.target.add(this.graphics)
    }

    this.ensureSprites()
    this.drawFragments()
  }

  private ensureSprites(): void {
    if (!this.options || !this.context) {
      return
    }

    this.clearSprites()

    const keys = this.options.textureKeys
    if (keys.length === 0) {
      return
    }

    const textures = this.context.scene.textures
    for (let i = 0; i < this.fragments.length; i += 1) {
      const fragment = this.fragments[i]!
      const key = keys[fragment.textureIndex]
      if (!key || !textures.exists(key)) {
        this.sprites.push(null)
        continue
      }

      const image = this.context.scene.add.image(0, 0, key)
      image.setName(`effect:${this.id}:tex:${i}`)
      image.setBlendMode(this.options.blendMode)
      image.setVisible(false)
      image.setAlpha(0)

      if (this.options.position === 'back') {
        this.context.target.addAt(image, 0)
      } else {
        this.context.target.add(image)
      }

      this.sprites.push(image)
    }
  }

  private hideSprites(): void {
    for (const sprite of this.sprites) {
      if (!sprite) {
        continue
      }
      sprite.setVisible(false)
      sprite.setAlpha(0)
    }
  }

  private clearSprites(): void {
    for (const sprite of this.sprites) {
      sprite?.destroy()
    }
    this.sprites = []
  }

  private drawFragments(): void {
    if (!this.graphics || !this.options) {
      return
    }

    this.graphics.clear()

    if (!this.running || this.fragments.length === 0) {
      this.hideSprites()
      return
    }

    const { color, intensity } = this.options
    const globalPeak = Math.min(intensity, 2)

    for (let i = 0; i < this.fragments.length; i += 1) {
      const fragment = this.fragments[i]!
      const sample = sampleFragmentBurstFragment(fragment, this.elapsedMs)
      const sprite = this.sprites[i]

      if (!sample.visible) {
        if (sprite) {
          sprite.setVisible(false)
          sprite.setAlpha(0)
        }
        continue
      }

      const alpha = Math.min(sample.alpha * globalPeak, 1)
      if (alpha < 0.004) {
        if (sprite) {
          sprite.setVisible(false)
          sprite.setAlpha(0)
        }
        continue
      }

      if (sprite) {
        const scale = fragment.size / Math.max(sprite.width, 1)
        sprite.setPosition(sample.x, sample.y)
        sprite.setRotation(sample.rotation)
        sprite.setScale(scale)
        sprite.setTint(color)
        sprite.setAlpha(alpha)
        sprite.setVisible(true)
        continue
      }

      // Soft outer halo then brighter core — avoids hard square particles.
      this.drawProceduralFragment(
        fragment,
        sample.x,
        sample.y,
        sample.rotation,
        color,
        alpha * 0.22,
        1.35,
      )
      this.drawProceduralFragment(
        fragment,
        sample.x,
        sample.y,
        sample.rotation,
        color,
        alpha * 0.72,
        1,
      )
    }
  }

  private drawProceduralFragment(
    fragment: FragmentBurstFragment,
    x: number,
    y: number,
    rotation: number,
    color: number,
    alpha: number,
    scaleMul: number,
  ): void {
    if (!this.graphics || alpha < 0.004) {
      return
    }

    const length = fragment.size * scaleMul
    const width = length * fragment.aspect
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    const tx = (lx: number, ly: number): { x: number; y: number } => ({
      x: x + lx * cos - ly * sin,
      y: y + lx * sin + ly * cos,
    })

    this.graphics.fillStyle(color, alpha)

    switch (fragment.shape) {
      case 'feather':
        this.fillFeather(tx, length, width)
        break
      case 'leaf':
        this.fillLeaf(tx, length, width)
        break
      case 'shard':
        this.fillShard(tx, length, width)
        break
      case 'petal':
      default:
        this.fillPetal(tx, length, width)
        break
    }
  }

  private fillFeather(
    tx: (lx: number, ly: number) => { x: number; y: number },
    length: number,
    width: number,
  ): void {
    if (!this.graphics) {
      return
    }
    // Elongated curved vane: tip → mid lobes → soft base.
    const tip = tx(length * 0.55, 0)
    const midL = tx(length * 0.08, -width * 0.55)
    const midR = tx(length * 0.08, width * 0.55)
    const base = tx(-length * 0.45, 0)
    const baseL = tx(-length * 0.2, -width * 0.22)
    const baseR = tx(-length * 0.2, width * 0.22)
    const bend = tx(length * 0.2, -width * 0.18)

    this.graphics.fillTriangle(tip.x, tip.y, midL.x, midL.y, bend.x, bend.y)
    this.graphics.fillTriangle(tip.x, tip.y, bend.x, bend.y, midR.x, midR.y)
    this.graphics.fillTriangle(midL.x, midL.y, baseL.x, baseL.y, base.x, base.y)
    this.graphics.fillTriangle(midR.x, midR.y, base.x, base.y, baseR.x, baseR.y)
    this.graphics.fillTriangle(midL.x, midL.y, midR.x, midR.y, base.x, base.y)
  }

  private fillLeaf(
    tx: (lx: number, ly: number) => { x: number; y: number },
    length: number,
    width: number,
  ): void {
    if (!this.graphics) {
      return
    }
    const tip = tx(length * 0.55, 0)
    const left = tx(0, -width * 0.55)
    const right = tx(0, width * 0.55)
    const base = tx(-length * 0.5, 0)
    this.graphics.fillTriangle(tip.x, tip.y, left.x, left.y, right.x, right.y)
    this.graphics.fillTriangle(base.x, base.y, left.x, left.y, right.x, right.y)
  }

  private fillShard(
    tx: (lx: number, ly: number) => { x: number; y: number },
    length: number,
    width: number,
  ): void {
    if (!this.graphics) {
      return
    }
    const a = tx(length * 0.55, -width * 0.15)
    const b = tx(length * 0.25, width * 0.45)
    const c = tx(-length * 0.5, width * 0.2)
    const d = tx(-length * 0.2, -width * 0.4)
    this.graphics.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y)
    this.graphics.fillTriangle(a.x, a.y, c.x, c.y, d.x, d.y)
  }

  private fillPetal(
    tx: (lx: number, ly: number) => { x: number; y: number },
    length: number,
    width: number,
  ): void {
    if (!this.graphics) {
      return
    }
    const tip = tx(length * 0.5, 0)
    const midL = tx(length * 0.05, -width * 0.6)
    const midR = tx(length * 0.05, width * 0.6)
    const base = tx(-length * 0.4, 0)
    const waistL = tx(-length * 0.1, -width * 0.25)
    const waistR = tx(-length * 0.1, width * 0.25)
    this.graphics.fillTriangle(tip.x, tip.y, midL.x, midL.y, midR.x, midR.y)
    this.graphics.fillTriangle(midL.x, midL.y, waistL.x, waistL.y, base.x, base.y)
    this.graphics.fillTriangle(midR.x, midR.y, base.x, base.y, waistR.x, waistR.y)
    this.graphics.fillTriangle(midL.x, midL.y, midR.x, midR.y, base.x, base.y)
  }

  private clearVisuals(): void {
    this.clearSprites()
    this.graphics?.destroy()
    this.graphics = null
    this.options = null
  }
}
