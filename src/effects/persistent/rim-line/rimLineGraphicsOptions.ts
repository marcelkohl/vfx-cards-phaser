import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
  mergeOptions,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export interface RimLineGraphicsOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Main line color as 0xRRGGBB. */
  color?: number
  /** Bright core color as 0xRRGGBB. */
  coreColor?: number
  /** Base stroke width in local pixels (scaled per glow layer). */
  lineWidth?: number
  /** Path inset outside the frame edge, in local pixels. */
  outerPadding?: number
  /** Duration of one full lap in milliseconds. */
  loopDuration?: number
  /** Visible segment length as a fraction of the perimeter (0..1). */
  segmentLength?: number
  /** Leading-tip fade window as a fraction of the segment (0..1). */
  headFade?: number
  /** Tail falloff exponent (higher = shorter/sharper tail). */
  tailFalloff?: number
  /** Multiplier for simulated glow layer alphas (relative intensity). */
  glowStrength?: number
  /** Travel direction: `1` forward, `-1` reverse. */
  direction?: 1 | -1
  /** Polyline samples along the segment. */
  sampleCount?: number
}

export interface ResolvedRimLineGraphicsOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  coreColor: number
  lineWidth: number
  outerPadding: number
  loopDuration: number
  segmentLength: number
  headFade: number
  tailFalloff: number
  glowStrength: number
  direction: 1 | -1
  sampleCount: number
}

export const RIM_LINE_GRAPHICS_DEFAULTS: ResolvedRimLineGraphicsOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0x5ce1ff,
  coreColor: 0xf2feff,
  lineWidth: 14,
  outerPadding: 1,
  loopDuration: 2800,
  segmentLength: 0.36,
  headFade: 0.12,
  tailFalloff: 0.8,
  glowStrength: 1,
  direction: 1,
  sampleCount: 32,
}

export function resolveRimLineGraphicsOptions(
  options: RimLineGraphicsOptions | undefined,
): ResolvedRimLineGraphicsOptions {
  const merged = mergeOptions(RIM_LINE_GRAPHICS_DEFAULTS, options)
  const width = clamp(merged.width, 1, 4096)
  const height = clamp(merged.height, 1, 4096)
  const outerPadding = clamp(merged.outerPadding, 0, 64)
  const frameRadius = Math.max(0, merged.cornerRadius)
  const pathRadius = frameRadius <= 0 ? 0 : frameRadius + outerPadding

  return {
    width,
    height,
    outerPadding,
    cornerRadius: resolveCornerRadius(pathRadius, width, height, outerPadding),
    color: merged.color >>> 0,
    coreColor: merged.coreColor >>> 0,
    lineWidth: clamp(merged.lineWidth, 0.5, 64),
    loopDuration: clamp(merged.loopDuration, 200, 60_000),
    segmentLength: clamp01(merged.segmentLength),
    headFade: clamp(merged.headFade, 0.01, 0.5),
    tailFalloff: clamp(merged.tailFalloff, 0.1, 8),
    glowStrength: clamp(merged.glowStrength, 0, 4),
    direction: merged.direction < 0 ? -1 : 1,
    sampleCount: Math.round(clamp(merged.sampleCount, 8, 128)),
  }
}
