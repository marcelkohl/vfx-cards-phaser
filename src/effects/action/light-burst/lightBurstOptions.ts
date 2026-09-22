import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type LightBurstPosition = 'back' | 'front'

/** How Light Burst scale evolves relative to opacity. Local to this effect. */
export type LightBurstScaleMode = 'return' | 'continuous'

export interface LightBurstOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Ray color as 0xRRGGBB. Default warm white. */
  color?: number
  /** Peak brightness multiplier (0..2). Default 0.7. */
  intensity?: number
  /** Number of rays around the target. Default 12. */
  rayCount?: number
  /** How far rays extend beyond the frame edge, in pixels. Default 80. */
  rayLength?: number
  /** Base width of each ray near the origin, in pixels. Default 14. */
  rayWidth?: number
  /**
   * How much wider the open tip is vs the base (1 = parallel, 3 = 3× tip).
   * Default 3.2 — tips flare open instead of coming to a star point.
   */
  tipFlare?: number
  /** Total animation duration in milliseconds. Default 420. */
  duration?: number
  /**
   * How far inside the frame the rays begin, as a fraction of half-size (0..0.6).
   * Higher = more “from behind / inside”. Default 0.18.
   */
  originInset?: number
  /** Angular irregularity 0..1 (avoids a rigid star). Default 0.55. */
  spreadJitter?: number
  /** Length variation 0..1 across rays. Default 0.32. */
  lengthJitter?: number
  /**
   * How ray expansion evolves relative to opacity.
   * - `return` (default): startScale → peakScale → endScale with opacity phases
   * - `continuous`: startScale → endScale over the full lifetime (never reverses)
   */
  scaleMode?: LightBurstScaleMode
  /**
   * Scale at t=0. Default 1 (historical: rays appear at full length).
   * Use a lower value with `continuous` for grow-in expansion.
   */
  startScale?: number
  /** Scale at opacity peak / hold (`return` mode). Default 1. */
  peakScale?: number
  /**
   * Scale at the end of the animation. Default 1.
   * Use a value &gt; startScale with `continuous` for ongoing expansion during fade-out.
   */
  endScale?: number
  /**
   * Normalized progress (0..1) where opacity reaches its peak (start of hold).
   * When set, redistributes fade-in/fade-out while preserving hold and total duration.
   * When omitted, the default duration split is used (backward compatible).
   */
  peakAt?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over the card (default). `back` = behind artwork.
   */
  position?: LightBurstPosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedLightBurstOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  intensity: number
  rayCount: number
  rayLength: number
  rayWidth: number
  tipFlare: number
  duration: number
  originInset: number
  spreadJitter: number
  lengthJitter: number
  scaleMode: LightBurstScaleMode
  startScale: number
  peakScale: number
  endScale: number
  peakAt: number
  position: LightBurstPosition
  blendMode: number
  fadeInDuration: number
  holdDuration: number
  fadeOutDuration: number
}

export interface LightBurstRay {
  angle: number
  lengthScale: number
  widthScale: number
  alphaScale: number
}

export interface LightBurstSample {
  /** Opacity envelope 0..1 (before intensity). */
  alpha: number
  /** Ray expansion factor. */
  scale: number
  finished: boolean
}

const BLEND_ADD = 1

export const LIGHT_BURST_DEFAULTS: ResolvedLightBurstOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0xfff4dd,
  intensity: 0.7,
  rayCount: 12,
  rayLength: 80,
  rayWidth: 14,
  tipFlare: 3.2,
  duration: 420,
  originInset: 0.18,
  spreadJitter: 0.55,
  lengthJitter: 0.32,
  scaleMode: 'return',
  startScale: 1,
  peakScale: 1,
  endScale: 1,
  peakAt: 55 / 420,
  position: 'front',
  blendMode: BLEND_ADD,
  fadeInDuration: 55,
  holdDuration: 70,
  fadeOutDuration: 295,
}

function splitDuration(total: number): {
  fadeInDuration: number
  holdDuration: number
  fadeOutDuration: number
} {
  const safe = Math.max(total, 1)
  return {
    fadeInDuration: Math.round(safe * 0.13),
    holdDuration: Math.round(safe * 0.17),
    fadeOutDuration: Math.max(
      1,
      safe - Math.round(safe * 0.13) - Math.round(safe * 0.17),
    ),
  }
}

function smoothstep(t: number): number {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Deterministic pseudo-random in [0, 1) from integer seeds.
 * Stable for a given run seed + ray index.
 */
export function burstHash01(seed: number, salt: number): number {
  let n = (seed * 374761393 + salt * 668265263) | 0
  n = (n ^ (n >>> 13)) * 1274126177
  n = n ^ (n >>> 16)
  return ((n >>> 0) % 10000) / 10000
}

export function buildLightBurstRays(
  options: ResolvedLightBurstOptions,
  seed: number,
): LightBurstRay[] {
  const rays: LightBurstRay[] = []
  const step = (Math.PI * 2) / options.rayCount

  for (let i = 0; i < options.rayCount; i += 1) {
    const base = -Math.PI / 2 + i * step
    const jitter =
      (burstHash01(seed, i * 3 + 1) - 0.5) * 2 * options.spreadJitter * step
    const lengthScale =
      1 -
      options.lengthJitter * 0.5 +
      burstHash01(seed, i * 3 + 2) * options.lengthJitter
    const widthScale = 0.75 + burstHash01(seed, i * 3 + 3) * 0.7
    const alphaScale = 0.45 + burstHash01(seed, i * 3 + 4) * 0.4

    rays.push({
      angle: base + jitter,
      lengthScale,
      widthScale,
      alphaScale,
    })
  }

  return rays
}

/**
 * Samples opacity and ray expansion independently for one burst.
 * Opacity uses the effect's own fade-in → hold → fade-out split of `duration`.
 * Scale follows `scaleMode` and is never derived from fade direction alone.
 */
export function sampleLightBurstEnvelope(
  elapsedMs: number,
  options: ResolvedLightBurstOptions,
): LightBurstSample {
  const fadeIn = Math.max(options.fadeInDuration, 0)
  const hold = Math.max(options.holdDuration, 0)
  const fadeOut = Math.max(options.fadeOutDuration, 0)
  const total = Math.max(fadeIn + hold + fadeOut, 1)

  if (elapsedMs <= 0) {
    return { alpha: 0, scale: options.startScale, finished: false }
  }

  if (elapsedMs >= total) {
    return { alpha: 0, scale: options.endScale, finished: true }
  }

  const alpha = sampleLightBurstOpacity(elapsedMs, fadeIn, hold, fadeOut)
  const scale = sampleLightBurstScale(
    elapsedMs,
    fadeIn,
    hold,
    fadeOut,
    total,
    options,
  )
  return { alpha, scale, finished: false }
}

function sampleLightBurstOpacity(
  elapsedMs: number,
  fadeIn: number,
  hold: number,
  fadeOut: number,
): number {
  if (elapsedMs < fadeIn) {
    const t = fadeIn <= 0 ? 1 : elapsedMs / fadeIn
    // Ease-out quad — matches the historical Light Burst fade-in feel.
    return 1 - (1 - t) * (1 - t)
  }

  if (elapsedMs < fadeIn + hold) {
    return 1
  }

  const outT = fadeOut <= 0 ? 1 : (elapsedMs - fadeIn - hold) / fadeOut
  return Math.max(0, 1 - outT * outT * (3 - 2 * outT))
}

function sampleLightBurstScale(
  elapsedMs: number,
  fadeIn: number,
  hold: number,
  fadeOut: number,
  total: number,
  options: ResolvedLightBurstOptions,
): number {
  if (options.scaleMode === 'continuous') {
    // Rays keep opening for the entire lifetime — hold does not pause expansion.
    return lerp(
      options.startScale,
      options.endScale,
      smoothstep(elapsedMs / total),
    )
  }

  if (elapsedMs < fadeIn) {
    if (fadeIn <= 0) {
      return options.peakScale
    }
    return lerp(
      options.startScale,
      options.peakScale,
      smoothstep(elapsedMs / fadeIn),
    )
  }

  if (elapsedMs < fadeIn + hold) {
    return options.peakScale
  }

  if (fadeOut <= 0) {
    return options.endScale
  }

  const outT = (elapsedMs - fadeIn - hold) / fadeOut
  return lerp(options.peakScale, options.endScale, smoothstep(outT))
}

export function resolveLightBurstOptions(
  options: LightBurstOptions | undefined,
): ResolvedLightBurstOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? LIGHT_BURST_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? LIGHT_BURST_DEFAULTS.height, 1, 4096)
  const duration = clamp(
    raw.duration ?? LIGHT_BURST_DEFAULTS.duration,
    80,
    10_000,
  )
  let split = splitDuration(duration)
  let peakAt: number

  if (raw.peakAt != null && Number.isFinite(raw.peakAt)) {
    peakAt = clamp01(raw.peakAt)
    const total = Math.max(
      split.fadeInDuration + split.holdDuration + split.fadeOutDuration,
      1,
    )
    const fadeIn = clamp(
      peakAt * total,
      0,
      Math.max(total - split.holdDuration, 0),
    )
    split = {
      fadeInDuration: fadeIn,
      holdDuration: split.holdDuration,
      fadeOutDuration: Math.max(total - fadeIn - split.holdDuration, 0),
    }
  } else {
    peakAt =
      split.fadeInDuration /
      Math.max(
        split.fadeInDuration + split.holdDuration + split.fadeOutDuration,
        1,
      )
  }

  const position: LightBurstPosition =
    raw.position === 'back' ? 'back' : 'front'
  const scaleMode: LightBurstScaleMode =
    raw.scaleMode === 'continuous' ? 'continuous' : 'return'

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? LIGHT_BURST_DEFAULTS.cornerRadius),
      width,
      height,
      0,
    ),
    color: (raw.color ?? LIGHT_BURST_DEFAULTS.color) >>> 0,
    intensity: clamp(raw.intensity ?? LIGHT_BURST_DEFAULTS.intensity, 0, 2),
    rayCount: Math.floor(
      clamp(raw.rayCount ?? LIGHT_BURST_DEFAULTS.rayCount, 4, 48),
    ),
    rayLength: clamp(
      raw.rayLength ?? LIGHT_BURST_DEFAULTS.rayLength,
      8,
      512,
    ),
    rayWidth: clamp(raw.rayWidth ?? LIGHT_BURST_DEFAULTS.rayWidth, 1, 96),
    tipFlare: clamp(raw.tipFlare ?? LIGHT_BURST_DEFAULTS.tipFlare, 1, 8),
    duration,
    originInset: clamp(
      raw.originInset ?? LIGHT_BURST_DEFAULTS.originInset,
      0,
      0.6,
    ),
    spreadJitter: clamp(
      raw.spreadJitter ?? LIGHT_BURST_DEFAULTS.spreadJitter,
      0,
      1,
    ),
    lengthJitter: clamp(
      raw.lengthJitter ?? LIGHT_BURST_DEFAULTS.lengthJitter,
      0,
      1,
    ),
    scaleMode,
    startScale: clamp(
      raw.startScale ?? LIGHT_BURST_DEFAULTS.startScale,
      0.05,
      8,
    ),
    peakScale: clamp(raw.peakScale ?? LIGHT_BURST_DEFAULTS.peakScale, 0.05, 8),
    endScale: clamp(raw.endScale ?? LIGHT_BURST_DEFAULTS.endScale, 0.05, 8),
    peakAt,
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : LIGHT_BURST_DEFAULTS.blendMode,
    ...split,
  }
}
