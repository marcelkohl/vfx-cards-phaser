import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import { colorToRgb01 } from '../../../core/effectConfig'
import { DISSOLVE_REVEAL_FRAGMENT_SHADER } from './dissolveReveal.frag'
import { DissolveRevealGraphicsFallback } from './DissolveRevealGraphicsFallback'
import {
  resolveDissolveRevealOptions,
  sampleDissolveProgress,
  type DissolveRevealOptions,
  type ResolvedDissolveRevealOptions,
} from './dissolveRevealOptions'

export type {
  DissolveRevealEffectOptions,
  DissolveRevealOptions,
} from './dissolveRevealOptions'
export { DISSOLVE_REVEAL_DEFAULTS } from './dissolveRevealOptions'

export type DissolveRevealFinishCallback = (
  effect: DissolveRevealEffect,
) => void

let shaderInstanceCount = 0

function isWebGLRenderer(scene: Phaser.Scene): boolean {
  const renderer = scene.game.renderer
  return (
    renderer !== null &&
    typeof renderer === 'object' &&
    'gl' in renderer &&
    (renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl !== null
  )
}

/**
 * Organic noise dissolve that reveals the target underneath (Action Effect).
 *
 * Idle after `enable()`: target fully visible (no cover).
 * `run()`: cover the frame → irregular luminous dissolve → fully visible again.
 * Works via a cover shader on `context.target` — no Card dependency.
 */
export class DissolveRevealEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.dissolveReveal
  public readonly name = 'Dissolve Reveal'
  public readonly description =
    'Revelação orgânica por dissolve; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: DissolveRevealOptions
  private options: ResolvedDissolveRevealOptions | null = null
  private shader: Phaser.GameObjects.Shader | null = null
  private fallback: DissolveRevealGraphicsFallback | null = null
  private elapsedMs = 0
  private progress = 1
  private active = false
  private running = false
  private finishListeners = new Set<DissolveRevealFinishCallback>()

  constructor(options?: DissolveRevealOptions) {
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
      ...(options as DissolveRevealOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one dissolve reveal. Fires `onFinish` when done. */
  public run(): this {
    if (!this.options || (!this.shader && !this.fallback)) {
      return this
    }

    this.running = true
    this.elapsedMs = 0
    this.progress = 0
    this.active = true
    this.syncVisuals()
    return this
  }

  /**
   * Stops immediately and restores a clean idle state (fully visible, no cover).
   * Does not fire onFinish.
   */
  public stop(): this {
    this.running = false
    this.elapsedMs = 0
    this.progress = 1
    this.active = false
    this.syncVisuals()
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as DissolveRevealFinishCallback
    this.finishListeners.add(listener)
    return () => {
      this.finishListeners.delete(listener)
    }
  }

  public update(_time: number, delta: number): void {
    if (!this.options || (!this.shader && !this.fallback)) {
      return
    }

    if (!this.running) {
      if (this.active) {
        this.active = false
        this.progress = 1
        this.syncVisuals()
      }
      return
    }

    this.elapsedMs += delta
    const sample = sampleDissolveProgress(this.elapsedMs, this.options.duration)

    if (sample.finished) {
      this.running = false
      this.progress = 1
      this.active = false
      this.syncVisuals()
      this.emitFinish()
      return
    }

    this.progress = sample.progress
    this.active = true
    this.syncVisuals()
  }

  public disable(): void {
    this.running = false
    this.clearVisuals()
    this.elapsedMs = 0
    this.progress = 1
    this.active = false
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

  private syncVisuals(): void {
    this.fallback?.setVisualState(this.progress, this.active)
    // Shader uniforms are pulled each frame via setupUniforms.
  }

  private rebuild(context: EffectContext): void {
    this.clearVisuals()
    this.options = resolveDissolveRevealOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.progress = 1
    this.active = false

    if (!isWebGLRenderer(context.scene)) {
      this.fallback = new DissolveRevealGraphicsFallback(this.inputOptions)
      this.fallback.apply(context)
      this.fallback.setVisualState(1, false)
      return
    }

    const {
      width,
      height,
      cornerRadius,
      edgeColor,
      edgeIntensity,
      edgeWidth,
      noiseScale,
      variation,
      seed,
      coverColor,
      coverOpacity,
    } = this.options

    const edgeRgb = colorToRgb01(edgeColor)
    const coverRgb = colorToRgb01(coverColor)
    const instanceId = ++shaderInstanceCount
    const effect = this

    this.shader = context.scene.add.shader(
      {
        name: `DissolveRevealShader-${instanceId}`,
        shaderName: 'DissolveRevealShader',
        fragmentSource: DISSOLVE_REVEAL_FRAGMENT_SHADER,
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          if (!effect.options) {
            return
          }

          setUniform('uResolution', [width, height])
          setUniform('uCardSize', [width, height])
          setUniform('uRadius', cornerRadius)
          setUniform('uProgress', effect.progress)
          setUniform('uActive', effect.active ? 1 : 0)
          setUniform('uNoiseScale', noiseScale)
          setUniform('uVariation', variation)
          setUniform('uSeed', seed)
          setUniform('uEdgeWidth', edgeWidth)
          setUniform('uEdgeIntensity', edgeIntensity)
          setUniform('uEdgeColor', edgeRgb)
          setUniform('uCoverColor', coverRgb)
          setUniform('uCoverOpacity', coverOpacity)
        },
      },
      0,
      0,
      width,
      height,
    )

    this.shader.setName(`effect:${this.id}`)
    this.shader.setOrigin(0.5, 0.5)
    this.shader.setBlendMode(Phaser.BlendModes.NORMAL)
    context.target.add(this.shader)
  }

  private clearVisuals(): void {
    this.fallback?.destroy()
    this.fallback = null
    this.shader?.destroy()
    this.shader = null
    this.options = null
  }
}
