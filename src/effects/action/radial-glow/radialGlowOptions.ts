import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
} from '../../../core/effectConfig'

export type RadialGlowPosition = 'back' | 'front'

export interface RadialGlowOptions {
  /** Target frame width in local pixels (for normalized positioning). */
  width?: number
  /** Target frame height in local pixels (for normalized positioning). */
  height?: number
  /** Glow tint as 0xRRGGBB. Default luminous cyan-blue. */
  color?: number
  /** Peak brightness multiplier (0..3). Default 0.28. */
  intensity?: number
  /** Peak alpha multiplier (0..1). Default 0.85. */
  opacity?: number
  /**
   * Base vertical radius of the halo circumference at scale 1 (px).
   * Horizontal radius is `radius * aspect`. Default 130.
   */
  radius?: number
  /**
   * Horizontal / vertical aspect ratio of the ellipse.
   * `1` = circle; `> 1` = wider. Default 1.12.
   */
  aspect?: number
  /**
   * Width of the dense luminous current rim at scale 1 (px).
   * Intentionally thin — soft glow / trail are separate. Default 1.5.
   */
  ringWidth?: number
  /**
   * How strongly the thin current rim stands out from the trail (0.5..3).
   * Default 2.35.
   */
  rimIntensity?: number
  /**
   * How far residual ghost light extends inward from the current rim,
   * as a fraction of the current radius (0..1). Default 0.5.
   * Larger than `outerGlow` — the trail is intentionally longer.
   */
  innerTrail?: number
  /**
   * How far soft glow extends outside the current rim,
   * as a fraction of the current radius (0..1). Default 0.09.
   */
  outerGlow?: number
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
  /** Scale at t = 0. Default 0.7. */
  startScale?: number
  /** Scale at t = 1 (always ≥ start for continuous expand). Default 1.2. */
  endScale?: number
  /**
   * Opacity fade-in duration in milliseconds (gradual appear). Default 350.
   * Lifetime = fadeInDuration + holdDuration + fadeOutDuration.
   */
  fadeInDuration?: number
  /**
   * Peak opacity hold duration in milliseconds. Default 80.
   * Expansion continues during hold — scale does not freeze.
   */
  holdDuration?: number
  /**
   * Opacity fade-out duration in milliseconds (fast disappear). Default 140.
   * Prefer shorter than fadeInDuration.
   */
  fadeOutDuration?: number
  /**
   * How gradually trail / soft wings / outer glow dissolve (0..1).
   * Does not thicken the thin rim core. Default 0.7.
   */
  softness?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over artwork (default). `back` = behind.
   */
  position?: RadialGlowPosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedRadialGlowOptions {
  width: number
  height: number
  color: number
  intensity: number
  opacity: number
  radius: number
  aspect: number
  ringWidth: number
  rimIntensity: number
  innerTrail: number
  outerGlow: number
  positionX: number
  positionY: number
  startScale: number
  endScale: number
  fadeInDuration: number
  holdDuration: number
  fadeOutDuration: number
  /** Derived: fadeIn + hold + fadeOut. */
  duration: number
  softness: number
  position: RadialGlowPosition
  blendMode: number
}

export interface RadialGlowSample {
  /** Opacity envelope 0..1 (before intensity/opacity multipliers). */
  strength: number
  /** Current expansion scale. */
  scale: number
  finished: boolean
}

const BLEND_ADD = 1

export const RADIAL_GLOW_DEFAULTS: ResolvedRadialGlowOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  color: 0x4ec8ff,
  intensity: 0.28,
  opacity: 0.85,
  radius: 130,
  aspect: 1.12,
  ringWidth: 1.5,
  rimIntensity: 2.35,
  innerTrail: 0.5,
  outerGlow: 0.09,
  positionX: 0.5,
  positionY: 0.5,
  startScale: 0.7,
  endScale: 1.2,
  fadeInDuration: 350,
  holdDuration: 80,
  fadeOutDuration: 140,
  duration: 570,
  softness: 0.7,
  position: 'front',
  blendMode: BLEND_ADD,
}

function smoothstep(t: number): number {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Opacity: fade-in → hold → fade-out.
 * Scale always moves startScale → endScale over the full lifetime (no reverse, no freeze).
 */
export function sampleRadialGlowEnvelope(
  elapsedMs: number,
  options: ResolvedRadialGlowOptions,
): RadialGlowSample {
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

  const progress = elapsedMs / total
  const scale = lerp(
    options.startScale,
    options.endScale,
    smoothstep(progress),
  )

  let strength: number
  if (elapsedMs < fadeIn) {
    strength = fadeIn <= 0 ? 1 : smoothstep(elapsedMs / fadeIn)
  } else if (elapsedMs < fadeIn + hold) {
    strength = 1
  } else {
    const outT = fadeOut <= 0 ? 1 : (elapsedMs - fadeIn - hold) / fadeOut
    strength = 1 - smoothstep(outT)
  }

  return { strength, scale, finished: false }
}

/** Local-space offset from target center for the configured normalized position. */
export function radialGlowLocalOffset(
  options: ResolvedRadialGlowOptions,
): { x: number; y: number } {
  return {
    x: (options.positionX - 0.5) * options.width,
    y: (options.positionY - 0.5) * options.height,
  }
}

/** Ellipse semi-axes of the halo circumference at the given scale. */
export function radialGlowRadiiAtScale(
  options: ResolvedRadialGlowOptions,
  scale: number,
): { radiusX: number; radiusY: number } {
  const s = Math.max(scale, 0.05)
  const radiusY = options.radius * s
  const radiusX = radiusY * Math.max(options.aspect, 0.05)
  return { radiusX, radiusY }
}

/**
 * Half-width of the thin dense rim in normalized ellipse space at this scale.
 * Allows sub-pixel rim cores; softness / trail are handled separately.
 */
export function radialGlowRingHalfNorm(
  options: ResolvedRadialGlowOptions,
  scale: number,
): number {
  const { radiusX, radiusY } = radialGlowRadiiAtScale(options, scale)
  const meanR = Math.max((radiusX + radiusY) * 0.5, 1)
  const ringPx = Math.max(options.ringWidth * Math.max(scale, 0.05), 0.35)
  return clamp((ringPx * 0.5) / meanR, 0.0012, 0.2)
}

/**
 * Outer extent factor so short outer glow beyond the rim fits in the draw quad.
 * Inner trail stays inside the rim and does not enlarge the quad.
 */
export function radialGlowOuterPadFactor(
  options: ResolvedRadialGlowOptions,
): number {
  const soft = options.softness
  const outer = options.outerGlow * mix(1.15, 1.75, soft)
  // Soft optical wings around the thin rim (not the rim core itself).
  const softWing = mix(0.018, 0.04, soft)
  return 1 + Math.max(outer, softWing) + 0.02
}

export function resolveRadialGlowOptions(
  options: RadialGlowOptions | undefined,
): ResolvedRadialGlowOptions {
  const raw = options ?? {}
  const position: RadialGlowPosition =
    raw.position === 'back' ? 'back' : 'front'

  let startScale = clamp(
    raw.startScale ?? RADIAL_GLOW_DEFAULTS.startScale,
    0.05,
    8,
  )
  let endScale = clamp(raw.endScale ?? RADIAL_GLOW_DEFAULTS.endScale, 0.05, 8)
  // Continuous expansion only — never allow contraction via misconfiguration.
  if (endScale < startScale) {
    const swap = startScale
    startScale = endScale
    endScale = swap
  }

  const fadeInDuration = clamp(
    raw.fadeInDuration ?? RADIAL_GLOW_DEFAULTS.fadeInDuration,
    0,
    8_000,
  )
  const holdDuration = clamp(
    raw.holdDuration ?? RADIAL_GLOW_DEFAULTS.holdDuration,
    0,
    4_000,
  )
  const fadeOutDuration = clamp(
    raw.fadeOutDuration ?? RADIAL_GLOW_DEFAULTS.fadeOutDuration,
    0,
    8_000,
  )
  const duration = Math.max(fadeInDuration + holdDuration + fadeOutDuration, 1)

  return {
    width: clamp(raw.width ?? RADIAL_GLOW_DEFAULTS.width, 1, 4096),
    height: clamp(raw.height ?? RADIAL_GLOW_DEFAULTS.height, 1, 4096),
    color: (raw.color ?? RADIAL_GLOW_DEFAULTS.color) >>> 0,
    intensity: clamp(raw.intensity ?? RADIAL_GLOW_DEFAULTS.intensity, 0, 3),
    opacity: clamp01(raw.opacity ?? RADIAL_GLOW_DEFAULTS.opacity),
    radius: clamp(raw.radius ?? RADIAL_GLOW_DEFAULTS.radius, 8, 2048),
    aspect: clamp(raw.aspect ?? RADIAL_GLOW_DEFAULTS.aspect, 0.2, 4),
    ringWidth: clamp(
      raw.ringWidth ?? RADIAL_GLOW_DEFAULTS.ringWidth,
      0.4,
      64,
    ),
    rimIntensity: clamp(
      raw.rimIntensity ?? RADIAL_GLOW_DEFAULTS.rimIntensity,
      0.5,
      3,
    ),
    innerTrail: clamp(
      raw.innerTrail ?? RADIAL_GLOW_DEFAULTS.innerTrail,
      0.05,
      0.95,
    ),
    outerGlow: clamp(
      raw.outerGlow ?? RADIAL_GLOW_DEFAULTS.outerGlow,
      0.02,
      0.5,
    ),
    positionX: clamp01(raw.positionX ?? RADIAL_GLOW_DEFAULTS.positionX),
    positionY: clamp01(raw.positionY ?? RADIAL_GLOW_DEFAULTS.positionY),
    startScale,
    endScale,
    fadeInDuration,
    holdDuration,
    fadeOutDuration,
    duration,
    softness: clamp01(raw.softness ?? RADIAL_GLOW_DEFAULTS.softness),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : RADIAL_GLOW_DEFAULTS.blendMode,
  }
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
