/**
 * Effect categories from the VFX architecture.
 *
 * - `persistent` — stays active until disabled (look while equipped).
 * - `action` — plays once via `run()`, then idles until run again.
 */
export type EffectKind = 'persistent' | 'action'

/**
 * @deprecated Use `EffectKind`. Kept for older call sites.
 */
export type CardEffectMode = EffectKind

export const EFFECT_IDS = {
  highlight: 'highlight',
  cardRimLine: 'card-rim-line',
  cardRimLineShader: 'card-rim-line-shader',
  rimLineDouble: 'rim-line-double',
  edgeGlow: 'edge-glow',
  ambientSparkles: 'ambient-sparkles',
  pulsingFrame: 'pulsing-frame',
  shineSweep: 'shine-sweep',
  flash: 'flash',
  lightBurst: 'light-burst',
  bloomFade: 'bloom-fade',
  dissolveReveal: 'dissolve-reveal',
  fragmentBurst: 'fragment-burst',
  sparkleBurst: 'sparkle-burst',
  risingStar: 'rising-star',
  softGlowPulse: 'soft-glow-pulse',
  convergingFrame: 'converging-frame',
  expandingFrame: 'expanding-frame',
  starFlare: 'star-flare',
  radialGlow: 'radial-glow',
  streakBurst: 'streak-burst',
} as const

export type EffectId =
  | (typeof EFFECT_IDS)[keyof typeof EFFECT_IDS]
  | (string & {})
