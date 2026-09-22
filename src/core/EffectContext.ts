import type Phaser from 'phaser'

/**
 * Runtime attachment point for effect visuals.
 * Portable: no knowledge of any specific card/entity class.
 */
export interface EffectContext {
  scene: Phaser.Scene
  /** Container that owns the effect visuals. */
  target: Phaser.GameObjects.Container
}

/**
 * @deprecated Use `EffectContext`.
 */
export type CardEffectContext = EffectContext
