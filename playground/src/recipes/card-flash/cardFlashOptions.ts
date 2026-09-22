import type {
  ExpandingFrameOptions,
  LightBurstOptions,
  RadialGlowOptions,
  StreakBurstOptions,
} from 'phaser-vfx-effects'

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

function resolveCornerRadius(
  requested: number,
  width: number,
  height: number,
): number {
  const maxRadius = Math.min(width / 2, height / 2)
  if (!Number.isFinite(requested) || requested < 0) {
    return 0
  }
  return Math.min(requested, maxRadius)
}

export interface CardFlashOptions {
  width?: number
  height?: number
  cornerRadius?: number
  expandingFrame?: ExpandingFrameOptions
  radialGlow?: RadialGlowOptions
  lightBurst?: LightBurstOptions
  streakBurst?: StreakBurstOptions
  /** Offset (ms) for Expanding Frame. Default 0. */
  expandingFrameAt?: number
  /** Offset (ms) for Radial Glow. Default 30. */
  radialGlowAt?: number
  /** Offset (ms) for Light Burst. Default 40. */
  lightBurstAt?: number
  /** Offset (ms) for Streak Burst. Default 70. */
  streakBurstAt?: number
}

export interface ResolvedCardFlashOptions {
  width: number
  height: number
  cornerRadius: number
  expandingFrame: ExpandingFrameOptions
  radialGlow: RadialGlowOptions
  lightBurst: LightBurstOptions
  streakBurst: StreakBurstOptions
  expandingFrameAt: number
  radialGlowAt: number
  lightBurstAt: number
  streakBurstAt: number
}

/** Coherent ice-cyan family for the whole flash. */
const FRAME_CYAN = 0x4ec8ff
const HALO_CYAN = 0x4ec8ff
const BURST_BLUE = 0x66ddff
const STREAK_PALE = 0xc8f4ff

/**
 * Primary impact — bright fill wash + expanding luminous rectangle.
 * Lifetime ≈ 28 + 75 + 340 = 443 ms.
 * Peak wash ≈ fade-in end (~28 ms) through hold (~103 ms).
 */
export const CARD_FLASH_EXPANDING_FRAME_DEFAULTS: ExpandingFrameOptions = {
  color: FRAME_CYAN,
  intensity: 1.22,
  opacity: 0.88,
  fillIntensity: 0.68,
  startScale: 1,
  endScale: 1.2,
  fadeInDuration: 28,
  holdDuration: 75,
  fadeOutDuration: 340,
  innerCoverage: 0.12,
  softness: 0.82,
  cornerFocus: 0.88,
  outerSpread: 7,
  outerIntensity: 0.22,
  position: 'front',
}

/**
 * Subtle optical halo — atmosphere only, never neon.
 * Lifetime ≈ 100 + 50 + 320 = 470 ms.
 */
export const CARD_FLASH_RADIAL_GLOW_DEFAULTS: RadialGlowOptions = {
  color: HALO_CYAN,
  intensity: 0.26,
  opacity: 0.78,
  radius: 125,
  aspect: 1.1,
  ringWidth: 1.5,
  rimIntensity: 2.2,
  innerTrail: 0.48,
  outerGlow: 0.09,
  positionX: 0.5,
  positionY: 0.5,
  startScale: 0.7,
  endScale: 1.22,
  fadeInDuration: 100,
  holdDuration: 50,
  fadeOutDuration: 320,
  softness: 0.7,
  position: 'back',
}

/**
 * Secondary broad rays — much weaker than Card Flare's Light Burst.
 * Duration 780 ms; continuous expand; peak early (~14%).
 */
export const CARD_FLASH_LIGHT_BURST_DEFAULTS: LightBurstOptions = {
  color: BURST_BLUE,
  intensity: 0.34,
  rayCount: 10,
  rayLength: 100,
  rayWidth: 11,
  tipFlare: 2.8,
  duration: 780,
  originInset: 0.28,
  spreadJitter: 0.45,
  lengthJitter: 0.25,
  position: 'front',
  scaleMode: 'continuous',
  startScale: 0.45,
  endScale: 1.35,
  peakAt: 0.14,
}

/**
 * Moving luminous streaks — mixed spawn so some begin over the artwork.
 * Lifetime ≈ delay + life (stagger 85 + ~520) after start offset.
 */
export const CARD_FLASH_STREAK_BURST_DEFAULTS: StreakBurstOptions = {
  color: STREAK_PALE,
  intensity: 1.15,
  opacity: 0.9,
  streakCount: 20,
  duration: 520,
  minLength: 40,
  maxLength: 88,
  minThickness: 1.15,
  maxThickness: 2.5,
  minTravel: 60,
  maxTravel: 145,
  stagger: 85,
  fadeInPortion: 0.08,
  fadeStart: 0.3,
  spawnRegion: 'mixed',
  angularVariation: 0.38,
  seed: 11,
  position: 'front',
}

export const CARD_FLASH_DEFAULTS: ResolvedCardFlashOptions = {
  width: 220,
  height: 320,
  cornerRadius: 18,
  expandingFrame: { ...CARD_FLASH_EXPANDING_FRAME_DEFAULTS },
  radialGlow: { ...CARD_FLASH_RADIAL_GLOW_DEFAULTS },
  lightBurst: { ...CARD_FLASH_LIGHT_BURST_DEFAULTS },
  streakBurst: { ...CARD_FLASH_STREAK_BURST_DEFAULTS },
  expandingFrameAt: 0,
  radialGlowAt: 30,
  lightBurstAt: 40,
  streakBurstAt: 70,
}

export function resolveCardFlashOptions(
  options: CardFlashOptions | undefined,
): ResolvedCardFlashOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? CARD_FLASH_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? CARD_FLASH_DEFAULTS.height, 1, 4096)

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? CARD_FLASH_DEFAULTS.cornerRadius),
      width,
      height,
    ),
    expandingFrame: {
      ...CARD_FLASH_EXPANDING_FRAME_DEFAULTS,
      ...(raw.expandingFrame ?? {}),
    },
    radialGlow: {
      ...CARD_FLASH_RADIAL_GLOW_DEFAULTS,
      ...(raw.radialGlow ?? {}),
    },
    lightBurst: {
      ...CARD_FLASH_LIGHT_BURST_DEFAULTS,
      ...(raw.lightBurst ?? {}),
    },
    streakBurst: {
      ...CARD_FLASH_STREAK_BURST_DEFAULTS,
      ...(raw.streakBurst ?? {}),
    },
    expandingFrameAt: clamp(
      raw.expandingFrameAt ?? CARD_FLASH_DEFAULTS.expandingFrameAt,
      0,
      10_000,
    ),
    radialGlowAt: clamp(
      raw.radialGlowAt ?? CARD_FLASH_DEFAULTS.radialGlowAt,
      0,
      10_000,
    ),
    lightBurstAt: clamp(
      raw.lightBurstAt ?? CARD_FLASH_DEFAULTS.lightBurstAt,
      0,
      10_000,
    ),
    streakBurstAt: clamp(
      raw.streakBurstAt ?? CARD_FLASH_DEFAULTS.streakBurstAt,
      0,
      10_000,
    ),
  }
}
