import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
  mergeOptions,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export interface EdgeGlowOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Glow color as 0xRRGGBB. */
  color?: number
  /**
   * How far the glow advances inward from the edge, as a fraction of
   * `min(width, height)`. `0.05` ≈ 5% of the shorter side.
   */
  innerCoverage?: number
  /** Visual strength of the inner tint (alias of `innerIntensity`). */
  intensity?: number
  /** Falloff softness (alias of `innerSoftness`). */
  softness?: number
  /** Strength of the inner glow band. */
  innerIntensity?: number
  /** Inner falloff softness (0 = tighter, 1 = more diffuse). */
  innerSoftness?: number
  /** Optional outer aura distance in local pixels. Default `0`. */
  outerSpread?: number
  /** Optional outer aura strength. Default `0`. */
  outerIntensity?: number
  /**
   * How strongly the glow concentrates on corners (0 = uniform edge,
   * 1 = dense corners / quiet mid-edges). Default favors corners.
   */
  cornerFocus?: number
  /** Final alpha multiplier (0..1). */
  opacity?: number
  /**
   * Expands (`> 0`) or shrinks (`< 0`) the glow contour relative to the
   * supplied width/height, in local pixels.
   */
  padding?: number
  /** Phaser blend mode constant (default ADD for soft light tint). */
  blendMode?: number
  /** Soft intensity pulse. Off by default. */
  pulse?: boolean
  /** Pulse period in milliseconds. */
  pulseSpeed?: number
  /** Pulse amplitude as a fraction of intensity (0..1). */
  pulseAmount?: number
}

export interface ResolvedEdgeGlowOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  innerCoverage: number
  innerIntensity: number
  innerSoftness: number
  outerSpread: number
  outerIntensity: number
  cornerFocus: number
  opacity: number
  padding: number
  blendMode: number
  pulse: boolean
  pulseSpeed: number
  pulseAmount: number
}

/** Numeric ADD blend — matches `Phaser.BlendModes.ADD`. */
const BLEND_ADD = 1

export const EDGE_GLOW_DEFAULTS: ResolvedEdgeGlowOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0x66dd99,
  innerCoverage: 0.09,
  innerIntensity: 0.99,
  innerSoftness: 0.9,
  outerSpread: 0,
  outerIntensity: 0,
  cornerFocus: 0.9,
  opacity: 0.9,
  padding: 0,
  blendMode: BLEND_ADD,
  pulse: false,
  pulseSpeed: 2200,
  pulseAmount: 0.2,
}

export function resolveEdgeGlowOptions(
  options: EdgeGlowOptions | undefined,
): ResolvedEdgeGlowOptions {
  const merged = mergeOptions(
    EDGE_GLOW_DEFAULTS,
    options as Partial<ResolvedEdgeGlowOptions>,
  )
  const width = clamp(merged.width, 1, 4096)
  const height = clamp(merged.height, 1, 4096)
  const padding = clamp(merged.padding, -64, 128)
  const frameRadius = Math.max(0, merged.cornerRadius)
  const pathRadius =
    frameRadius <= 0 ? 0 : Math.max(0, frameRadius + padding)
  const pathWidth = Math.max(1, width + padding * 2)
  const pathHeight = Math.max(1, height + padding * 2)

  const raw = options ?? {}
  const outerSpread = clamp(
    raw.outerSpread ?? EDGE_GLOW_DEFAULTS.outerSpread,
    0,
    128,
  )

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(pathRadius, pathWidth, pathHeight, 0),
    color: (raw.color ?? EDGE_GLOW_DEFAULTS.color) >>> 0,
    innerCoverage: clamp01(
      raw.innerCoverage ?? EDGE_GLOW_DEFAULTS.innerCoverage,
    ),
    innerIntensity: clamp(
      raw.innerIntensity ?? raw.intensity ?? EDGE_GLOW_DEFAULTS.innerIntensity,
      0,
      4,
    ),
    innerSoftness: clamp01(
      raw.innerSoftness ?? raw.softness ?? EDGE_GLOW_DEFAULTS.innerSoftness,
    ),
    outerSpread,
    outerIntensity: clamp(
      raw.outerIntensity ??
        (outerSpread > 0 && raw.outerSpread !== undefined ? 0.12 : 0),
      0,
      4,
    ),
    cornerFocus: clamp01(
      raw.cornerFocus ?? EDGE_GLOW_DEFAULTS.cornerFocus,
    ),
    opacity: clamp01(raw.opacity ?? EDGE_GLOW_DEFAULTS.opacity),
    padding,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : EDGE_GLOW_DEFAULTS.blendMode,
    pulse: Boolean(raw.pulse ?? EDGE_GLOW_DEFAULTS.pulse),
    pulseSpeed: clamp(
      raw.pulseSpeed ?? EDGE_GLOW_DEFAULTS.pulseSpeed,
      200,
      60_000,
    ),
    pulseAmount: clamp01(
      raw.pulseAmount ?? EDGE_GLOW_DEFAULTS.pulseAmount,
    ),
  }
}
