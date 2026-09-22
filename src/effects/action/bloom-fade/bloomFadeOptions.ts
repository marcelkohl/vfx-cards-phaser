import {
  clamp,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type BloomFadePosition = 'back' | 'front'

/**
 * How the soft mist is drawn.
 * - `organic` — wider / stronger at edge midpoints, thinner at corners
 * - `rounded-rect` — uniform soft rings via `strokeRoundedRect`
 */
export type BloomFadeShape = 'organic' | 'rounded-rect'

export interface BloomFadeOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Bloom color as 0xRRGGBB. Default warm soft white. */
  color?: number
  /** Peak brightness multiplier (0..2). Default 0.36 — medium soft haze. */
  intensity?: number
  /**
   * How far the soft bloom extends beyond the frame, in pixels (each side).
   * Default 18 — thin mist hugging the target.
   */
  padding?: number
  /** Time to ramp from invisible to peak, in milliseconds. Default 70. */
  fadeInDuration?: number
  /** Time held near peak before the long fade, in milliseconds. Default 90. */
  holdDuration?: number
  /** Time to fade from peak to invisible, in milliseconds. Default 640. */
  fadeOutDuration?: number
  /**
   * Extra reach (px per side) at peak size. During fade-out the bloom shrinks
   * back toward the frame. Default 4.
   */
  expansion?: number
  /**
   * Draw order relative to other children of the target.
   * `back` = behind the card frame/artwork (default). `front` = over it.
   */
  position?: BloomFadePosition
  /**
   * Mist silhouette.
   * `organic` (default) or `rounded-rect` (`strokeRoundedRect` rings).
   */
  shape?: BloomFadeShape
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedBloomFadeOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  intensity: number
  padding: number
  fadeInDuration: number
  holdDuration: number
  fadeOutDuration: number
  expansion: number
  position: BloomFadePosition
  shape: BloomFadeShape
  blendMode: number
}

const BLEND_ADD = 1

export const BLOOM_FADE_DEFAULTS: ResolvedBloomFadeOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0xfff4dd,
  intensity: 0.36,
  padding: 18,
  fadeInDuration: 70,
  holdDuration: 90,
  fadeOutDuration: 640,
  expansion: 4,
  position: 'back',
  shape: 'organic',
  blendMode: BLEND_ADD,
}

export function getBloomFadeDurationMs(
  options: ResolvedBloomFadeOptions,
): number {
  return Math.max(
    options.fadeInDuration + options.holdDuration + options.fadeOutDuration,
    1,
  )
}

/**
 * Samples opacity + size factor for a single `run()`.
 * `alpha` is 0..1 before intensity.
 * `expand` is 0..1 size: grows on fade-in, full at hold, shrinks on fade-out.
 */
export function sampleBloomFadeEnvelope(
  elapsedMs: number,
  options: ResolvedBloomFadeOptions,
): { alpha: number; expand: number; finished: boolean } {
  const fadeIn = Math.max(options.fadeInDuration, 0)
  const hold = Math.max(options.holdDuration, 0)
  const fadeOut = Math.max(options.fadeOutDuration, 0)
  const total = Math.max(fadeIn + hold + fadeOut, 1)

  if (elapsedMs >= total) {
    return { alpha: 0, expand: 0, finished: true }
  }

  if (elapsedMs < fadeIn) {
    const t = fadeIn <= 0 ? 1 : elapsedMs / fadeIn
    const eased = 1 - (1 - t) * (1 - t)
    return { alpha: eased, expand: eased, finished: false }
  }

  if (elapsedMs < fadeIn + hold) {
    return { alpha: 1, expand: 1, finished: false }
  }

  const outT = fadeOut <= 0 ? 1 : (elapsedMs - fadeIn - hold) / fadeOut
  // Slow opacity fade + shrink back toward the frame (not grow outward).
  const alpha = Math.max(0, 1 - outT * outT * (3 - 2 * outT))
  const expand = Math.max(0.2, 1 - outT * 0.8)
  return { alpha, expand, finished: false }
}

export function resolveBloomFadeOptions(
  options: BloomFadeOptions | undefined,
): ResolvedBloomFadeOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? BLOOM_FADE_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? BLOOM_FADE_DEFAULTS.height, 1, 4096)
  const position: BloomFadePosition =
    raw.position === 'front' ? 'front' : 'back'
  const shape: BloomFadeShape =
    raw.shape === 'rounded-rect' ? 'rounded-rect' : 'organic'

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? BLOOM_FADE_DEFAULTS.cornerRadius),
      width,
      height,
      0,
    ),
    color: (raw.color ?? BLOOM_FADE_DEFAULTS.color) >>> 0,
    intensity: clamp(raw.intensity ?? BLOOM_FADE_DEFAULTS.intensity, 0, 2),
    padding: clamp(raw.padding ?? BLOOM_FADE_DEFAULTS.padding, 0, 512),
    fadeInDuration: clamp(
      raw.fadeInDuration ?? BLOOM_FADE_DEFAULTS.fadeInDuration,
      0,
      10_000,
    ),
    holdDuration: clamp(
      raw.holdDuration ?? BLOOM_FADE_DEFAULTS.holdDuration,
      0,
      10_000,
    ),
    fadeOutDuration: clamp(
      raw.fadeOutDuration ?? BLOOM_FADE_DEFAULTS.fadeOutDuration,
      0,
      10_000,
    ),
    expansion: clamp(raw.expansion ?? BLOOM_FADE_DEFAULTS.expansion, 0, 256),
    position,
    shape,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : BLOOM_FADE_DEFAULTS.blendMode,
  }
}
