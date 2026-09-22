import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
} from '../../../core/effectConfig'

export type StreakBurstPosition = 'back' | 'front'

export type StreakBurstSpawnRegion = 'center' | 'edge' | 'area' | 'mixed'

export interface StreakBurstOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Streak tint as 0xRRGGBB. Default pale cyan. */
  color?: number
  /** Peak brightness multiplier (0..2). Default 1.15. */
  intensity?: number
  /** Global opacity multiplier (0..1). Default 0.9. */
  opacity?: number
  /** Number of streaks. Default 20. */
  streakCount?: number
  /** Approximate lifetime of each streak in milliseconds. Default 520. */
  duration?: number
  /** Minimum outward travel distance in pixels. Default 55. */
  minTravel?: number
  /** Maximum outward travel distance in pixels. Default 130. */
  maxTravel?: number
  /** Minimum streak length in pixels. Default 38. */
  minLength?: number
  /** Maximum streak length in pixels. Default 80. */
  maxLength?: number
  /** Minimum core thickness in pixels. Default 1.2. */
  minThickness?: number
  /** Maximum core thickness in pixels. Default 2.6. */
  maxThickness?: number
  /**
   * How far inside the frame streaks may spawn (0 = near edge, 1 = deep).
   * Used with edge/area/mixed. Default 0.1.
   */
  spawnInset?: number
  /** Extra spawn position jitter in pixels. Default 8. */
  spawnJitter?: number
  /**
   * Where streaks originate.
   * - `edge` — near the frame perimeter
   * - `center` — near the middle
   * - `area` — broad coverage across the target interior
   * - `mixed` — interior + edge origins (~55% / ~45%)
   */
  spawnRegion?: StreakBurstSpawnRegion
  /**
   * Max angular deviation from outward radial (radians). Default 0.4.
   */
  angularVariation?: number
  /**
   * Normalized progress (0..1) within each streak's life when fade-out begins.
   * Default 0.32 — readable early, fade while still traveling.
   */
  fadeStart?: number
  /**
   * Fraction of each streak's life spent fading in. Default 0.08.
   */
  fadeInPortion?: number
  /**
   * Max start-delay spread across streaks, in milliseconds. Default 90.
   * Tight stagger — one burst event, not continuous emission.
   */
  stagger?: number
  /**
   * Deterministic seed. Same seed → same layout and motion.
   * Default 1.
   */
  seed?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over artwork (default). `back` = behind.
   */
  position?: StreakBurstPosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedStreakBurstOptions {
  width: number
  height: number
  color: number
  intensity: number
  opacity: number
  streakCount: number
  duration: number
  minTravel: number
  maxTravel: number
  minLength: number
  maxLength: number
  minThickness: number
  maxThickness: number
  spawnInset: number
  spawnJitter: number
  spawnRegion: StreakBurstSpawnRegion
  angularVariation: number
  fadeStart: number
  fadeInPortion: number
  stagger: number
  seed: number
  position: StreakBurstPosition
  blendMode: number
}

export interface StreakBurstStreak {
  originX: number
  originY: number
  angle: number
  travelDistance: number
  length: number
  thickness: number
  delayMs: number
  lifeMs: number
  fadeStart: number
  fadeInPortion: number
  alphaScale: number
}

export interface StreakBurstSample {
  x: number
  y: number
  angle: number
  alpha: number
  visible: boolean
  finished: boolean
}

const BLEND_ADD = 1

export const STREAK_BURST_DEFAULTS: ResolvedStreakBurstOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  color: 0xc8f4ff,
  intensity: 1.15,
  opacity: 0.9,
  streakCount: 20,
  duration: 520,
  minTravel: 55,
  maxTravel: 130,
  minLength: 38,
  maxLength: 80,
  minThickness: 1.2,
  maxThickness: 2.6,
  spawnInset: 0.1,
  spawnJitter: 8,
  spawnRegion: 'mixed',
  angularVariation: 0.4,
  fadeStart: 0.32,
  fadeInPortion: 0.08,
  stagger: 90,
  seed: 1,
  position: 'front',
  blendMode: BLEND_ADD,
}

/**
 * Deterministic pseudo-random in [0, 1) from integer seeds.
 * Local to Streak Burst — not shared with other Action Effects.
 */
export function streakHash01(seed: number, salt: number): number {
  let n = (seed * 374761393 + salt * 668265263) | 0
  n = (n ^ (n >>> 13)) * 1274126177
  n = n ^ (n >>> 16)
  return ((n >>> 0) % 10000) / 10000
}

function pickSpawnRegion(
  region: StreakBurstSpawnRegion,
  seed: number,
  index: number,
): StreakBurstSpawnRegion {
  if (region !== 'mixed') {
    return region
  }
  // Genuine mix: majority interior/area, substantial edge share.
  // ~58% area / ~42% edge — both families readable in a still frame.
  return streakHash01(seed, index * 17 + 3) < 0.58 ? 'area' : 'edge'
}

function spawnPoint(
  options: ResolvedStreakBurstOptions,
  seed: number,
  index: number,
): { x: number; y: number } {
  const halfW = options.width / 2
  const halfH = options.height / 2
  const inset = options.spawnInset
  const jitter = options.spawnJitter
  const region = pickSpawnRegion(options.spawnRegion, seed, index)

  let x = 0
  let y = 0

  if (region === 'center') {
    x = (streakHash01(seed, index * 11 + 1) - 0.5) * halfW * 0.28
    y = (streakHash01(seed, index * 11 + 2) - 0.5) * halfH * 0.28
  } else if (region === 'area') {
    // Broad coverage of the target interior — not clustered at center.
    const cover = 0.9 - inset * 0.25
    const innerW = halfW * cover
    const innerH = halfH * cover
    x = (streakHash01(seed, index * 11 + 1) - 0.5) * 2 * innerW
    y = (streakHash01(seed, index * 11 + 2) - 0.5) * 2 * innerH
  } else {
    // Edge: irregular walk of the rectangle perimeter, slight inward pull.
    const perimeter = 2 * (options.width + options.height)
    // Uneven segments — avoid perfect ring spacing.
    const t =
      (streakHash01(seed, index * 11 + 1) * 0.72 +
        streakHash01(seed, index * 19 + 2) * 0.28) *
      perimeter
    const w = options.width
    const h = options.height
    if (t < w) {
      x = -halfW + t
      y = -halfH
    } else if (t < w + h) {
      x = halfW
      y = -halfH + (t - w)
    } else if (t < w + h + w) {
      x = halfW - (t - w - h)
      y = halfH
    } else {
      x = -halfW
      y = halfH - (t - w - h - w)
    }
    x *= 1 - inset * 0.4
    y *= 1 - inset * 0.4
  }

  x += (streakHash01(seed, index * 11 + 4) - 0.5) * 2 * jitter
  y += (streakHash01(seed, index * 11 + 5) - 0.5) * 2 * jitter
  return { x, y }
}

export function buildStreakBurstStreaks(
  options: ResolvedStreakBurstOptions,
  seed: number = options.seed,
): StreakBurstStreak[] {
  const streaks: StreakBurstStreak[] = []
  const travelSpan = Math.max(options.maxTravel - options.minTravel, 0)
  const lengthSpan = Math.max(options.maxLength - options.minLength, 0)
  const thickSpan = Math.max(options.maxThickness - options.minThickness, 0)
  const baseLife = Math.max(options.duration, 80)

  for (let i = 0; i < options.streakCount; i += 1) {
    const origin = spawnPoint(options, seed, i)
    const distFromCenter = Math.hypot(origin.x, origin.y)
    const outward =
      distFromCenter < 14
        ? streakHash01(seed, i * 13 + 7) * Math.PI * 2
        : Math.atan2(origin.y, origin.x)
    const angle =
      outward +
      (streakHash01(seed, i * 13 + 6) - 0.5) * 2 * options.angularVariation

    const delayMs = streakHash01(seed, i * 13 + 8) * options.stagger
    const lifeMs = baseLife * (0.82 + streakHash01(seed, i * 13 + 9) * 0.28)

    streaks.push({
      originX: origin.x,
      originY: origin.y,
      angle,
      travelDistance:
        options.minTravel + streakHash01(seed, i * 13 + 13) * travelSpan,
      length: options.minLength + streakHash01(seed, i * 13 + 16) * lengthSpan,
      thickness:
        options.minThickness + streakHash01(seed, i * 13 + 17) * thickSpan,
      delayMs,
      lifeMs,
      fadeStart:
        options.fadeStart * (0.88 + streakHash01(seed, i * 13 + 18) * 0.24),
      fadeInPortion:
        options.fadeInPortion *
        (0.85 + streakHash01(seed, i * 13 + 19) * 0.3),
      alphaScale: 0.65 + streakHash01(seed, i * 13 + 20) * 0.35,
    })
  }

  return streaks
}

/**
 * Fast launch then ease — energetic impact release, not a slow wind-up.
 */
function travelEase(t: number): number {
  const x = clamp01(t)
  return 1 - Math.pow(1 - x, 2.45)
}

export function sampleStreakBurstStreak(
  streak: StreakBurstStreak,
  elapsedMs: number,
): StreakBurstSample {
  const local = elapsedMs - streak.delayMs
  if (local < 0) {
    return {
      x: streak.originX,
      y: streak.originY,
      angle: streak.angle,
      alpha: 0,
      visible: false,
      finished: false,
    }
  }

  const life = Math.max(streak.lifeMs, 1)
  if (local >= life) {
    const travel = streak.travelDistance
    const cos = Math.cos(streak.angle)
    const sin = Math.sin(streak.angle)
    return {
      x: streak.originX + cos * travel,
      y: streak.originY + sin * travel,
      angle: streak.angle,
      alpha: 0,
      visible: false,
      finished: true,
    }
  }

  const t = local / life
  const eased = travelEase(t)
  const travel = streak.travelDistance * eased
  const cos = Math.cos(streak.angle)
  const sin = Math.sin(streak.angle)
  const x = streak.originX + cos * travel
  const y = streak.originY + sin * travel

  const fadeIn = clamp(streak.fadeInPortion, 0.02, 0.4)
  const fadeStart = clamp(streak.fadeStart, fadeIn + 0.05, 0.92)

  let alpha: number
  if (t < fadeIn) {
    const u = t / fadeIn
    alpha = u * u * streak.alphaScale
  } else if (t < fadeStart) {
    alpha = streak.alphaScale
  } else {
    const ft = (t - fadeStart) / Math.max(1 - fadeStart, 1e-6)
    // Soft land at zero while still moving.
    alpha = Math.max(0, (1 - ft) * (1 - ft)) * streak.alphaScale
  }

  return {
    x,
    y,
    angle: streak.angle,
    alpha,
    visible: alpha > 0.004,
    finished: false,
  }
}

/** Total effect lifetime = latest streak start + that streak's life. */
export function getStreakBurstLifetimeMs(
  options: ResolvedStreakBurstOptions,
  streaks: StreakBurstStreak[],
): number {
  let maxEnd = options.duration
  for (const streak of streaks) {
    maxEnd = Math.max(maxEnd, streak.delayMs + streak.lifeMs)
  }
  return Math.max(maxEnd, 1)
}

export function sampleStreakBurstFinished(
  elapsedMs: number,
  options: ResolvedStreakBurstOptions,
  streaks: StreakBurstStreak[],
): boolean {
  return elapsedMs >= getStreakBurstLifetimeMs(options, streaks)
}

export function resolveStreakBurstOptions(
  options: StreakBurstOptions | undefined,
): ResolvedStreakBurstOptions {
  const raw = options ?? {}
  const position: StreakBurstPosition =
    raw.position === 'back' ? 'back' : 'front'

  let spawnRegion: StreakBurstSpawnRegion = STREAK_BURST_DEFAULTS.spawnRegion
  if (
    raw.spawnRegion === 'center' ||
    raw.spawnRegion === 'edge' ||
    raw.spawnRegion === 'area' ||
    raw.spawnRegion === 'mixed'
  ) {
    spawnRegion = raw.spawnRegion
  }

  let minTravel = clamp(
    raw.minTravel ?? STREAK_BURST_DEFAULTS.minTravel,
    4,
    2048,
  )
  let maxTravel = clamp(
    raw.maxTravel ?? STREAK_BURST_DEFAULTS.maxTravel,
    4,
    2048,
  )
  if (maxTravel < minTravel) {
    const swap = minTravel
    minTravel = maxTravel
    maxTravel = swap
  }

  let minLength = clamp(
    raw.minLength ?? STREAK_BURST_DEFAULTS.minLength,
    2,
    512,
  )
  let maxLength = clamp(
    raw.maxLength ?? STREAK_BURST_DEFAULTS.maxLength,
    2,
    512,
  )
  if (maxLength < minLength) {
    const swap = minLength
    minLength = maxLength
    maxLength = swap
  }

  let minThickness = clamp(
    raw.minThickness ?? STREAK_BURST_DEFAULTS.minThickness,
    0.4,
    64,
  )
  let maxThickness = clamp(
    raw.maxThickness ?? STREAK_BURST_DEFAULTS.maxThickness,
    0.4,
    64,
  )
  if (maxThickness < minThickness) {
    const swap = minThickness
    minThickness = maxThickness
    maxThickness = swap
  }

  return {
    width: clamp(raw.width ?? STREAK_BURST_DEFAULTS.width, 1, 4096),
    height: clamp(raw.height ?? STREAK_BURST_DEFAULTS.height, 1, 4096),
    color: (raw.color ?? STREAK_BURST_DEFAULTS.color) >>> 0,
    intensity: clamp(
      raw.intensity ?? STREAK_BURST_DEFAULTS.intensity,
      0,
      2,
    ),
    opacity: clamp01(raw.opacity ?? STREAK_BURST_DEFAULTS.opacity),
    streakCount: Math.floor(
      clamp(raw.streakCount ?? STREAK_BURST_DEFAULTS.streakCount, 1, 80),
    ),
    duration: clamp(raw.duration ?? STREAK_BURST_DEFAULTS.duration, 80, 8_000),
    minTravel,
    maxTravel,
    minLength,
    maxLength,
    minThickness,
    maxThickness,
    spawnInset: clamp01(raw.spawnInset ?? STREAK_BURST_DEFAULTS.spawnInset),
    spawnJitter: clamp(
      raw.spawnJitter ?? STREAK_BURST_DEFAULTS.spawnJitter,
      0,
      128,
    ),
    spawnRegion,
    angularVariation: clamp(
      raw.angularVariation ?? STREAK_BURST_DEFAULTS.angularVariation,
      0,
      Math.PI,
    ),
    fadeStart: clamp01(raw.fadeStart ?? STREAK_BURST_DEFAULTS.fadeStart),
    fadeInPortion: clamp01(
      raw.fadeInPortion ?? STREAK_BURST_DEFAULTS.fadeInPortion,
    ),
    stagger: clamp(raw.stagger ?? STREAK_BURST_DEFAULTS.stagger, 0, 2_000),
    seed: Math.floor(clamp(raw.seed ?? STREAK_BURST_DEFAULTS.seed, 0, 1e9)),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : STREAK_BURST_DEFAULTS.blendMode,
  }
}
