import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type ConvergingFramePosition = 'back' | 'front'

export interface ConvergingFrameOptions {
  /** Final target frame width in local pixels. */
  width?: number
  /** Final target frame height in local pixels. */
  height?: number
  /** Corner radius of the final target frame. `0` = sharp. */
  cornerRadius?: number
  /** Glow tint as 0xRRGGBB. Default matches Edge Glow mint. */
  color?: number
  /**
   * Peak brightness of the Edge Glow band (0..4). Default 0.95.
   * Maps to Edge Glow `innerIntensity`.
   */
  intensity?: number
  /**
   * Initial uniform scale of the luminous frame relative to the target.
   * Default `1.10` — starts ~10% larger than the target.
   */
  startScale?: number
  /**
   * Final uniform scale when the convergence ends. Default `1.0`.
   */
  endScale?: number
  /**
   * Overall convergence movement duration in milliseconds.
   * Scale always lerps over this window. Default 420.
   */
  duration?: number
  /**
   * Opacity rise at the start of the convergence, in milliseconds.
   * Independent of `fadeOutDuration`. Default 50.
   */
  fadeInDuration?: number
  /**
   * Opacity fall at the end of the convergence, in milliseconds.
   * Independent of `fadeInDuration`. Default 180.
   */
  fadeOutDuration?: number
  /**
   * How far the glow advances inward from the edge, as a fraction of
   * `min(width, height)`. Default 0.09 — same idea as Edge Glow.
   */
  innerCoverage?: number
  /**
   * Inner falloff softness (0 = tighter, 1 = more diffuse). Default 0.9.
   */
  softness?: number
  /**
   * Corner concentration (0 = uniform edge, 1 = dense corners). Default 0.9.
   */
  cornerFocus?: number
  /**
   * Optional outer aura distance in pixels. Default `0` (no broad haze).
   */
  outerSpread?: number
  /**
   * Optional outer aura strength. Default `0`.
   */
  outerIntensity?: number
  /** Final alpha multiplier at peak (0..1). Default 0.9. */
  opacity?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over artwork (default). `back` = behind.
   */
  position?: ConvergingFramePosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedConvergingFrameOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  intensity: number
  startScale: number
  endScale: number
  duration: number
  fadeInDuration: number
  fadeOutDuration: number
  innerCoverage: number
  softness: number
  cornerFocus: number
  outerSpread: number
  outerIntensity: number
  opacity: number
  position: ConvergingFramePosition
  blendMode: number
}

const BLEND_ADD = 1

export const CONVERGING_FRAME_DEFAULTS: ResolvedConvergingFrameOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0x66dd99,
  intensity: 0.95,
  startScale: 1.1,
  endScale: 1,
  duration: 420,
  fadeInDuration: 50,
  fadeOutDuration: 180,
  innerCoverage: 0.09,
  softness: 0.9,
  cornerFocus: 0.9,
  outerSpread: 0,
  outerIntensity: 0,
  opacity: 0.9,
  position: 'front',
  blendMode: BLEND_ADD,
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

/** Ease-out cubic — snappy inward settle. */
function easeOutCubic(t: number): number {
  const x = 1 - clamp(t, 0, 1)
  return 1 - x * x * x
}

export interface ConvergingFrameSample {
  /** Uniform scale applied to the luminous frame. */
  scale: number
  /** Normalized opacity envelope (0..1). */
  strength: number
  finished: boolean
}

/**
 * Samples one convergence: scale moves `startScale → endScale` over `duration`
 * while opacity fades in at the start and out at the end.
 * Starts and ends at strength 0 — never flashes at full intensity.
 */
export function sampleConvergingFrameEnvelope(
  elapsedMs: number,
  options: ResolvedConvergingFrameOptions,
): ConvergingFrameSample {
  const duration = Math.max(options.duration, 1)
  const startScale = options.startScale
  const endScale = options.endScale

  if (elapsedMs <= 0) {
    return { scale: startScale, strength: 0, finished: false }
  }

  if (elapsedMs >= duration) {
    return { scale: endScale, strength: 0, finished: true }
  }

  const progress = easeOutCubic(elapsedMs / duration)
  const scale = startScale + (endScale - startScale) * progress

  const fadeIn = Math.max(options.fadeInDuration, 0)
  const fadeOut = Math.max(options.fadeOutDuration, 0)

  let strength = 1
  if (fadeIn > 0 && elapsedMs < fadeIn) {
    strength = smoothstep(elapsedMs / fadeIn)
  }

  if (fadeOut > 0) {
    const outStart = Math.max(duration - fadeOut, 0)
    if (elapsedMs > outStart) {
      const outT = clamp((elapsedMs - outStart) / fadeOut, 0, 1)
      strength = Math.min(strength, 1 - smoothstep(outT))
    }
  }

  return { scale, strength, finished: false }
}

export function resolveConvergingFrameOptions(
  options: ConvergingFrameOptions | undefined,
): ResolvedConvergingFrameOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? CONVERGING_FRAME_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? CONVERGING_FRAME_DEFAULTS.height, 1, 4096)
  const position: ConvergingFramePosition =
    raw.position === 'back' ? 'back' : 'front'
  const outerSpread = clamp(
    raw.outerSpread ?? CONVERGING_FRAME_DEFAULTS.outerSpread,
    0,
    128,
  )

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? CONVERGING_FRAME_DEFAULTS.cornerRadius),
      width,
      height,
      0,
    ),
    color: (raw.color ?? CONVERGING_FRAME_DEFAULTS.color) >>> 0,
    intensity: clamp(
      raw.intensity ?? CONVERGING_FRAME_DEFAULTS.intensity,
      0,
      4,
    ),
    startScale: clamp(
      raw.startScale ?? CONVERGING_FRAME_DEFAULTS.startScale,
      0.5,
      4,
    ),
    endScale: clamp(
      raw.endScale ?? CONVERGING_FRAME_DEFAULTS.endScale,
      0.25,
      4,
    ),
    duration: clamp(
      raw.duration ?? CONVERGING_FRAME_DEFAULTS.duration,
      16,
      12_000,
    ),
    fadeInDuration: clamp(
      raw.fadeInDuration ?? CONVERGING_FRAME_DEFAULTS.fadeInDuration,
      0,
      4_000,
    ),
    fadeOutDuration: clamp(
      raw.fadeOutDuration ?? CONVERGING_FRAME_DEFAULTS.fadeOutDuration,
      0,
      4_000,
    ),
    innerCoverage: clamp01(
      raw.innerCoverage ?? CONVERGING_FRAME_DEFAULTS.innerCoverage,
    ),
    softness: clamp01(raw.softness ?? CONVERGING_FRAME_DEFAULTS.softness),
    cornerFocus: clamp01(
      raw.cornerFocus ?? CONVERGING_FRAME_DEFAULTS.cornerFocus,
    ),
    outerSpread,
    outerIntensity: clamp(
      raw.outerIntensity ??
        (outerSpread > 0 && raw.outerSpread !== undefined
          ? 0.12
          : CONVERGING_FRAME_DEFAULTS.outerIntensity),
      0,
      4,
    ),
    opacity: clamp01(raw.opacity ?? CONVERGING_FRAME_DEFAULTS.opacity),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : CONVERGING_FRAME_DEFAULTS.blendMode,
  }
}
