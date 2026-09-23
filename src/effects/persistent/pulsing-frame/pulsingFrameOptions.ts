import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type PulsingFramePosition = 'back' | 'front'

export interface PulsingFrameOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Frame tint as 0xRRGGBB. Default cool cyan. */
  color?: number
  /** Peak brightness multiplier (0..2). Default 1. */
  intensity?: number
  /** Global opacity multiplier (0..1). Default 1. */
  opacity?: number
  /**
   * Normalized luminous strength at the pulse low (0..1).
   * Applied before intensity/opacity. Default 0.16 — still visible, calm.
   */
  minOpacity?: number
  /**
   * Normalized luminous strength at the pulse high (0..1).
   * Applied before intensity/opacity. Default 1.
   */
  maxOpacity?: number
  /** Bright core stroke thickness in pixels. Default 2.4. */
  frameWidth?: number
  /**
   * Inward soft-illumination distance in pixels (from contour toward center).
   * Default 26. Exterior glow is not produced.
   */
  glowWidth?: number
  /** Inward glow strength relative to the core (0..2). Default 0.95. */
  glowIntensity?: number
  /** Time to rise from low → high (ms). Default 900. */
  fadeInDuration?: number
  /** Time to fall from high → low (ms). Default 1100. */
  fadeOutDuration?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over the card (default). `back` = behind artwork.
   */
  position?: PulsingFramePosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedPulsingFrameOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  intensity: number
  opacity: number
  minOpacity: number
  maxOpacity: number
  frameWidth: number
  glowWidth: number
  glowIntensity: number
  fadeInDuration: number
  fadeOutDuration: number
  position: PulsingFramePosition
  blendMode: number
}

const BLEND_ADD = 1

export const PULSING_FRAME_DEFAULTS: ResolvedPulsingFrameOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0x4ec8ff,
  intensity: 1.15,
  opacity: 1,
  minOpacity: 0.16,
  maxOpacity: 1,
  frameWidth: 2.4,
  glowWidth: 26,
  glowIntensity: 0.95,
  fadeInDuration: 900,
  fadeOutDuration: 1100,
  position: 'front',
  blendMode: BLEND_ADD,
}

function smoothstep(t: number): number {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

/**
 * One continuous breathing cycle: LOW → HIGH → LOW.
 * Returns normalized 0..1 envelope (0 = minOpacity, 1 = maxOpacity).
 */
export function samplePulsingFrameEnvelope(
  elapsedMs: number,
  options: ResolvedPulsingFrameOptions,
): number {
  const rise = Math.max(options.fadeInDuration, 1)
  const fall = Math.max(options.fadeOutDuration, 1)
  const cycle = rise + fall
  const t = ((elapsedMs % cycle) + cycle) % cycle

  if (t < rise) {
    return smoothstep(t / rise)
  }
  return 1 - smoothstep((t - rise) / fall)
}

/** Maps envelope 0..1 into absolute opacity before intensity. */
export function samplePulsingFrameStrength(
  elapsedMs: number,
  options: ResolvedPulsingFrameOptions,
): number {
  const u = samplePulsingFrameEnvelope(elapsedMs, options)
  const lo = options.minOpacity
  const hi = Math.max(options.maxOpacity, lo)
  return lo + (hi - lo) * u
}

export function resolvePulsingFrameOptions(
  options: PulsingFrameOptions | undefined,
): ResolvedPulsingFrameOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? PULSING_FRAME_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? PULSING_FRAME_DEFAULTS.height, 1, 4096)
  const minOpacity = clamp01(
    raw.minOpacity ?? PULSING_FRAME_DEFAULTS.minOpacity,
  )
  const maxOpacity = clamp(
    raw.maxOpacity ?? PULSING_FRAME_DEFAULTS.maxOpacity,
    minOpacity,
    1,
  )
  const position: PulsingFramePosition =
    raw.position === 'back' ? 'back' : 'front'

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? PULSING_FRAME_DEFAULTS.cornerRadius),
      width,
      height,
    ),
    color: (raw.color ?? PULSING_FRAME_DEFAULTS.color) >>> 0,
    intensity: clamp(
      raw.intensity ?? PULSING_FRAME_DEFAULTS.intensity,
      0,
      2,
    ),
    opacity: clamp01(raw.opacity ?? PULSING_FRAME_DEFAULTS.opacity),
    minOpacity,
    maxOpacity,
    frameWidth: clamp(
      raw.frameWidth ?? PULSING_FRAME_DEFAULTS.frameWidth,
      0.5,
      32,
    ),
    glowWidth: clamp(
      raw.glowWidth ?? PULSING_FRAME_DEFAULTS.glowWidth,
      0,
      64,
    ),
    glowIntensity: clamp(
      raw.glowIntensity ?? PULSING_FRAME_DEFAULTS.glowIntensity,
      0,
      2,
    ),
    fadeInDuration: clamp(
      raw.fadeInDuration ?? PULSING_FRAME_DEFAULTS.fadeInDuration,
      40,
      60_000,
    ),
    fadeOutDuration: clamp(
      raw.fadeOutDuration ?? PULSING_FRAME_DEFAULTS.fadeOutDuration,
      40,
      60_000,
    ),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : PULSING_FRAME_DEFAULTS.blendMode,
  }
}
