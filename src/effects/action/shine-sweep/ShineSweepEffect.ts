import Phaser from 'phaser'
import type { ActionEffect } from '../../../core/ActionEffect'
import { ActionRunProgress } from '../../../core/ActionRunProgress'
import type { EffectContext } from '../../../core/EffectContext'
import { EFFECT_IDS } from '../../../core/EffectKind'
import { colorToRgb01 } from '../../../core/effectConfig'
import { SHINE_SWEEP_FRAGMENT_SHADER } from './shineSweep.frag'
import { ShineSweepGraphicsFallback } from './ShineSweepGraphicsFallback'
import {
  resolveShineSweepOptions,
  sampleShinePlayback,
  type ResolvedShineSweepOptions,
  type ShineSweepOptions,
} from './shineSweepOptions'

export type { ShineSweepOptions } from './shineSweepOptions'
export { SHINE_SWEEP_DEFAULTS } from './shineSweepOptions'

export type ShineSweepFinishCallback = (effect: ShineSweepEffect) => void

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
 * Soft light reflection across a rounded-rect frame (Action Effect).
 * Idle after `enable()` — call `run()` to play one pass.
 * Loop via `onFinish` → `run()`.
 */
export class ShineSweepEffect implements ActionEffect {
  public readonly id = EFFECT_IDS.shineSweep
  public readonly name = 'Shine Sweep'
  public readonly description =
    'Faixa de luz sob demanda; use run() / onFinish().'
  public readonly kind = 'action' as const

  private inputOptions: ShineSweepOptions
  private options: ResolvedShineSweepOptions | null = null
  private shader: Phaser.GameObjects.Shader | null = null
  private fallback: ShineSweepGraphicsFallback | null = null
  private elapsedMs = 0
  private progress = 0
  private sweepActive = false
  private running = false
  private finishListeners = new Set<ShineSweepFinishCallback>()
  private readonly runProgress = new ActionRunProgress(() => this)

  constructor(options?: ShineSweepOptions) {
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
      ...(options as ShineSweepOptions),
    }
    this.rebuild(context)
    if (wasRunning) {
      this.run()
    }
  }

  /** Starts (or restarts) one shine pass. Fires `onFinish` when it ends. */
  public run(): this {
    if (!this.options && !this.shader && !this.fallback) {
      return this
    }

    this.running = true
    this.elapsedMs = 0
    this.progress = 0
    this.sweepActive = true
    this.fallback?.setVisualState(0, true)
    this.runProgress.beginRun()
    return this
  }

  /** Stops playback immediately and hides the band (does not fire onFinish). */
  public stop(): this {
    this.running = false
    this.runProgress.abort()
    this.elapsedMs = 0
    this.progress = 0
    this.sweepActive = false
    this.fallback?.setVisualState(0, false)
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  /**
   * Registers a listener invoked when a `run()` pass completes.
   * Returns an unsubscribe function.
   */
  public onFinish(callback: (effect: ActionEffect) => void): () => void {
    const listener = callback as ShineSweepFinishCallback
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
    if (!this.options || (!this.shader && !this.fallback)) {
      return
    }

    if (!this.running) {
      this.sweepActive = false
      this.fallback?.setVisualState(this.progress, false)
      return
    }

    this.elapsedMs += delta
    const duration = Math.max(this.options.speed, 1)
    this.runProgress.notify(this.elapsedMs / duration)
    const sample = sampleShinePlayback(this.elapsedMs, this.options.speed)

    if (sample.finished) {
      this.running = false
      this.sweepActive = false
      this.progress = 0
      this.fallback?.setVisualState(0, false)
      this.runProgress.complete()
      this.emitFinish()
      return
    }

    this.sweepActive = true
    this.progress = sample.progress
    this.fallback?.setVisualState(this.progress, true)
  }

  public disable(): void {
    this.running = false
    this.runProgress.abort()
    this.clearVisuals()
    this.elapsedMs = 0
    this.progress = 0
    this.sweepActive = false
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
    this.options = resolveShineSweepOptions(this.inputOptions)
    this.running = false
    this.elapsedMs = 0
    this.progress = 0
    this.sweepActive = false

    if (!isWebGLRenderer(context.scene)) {
      this.fallback = new ShineSweepGraphicsFallback(this.inputOptions)
      this.fallback.apply(context)
      this.fallback.setVisualState(0, false)
      return
    }

    const {
      width,
      height,
      cornerRadius,
      color,
      bandWidth,
      intensity,
      opacity,
      softness,
      dispersion,
      padding,
      blendMode,
      dirX,
      dirY,
    } = this.options

    const pathWidth = Math.max(1, width + padding * 2)
    const pathHeight = Math.max(1, height + padding * 2)
    const quadWidth = Math.ceil(pathWidth)
    const quadHeight = Math.ceil(pathHeight)
    const rgb = colorToRgb01(color)
    const instanceId = ++shaderInstanceCount
    const effect = this

    this.shader = context.scene.add.shader(
      {
        name: `ShineSweepShader-${instanceId}`,
        shaderName: 'ShineSweepShader',
        fragmentSource: SHINE_SWEEP_FRAGMENT_SHADER,
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          if (!effect.options) {
            return
          }

          setUniform('uResolution', [quadWidth, quadHeight])
          setUniform('uCardSize', [pathWidth, pathHeight])
          setUniform('uRadius', cornerRadius)
          setUniform('uColor', rgb)
          setUniform('uBandWidth', bandWidth)
          setUniform('uProgress', effect.progress)
          setUniform('uIntensity', effect.sweepActive ? intensity : 0)
          setUniform('uOpacity', opacity)
          setUniform('uSoftness', softness)
          setUniform('uDispersion', dispersion)
          setUniform('uDir', [dirX, dirY])
        },
      },
      0,
      0,
      quadWidth,
      quadHeight,
    )

    this.shader.setName(`effect:${this.id}`)
    this.shader.setOrigin(0.5, 0.5)
    this.shader.setBlendMode(blendMode)
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
