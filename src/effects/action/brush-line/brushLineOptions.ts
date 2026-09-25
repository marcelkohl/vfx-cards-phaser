import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type BrushLinePosition = 'back' | 'front'

export interface BrushLineOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Sweep tint as 0xRRGGBB. Default electric cyan. */
  color?: number
  /** Peak brightness multiplier (0..3). Default 1.2. */
  intensity?: number
  /** Global opacity multiplier (0..1). Default 0.95. */
  opacity?: number
  /**
   * Time for the leading front to travel bottom → top, in milliseconds.
   * Default 950.
   */
  duration?: number
  /**
   * Residual trail fade after the front reaches the top, in milliseconds.
   * Default 380. Total lifetime = duration + fadeOutDuration.
   */
  fadeOutDuration?: number
  /** Half-height of the bright horizontal core in pixels. Default 1.4. */
  lineWidth?: number
  /** Extra brightness on the leading edge (0..3). Default 1.55. */
  lineIntensity?: number
  /** Soft bloom radius around the leading edge in pixels. Default 20. */
  glowWidth?: number
  /** Number of vertical brush trails. Default 28. */
  trailCount?: number
  /** Shortest trail length in pixels. Default 55. */
  minTrailLength?: number
  /** Longest trail length in pixels. Default 280. */
  maxTrailLength?: number
  /** Thinnest trail half-width in pixels. Default 0.9. */
  minTrailWidth?: number
  /** Thickest trail half-width in pixels. Default 7.5. */
  maxTrailWidth?: number
  /** Relative trail brightness vs the leading edge (0..2). Default 0.85. */
  trailIntensity?: number
  /**
   * Deterministic seed. Same seed + options → same brush pattern.
   * Default 1.
   */
  seed?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over artwork (default). `back` = behind.
   */
  position?: BrushLinePosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedBrushLineOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  intensity: number
  opacity: number
  duration: number
  fadeOutDuration: number
  /** Derived: duration + fadeOutDuration. */
  totalDuration: number
  lineWidth: number
  lineIntensity: number
  glowWidth: number
  trailCount: number
  minTrailLength: number
  maxTrailLength: number
  minTrailWidth: number
  maxTrailWidth: number
  trailIntensity: number
  seed: number
  position: BrushLinePosition
  blendMode: number
}

export interface BrushLineTrail {
  /** Local X center (0 = card center). */
  x: number
  /** Half-width of the soft trail core. */
  halfWidth: number
  /** How far the trail extends behind the front. */
  length: number
  /** Relative brightness 0..1. */
  brightness: number
  /** Softness of the trail edge (0 = sharper, 1 = softer). */
  softness: number
}

export interface BrushLineSample {
  /** Normalized progress of the full run (0..1) for onProgress. */
  progress: number
  /** Front travel 0..1 (holds at 1 during residual fade-out). */
  scanT: number
  /** Global opacity envelope. */
  strength: number
  /** Leading-edge visibility (fades during residual). */
  frontStrength: number
  finished: boolean
}

const BLEND_ADD = 1

/** Soft outer bloom / trail spill beyond the frame. */
export const BRUSH_LINE_OUTER_PAD = 14

export const BRUSH_LINE_DEFAULTS: ResolvedBrushLineOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0x4ec8ff,
  intensity: 1.2,
  opacity: 0.95,
  duration: 950,
  fadeOutDuration: 380,
  totalDuration: 1330,
  lineWidth: 1.4,
  lineIntensity: 1.55,
  glowWidth: 20,
  trailCount: 28,
  minTrailLength: 55,
  maxTrailLength: 280,
  minTrailWidth: 0.9,
  maxTrailWidth: 7.5,
  trailIntensity: 0.85,
  seed: 1,
  position: 'front',
  blendMode: BLEND_ADD,
}

/**
 * Deterministic pseudo-random in [0, 1) from integer seeds.
 * Same formula family as Streak Burst / Ambient Sparkles.
 */
export function brushHash01(seed: number, salt: number): number {
  let n = (seed * 374761393 + salt * 668265263) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n >>> 0) % 10_000) / 10_000
}

export function getBrushLineDurationMs(
  options: ResolvedBrushLineOptions,
): number {
  return Math.max(options.totalDuration, 1)
}

/**
 * Samples one `run()` pass.
 * Front travels during `duration`; residual trails fade during `fadeOutDuration`.
 */
export function sampleBrushLineEnvelope(
  elapsedMs: number,
  options: ResolvedBrushLineOptions,
): BrushLineSample {
  const sweep = Math.max(options.duration, 1)
  const fadeOut = Math.max(options.fadeOutDuration, 0)
  const total = Math.max(sweep + fadeOut, 1)

  if (elapsedMs <= 0) {
    return {
      progress: 0,
      scanT: 0,
      strength: 0,
      frontStrength: 0,
      finished: false,
    }
  }

  if (elapsedMs >= total) {
    return {
      progress: 1,
      scanT: 1,
      strength: 0,
      frontStrength: 0,
      finished: true,
    }
  }

  const progress = elapsedMs / total
  const scanT = Math.min(elapsedMs / sweep, 1)
  const fadeIn = Math.min(70, sweep * 0.09)

  let strength: number
  if (elapsedMs < fadeIn) {
    const t = fadeIn <= 0 ? 1 : elapsedMs / fadeIn
    strength = t * t * (3 - 2 * t)
  } else if (elapsedMs <= sweep) {
    strength = 1
  } else {
    const outT = fadeOut <= 0 ? 1 : (elapsedMs - sweep) / fadeOut
    const t = clamp01(outT)
    strength = (1 - t) * (1 - t)
  }

  const frontStrength =
    elapsedMs <= sweep
      ? strength
      : strength * Math.pow(clamp01(1 - (elapsedMs - sweep) / Math.max(fadeOut, 1)), 1.35)

  return {
    progress,
    scanT,
    strength,
    frontStrength: Math.max(0, frontStrength),
    finished: false,
  }
}

/**
 * Builds the deterministic vertical brush layout for one run.
 * Trails are irregular in x / width / length / brightness — not a barcode.
 */
export function buildBrushLineTrails(
  options: ResolvedBrushLineOptions,
  seed: number = options.seed,
): BrushLineTrail[] {
  const count = options.trailCount
  const halfW = options.width * 0.5
  const lengthSpan = Math.max(options.maxTrailLength - options.minTrailLength, 0)
  const widthSpan = Math.max(options.maxTrailWidth - options.minTrailWidth, 0)
  const trails: BrushLineTrail[] = []

  for (let i = 0; i < count; i += 1) {
    // Uneven horizontal distribution — cluster some, leave gaps.
    const slot = brushHash01(seed, i * 17 + 1)
    const jitter = (brushHash01(seed, i * 17 + 2) - 0.5) * 0.12
    const xNorm = clamp01(slot + jitter)
    const x = (xNorm - 0.5) * 2 * (halfW - 4)

    const length =
      options.minTrailLength + brushHash01(seed, i * 17 + 3) * lengthSpan
    const halfWidth =
      options.minTrailWidth + brushHash01(seed, i * 17 + 4) * widthSpan
    const brightness = 0.35 + brushHash01(seed, i * 17 + 5) * 0.65
    const softness = 0.35 + brushHash01(seed, i * 17 + 6) * 0.55

    trails.push({ x, halfWidth, length, brightness, softness })
  }

  return trails
}

export function resolveBrushLineOptions(
  options: BrushLineOptions | undefined,
): ResolvedBrushLineOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? BRUSH_LINE_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? BRUSH_LINE_DEFAULTS.height, 1, 4096)
  const position: BrushLinePosition =
    raw.position === 'back' ? 'back' : 'front'

  const duration = clamp(
    raw.duration ?? BRUSH_LINE_DEFAULTS.duration,
    200,
    12_000,
  )
  const fadeOutDuration = clamp(
    raw.fadeOutDuration ?? BRUSH_LINE_DEFAULTS.fadeOutDuration,
    0,
    8_000,
  )

  let minTrailLength = clamp(
    raw.minTrailLength ?? BRUSH_LINE_DEFAULTS.minTrailLength,
    8,
    2048,
  )
  let maxTrailLength = clamp(
    raw.maxTrailLength ?? Math.max(height * 0.92, minTrailLength),
    8,
    2048,
  )
  if (maxTrailLength < minTrailLength) {
    const swap = minTrailLength
    minTrailLength = maxTrailLength
    maxTrailLength = swap
  }

  let minTrailWidth = clamp(
    raw.minTrailWidth ?? BRUSH_LINE_DEFAULTS.minTrailWidth,
    0.3,
    48,
  )
  let maxTrailWidth = clamp(
    raw.maxTrailWidth ?? BRUSH_LINE_DEFAULTS.maxTrailWidth,
    0.3,
    48,
  )
  if (maxTrailWidth < minTrailWidth) {
    const swap = minTrailWidth
    minTrailWidth = maxTrailWidth
    maxTrailWidth = swap
  }

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? BRUSH_LINE_DEFAULTS.cornerRadius),
      width,
      height,
      0,
    ),
    color: (raw.color ?? BRUSH_LINE_DEFAULTS.color) >>> 0,
    intensity: clamp(raw.intensity ?? BRUSH_LINE_DEFAULTS.intensity, 0, 3),
    opacity: clamp01(raw.opacity ?? BRUSH_LINE_DEFAULTS.opacity),
    duration,
    fadeOutDuration,
    totalDuration: Math.max(duration + fadeOutDuration, 1),
    lineWidth: clamp(
      raw.lineWidth ?? BRUSH_LINE_DEFAULTS.lineWidth,
      0.4,
      24,
    ),
    lineIntensity: clamp(
      raw.lineIntensity ?? BRUSH_LINE_DEFAULTS.lineIntensity,
      0,
      3,
    ),
    glowWidth: clamp(
      raw.glowWidth ?? BRUSH_LINE_DEFAULTS.glowWidth,
      2,
      128,
    ),
    trailCount: Math.floor(
      clamp(raw.trailCount ?? BRUSH_LINE_DEFAULTS.trailCount, 4, 40),
    ),
    minTrailLength,
    maxTrailLength,
    minTrailWidth,
    maxTrailWidth,
    trailIntensity: clamp(
      raw.trailIntensity ?? BRUSH_LINE_DEFAULTS.trailIntensity,
      0,
      2,
    ),
    seed: Math.floor(clamp(raw.seed ?? BRUSH_LINE_DEFAULTS.seed, 0, 1e9)),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : BRUSH_LINE_DEFAULTS.blendMode,
  }
}
