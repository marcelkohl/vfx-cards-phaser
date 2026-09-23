import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type AmbientSparklesPosition = 'back' | 'front'

export type AmbientSparklesSpawnRegion = 'area' | 'edge' | 'mixed'

export interface AmbientSparklesOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Sparkle tint as 0xRRGGBB. Default pale cyan. */
  color?: number
  /** Peak brightness multiplier (0..2). Default 1.05. */
  intensity?: number
  /** Global opacity multiplier (0..1). Default 0.9. */
  opacity?: number
  /** Maximum simultaneously alive sparkles. Default 6. */
  maxActiveSparkles?: number
  /** Minimum delay between new spawns (ms). Default 140. */
  minSpawnInterval?: number
  /** Maximum delay between new spawns (ms). Default 360. */
  maxSpawnInterval?: number
  /** Minimum sparkle lifetime (ms). Default 550. */
  minLifetime?: number
  /** Maximum sparkle lifetime (ms). Default 1100. */
  maxLifetime?: number
  /** Minimum sparkle size in pixels. Default 8. */
  minSize?: number
  /** Maximum sparkle size in pixels. Default 22. */
  maxSize?: number
  /**
   * Scale at spawn (before fade-in completes). Default 0.65.
   */
  startScale?: number
  /**
   * Scale near peak readability. Default 1.
   */
  peakScale?: number
  /**
   * Scale at end of life (subtle grow while fading). Default 1.05.
   */
  endScale?: number
  /**
   * Fraction of lifetime spent fading in. Default 0.22.
   */
  fadeInPortion?: number
  /**
   * Fraction of lifetime spent fading out at the end. Default 0.38.
   */
  fadeOutPortion?: number
  /**
   * Horizontal streak length multiplier relative to size. Default 1.2.
   */
  horizontalScale?: number
  /**
   * Vertical streak length multiplier relative to size. Default 0.85.
   */
  verticalScale?: number
  /**
   * Where sparkles may spawn.
   * - `area` — interior of the frame
   * - `edge` — near the perimeter
   * - `mixed` — mostly area, some edge, some slightly outside
   */
  spawnRegion?: AmbientSparklesSpawnRegion
  /**
   * How far outside the frame edge a mixed/outside spawn may land (px).
   * Default 14.
   */
  outsideAllowance?: number
  /** Extra spawn position jitter in pixels. Default 6. */
  spawnJitter?: number
  /**
   * Deterministic seed. Same seed → same spawn sequence over time.
   * Default 1.
   */
  seed?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over the card (default). `back` = behind artwork.
   */
  position?: AmbientSparklesPosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedAmbientSparklesOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  intensity: number
  opacity: number
  maxActiveSparkles: number
  minSpawnInterval: number
  maxSpawnInterval: number
  minLifetime: number
  maxLifetime: number
  minSize: number
  maxSize: number
  startScale: number
  peakScale: number
  endScale: number
  fadeInPortion: number
  fadeOutPortion: number
  horizontalScale: number
  verticalScale: number
  spawnRegion: AmbientSparklesSpawnRegion
  outsideAllowance: number
  spawnJitter: number
  seed: number
  position: AmbientSparklesPosition
  blendMode: number
}

/** Active sparkle slot — position is fixed for the whole lifetime. */
export interface AmbientSparkleSlot {
  active: boolean
  x: number
  y: number
  size: number
  lifetime: number
  age: number
  alphaScale: number
  horizontalScale: number
  verticalScale: number
}

const BLEND_ADD = 1

export const AMBIENT_SPARKLES_DEFAULTS: ResolvedAmbientSparklesOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0xc8f4ff,
  intensity: 1.05,
  opacity: 0.9,
  maxActiveSparkles: 6,
  minSpawnInterval: 140,
  maxSpawnInterval: 360,
  minLifetime: 550,
  maxLifetime: 1100,
  minSize: 8,
  maxSize: 22,
  startScale: 0.65,
  peakScale: 1,
  endScale: 1.05,
  fadeInPortion: 0.22,
  fadeOutPortion: 0.38,
  horizontalScale: 1.2,
  verticalScale: 0.85,
  spawnRegion: 'mixed',
  outsideAllowance: 14,
  spawnJitter: 6,
  seed: 1,
  position: 'front',
  blendMode: BLEND_ADD,
}

/**
 * Deterministic pseudo-random in [0, 1) from integer seeds.
 * Local to Ambient Sparkles — not shared with other effects.
 */
export function ambientHash01(seed: number, salt: number): number {
  let n = (seed * 374761393 + salt * 668265263) | 0
  n = (n ^ (n >>> 13)) * 1274126177
  n = n ^ (n >>> 16)
  return ((n >>> 0) % 10000) / 10000
}

function pickSpawnMode(
  region: AmbientSparklesSpawnRegion,
  seed: number,
  index: number,
): 'area' | 'edge' | 'outside' {
  if (region === 'area') {
    return 'area'
  }
  if (region === 'edge') {
    return 'edge'
  }
  // mixed: mostly interior, some perimeter, occasional slight outside.
  const r = ambientHash01(seed, index * 31 + 3)
  if (r < 0.58) {
    return 'area'
  }
  if (r < 0.84) {
    return 'edge'
  }
  return 'outside'
}

export function spawnAmbientPoint(
  options: ResolvedAmbientSparklesOptions,
  seed: number,
  index: number,
): { x: number; y: number } {
  const halfW = options.width / 2
  const halfH = options.height / 2
  const jitter = options.spawnJitter
  const mode = pickSpawnMode(options.spawnRegion, seed, index)

  let x = 0
  let y = 0

  if (mode === 'area') {
    const cover = 0.88
    x = (ambientHash01(seed, index * 47 + 1) - 0.5) * 2 * halfW * cover
    y = (ambientHash01(seed, index * 47 + 2) - 0.5) * 2 * halfH * cover
  } else {
    // Edge / outside: walk the perimeter irregularly.
    const perimeter = 2 * (options.width + options.height)
    const t =
      (ambientHash01(seed, index * 47 + 1) * 0.68 +
        ambientHash01(seed, index * 53 + 7) * 0.32) *
      perimeter
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

    if (mode === 'edge') {
      // Slight inward pull so stars sit near the border.
      x *= 0.96
      y *= 0.96
    } else {
      // Push slightly beyond the silhouette.
      const push =
        options.outsideAllowance *
        (0.35 + ambientHash01(seed, index * 47 + 9) * 0.65)
      const len = Math.hypot(x, y) || 1
      x += (x / len) * push
      y += (y / len) * push
    }
  }

  x += (ambientHash01(seed, index * 47 + 4) - 0.5) * 2 * jitter
  y += (ambientHash01(seed, index * 47 + 5) - 0.5) * 2 * jitter
  return { x, y }
}

export interface AmbientSparkleSample {
  alpha: number
  scale: number
  finished: boolean
}

/**
 * Smooth opacity / scale envelope for one stationary sparkle.
 * Position never changes — only alpha and scale evolve.
 */
export function sampleAmbientSparkle(
  age: number,
  lifetime: number,
  options: ResolvedAmbientSparklesOptions,
): AmbientSparkleSample {
  const life = Math.max(lifetime, 1)
  if (age < 0) {
    return { alpha: 0, scale: options.startScale, finished: false }
  }
  if (age >= life) {
    return { alpha: 0, scale: options.endScale, finished: true }
  }

  const t = age / life
  const fadeIn = clamp(options.fadeInPortion, 0.04, 0.45)
  const fadeOut = clamp(options.fadeOutPortion, 0.08, 0.6)
  const fadeOutStart = Math.max(1 - fadeOut, fadeIn + 0.05)

  let alpha = 1
  if (t < fadeIn) {
    const u = t / fadeIn
    // Smoothstep ease-in.
    alpha = u * u * (3 - 2 * u)
  } else if (t > fadeOutStart) {
    const u = (t - fadeOutStart) / Math.max(1 - fadeOutStart, 0.001)
    const s = u * u * (3 - 2 * u)
    alpha = 1 - s
  }

  // Subtle grow: start → peak during fade-in, then drift toward endScale.
  let scale: number
  if (t < fadeIn) {
    const u = t / fadeIn
    const s = u * u * (3 - 2 * u)
    scale = options.startScale + (options.peakScale - options.startScale) * s
  } else {
    const u = (t - fadeIn) / Math.max(1 - fadeIn, 0.001)
    scale = options.peakScale + (options.endScale - options.peakScale) * u
  }

  return { alpha: clamp01(alpha), scale, finished: false }
}

export function resolveAmbientSparklesOptions(
  options: AmbientSparklesOptions | undefined,
): ResolvedAmbientSparklesOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? AMBIENT_SPARKLES_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? AMBIENT_SPARKLES_DEFAULTS.height, 1, 4096)
  const minSpawn = clamp(
    raw.minSpawnInterval ?? AMBIENT_SPARKLES_DEFAULTS.minSpawnInterval,
    40,
    30_000,
  )
  const maxSpawn = clamp(
    raw.maxSpawnInterval ?? AMBIENT_SPARKLES_DEFAULTS.maxSpawnInterval,
    minSpawn,
    30_000,
  )
  const minLife = clamp(
    raw.minLifetime ?? AMBIENT_SPARKLES_DEFAULTS.minLifetime,
    80,
    30_000,
  )
  const maxLife = clamp(
    raw.maxLifetime ?? AMBIENT_SPARKLES_DEFAULTS.maxLifetime,
    minLife,
    30_000,
  )
  const minSize = clamp(
    raw.minSize ?? AMBIENT_SPARKLES_DEFAULTS.minSize,
    1,
    128,
  )
  const maxSize = clamp(
    raw.maxSize ?? AMBIENT_SPARKLES_DEFAULTS.maxSize,
    minSize,
    128,
  )
  const spawnRegion = raw.spawnRegion ?? AMBIENT_SPARKLES_DEFAULTS.spawnRegion
  const position = raw.position ?? AMBIENT_SPARKLES_DEFAULTS.position

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? AMBIENT_SPARKLES_DEFAULTS.cornerRadius),
      width,
      height,
    ),
    color: (raw.color ?? AMBIENT_SPARKLES_DEFAULTS.color) >>> 0,
    intensity: clamp(
      raw.intensity ?? AMBIENT_SPARKLES_DEFAULTS.intensity,
      0,
      2,
    ),
    opacity: clamp01(raw.opacity ?? AMBIENT_SPARKLES_DEFAULTS.opacity),
    maxActiveSparkles: Math.round(
      clamp(
        raw.maxActiveSparkles ?? AMBIENT_SPARKLES_DEFAULTS.maxActiveSparkles,
        1,
        32,
      ),
    ),
    minSpawnInterval: minSpawn,
    maxSpawnInterval: maxSpawn,
    minLifetime: minLife,
    maxLifetime: maxLife,
    minSize,
    maxSize,
    startScale: clamp(
      raw.startScale ?? AMBIENT_SPARKLES_DEFAULTS.startScale,
      0.1,
      3,
    ),
    peakScale: clamp(
      raw.peakScale ?? AMBIENT_SPARKLES_DEFAULTS.peakScale,
      0.1,
      3,
    ),
    endScale: clamp(
      raw.endScale ?? AMBIENT_SPARKLES_DEFAULTS.endScale,
      0.1,
      3,
    ),
    fadeInPortion: clamp01(
      raw.fadeInPortion ?? AMBIENT_SPARKLES_DEFAULTS.fadeInPortion,
    ),
    fadeOutPortion: clamp01(
      raw.fadeOutPortion ?? AMBIENT_SPARKLES_DEFAULTS.fadeOutPortion,
    ),
    horizontalScale: clamp(
      raw.horizontalScale ?? AMBIENT_SPARKLES_DEFAULTS.horizontalScale,
      0.2,
      4,
    ),
    verticalScale: clamp(
      raw.verticalScale ?? AMBIENT_SPARKLES_DEFAULTS.verticalScale,
      0.2,
      4,
    ),
    spawnRegion:
      spawnRegion === 'area' || spawnRegion === 'edge' || spawnRegion === 'mixed'
        ? spawnRegion
        : AMBIENT_SPARKLES_DEFAULTS.spawnRegion,
    outsideAllowance: clamp(
      raw.outsideAllowance ?? AMBIENT_SPARKLES_DEFAULTS.outsideAllowance,
      0,
      128,
    ),
    spawnJitter: clamp(
      raw.spawnJitter ?? AMBIENT_SPARKLES_DEFAULTS.spawnJitter,
      0,
      64,
    ),
    seed: Math.round(
      clamp(raw.seed ?? AMBIENT_SPARKLES_DEFAULTS.seed, 0, 1_000_000_000),
    ),
    position: position === 'back' ? 'back' : 'front',
    blendMode: raw.blendMode ?? AMBIENT_SPARKLES_DEFAULTS.blendMode,
  }
}
