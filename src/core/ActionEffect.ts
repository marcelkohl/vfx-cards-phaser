import type { VfxEffect } from './Effect'

/**
 * One-shot animation — call `run()` to play; reusable after finish.
 *
 * Lifecycle: create → enable → run → finish → run again → destroy
 */
export interface ActionEffect extends VfxEffect {
  readonly kind: 'action'

  /** Start or restart one playback pass. */
  run(): this

  /** Stop immediately without firing finish listeners. */
  stop(): this

  isRunning(): boolean

  /**
   * Invoked when a `run()` pass completes naturally.
   * Returns an unsubscribe function.
   */
  onFinish(callback: (effect: ActionEffect) => void): () => void
}

/** Type guard for action effects (run / onFinish). */
export function isActionEffect(effect: VfxEffect): effect is ActionEffect {
  return effect.kind === 'action'
}
