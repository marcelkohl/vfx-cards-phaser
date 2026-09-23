import type { ActionEffect } from './ActionEffect'
import { clamp01 } from './effectConfig'

export type ActionProgressCallback = (effect: ActionEffect) => void

interface ProgressRegistration {
  threshold: number
  callback: ActionProgressCallback
  /** Fired state for the current `run()` — reset by `beginRun()`. */
  fired: boolean
}

/**
 * Shared once-per-run progress-event tracker for Action Effects.
 *
 * Registrations persist across runs; only `fired` is reset on each `beginRun()`.
 * A generation counter invalidates in-flight dispatch if `run()` / `stop()`
 * happens inside a callback.
 */
export class ActionRunProgress {
  private readonly getEffect: () => ActionEffect
  private readonly registrations: ProgressRegistration[] = []
  private generation = 0
  private active = false

  constructor(getEffect: () => ActionEffect) {
    this.getEffect = getEffect
  }

  /**
   * Register a progress callback. `progress` is clamped to `[0, 1]`.
   * Non-finite values become `0`.
   * Returns an unsubscribe function.
   */
  public onProgress(
    progress: number,
    callback: ActionProgressCallback,
  ): () => void {
    const threshold = normalizeProgress(progress)
    const entry: ProgressRegistration = {
      threshold,
      callback,
      fired: false,
    }
    this.registrations.push(entry)
    return () => {
      const index = this.registrations.indexOf(entry)
      if (index >= 0) {
        this.registrations.splice(index, 1)
      }
    }
  }

  /**
   * Start (or restart) a run: rearm all callbacks and fire any at `0`.
   * Call at the end of `run()` after the effect is armed.
   */
  public beginRun(): void {
    this.generation += 1
    this.active = true
    for (const entry of this.registrations) {
      entry.fired = false
    }
    this.dispatch(0)
  }

  /**
   * Abort the current run without firing remaining progress or finish.
   * Call from `stop()` / `disable()`.
   */
  public abort(): void {
    this.generation += 1
    this.active = false
  }

  /**
   * Report normalized execution progress for the active run.
   * Fires every unfired registration whose threshold `<= progress`.
   */
  public notify(progress: number): void {
    if (!this.active) {
      return
    }
    this.dispatch(normalizeProgress(progress))
  }

  /**
   * Natural completion: ensure progress `1` callbacks fire, then deactivate.
   * Call immediately before `onFinish` listeners.
   * If a callback restarts the effect, the new run is left active.
   */
  public complete(): void {
    if (!this.active) {
      return
    }
    const gen = this.generation
    this.dispatch(1)
    if (this.generation !== gen) {
      return
    }
    this.active = false
  }

  /** Drop all registrations (for `destroy()`). */
  public clear(): void {
    this.abort()
    this.registrations.length = 0
  }

  private dispatch(progress: number): void {
    if (!this.active) {
      return
    }

    const gen = this.generation
    const pending: ProgressRegistration[] = []
    for (const entry of this.registrations) {
      if (!entry.fired && entry.threshold <= progress) {
        pending.push(entry)
      }
    }

    // Ascending threshold; registration order for equal thresholds.
    pending.sort((a, b) => {
      if (a.threshold !== b.threshold) {
        return a.threshold - b.threshold
      }
      return this.registrations.indexOf(a) - this.registrations.indexOf(b)
    })

    const effect = this.getEffect()
    for (const entry of pending) {
      if (this.generation !== gen || !this.active) {
        return
      }
      if (this.registrations.indexOf(entry) < 0 || entry.fired) {
        continue
      }
      entry.fired = true
      entry.callback(effect)
    }
  }
}

/** Clamp to `[0, 1]`; non-finite → `0`. */
export function normalizeProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0
  }
  return clamp01(progress)
}
