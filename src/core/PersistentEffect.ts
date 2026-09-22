import type { VfxEffect } from './Effect'

/**
 * Continuous decoration — active until `disable()`.
 *
 * Lifecycle: create → enable → update → disable → destroy
 */
export interface PersistentEffect extends VfxEffect {
  readonly kind: 'persistent'
}

/** Type guard for persistent effects. */
export function isPersistentEffect(
  effect: VfxEffect,
): effect is PersistentEffect {
  return effect.kind === 'persistent'
}
