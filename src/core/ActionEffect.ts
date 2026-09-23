import type { VfxEffect } from './Effect'

/**
 * One-shot animation — call `run()` to play; reusable after finish.
 *
 * Lifecycle: create → enable → run → finish → run again → destroy
 *
 * @see ActionEffect.md for `onProgress` semantics
 */
export interface ActionEffect extends VfxEffect {
  readonly kind: 'action'

  /** Start or restart one playback pass. */
  run(): this

  /** Stop immediately without firing finish or pending progress listeners. */
  stop(): this

  isRunning(): boolean

  /**
   * Invoked when a `run()` pass completes naturally.
   * Returns an unsubscribe function.
   */
  onFinish(callback: (effect: ActionEffect) => void): () => void

  /**
   * Invoked once per `run()` when normalized execution progress reaches or
   * crosses `progress` (clamped to `[0, 1]`).
   *
   * Registrations persist across runs and rearm on each `run()`.
   * `stop()` prevents pending callbacks for the interrupted run.
   * Returns an unsubscribe function.
   */
  onProgress(
    progress: number,
    callback: (effect: ActionEffect) => void,
  ): () => void
}

/** Type guard for action effects (run / onFinish / onProgress). */
export function isActionEffect(effect: VfxEffect): effect is ActionEffect {
  return effect.kind === 'action'
}
