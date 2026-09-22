import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
  mergeOptions,
  resolveCornerRadius,
} from '../../../core/effectConfig'
import type { RimLineGraphicsOptions } from './rimLineGraphicsOptions'

export interface RimLineShaderOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Main glow color as 0xRRGGBB. */
  color?: number
  /** Near-white core color as 0xRRGGBB. */
  coreColor?: number
  /** Path inset outside the frame edge, in local pixels. */
  outerPadding?: number
  /** Extra shader quad padding so glow is not clipped, in local pixels. */
  glowPadding?: number
  /** Duration of one full lap in milliseconds. */
  loopDuration?: number
  /** Visible segment length as a fraction of the perimeter (0..1). */
  segmentLength?: number
  /** Core stroke half-width in local pixels. */
  coreWidth?: number
  /** Soft glow radius in local pixels. */
  glowWidth?: number
  /** Relative glow intensity multiplier. */
  glowStrength?: number
  /** Travel direction: `1` forward, `-1` reverse. */
  direction?: 1 | -1
}

export interface ResolvedRimLineShaderOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  coreColor: number
  outerPadding: number
  glowPadding: number
  loopDuration: number
  segmentLength: number
  coreWidth: number
  glowWidth: number
  glowStrength: number
  direction: 1 | -1
}

export const RIM_LINE_SHADER_DEFAULTS: ResolvedRimLineShaderOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0x5ce1ff,
  coreColor: 0xf2feff,
  outerPadding: 1,
  glowPadding: 28,
  loopDuration: 2800,
  segmentLength: 0.16,
  coreWidth: 1.35,
  glowWidth: 7.5,
  glowStrength: 1,
  direction: 1,
}

export function resolveRimLineShaderOptions(
  options: RimLineShaderOptions | undefined,
): ResolvedRimLineShaderOptions {
  const merged = mergeOptions(RIM_LINE_SHADER_DEFAULTS, options)
  const width = clamp(merged.width, 1, 4096)
  const height = clamp(merged.height, 1, 4096)
  const outerPadding = clamp(merged.outerPadding, 0, 64)
  const glowStrength = clamp(merged.glowStrength, 0, 4)
  const frameRadius = Math.max(0, merged.cornerRadius)
  const pathRadius = frameRadius <= 0 ? 0 : frameRadius + outerPadding

  return {
    width,
    height,
    outerPadding,
    cornerRadius: resolveCornerRadius(pathRadius, width, height, outerPadding),
    color: merged.color >>> 0,
    coreColor: merged.coreColor >>> 0,
    glowPadding: clamp(merged.glowPadding, 4, 128),
    loopDuration: clamp(merged.loopDuration, 200, 60_000),
    segmentLength: clamp01(merged.segmentLength),
    coreWidth: clamp(merged.coreWidth, 0.25, 32),
    glowWidth: clamp(merged.glowWidth * glowStrength, 0.5, 64),
    glowStrength,
    direction: merged.direction < 0 ? -1 : 1,
  }
}

/** Best-effort mapping used when the shader falls back to Graphics. */
export function toGraphicsFallbackOptions(
  options: ResolvedRimLineShaderOptions,
): RimLineGraphicsOptions {
  return {
    width: options.width,
    height: options.height,
    cornerRadius: Math.max(0, options.cornerRadius - options.outerPadding),
    color: options.color,
    coreColor: options.coreColor,
    outerPadding: options.outerPadding,
    loopDuration: options.loopDuration,
    segmentLength: options.segmentLength,
    glowStrength: options.glowStrength,
    direction: options.direction,
    lineWidth: Math.max(options.coreWidth * 8, 6),
  }
}
