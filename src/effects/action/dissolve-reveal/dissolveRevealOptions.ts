import {
  clamp,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export interface DissolveRevealOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Total reveal duration in milliseconds. Default 920. */
  duration?: number
  /** Luminous boundary color as 0xRRGGBB. Default cool white. */
  edgeColor?: number
  /** Brightness of the dissolve edge (0..3). Default 1.35. */
  edgeIntensity?: number
  /**
   * Soft width of the glowing boundary in noise-space (0.01..0.25).
   * Default 0.07.
   */
  edgeWidth?: number
  /**
   * Spatial frequency of the dissolve noise (higher = finer islands).
   * Default 4.2.
   */
  noiseScale?: number
  /**
   * How strongly center / borders / corners desync the reveal (0..1).
   * Default 0.55.
   */
  variation?: number
  /**
   * Integer seed for a stable pattern. Same seed → same dissolve map.
   * Default 1. Omit / change for a different pattern.
   */
  seed?: number
  /**
   * Fill color of the still-hidden (unrevealed) area as 0xRRGGBB.
   * Default near-black (`0x050508`) — set this to match your scene/UI.
   */
  coverColor?: number
  /**
   * Opacity of the unrevealed fill (0..1). Default 1 (fully opaque).
   */
  coverOpacity?: number
}

/** Alias matching the public package naming request. */
export type DissolveRevealEffectOptions = DissolveRevealOptions

export interface ResolvedDissolveRevealOptions {
  width: number
  height: number
  cornerRadius: number
  duration: number
  edgeColor: number
  edgeIntensity: number
  edgeWidth: number
  noiseScale: number
  variation: number
  seed: number
  coverColor: number
  coverOpacity: number
}

export const DISSOLVE_REVEAL_DEFAULTS: ResolvedDissolveRevealOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  duration: 920,
  edgeColor: 0xc8fff4,
  edgeIntensity: 1.35,
  edgeWidth: 0.07,
  noiseScale: 4.2,
  variation: 0.55,
  seed: 1,
  coverColor: 0x050508,
  coverOpacity: 1,
}

/**
 * Progress 0 = fully covered (hidden), 1 = fully revealed.
 * Ease-in-out so early islands appear deliberately, then connect.
 */
export function sampleDissolveProgress(
  elapsedMs: number,
  durationMs: number,
): { progress: number; finished: boolean } {
  const duration = Math.max(durationMs, 1)
  if (elapsedMs >= duration) {
    return { progress: 1, finished: true }
  }

  const t = clamp(elapsedMs / duration, 0, 1)
  // Smoothstep² — slow start, faster mid connection, soft finish.
  const s = t * t * (3 - 2 * t)
  const eased = s * s * (3 - 2 * s)
  return { progress: eased, finished: false }
}

export function resolveDissolveRevealOptions(
  options: DissolveRevealOptions | undefined,
): ResolvedDissolveRevealOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? DISSOLVE_REVEAL_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? DISSOLVE_REVEAL_DEFAULTS.height, 1, 4096)

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? DISSOLVE_REVEAL_DEFAULTS.cornerRadius),
      width,
      height,
      0,
    ),
    duration: clamp(
      raw.duration ?? DISSOLVE_REVEAL_DEFAULTS.duration,
      120,
      20_000,
    ),
    edgeColor: (raw.edgeColor ?? DISSOLVE_REVEAL_DEFAULTS.edgeColor) >>> 0,
    edgeIntensity: clamp(
      raw.edgeIntensity ?? DISSOLVE_REVEAL_DEFAULTS.edgeIntensity,
      0,
      3,
    ),
    edgeWidth: clamp(
      raw.edgeWidth ?? DISSOLVE_REVEAL_DEFAULTS.edgeWidth,
      0.01,
      0.25,
    ),
    noiseScale: clamp(
      raw.noiseScale ?? DISSOLVE_REVEAL_DEFAULTS.noiseScale,
      0.5,
      24,
    ),
    variation: clamp(
      raw.variation ?? DISSOLVE_REVEAL_DEFAULTS.variation,
      0,
      1,
    ),
    seed: Math.floor(
      clamp(raw.seed ?? DISSOLVE_REVEAL_DEFAULTS.seed, 0, 1_000_000),
    ),
    coverColor: (raw.coverColor ?? DISSOLVE_REVEAL_DEFAULTS.coverColor) >>> 0,
    coverOpacity: clamp(
      raw.coverOpacity ?? DISSOLVE_REVEAL_DEFAULTS.coverOpacity,
      0,
      1,
    ),
  }
}
