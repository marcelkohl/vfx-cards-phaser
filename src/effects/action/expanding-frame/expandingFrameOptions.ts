import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type ExpandingFramePosition = 'back' | 'front'

export interface ExpandingFrameOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius of the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Glow tint as 0xRRGGBB. Default luminous cyan. */
  color?: number
  /**
   * Peak brightness of the luminous band (0..4). Default 1.35.
   * Maps to Edge Glow `innerIntensity`.
   */
  intensity?: number
  /**
   * Initial uniform scale relative to the target. Default `1.0` —
   * starts approximately aligned with the target bounds.
   */
  startScale?: number
  /**
   * Final uniform scale after expansion. Default `1.18`.
   * Always ≥ `startScale` (outgoing only).
   */
  endScale?: number
  /**
   * Opacity rise at the start (ms). Default 35 — fast appearance.
   */
  fadeInDuration?: number
  /**
   * Peak opacity hold (ms). Default 70.
   * Expansion continues during hold — scale does not freeze.
   */
  holdDuration?: number
  /**
   * Opacity fade-out while expanding (ms). Default 280.
   * Prefer longer than fade-in for a releasing energy feel.
   */
  fadeOutDuration?: number
  /**
   * How far the glow advances inward from the edge, as a fraction of
   * `min(width, height)`. Default 0.12 — strong initial presence.
   */
  innerCoverage?: number
  /**
   * Inner falloff softness (0 = tighter, 1 = more diffuse). Default 0.85.
   */
  softness?: number
  /**
   * Corner concentration (0 = uniform edge, 1 = dense corners). Default 0.88.
   */
  cornerFocus?: number
  /**
   * Optional outer aura distance in pixels. Default `6`.
   */
  outerSpread?: number
  /**
   * Optional outer aura strength. Default `0.22`.
   */
  outerIntensity?: number
  /**
   * Translucent luminous fill inside the rounded frame (0..2).
   * `0` = transparent center (default). Higher values wash the enclosed area
   * with the same `color` while staying weaker than the boundary.
   */
  fillIntensity?: number
  /** Peak alpha multiplier (0..1). Default 0.95. */
  opacity?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over artwork (default). `back` = behind.
   */
  position?: ExpandingFramePosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedExpandingFrameOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  intensity: number
  startScale: number
  endScale: number
  fadeInDuration: number
  holdDuration: number
  fadeOutDuration: number
  /** Derived: fadeIn + hold + fadeOut. */
  duration: number
  innerCoverage: number
  softness: number
  cornerFocus: number
  outerSpread: number
  outerIntensity: number
  fillIntensity: number
  opacity: number
  position: ExpandingFramePosition
  blendMode: number
}

export interface ExpandingFrameSample {
  /** Uniform scale applied to the luminous frame. */
  scale: number
  /** Normalized opacity envelope (0..1). */
  strength: number
  finished: boolean
}

const BLEND_ADD = 1

export const EXPANDING_FRAME_DEFAULTS: ResolvedExpandingFrameOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0x4ec8ff,
  intensity: 1.35,
  startScale: 1,
  endScale: 1.18,
  fadeInDuration: 35,
  holdDuration: 70,
  fadeOutDuration: 280,
  duration: 385,
  innerCoverage: 0.12,
  softness: 0.85,
  cornerFocus: 0.88,
  outerSpread: 6,
  outerIntensity: 0.22,
  fillIntensity: 0,
  opacity: 0.95,
  position: 'front',
  blendMode: BLEND_ADD,
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Opacity: fast fade-in → brief hold → fade-out to true zero.
 * Scale always moves startScale → endScale over the full lifetime (never freezes).
 */
export function sampleExpandingFrameEnvelope(
  elapsedMs: number,
  options: ResolvedExpandingFrameOptions,
): ExpandingFrameSample {
  const fadeIn = Math.max(options.fadeInDuration, 0)
  const hold = Math.max(options.holdDuration, 0)
  const fadeOut = Math.max(options.fadeOutDuration, 0)
  const total = Math.max(fadeIn + hold + fadeOut, 1)
  const startScale = options.startScale
  const endScale = options.endScale

  if (elapsedMs <= 0) {
    return { scale: startScale, strength: 0, finished: false }
  }

  if (elapsedMs >= total) {
    return { scale: endScale, strength: 0, finished: true }
  }

  const progress = elapsedMs / total
  const scale = lerp(startScale, endScale, smoothstep(progress))

  let strength: number
  if (elapsedMs < fadeIn) {
    strength = fadeIn <= 0 ? 1 : smoothstep(elapsedMs / fadeIn)
  } else if (elapsedMs < fadeIn + hold) {
    strength = 1
  } else {
    const outT = fadeOut <= 0 ? 1 : (elapsedMs - fadeIn - hold) / fadeOut
    const t = clamp01(outT)
    // Prompt decline with soft landing at zero before natural completion.
    strength = (1 - t) * (1 - t)
  }

  return { scale, strength, finished: false }
}

export function resolveExpandingFrameOptions(
  options: ExpandingFrameOptions | undefined,
): ResolvedExpandingFrameOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? EXPANDING_FRAME_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? EXPANDING_FRAME_DEFAULTS.height, 1, 4096)
  const position: ExpandingFramePosition =
    raw.position === 'back' ? 'back' : 'front'
  const outerSpread = clamp(
    raw.outerSpread ?? EXPANDING_FRAME_DEFAULTS.outerSpread,
    0,
    128,
  )

  let startScale = clamp(
    raw.startScale ?? EXPANDING_FRAME_DEFAULTS.startScale,
    0.5,
    4,
  )
  let endScale = clamp(
    raw.endScale ?? EXPANDING_FRAME_DEFAULTS.endScale,
    0.5,
    4,
  )
  // Outward expansion only — never allow contraction via misconfiguration.
  if (endScale < startScale) {
    const swap = startScale
    startScale = endScale
    endScale = swap
  }

  const fadeInDuration = clamp(
    raw.fadeInDuration ?? EXPANDING_FRAME_DEFAULTS.fadeInDuration,
    0,
    4_000,
  )
  const holdDuration = clamp(
    raw.holdDuration ?? EXPANDING_FRAME_DEFAULTS.holdDuration,
    0,
    4_000,
  )
  const fadeOutDuration = clamp(
    raw.fadeOutDuration ?? EXPANDING_FRAME_DEFAULTS.fadeOutDuration,
    0,
    8_000,
  )
  const duration = Math.max(fadeInDuration + holdDuration + fadeOutDuration, 1)

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? EXPANDING_FRAME_DEFAULTS.cornerRadius),
      width,
      height,
      0,
    ),
    color: (raw.color ?? EXPANDING_FRAME_DEFAULTS.color) >>> 0,
    intensity: clamp(
      raw.intensity ?? EXPANDING_FRAME_DEFAULTS.intensity,
      0,
      4,
    ),
    startScale,
    endScale,
    fadeInDuration,
    holdDuration,
    fadeOutDuration,
    duration,
    innerCoverage: clamp01(
      raw.innerCoverage ?? EXPANDING_FRAME_DEFAULTS.innerCoverage,
    ),
    softness: clamp01(raw.softness ?? EXPANDING_FRAME_DEFAULTS.softness),
    cornerFocus: clamp01(
      raw.cornerFocus ?? EXPANDING_FRAME_DEFAULTS.cornerFocus,
    ),
    outerSpread,
    outerIntensity: clamp(
      raw.outerIntensity ?? EXPANDING_FRAME_DEFAULTS.outerIntensity,
      0,
      4,
    ),
    fillIntensity: clamp(
      raw.fillIntensity ?? EXPANDING_FRAME_DEFAULTS.fillIntensity,
      0,
      2,
    ),
    opacity: clamp01(raw.opacity ?? EXPANDING_FRAME_DEFAULTS.opacity),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : EXPANDING_FRAME_DEFAULTS.blendMode,
  }
}
