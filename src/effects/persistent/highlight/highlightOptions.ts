import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
  mergeOptions,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export interface HighlightEffectOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Stroke color as 0xRRGGBB. */
  color?: number
  /** Stroke opacity in 0..1. */
  alpha?: number
  /** Stroke thickness in local pixels. */
  lineWidth?: number
  /** Extra inset outside the frame edge, in local pixels. */
  outerPadding?: number
}

export interface ResolvedHighlightEffectOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  alpha: number
  lineWidth: number
  outerPadding: number
}

export const HIGHLIGHT_EFFECT_DEFAULTS: ResolvedHighlightEffectOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 20,
  color: 0xf0c040,
  alpha: 0.95,
  lineWidth: 4,
  outerPadding: 8,
}

export function resolveHighlightOptions(
  options: HighlightEffectOptions | undefined,
): ResolvedHighlightEffectOptions {
  const merged = mergeOptions(HIGHLIGHT_EFFECT_DEFAULTS, options)
  const width = clamp(merged.width, 1, 4096)
  const height = clamp(merged.height, 1, 4096)
  const outerPadding = clamp(merged.outerPadding, 0, 128)
  const frameRadius = Math.max(0, merged.cornerRadius)
  const pathRadius = frameRadius <= 0 ? 0 : frameRadius + outerPadding

  return {
    width,
    height,
    outerPadding,
    cornerRadius: resolveCornerRadius(pathRadius, width, height, outerPadding),
    color: merged.color >>> 0,
    alpha: clamp01(merged.alpha),
    lineWidth: clamp(merged.lineWidth, 0.5, 64),
  }
}
