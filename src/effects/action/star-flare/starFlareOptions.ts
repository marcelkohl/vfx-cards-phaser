import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
} from '../../../core/effectConfig'

export type StarFlareLayerPosition = 'back' | 'front'

export interface StarFlareOptions {
  /** Target frame width in local pixels (used for normalized positioning). */
  width?: number
  /** Target frame height in local pixels (used for normalized positioning). */
  height?: number
  /** Flare tint as 0xRRGGBB. Default warm white. */
  color?: number
  /** Peak brightness multiplier (0..3). Default 1.15. */
  intensity?: number
  /** Final alpha multiplier at peak (0..1). Default 0.95. */
  opacity?: number
  /**
   * Full tip-to-tip length of the horizontal luminous streak, in pixels.
   * Default 400 (~1.8× default width — extends well beyond the target).
   */
  horizontalLength?: number
  /**
   * Full tip-to-tip length of the vertical luminous streak, in pixels.
   * Default 380 (~1.2× default height).
   */
  verticalLength?: number
  /**
   * Soft thickness of the horizontal streak near the center, in pixels.
   * Default 16.
   */
  horizontalThickness?: number
  /**
   * Soft thickness of the vertical streak near the center, in pixels.
   * Default 11.
   */
  verticalThickness?: number
  /**
   * Soft central halo radius in pixels. Also drives the bright core size.
   * Default 34.
   */
  glowRadius?: number
  /**
   * Normalized horizontal position on the target (0 = left, 0.5 = center, 1 = right).
   * Default 0.5.
   */
  positionX?: number
  /**
   * Normalized vertical position on the target (0 = top, 0.5 = center, 1 = bottom).
   * Default 0.5.
   */
  positionY?: number
  /** Time to ramp from invisible to peak, in milliseconds. Default 50. */
  fadeInDuration?: number
  /** Time held near peak before fade-out, in milliseconds. Default 60. */
  holdDuration?: number
  /** Time to fade from peak to invisible, in milliseconds. Default 400. */
  fadeOutDuration?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over artwork (default). `back` = behind.
   */
  position?: StarFlareLayerPosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedStarFlareOptions {
  width: number
  height: number
  color: number
  intensity: number
  opacity: number
  horizontalLength: number
  verticalLength: number
  horizontalThickness: number
  verticalThickness: number
  glowRadius: number
  positionX: number
  positionY: number
  fadeInDuration: number
  holdDuration: number
  fadeOutDuration: number
  position: StarFlareLayerPosition
  blendMode: number
}

const BLEND_ADD = 1

export const STAR_FLARE_DEFAULTS: ResolvedStarFlareOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  color: 0xfff4dd,
  intensity: 1.15,
  opacity: 0.95,
  horizontalLength: 400,
  verticalLength: 380,
  horizontalThickness: 16,
  verticalThickness: 11,
  glowRadius: 34,
  positionX: 0.5,
  positionY: 0.5,
  fadeInDuration: 50,
  holdDuration: 60,
  fadeOutDuration: 400,
  position: 'front',
  blendMode: BLEND_ADD,
}

export function getStarFlareDurationMs(
  options: ResolvedStarFlareOptions,
): number {
  return Math.max(
    options.fadeInDuration + options.holdDuration + options.fadeOutDuration,
    1,
  )
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

export interface StarFlareSample {
  /** Normalized opacity envelope (0..1) before intensity/opacity. */
  strength: number
  /**
   * Ray length growth factor (0..1).
   * Grows subtly during fade-in; full during hold/fade-out.
   */
  rayGrowth: number
  finished: boolean
}

/**
 * Samples one flare: fade-in → hold → fade-out.
 * Starts and ends at strength 0 — never jumps to full intensity.
 * `rayGrowth` rises with fade-in so rays subtly extend without exploding.
 */
export function sampleStarFlareEnvelope(
  elapsedMs: number,
  options: ResolvedStarFlareOptions,
): StarFlareSample {
  const fadeIn = Math.max(options.fadeInDuration, 0)
  const hold = Math.max(options.holdDuration, 0)
  const fadeOut = Math.max(options.fadeOutDuration, 0)
  const total = Math.max(fadeIn + hold + fadeOut, 1)

  if (elapsedMs <= 0) {
    return { strength: 0, rayGrowth: 0.55, finished: false }
  }

  if (elapsedMs >= total) {
    return { strength: 0, rayGrowth: 1, finished: true }
  }

  if (elapsedMs < fadeIn) {
    if (fadeIn <= 0) {
      return { strength: 1, rayGrowth: 1, finished: false }
    }
    const t = smoothstep(elapsedMs / fadeIn)
    // Subtle growth: start ~55% length → full by end of fade-in.
    return { strength: t, rayGrowth: 0.55 + 0.45 * t, finished: false }
  }

  if (elapsedMs < fadeIn + hold) {
    return { strength: 1, rayGrowth: 1, finished: false }
  }

  const outT = fadeOut <= 0 ? 1 : (elapsedMs - fadeIn - hold) / fadeOut
  const strength = 1 - smoothstep(outT)
  return { strength, rayGrowth: 1, finished: false }
}

/** Local-space offset from target center for the configured normalized position. */
export function starFlareLocalOffset(
  options: ResolvedStarFlareOptions,
): { x: number; y: number } {
  return {
    x: (options.positionX - 0.5) * options.width,
    y: (options.positionY - 0.5) * options.height,
  }
}

export function resolveStarFlareOptions(
  options: StarFlareOptions | undefined,
): ResolvedStarFlareOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? STAR_FLARE_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? STAR_FLARE_DEFAULTS.height, 1, 4096)
  const position: StarFlareLayerPosition =
    raw.position === 'back' ? 'back' : 'front'

  return {
    width,
    height,
    color: (raw.color ?? STAR_FLARE_DEFAULTS.color) >>> 0,
    intensity: clamp(raw.intensity ?? STAR_FLARE_DEFAULTS.intensity, 0, 3),
    opacity: clamp01(raw.opacity ?? STAR_FLARE_DEFAULTS.opacity),
    horizontalLength: clamp(
      raw.horizontalLength ?? STAR_FLARE_DEFAULTS.horizontalLength,
      8,
      4096,
    ),
    verticalLength: clamp(
      raw.verticalLength ?? STAR_FLARE_DEFAULTS.verticalLength,
      8,
      4096,
    ),
    horizontalThickness: clamp(
      raw.horizontalThickness ?? STAR_FLARE_DEFAULTS.horizontalThickness,
      0.5,
      256,
    ),
    verticalThickness: clamp(
      raw.verticalThickness ?? STAR_FLARE_DEFAULTS.verticalThickness,
      0.5,
      256,
    ),
    glowRadius: clamp(
      raw.glowRadius ?? STAR_FLARE_DEFAULTS.glowRadius,
      2,
      512,
    ),
    positionX: clamp01(raw.positionX ?? STAR_FLARE_DEFAULTS.positionX),
    positionY: clamp01(raw.positionY ?? STAR_FLARE_DEFAULTS.positionY),
    fadeInDuration: clamp(
      raw.fadeInDuration ?? STAR_FLARE_DEFAULTS.fadeInDuration,
      0,
      8_000,
    ),
    holdDuration: clamp(
      raw.holdDuration ?? STAR_FLARE_DEFAULTS.holdDuration,
      0,
      8_000,
    ),
    fadeOutDuration: clamp(
      raw.fadeOutDuration ?? STAR_FLARE_DEFAULTS.fadeOutDuration,
      0,
      12_000,
    ),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : STAR_FLARE_DEFAULTS.blendMode,
  }
}
