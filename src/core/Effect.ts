import type { EffectContext } from './EffectContext'
import type { EffectKind } from './EffectKind'

/**
 * Portable contract for a single visual effect.
 * Implementations must not depend on any specific card class or other effects.
 */
export interface VfxEffect {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly kind: EffectKind

  /**
   * Attach visuals to the target (idle for action effects).
   * Persistent effects become visible; action effects wait for `run()`.
   */
  enable(context: EffectContext): void

  /** Detach visuals without destroying the instance (can enable again). */
  disable(): void

  /**
   * Merge new options and rebuild visuals if already enabled.
   * Used when the consumer's target geometry or style changes.
   */
  reconfigure?(
    options: Record<string, unknown>,
    context: EffectContext,
  ): void

  update?(time: number, delta: number): void

  /** Tear down permanently. Instance should not be reused afterward. */
  destroy(): void
}

/**
 * @deprecated Use `VfxEffect`.
 */
export type CardEffect = VfxEffect
