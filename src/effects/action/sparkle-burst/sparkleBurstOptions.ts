import {
  clamp,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type SparkleBurstPosition = 'back' | 'front'

export type SparkleBurstSpawnRegion =
  | 'center'
  | 'edge'
  | 'area'
  | 'mixed'
  | 'ring'

export type SparkleBurstShape = 'star' | 'diamond' | 'cross' | 'flare'

export interface SparkleBurstOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Sparkle tint as 0xRRGGBB. Default soft warm white. */
  color?: number
  /** Peak brightness multiplier (0..2). Default 1. */
  intensity?: number
  /** Global opacity multiplier (0..1). Default 0.92. */
  opacity?: number
  /** Number of sparkles. Default 16. */
  sparkleCount?: number
  /** Total animation duration in milliseconds. Default 900. */
  duration?: number
  /** Minimum outward drift distance in pixels. Default 14. */
  minTravel?: number
  /** Maximum outward drift distance in pixels. Default 38. */
  maxTravel?: number
  /** Minimum sparkle size in pixels. Default 3.5. */
  minSize?: number
  /** Maximum sparkle size in pixels. Default 35.5. */
  maxSize?: number
  /**
   * How far outside/inside the frame edge sparkles may spawn.
   * Positive = prefer slightly outside the silhouette. Default 0.08.
   */
  spawnPadding?: number
  /** Extra spawn position jitter in pixels. Default 8. */
  spawnJitter?: number
  /**
   * Where sparkles originate.
   * - `ring` — around the silhouette (default reference look)
   * - `edge` — near the frame perimeter
   * - `center` / `area` / `mixed` — interior-biased layouts
   */
  spawnRegion?: SparkleBurstSpawnRegion
  /**
   * Normalized progress (0..1) within each sparkle's life when fade-out begins.
   * Default 0.42.
   */
  fadeStart?: number
  /**
   * Fraction of each sparkle's life spent fading in. Default 0.14.
   */
  fadeInPortion?: number
  /**
   * Max start-delay spread across sparkles, in milliseconds. Default 220.
   */
  startDelaySpread?: number
  /**
   * Deterministic seed. Same seed → same layout and motion.
   * Default 1.
   */
  seed?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over the card (default). `back` = behind artwork.
   */
  position?: SparkleBurstPosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedSparkleBurstOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  intensity: number
  opacity: number
  sparkleCount: number
  duration: number
  minTravel: number
  maxTravel: number
  minSize: number
  maxSize: number
  spawnPadding: number
  spawnJitter: number
  spawnRegion: SparkleBurstSpawnRegion
  fadeStart: number
  fadeInPortion: number
  startDelaySpread: number
  seed: number
  position: SparkleBurstPosition
  blendMode: number
}

export interface SparkleBurstSparkle {
  shape: SparkleBurstShape
  originX: number
  originY: number
  angle: number
  travelDistance: number
  size: number
  delayMs: number
  lifeMs: number
  fadeStart: number
  fadeInPortion: number
  alphaScale: number
  /** Peak scale multiplier during life (slight grow). */
  peakScale: number
  spin: number
}

const BLEND_ADD = 1

const SHAPES: SparkleBurstShape[] = ['star', 'diamond', 'cross', 'flare']

export const SPARKLE_BURST_DEFAULTS: ResolvedSparkleBurstOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0xfff6e0,
  intensity: 1,
  opacity: 0.92,
  sparkleCount: 16,
  duration: 900,
  minTravel: 14,
  maxTravel: 38,
  minSize: 3.5,
  maxSize: 35.5,
  spawnPadding: 0.08,
  spawnJitter: 8,
  spawnRegion: 'ring',
  fadeStart: 0.42,
  fadeInPortion: 0.14,
  startDelaySpread: 220,
  seed: 1,
  position: 'front',
  blendMode: BLEND_ADD,
}

/**
 * Deterministic pseudo-random in [0, 1) from integer seeds.
 * Stable for a given seed + sparkle salt.
 */
export function sparkleHash01(seed: number, salt: number): number {
  let n = (seed * 374761393 + salt * 668265263) | 0
  n = (n ^ (n >>> 13)) * 1274126177
  n = n ^ (n >>> 16)
  return ((n >>> 0) % 10000) / 10000
}

function pickSpawnRegion(
  region: SparkleBurstSpawnRegion,
  seed: number,
  index: number,
): SparkleBurstSpawnRegion {
  if (region !== 'mixed') {
    return region
  }
  return sparkleHash01(seed, index * 19 + 2) < 0.35 ? 'area' : 'ring'
}

function spawnPoint(
  options: ResolvedSparkleBurstOptions,
  seed: number,
  index: number,
): { x: number; y: number } {
  const halfW = options.width / 2
  const halfH = options.height / 2
  const padding = options.spawnPadding
  const jitter = options.spawnJitter
  const region = pickSpawnRegion(options.spawnRegion, seed, index)

  let x = 0
  let y = 0

  if (region === 'center') {
    x = (sparkleHash01(seed, index * 11 + 1) - 0.5) * halfW * 0.45
    y = (sparkleHash01(seed, index * 11 + 2) - 0.5) * halfH * 0.45
  } else if (region === 'area') {
    x = (sparkleHash01(seed, index * 11 + 1) - 0.5) * 2 * halfW * 0.85
    y = (sparkleHash01(seed, index * 11 + 2) - 0.5) * 2 * halfH * 0.85
  } else if (region === 'edge') {
    const perimeter = 2 * (options.width + options.height)
    const t = sparkleHash01(seed, index * 11 + 1) * perimeter
    const w = options.width
    const h = options.height
    if (t < w) {
      x = -halfW + t
      y = -halfH
    } else if (t < w + h) {
      x = halfW
      y = -halfH + (t - w)
    } else if (t < w + h + w) {
      x = halfW - (t - w - h)
      y = halfH
    } else {
      x = -halfW
      y = halfH - (t - w - h - w)
    }
    const pull = 1 - padding * 0.35
    x *= pull
    y *= pull
  } else {
    // ring — distribute around silhouette, slightly outside for JRPG sparkle look
    const angle = sparkleHash01(seed, index * 11 + 1) * Math.PI * 2
    const rx = halfW * (1 + padding)
    const ry = halfH * (1 + padding)
    // Soft ellipse with slight radial jitter so they aren't on a perfect oval.
    const radial =
      0.88 + sparkleHash01(seed, index * 11 + 2) * 0.28
    x = Math.cos(angle) * rx * radial
    y = Math.sin(angle) * ry * radial
  }

  x += (sparkleHash01(seed, index * 11 + 4) - 0.5) * 2 * jitter
  y += (sparkleHash01(seed, index * 11 + 5) - 0.5) * 2 * jitter
  return { x, y }
}

export function buildSparkleBurstSparkles(
  options: ResolvedSparkleBurstOptions,
  seed: number = options.seed,
): SparkleBurstSparkle[] {
  const sparkles: SparkleBurstSparkle[] = []
  const travelSpan = Math.max(options.maxTravel - options.minTravel, 0)
  const sizeSpan = Math.max(options.maxSize - options.minSize, 0)

  for (let i = 0; i < options.sparkleCount; i += 1) {
    const origin = spawnPoint(options, seed, i)
    const baseAngle = Math.atan2(origin.y, origin.x)
    const nearCenter = Math.hypot(origin.x, origin.y) < 10
    const angleJitter =
      (sparkleHash01(seed, i * 13 + 6) - 0.5) * Math.PI * 0.7
    const angle = nearCenter
      ? sparkleHash01(seed, i * 13 + 7) * Math.PI * 2
      : baseAngle + angleJitter

    const delayMs =
      sparkleHash01(seed, i * 13 + 8) * options.startDelaySpread
    const remaining = Math.max(options.duration - delayMs, 60)
    const lifeMs = remaining * (0.55 + sparkleHash01(seed, i * 13 + 9) * 0.45)

    const shape =
      SHAPES[Math.floor(sparkleHash01(seed, i * 13 + 10) * SHAPES.length)]!

    sparkles.push({
      shape,
      originX: origin.x,
      originY: origin.y,
      angle,
      travelDistance:
        options.minTravel + sparkleHash01(seed, i * 13 + 11) * travelSpan,
      size: options.minSize + sparkleHash01(seed, i * 13 + 12) * sizeSpan,
      delayMs,
      lifeMs,
      fadeStart:
        options.fadeStart * (0.88 + sparkleHash01(seed, i * 13 + 13) * 0.24),
      fadeInPortion:
        options.fadeInPortion *
        (0.75 + sparkleHash01(seed, i * 13 + 14) * 0.5),
      alphaScale: 0.55 + sparkleHash01(seed, i * 13 + 15) * 0.45,
      peakScale: 1.05 + sparkleHash01(seed, i * 13 + 16) * 0.35,
      spin: (sparkleHash01(seed, i * 13 + 17) - 0.5) * 0.9,
    })
  }

  return sparkles
}

export interface SparkleBurstSample {
  x: number
  y: number
  rotation: number
  scale: number
  alpha: number
  visible: boolean
  finished: boolean
}

export function sampleSparkleBurstSparkle(
  sparkle: SparkleBurstSparkle,
  elapsedMs: number,
): SparkleBurstSample {
  const local = elapsedMs - sparkle.delayMs
  if (local < 0) {
    return {
      x: sparkle.originX,
      y: sparkle.originY,
      rotation: 0,
      scale: 0.35,
      alpha: 0,
      visible: false,
      finished: false,
    }
  }

  const life = Math.max(sparkle.lifeMs, 1)
  if (local >= life) {
    return {
      x: sparkle.originX,
      y: sparkle.originY,
      rotation: sparkle.spin,
      scale: sparkle.peakScale,
      alpha: 0,
      visible: false,
      finished: true,
    }
  }

  const t = local / life
  // Soft ease-out drift — floating light, not ejected debris.
  const eased = 1 - Math.pow(1 - t, 1.85)
  const travel = sparkle.travelDistance * eased
  const cos = Math.cos(sparkle.angle)
  const sin = Math.sin(sparkle.angle)
  const x = sparkle.originX + cos * travel
  const y = sparkle.originY + sin * travel
  const rotation = sparkle.spin * eased

  const fadeIn = clamp(sparkle.fadeInPortion, 0.04, 0.4)
  const fadeStart = clamp(sparkle.fadeStart, fadeIn + 0.05, 0.95)

  let alpha: number
  if (t < fadeIn) {
    const u = t / fadeIn
    alpha = u * u * sparkle.alphaScale
  } else if (t < fadeStart) {
    alpha = sparkle.alphaScale
  } else {
    const ft = (t - fadeStart) / (1 - fadeStart)
    const faded = 1 - ft * ft * (3 - 2 * ft)
    alpha = Math.max(0, faded) * sparkle.alphaScale
  }

  // Quick appear undersized, grow toward peak, gently ease near end.
  let scale: number
  if (t < fadeIn) {
    const u = t / fadeIn
    scale = 0.35 + (sparkle.peakScale - 0.35) * (u * (2 - u))
  } else if (t < fadeStart) {
    scale = sparkle.peakScale
  } else {
    const ft = (t - fadeStart) / (1 - fadeStart)
    scale = sparkle.peakScale * (1 - 0.25 * ft)
  }

  return {
    x,
    y,
    rotation,
    scale,
    alpha,
    visible: alpha > 0.004,
    finished: false,
  }
}

export function sampleSparkleBurstFinished(
  elapsedMs: number,
  options: ResolvedSparkleBurstOptions,
): boolean {
  return elapsedMs >= Math.max(options.duration, 1)
}

function resolveSpawnRegion(
  value: SparkleBurstSpawnRegion | undefined,
): SparkleBurstSpawnRegion {
  if (
    value === 'center' ||
    value === 'edge' ||
    value === 'area' ||
    value === 'mixed' ||
    value === 'ring'
  ) {
    return value
  }
  return SPARKLE_BURST_DEFAULTS.spawnRegion
}

export function resolveSparkleBurstOptions(
  options: SparkleBurstOptions | undefined,
): ResolvedSparkleBurstOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? SPARKLE_BURST_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? SPARKLE_BURST_DEFAULTS.height, 1, 4096)
  const minTravel = clamp(
    raw.minTravel ?? SPARKLE_BURST_DEFAULTS.minTravel,
    0,
    256,
  )
  const maxTravel = clamp(
    raw.maxTravel ?? SPARKLE_BURST_DEFAULTS.maxTravel,
    minTravel,
    384,
  )
  const minSize = clamp(
    raw.minSize ?? SPARKLE_BURST_DEFAULTS.minSize,
    1,
    48,
  )
  const maxSize = clamp(
    raw.maxSize ?? SPARKLE_BURST_DEFAULTS.maxSize,
    minSize,
    64,
  )
  const position: SparkleBurstPosition =
    raw.position === 'back' ? 'back' : 'front'

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? SPARKLE_BURST_DEFAULTS.cornerRadius),
      width,
      height,
      0,
    ),
    color: (raw.color ?? SPARKLE_BURST_DEFAULTS.color) >>> 0,
    intensity: clamp(
      raw.intensity ?? SPARKLE_BURST_DEFAULTS.intensity,
      0,
      2,
    ),
    opacity: clamp(raw.opacity ?? SPARKLE_BURST_DEFAULTS.opacity, 0, 1),
    sparkleCount: Math.floor(
      clamp(
        raw.sparkleCount ?? SPARKLE_BURST_DEFAULTS.sparkleCount,
        1,
        96,
      ),
    ),
    duration: clamp(
      raw.duration ?? SPARKLE_BURST_DEFAULTS.duration,
      120,
      20_000,
    ),
    minTravel,
    maxTravel,
    minSize,
    maxSize,
    spawnPadding: clamp(
      raw.spawnPadding ?? SPARKLE_BURST_DEFAULTS.spawnPadding,
      -0.25,
      0.6,
    ),
    spawnJitter: clamp(
      raw.spawnJitter ?? SPARKLE_BURST_DEFAULTS.spawnJitter,
      0,
      64,
    ),
    spawnRegion: resolveSpawnRegion(raw.spawnRegion),
    fadeStart: clamp(
      raw.fadeStart ?? SPARKLE_BURST_DEFAULTS.fadeStart,
      0.1,
      0.95,
    ),
    fadeInPortion: clamp(
      raw.fadeInPortion ?? SPARKLE_BURST_DEFAULTS.fadeInPortion,
      0.04,
      0.4,
    ),
    startDelaySpread: clamp(
      raw.startDelaySpread ?? SPARKLE_BURST_DEFAULTS.startDelaySpread,
      0,
      2000,
    ),
    seed: Math.floor(
      clamp(raw.seed ?? SPARKLE_BURST_DEFAULTS.seed, 0, 1_000_000),
    ),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : SPARKLE_BURST_DEFAULTS.blendMode,
  }
}
