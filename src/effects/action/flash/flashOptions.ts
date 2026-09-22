import {
  clamp,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export interface FlashOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Flash color as 0xRRGGBB. Default white. */
  color?: number
  /** Peak brightness multiplier (0..2). Default 1. */
  intensity?: number
  /** Time to ramp from transparent to peak, in milliseconds. */
  fadeInDuration?: number
  /** Time held at peak brightness, in milliseconds. */
  holdDuration?: number
  /** Time to fade from peak to transparent, in milliseconds. */
  fadeOutDuration?: number
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedFlashOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  intensity: number
  fadeInDuration: number
  holdDuration: number
  fadeOutDuration: number
  blendMode: number
}

const BLEND_ADD = 1

export const FLASH_DEFAULTS: ResolvedFlashOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0xffffff,
  intensity: 1,
  fadeInDuration: 45,
  holdDuration: 40,
  fadeOutDuration: 220,
  blendMode: BLEND_ADD,
}

export function getFlashDurationMs(options: ResolvedFlashOptions): number {
  return Math.max(
    options.fadeInDuration + options.holdDuration + options.fadeOutDuration,
    1,
  )
}

/**
 * Samples the flash opacity envelope for a single `run()`.
 * Returns normalized alpha in 0..1 before intensity is applied by the renderer.
 */
export function sampleFlashEnvelope(
  elapsedMs: number,
  options: ResolvedFlashOptions,
): { alpha: number; finished: boolean } {
  const fadeIn = Math.max(options.fadeInDuration, 0)
  const hold = Math.max(options.holdDuration, 0)
  const fadeOut = Math.max(options.fadeOutDuration, 0)
  const total = Math.max(fadeIn + hold + fadeOut, 1)

  if (elapsedMs >= total) {
    return { alpha: 0, finished: true }
  }

  if (elapsedMs < fadeIn) {
    const t = fadeIn <= 0 ? 1 : elapsedMs / fadeIn
    const eased = 1 - (1 - t) * (1 - t)
    return { alpha: eased, finished: false }
  }

  if (elapsedMs < fadeIn + hold) {
    return { alpha: 1, finished: false }
  }

  const outT = fadeOut <= 0 ? 1 : (elapsedMs - fadeIn - hold) / fadeOut
  const eased = 1 - outT * outT * (3 - 2 * outT)
  return { alpha: Math.max(0, eased), finished: false }
}

export function resolveFlashOptions(
  options: FlashOptions | undefined,
): ResolvedFlashOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? FLASH_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? FLASH_DEFAULTS.height, 1, 4096)

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? FLASH_DEFAULTS.cornerRadius),
      width,
      height,
      0,
    ),
    color: (raw.color ?? FLASH_DEFAULTS.color) >>> 0,
    intensity: clamp(raw.intensity ?? FLASH_DEFAULTS.intensity, 0, 2),
    fadeInDuration: clamp(
      raw.fadeInDuration ?? FLASH_DEFAULTS.fadeInDuration,
      0,
      10_000,
    ),
    holdDuration: clamp(
      raw.holdDuration ?? FLASH_DEFAULTS.holdDuration,
      0,
      10_000,
    ),
    fadeOutDuration: clamp(
      raw.fadeOutDuration ?? FLASH_DEFAULTS.fadeOutDuration,
      0,
      10_000,
    ),
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : FLASH_DEFAULTS.blendMode,
  }
}
