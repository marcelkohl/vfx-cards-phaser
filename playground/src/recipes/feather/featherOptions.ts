import type {
  FragmentBurstOptions,
  RisingStarOptions,
  SoftGlowPulseOptions,
  SparkleBurstOptions,
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

export interface FeatherOptions {
  width?: number
  height?: number
  cornerRadius?: number
  /** Soft Glow Pulse — magical aura foundation. */
  aura?: SoftGlowPulseOptions
  fragmentBurst?: FragmentBurstOptions
  sparkleBurst?: SparkleBurstOptions
  risingStar?: RisingStarOptions
  /** Optional second Rising Star wave for staggered vertical sparkles. */
  risingStarLate?: RisingStarOptions
  auraAt?: number
  fragmentAt?: number
  sparkleAt?: number
  risingStarAt?: number
  risingStarLateAt?: number
}

export interface ResolvedFeatherOptions {
  width: number
  height: number
  cornerRadius: number
  aura: SoftGlowPulseOptions
  fragmentBurst: FragmentBurstOptions
  sparkleBurst: SparkleBurstOptions
  risingStar: RisingStarOptions
  risingStarLate: RisingStarOptions
  auraAt: number
  fragmentAt: number
  sparkleAt: number
  risingStarAt: number
  risingStarLateAt: number
}

/** Aura: quick rise, long soft fade — stays alive under the other bursts. */
export const FEATHER_AURA_DEFAULTS: SoftGlowPulseOptions = {
  color: 0xc8fff4,
  intensity: 0.92,
  innerCoverage: 0.1,
  softness: 0.88,
  cornerFocus: 0.88,
  opacity: 0.92,
  outerSpread: 0,
  pulseCount: 1,
  fadeInDuration: 70,
  fadeOutDuration: 1500,
  position: 'front',
}

export const FEATHER_FRAGMENT_DEFAULTS: FragmentBurstOptions = {
  color: 0xc8fff4,
  intensity: 0.82,
  fragmentCount: 16,
  duration: 1150,
  minTravel: 46,
  maxTravel: 118,
  minSize: 10,
  maxSize: 20,
  curvature: 30,
  seed: 42,
  spawnRegion: 'mixed',
  position: 'front',
}

export const FEATHER_SPARKLE_DEFAULTS: SparkleBurstOptions = {
  color: 0xfff6e0,
  intensity: 1,
  opacity: 0.92,
  sparkleCount: 14,
  duration: 980,
  minTravel: 12,
  maxTravel: 36,
  minSize: 3.5,
  maxSize: 12,
  seed: 42,
  spawnRegion: 'ring',
  position: 'front',
}

export const FEATHER_RISING_STAR_DEFAULTS: RisingStarOptions = {
  color: 0xfff4d8,
  intensity: 1.05,
  opacity: 0.95,
  starCount: 4,
  duration: 1100,
  direction: 'up',
  minRise: 42,
  maxRise: 100,
  verticalLength: 34,
  horizontalLength: 8,
  seed: 42,
  spawnRegion: 'mixed',
  startDelaySpread: 220,
  position: 'front',
}

export const FEATHER_RISING_STAR_LATE_DEFAULTS: RisingStarOptions = {
  color: 0xc8fff4,
  intensity: 1,
  opacity: 0.9,
  starCount: 3,
  duration: 1050,
  direction: 'up',
  minRise: 50,
  maxRise: 120,
  verticalLength: 40,
  horizontalLength: 6,
  seed: 77,
  spawnRegion: 'top',
  startDelaySpread: 180,
  position: 'front',
}

export const FEATHER_DEFAULTS: ResolvedFeatherOptions = {
  width: 220,
  height: 320,
  cornerRadius: 18,
  aura: { ...FEATHER_AURA_DEFAULTS },
  fragmentBurst: { ...FEATHER_FRAGMENT_DEFAULTS },
  sparkleBurst: { ...FEATHER_SPARKLE_DEFAULTS },
  risingStar: { ...FEATHER_RISING_STAR_DEFAULTS },
  risingStarLate: { ...FEATHER_RISING_STAR_LATE_DEFAULTS },
  auraAt: 0,
  fragmentAt: 90,
  sparkleAt: 200,
  risingStarAt: 280,
  risingStarLateAt: 520,
}

export function resolveFeatherOptions(
  options: FeatherOptions | undefined,
): ResolvedFeatherOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? FEATHER_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? FEATHER_DEFAULTS.height, 1, 4096)

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? FEATHER_DEFAULTS.cornerRadius),
      width,
      height,
    ),
    aura: {
      ...FEATHER_AURA_DEFAULTS,
      ...(raw.aura ?? {}),
    },
    fragmentBurst: {
      ...FEATHER_FRAGMENT_DEFAULTS,
      ...(raw.fragmentBurst ?? {}),
    },
    sparkleBurst: {
      ...FEATHER_SPARKLE_DEFAULTS,
      ...(raw.sparkleBurst ?? {}),
    },
    risingStar: {
      ...FEATHER_RISING_STAR_DEFAULTS,
      ...(raw.risingStar ?? {}),
    },
    risingStarLate: {
      ...FEATHER_RISING_STAR_LATE_DEFAULTS,
      ...(raw.risingStarLate ?? {}),
    },
    auraAt: clamp(raw.auraAt ?? FEATHER_DEFAULTS.auraAt, 0, 10_000),
    fragmentAt: clamp(raw.fragmentAt ?? FEATHER_DEFAULTS.fragmentAt, 0, 10_000),
    sparkleAt: clamp(raw.sparkleAt ?? FEATHER_DEFAULTS.sparkleAt, 0, 10_000),
    risingStarAt: clamp(
      raw.risingStarAt ?? FEATHER_DEFAULTS.risingStarAt,
      0,
      10_000,
    ),
    risingStarLateAt: clamp(
      raw.risingStarLateAt ?? FEATHER_DEFAULTS.risingStarLateAt,
      0,
      10_000,
    ),
  }
}
