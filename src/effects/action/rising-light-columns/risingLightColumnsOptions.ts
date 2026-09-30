import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
} from '../../../core/effectConfig'

export type RisingLightColumnsPosition = 'back' | 'front'

export interface RisingLightColumnsOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Streak tint as 0xRRGGBB. Default electric cyan. */
  color?: number
  /** Peak brightness multiplier (0..2). Default 0.85 — readable, still translucent. */
  intensity?: number
  /** Global opacity multiplier (0..1). Default 0.82. */
  opacity?: number
  /**
   * Complete run lifetime in milliseconds.
   * Default 1600.
   */
  duration?: number
  /** Number of narrow vertical streaks. Default 11 (sparse, readable). */
  streakCount?: number
  /**
   * Minimum luminous core width in pixels.
   * Default 1.8 — clearly visible but still narrow.
   */
  minStreakWidth?: number
  /**
   * Maximum luminous core width in pixels.
   * Default 4.5 — occasional slightly broader soft streak.
   */
  maxStreakWidth?: number
  /**
   * Shortest streak length in pixels.
   * Default ≈ height × 0.42 when omitted.
   */
  minStreakLength?: number
  /**
   * Longest streak length in pixels.
   * Default ≈ height × 0.68 when omitted (can span ~half+ of card).
   */
  maxStreakLength?: number
  /**
   * How far each streak's leading tip travels upward (px).
   * Default ≈ card height × 0.95.
   */
  travelDistance?: number
  /**
   * How far streaks may draw above the top edge (px).
   * Default 36. Drawing margin only — not the fade mechanism.
   */
  topOverflow?: number
  /**
   * Soft bloom around each streak core (0..1.5).
   * Default 0.65 — local, stronger with fewer streaks.
   */
  glowIntensity?: number
  /**
   * Deterministic seed. Same seed + options → same layout.
   * Default 1.
   */
  seed?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over artwork (default).
   */
  position?: RisingLightColumnsPosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedRisingLightColumnsOptions {
  width: number
  height: number
  color: number
  intensity: number
  opacity: number
  duration: number
  streakCount: number
  minStreakWidth: number
  maxStreakWidth: number
  minStreakLength: number
  maxStreakLength: number
  travelDistance: number
  topOverflow: number
  glowIntensity: number
  seed: number
  position: RisingLightColumnsPosition
  blendMode: number
}

/**
 * One narrow vertical light streak that TRANSLATES upward.
 * The bright tip (`startLeadY`) moves toward −Y; the fading trail hangs below.
 */
export interface RisingLightStreak {
  /** Local X center. */
  x: number
  /**
   * Initial Y of the bright leading tip (+Y down).
   * Placed in the lower / lower-middle region.
   */
  startLeadY: number
  /** Vertical length of the trailing body (hangs below the tip). */
  length: number
  /** Luminous core width in pixels (typically 1–3.5). */
  coreWidth: number
  /** Relative brightness 0..1. */
  brightness: number
  /** Delay before this streak appears (ms). */
  delayMs: number
  /** Lifetime after delay (ms). */
  lifeMs: number
  /** Upward travel distance of the leading tip (px). */
  travel: number
  /**
   * Local lifetime progress (0..1) when opacity fade-out begins.
   * Independent of travel — streak keeps rising while dissolving.
   * Typical ~0.35–0.52 so fade lasts a large share of the life.
   */
  fadeStart: number
}

export interface RisingLightStreakSample {
  /** Current Y of the bright leading tip. */
  leadY: number
  /** Bottom of the fading trail (always ≥ leadY). */
  trailY: number
  /** Opacity envelope for this streak 0..1. */
  alpha: number
  visible: boolean
}

const BLEND_ADD = 1

export const RISING_LIGHT_COLUMNS_DEFAULTS: ResolvedRisingLightColumnsOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  color: 0x4ec8ff,
  intensity: 0.85,
  opacity: 0.82,
  duration: 1600,
  streakCount: 11,
  minStreakWidth: 1.8,
  maxStreakWidth: 4.5,
  // Length defaults resolve relative to height when omitted; these are
  // the absolute fallbacks for a default 320px-tall frame (~0.42–0.68 H).
  minStreakLength: 134,
  maxStreakLength: 218,
  travelDistance: 304,
  topOverflow: 36,
  glowIntensity: 0.65,
  seed: 1,
  position: 'front',
  blendMode: BLEND_ADD,
}

/**
 * Deterministic pseudo-random in [0, 1).
 * Independent of other effects' hash helpers.
 */
export function risingLightHash01(seed: number, salt: number): number {
  let n = (seed * 374761393 + salt * 668265263) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n >>> 0) % 10_000) / 10_000
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(edge1 - edge0, 1e-6))
  return t * t * (3 - 2 * t)
}

export function getRisingLightColumnsDurationMs(
  options: ResolvedRisingLightColumnsOptions,
): number {
  return Math.max(options.duration, 1)
}

/**
 * Samples one streak's upward-translating pose + independent opacity.
 *
 * Motion (`moveT`) and visibility (`alpha`) share the same lifetime clock
 * but use different curves: the shaft keeps translating upward while opacity
 * fades for a substantial portion of the life. Disappearance is NOT driven
 * by top clipping / overflow.
 *
 * Length is fixed — the streak does NOT grow downward from a fixed center.
 */
export function sampleRisingLightStreak(
  streak: RisingLightStreak,
  elapsedMs: number,
): RisingLightStreakSample {
  const local = elapsedMs - streak.delayMs
  if (local < 0) {
    return {
      leadY: streak.startLeadY,
      trailY: streak.startLeadY + streak.length,
      alpha: 0,
      visible: false,
    }
  }

  const life = Math.max(streak.lifeMs, 1)
  if (local >= life) {
    return {
      leadY: streak.startLeadY - streak.travel,
      trailY: streak.startLeadY - streak.travel + streak.length,
      alpha: 0,
      visible: false,
    }
  }

  const t = local / life

  // Motion: continues for the full lifetime (independent of fade).
  const moveT = 1 - (1 - t) * (1 - t)
  const leadY = streak.startLeadY - streak.travel * moveT
  const trailY = leadY + streak.length

  // Visibility: quick appear → hold → long gradual dissolve while still rising.
  const fadeIn = smoothstep(0, 0.12, t)
  const fadeStart = clamp(streak.fadeStart, 0.2, 0.7)
  let fadeOut = 1
  if (t > fadeStart) {
    // Long soft fade across the remaining life (not a last-frame pop).
    const u = (t - fadeStart) / Math.max(1 - fadeStart, 1e-4)
    fadeOut = 1 - smoothstep(0, 1, u)
    // Gentle late tail so remnants dissolve rather than snap off.
    fadeOut *= 1 - u * 0.15
  }
  const alpha = Math.max(0, fadeIn * fadeOut)

  return {
    leadY,
    trailY,
    alpha,
    visible: alpha > 0.01,
  }
}

/**
 * Builds the deterministic narrow-streak table for one run.
 *
 * - Widths biased thin (most near min).
 * - Start Y in lower / lower-middle region.
 * - Outer |x| streaks appear later (center-out population).
 * - Entire body translates upward via `travel` — no vertical scale-about-center.
 */
export function buildRisingLightStreaks(
  options: ResolvedRisingLightColumnsOptions,
  seed: number = options.seed,
): RisingLightStreak[] {
  const count = options.streakCount
  const halfW = options.width * 0.5
  const halfH = options.height * 0.5
  const widthSpan = Math.max(options.maxStreakWidth - options.minStreakWidth, 0)
  const lengthSpan = Math.max(
    options.maxStreakLength - options.minStreakLength,
    0,
  )
  const baseTravel = options.travelDistance
  const duration = Math.max(options.duration, 1)
  const streaks: RisingLightStreak[] = []

  for (let i = 0; i < count; i += 1) {
    // Irregular horizontal placement with mild center preference early,
    // but still covering most of the width across the set.
    const side = risingLightHash01(seed, i * 23 + 1) < 0.5 ? -1 : 1
    const lateral = Math.pow(risingLightHash01(seed, i * 23 + 2), 0.65)
    const x = side * lateral * (halfW - 6)

    // Mild thin bias — still mostly near min, but readable cores.
    const wT = risingLightHash01(seed, i * 23 + 3)
    const coreWidth =
      options.minStreakWidth + wT * wT * 0.85 * widthSpan + wT * 0.15 * widthSpan

    const length =
      options.minStreakLength +
      risingLightHash01(seed, i * 23 + 4) * lengthSpan

    // Lower / lower-middle: lead tip starts in the lower half.
    const startLeadY =
      halfH * (0.08 + risingLightHash01(seed, i * 23 + 5) * 0.42)

    const brightness = 0.55 + risingLightHash01(seed, i * 23 + 6) * 0.45

    // Compact stagger so fewer streaks still overlap in time.
    // Outer streaks appear slightly later (center-out population).
    const lateralNorm = Math.min(Math.abs(x) / Math.max(halfW, 1), 1)
    const delayMs =
      (0.02 + lateralNorm * 0.14 + risingLightHash01(seed, i * 23 + 7) * 0.08) *
      duration

    // Long lives relative to delay → several coexist while rising/fading.
    let lifeMs =
      (0.58 + risingLightHash01(seed, i * 23 + 8) * 0.32) * duration
    lifeMs = Math.min(lifeMs, Math.max(duration - delayMs, duration * 0.4))

    const travel =
      baseTravel * (0.82 + risingLightHash01(seed, i * 23 + 9) * 0.28)

    // Fade begins mid-life so a large share of the lifetime is dissolve-while-rising.
    const fadeStart =
      0.35 + risingLightHash01(seed, i * 23 + 10) * 0.17

    streaks.push({
      x,
      startLeadY,
      length,
      coreWidth,
      brightness,
      delayMs,
      lifeMs,
      travel,
      fadeStart,
    })
  }

  return streaks
}

export function resolveRisingLightColumnsOptions(
  options: RisingLightColumnsOptions | undefined,
): ResolvedRisingLightColumnsOptions {
  const raw = options ?? {}
  const width = clamp(
    raw.width ?? RISING_LIGHT_COLUMNS_DEFAULTS.width,
    1,
    4096,
  )
  const height = clamp(
    raw.height ?? RISING_LIGHT_COLUMNS_DEFAULTS.height,
    1,
    4096,
  )
  const position: RisingLightColumnsPosition =
    raw.position === 'back' ? 'back' : 'front'

  let minStreakWidth = clamp(
    raw.minStreakWidth ?? RISING_LIGHT_COLUMNS_DEFAULTS.minStreakWidth,
    0.4,
    12,
  )
  let maxStreakWidth = clamp(
    raw.maxStreakWidth ?? RISING_LIGHT_COLUMNS_DEFAULTS.maxStreakWidth,
    0.4,
    12,
  )
  if (maxStreakWidth < minStreakWidth) {
    const swap = minStreakWidth
    minStreakWidth = maxStreakWidth
    maxStreakWidth = swap
  }

  // Prefer height-relative lengths so long trails scale with the target.
  let minStreakLength = clamp(
    raw.minStreakLength ?? Math.max(height * 0.42, 80),
    12,
    2048,
  )
  let maxStreakLength = clamp(
    raw.maxStreakLength ?? Math.max(height * 0.68, minStreakLength),
    12,
    2048,
  )
  if (maxStreakLength < minStreakLength) {
    const swap = minStreakLength
    minStreakLength = maxStreakLength
    maxStreakLength = swap
  }

  return {
    width,
    height,
    color: (raw.color ?? RISING_LIGHT_COLUMNS_DEFAULTS.color) >>> 0,
    intensity: clamp(
      raw.intensity ?? RISING_LIGHT_COLUMNS_DEFAULTS.intensity,
      0,
      2,
    ),
    opacity: clamp01(raw.opacity ?? RISING_LIGHT_COLUMNS_DEFAULTS.opacity),
    duration: clamp(
      raw.duration ?? RISING_LIGHT_COLUMNS_DEFAULTS.duration,
      400,
      12_000,
    ),
    streakCount: Math.floor(
      clamp(
        raw.streakCount ?? RISING_LIGHT_COLUMNS_DEFAULTS.streakCount,
        4,
        48,
      ),
    ),
    minStreakWidth,
    maxStreakWidth,
    minStreakLength,
    maxStreakLength,
    travelDistance: clamp(
      raw.travelDistance ?? Math.max(height * 0.95, 120),
      40,
      4096,
    ),
    topOverflow: clamp(
      raw.topOverflow ?? RISING_LIGHT_COLUMNS_DEFAULTS.topOverflow,
      0,
      256,
    ),
    glowIntensity: clamp(
      raw.glowIntensity ?? RISING_LIGHT_COLUMNS_DEFAULTS.glowIntensity,
      0,
      1.5,
    ),
    seed: Math.floor(
      clamp(raw.seed ?? RISING_LIGHT_COLUMNS_DEFAULTS.seed, 0, 1e9),
    ),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : RISING_LIGHT_COLUMNS_DEFAULTS.blendMode,
  }
}
