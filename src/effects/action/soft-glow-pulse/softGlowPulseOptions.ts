import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type SoftGlowPulsePosition = 'back' | 'front'

export interface SoftGlowPulseOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Glow tint as 0xRRGGBB. Default matches Edge Glow mint. */
  color?: number
  /**
   * Peak brightness of the Edge Glow band (0..4). Default 0.95.
   * Maps to Edge Glow `innerIntensity`.
   */
  intensity?: number
  /** How many breaths to play. Default 2. */
  pulseCount?: number
  /**
   * Optional hold at peak intensity within each pulse, in milliseconds.
   * Default `0` (no hold — fade-in goes straight into fade-out).
   */
  pulseDuration?: number
  /**
   * Rise time of each pulse, in milliseconds.
   * Independent of `fadeOutDuration`. Default 120.
   */
  fadeInDuration?: number
  /**
   * Fall time of each pulse, in milliseconds.
   * Independent of `fadeInDuration`. Default 280.
   */
  fadeOutDuration?: number
  /**
   * Optional pause at the valley between pulses, in milliseconds.
   * Default `0` (continuous).
   */
  pulsePause?: number
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
   * Minimum strength between non-final pulses (0..0.5). Default 0.
   * `0` = fully dark between pulses (no flash at the seams).
   */
  pulseValley?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over artwork (default, matches Edge Glow). `back` = behind.
   */
  position?: SoftGlowPulsePosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedSoftGlowPulseOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  intensity: number
  pulseCount: number
  pulseDuration: number
  fadeInDuration: number
  fadeOutDuration: number
  pulsePause: number
  innerCoverage: number
  softness: number
  cornerFocus: number
  outerSpread: number
  outerIntensity: number
  opacity: number
  pulseValley: number
  position: SoftGlowPulsePosition
  blendMode: number
}

const BLEND_ADD = 1

export const SOFT_GLOW_PULSE_DEFAULTS: ResolvedSoftGlowPulseOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0x66dd99,
  intensity: 0.95,
  pulseCount: 2,
  pulseDuration: 0,
  fadeInDuration: 120,
  fadeOutDuration: 280,
  pulsePause: 0,
  innerCoverage: 0.09,
  softness: 0.9,
  cornerFocus: 0.9,
  outerSpread: 0,
  outerIntensity: 0,
  opacity: 0.9,
  pulseValley: 0,
  position: 'front',
  blendMode: BLEND_ADD,
}

export function getSoftGlowPulseCycleMs(
  options: ResolvedSoftGlowPulseOptions,
): number {
  return Math.max(
    options.fadeInDuration + options.pulseDuration + options.fadeOutDuration,
    1,
  )
}

export function getSoftGlowPulseDurationMs(
  options: ResolvedSoftGlowPulseOptions,
): number {
  const pulses = Math.max(options.pulseCount, 1)
  const cycle = getSoftGlowPulseCycleMs(options)
  const gaps = Math.max(pulses - 1, 0) * Math.max(options.pulsePause, 0)
  return Math.max(pulses * cycle + gaps, 1)
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

function sampleSinglePulse(
  localMs: number,
  fadeIn: number,
  hold: number,
  fadeOut: number,
  floorStart: number,
  floorEnd: number,
): number {
  if (localMs < fadeIn) {
    if (fadeIn <= 0) {
      return 1
    }
    const u = clamp(localMs / fadeIn, 0, 1)
    const eased = smoothstep(u)
    return floorStart + (1 - floorStart) * eased
  }

  if (localMs < fadeIn + hold) {
    return 1
  }

  if (fadeOut <= 0) {
    return floorEnd
  }

  const outT = clamp((localMs - fadeIn - hold) / fadeOut, 0, 1)
  const eased = smoothstep(outT)
  return 1 + (floorEnd - 1) * eased
}

/**
 * Samples normalized pulse strength (0..1) for the full sequence.
 * Each pulse uses independent `fadeInDuration` / `fadeOutDuration`.
 * Starts and ends at 0 — never jumps to full intensity.
 */
export function sampleSoftGlowPulseEnvelope(
  elapsedMs: number,
  options: ResolvedSoftGlowPulseOptions,
): { strength: number; finished: boolean } {
  const fadeIn = Math.max(options.fadeInDuration, 0)
  const fadeOut = Math.max(options.fadeOutDuration, 0)
  const hold = Math.max(options.pulseDuration, 0)
  const pause = Math.max(options.pulsePause, 0)
  const pulses = Math.max(options.pulseCount, 1)
  const valley = clamp(options.pulseValley, 0, 0.5)
  const cycle = Math.max(fadeIn + hold + fadeOut, 1)
  const total = getSoftGlowPulseDurationMs(options)

  if (elapsedMs <= 0) {
    return { strength: 0, finished: false }
  }

  if (elapsedMs >= total) {
    return { strength: 0, finished: true }
  }

  let t = elapsedMs
  for (let i = 0; i < pulses; i += 1) {
    const isFirst = i === 0
    const isLast = i === pulses - 1
    const floorStart = isFirst ? 0 : valley
    const floorEnd = isLast ? 0 : valley

    if (t < cycle) {
      return {
        strength: sampleSinglePulse(
          t,
          fadeIn,
          hold,
          fadeOut,
          floorStart,
          floorEnd,
        ),
        finished: false,
      }
    }

    t -= cycle
    if (!isLast && pause > 0) {
      if (t < pause) {
        return { strength: valley, finished: false }
      }
      t -= pause
    }
  }

  return { strength: 0, finished: true }
}

export function resolveSoftGlowPulseOptions(
  options: SoftGlowPulseOptions | undefined,
): ResolvedSoftGlowPulseOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? SOFT_GLOW_PULSE_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? SOFT_GLOW_PULSE_DEFAULTS.height, 1, 4096)
  const position: SoftGlowPulsePosition =
    raw.position === 'back' ? 'back' : 'front'
  const outerSpread = clamp(
    raw.outerSpread ?? SOFT_GLOW_PULSE_DEFAULTS.outerSpread,
    0,
    128,
  )

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? SOFT_GLOW_PULSE_DEFAULTS.cornerRadius),
      width,
      height,
      0,
    ),
    color: (raw.color ?? SOFT_GLOW_PULSE_DEFAULTS.color) >>> 0,
    intensity: clamp(
      raw.intensity ?? SOFT_GLOW_PULSE_DEFAULTS.intensity,
      0,
      4,
    ),
    pulseCount: Math.floor(
      clamp(raw.pulseCount ?? SOFT_GLOW_PULSE_DEFAULTS.pulseCount, 1, 12),
    ),
    pulseDuration: clamp(
      raw.pulseDuration ?? SOFT_GLOW_PULSE_DEFAULTS.pulseDuration,
      0,
      8_000,
    ),
    fadeInDuration: clamp(
      raw.fadeInDuration ?? SOFT_GLOW_PULSE_DEFAULTS.fadeInDuration,
      0,
      4_000,
    ),
    fadeOutDuration: clamp(
      raw.fadeOutDuration ?? SOFT_GLOW_PULSE_DEFAULTS.fadeOutDuration,
      0,
      4_000,
    ),
    pulsePause: clamp(
      raw.pulsePause ?? SOFT_GLOW_PULSE_DEFAULTS.pulsePause,
      0,
      4_000,
    ),
    innerCoverage: clamp01(
      raw.innerCoverage ?? SOFT_GLOW_PULSE_DEFAULTS.innerCoverage,
    ),
    softness: clamp01(raw.softness ?? SOFT_GLOW_PULSE_DEFAULTS.softness),
    cornerFocus: clamp01(
      raw.cornerFocus ?? SOFT_GLOW_PULSE_DEFAULTS.cornerFocus,
    ),
    outerSpread,
    outerIntensity: clamp(
      raw.outerIntensity ??
        (outerSpread > 0 && raw.outerSpread !== undefined
          ? 0.12
          : SOFT_GLOW_PULSE_DEFAULTS.outerIntensity),
      0,
      4,
    ),
    opacity: clamp01(raw.opacity ?? SOFT_GLOW_PULSE_DEFAULTS.opacity),
    pulseValley: clamp(
      raw.pulseValley ?? SOFT_GLOW_PULSE_DEFAULTS.pulseValley,
      0,
      0.5,
    ),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : SOFT_GLOW_PULSE_DEFAULTS.blendMode,
  }
}
