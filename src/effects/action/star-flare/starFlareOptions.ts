import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
} from '../../../core/effectConfig'

export type StarFlareLayerPosition = 'back' | 'front'

/** How Star Flare scale evolves relative to opacity. Local to this effect. */
export type StarFlareScaleMode = 'return' | 'continuous'

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
   * Default 12.
   */
  horizontalThickness?: number
  /**
   * Soft thickness of the vertical streak near the center, in pixels.
   * Default 8.
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
   * How visual scale evolves relative to opacity.
   * - `return` (default): startScale → peakScale → endScale with opacity phases
   * - `continuous`: startScale → endScale over the full lifetime (never reverses)
   */
  scaleMode?: StarFlareScaleMode
  /** Scale at t=0. Default 0.55 (historical subtle grow-in). */
  startScale?: number
  /** Scale at opacity peak / hold (`return` mode). Default 1. */
  peakScale?: number
  /**
   * Scale at the end of the animation.
   * Default 1 (historical: stays full size during fade-out).
   */
  endScale?: number
  /**
   * Normalized progress (0..1) where opacity reaches its peak (start of hold).
   * When set, redistributes fade-in/fade-out while preserving hold and total duration.
   * When omitted, `fadeInDuration` / `holdDuration` / `fadeOutDuration` are used as given.
   */
  peakAt?: number
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
  scaleMode: StarFlareScaleMode
  startScale: number
  peakScale: number
  endScale: number
  peakAt: number
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
  horizontalThickness: 12,
  verticalThickness: 8,
  glowRadius: 34,
  positionX: 0.5,
  positionY: 0.5,
  fadeInDuration: 50,
  holdDuration: 60,
  fadeOutDuration: 400,
  scaleMode: 'return',
  startScale: 0.55,
  peakScale: 1,
  endScale: 1,
  peakAt: 50 / (50 + 60 + 400),
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
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export interface StarFlareSample {
  /** Normalized opacity envelope (0..1) before intensity/opacity. */
  strength: number
  /** Visual scale for the whole flare (star, halo, both rays). */
  scale: number
  finished: boolean
}

/**
 * Samples one flare. Opacity uses fade-in → hold → fade-out.
 * Scale is independent and follows `scaleMode`.
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
    return { strength: 0, scale: options.startScale, finished: false }
  }

  if (elapsedMs >= total) {
    return { strength: 0, scale: options.endScale, finished: true }
  }

  const strength = sampleStarFlareOpacity(elapsedMs, fadeIn, hold, fadeOut)
  const scale = sampleStarFlareScale(
    elapsedMs,
    fadeIn,
    hold,
    fadeOut,
    total,
    options,
  )
  return { strength, scale, finished: false }
}

function sampleStarFlareOpacity(
  elapsedMs: number,
  fadeIn: number,
  hold: number,
  fadeOut: number,
): number {
  if (elapsedMs < fadeIn) {
    if (fadeIn <= 0) {
      return 1
    }
    return smoothstep(elapsedMs / fadeIn)
  }

  if (elapsedMs < fadeIn + hold) {
    return 1
  }

  const outT = fadeOut <= 0 ? 1 : (elapsedMs - fadeIn - hold) / fadeOut
  return 1 - smoothstep(outT)
}

function sampleStarFlareScale(
  elapsedMs: number,
  fadeIn: number,
  hold: number,
  fadeOut: number,
  total: number,
  options: ResolvedStarFlareOptions,
): number {
  if (options.scaleMode === 'continuous') {
    // Full-lifetime expansion — never pauses during hold, never reverses.
    return lerp(
      options.startScale,
      options.endScale,
      smoothstep(elapsedMs / total),
    )
  }

  // return: grow to peak with fade-in, hold, then ease toward endScale
  if (elapsedMs < fadeIn) {
    if (fadeIn <= 0) {
      return options.peakScale
    }
    return lerp(
      options.startScale,
      options.peakScale,
      smoothstep(elapsedMs / fadeIn),
    )
  }

  if (elapsedMs < fadeIn + hold) {
    return options.peakScale
  }

  if (fadeOut <= 0) {
    return options.endScale
  }

  const outT = (elapsedMs - fadeIn - hold) / fadeOut
  return lerp(options.peakScale, options.endScale, smoothstep(outT))
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

  let fadeInDuration = clamp(
    raw.fadeInDuration ?? STAR_FLARE_DEFAULTS.fadeInDuration,
    0,
    8_000,
  )
  let holdDuration = clamp(
    raw.holdDuration ?? STAR_FLARE_DEFAULTS.holdDuration,
    0,
    8_000,
  )
  let fadeOutDuration = clamp(
    raw.fadeOutDuration ?? STAR_FLARE_DEFAULTS.fadeOutDuration,
    0,
    12_000,
  )

  let peakAt: number
  if (raw.peakAt != null && Number.isFinite(raw.peakAt)) {
    peakAt = clamp01(raw.peakAt)
    const total = Math.max(fadeInDuration + holdDuration + fadeOutDuration, 1)
    fadeInDuration = clamp(peakAt * total, 0, Math.max(total - holdDuration, 0))
    fadeOutDuration = Math.max(total - fadeInDuration - holdDuration, 0)
  } else {
    const total = Math.max(fadeInDuration + holdDuration + fadeOutDuration, 1)
    peakAt = fadeInDuration / total
  }

  const scaleMode: StarFlareScaleMode =
    raw.scaleMode === 'continuous' ? 'continuous' : 'return'

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
    fadeInDuration,
    holdDuration,
    fadeOutDuration,
    scaleMode,
    startScale: clamp(
      raw.startScale ?? STAR_FLARE_DEFAULTS.startScale,
      0.05,
      8,
    ),
    peakScale: clamp(raw.peakScale ?? STAR_FLARE_DEFAULTS.peakScale, 0.05, 8),
    endScale: clamp(raw.endScale ?? STAR_FLARE_DEFAULTS.endScale, 0.05, 8),
    peakAt,
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : STAR_FLARE_DEFAULTS.blendMode,
  }
}
