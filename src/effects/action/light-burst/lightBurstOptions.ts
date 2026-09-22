import {
  clamp,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type LightBurstPosition = 'back' | 'front'

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

export function sampleLightBurstEnvelope(
  elapsedMs: number,
  options: ResolvedLightBurstOptions,
): { alpha: number; finished: boolean } {
  const fadeIn = Math.max(options.fadeInDuration, 0)
  const hold = Math.max(options.holdDuration, 0)
  const fadeOut = Math.max(options.fadeOutDuration, 0)
  const total = Math.max(fadeIn + hold + fadeOut, 1)

  if (elapsedMs >= total) {
    return { alpha: 0, finished: true }
  }

  if (elapsedMs < fadeIn) {
    const t = fadeIn <= 0 ? 1 : elapsedMs / fadeIn
    const eased = 1 - (1 - t) * (1 - t)
    return { alpha: eased, finished: false }
  }

  if (elapsedMs < fadeIn + hold) {
    return { alpha: 1, finished: false }
  }

  const outT = fadeOut <= 0 ? 1 : (elapsedMs - fadeIn - hold) / fadeOut
  const eased = 1 - outT * outT * (3 - 2 * outT)
  return { alpha: Math.max(0, eased), finished: false }
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
  const split = splitDuration(duration)
  const position: LightBurstPosition =
    raw.position === 'back' ? 'back' : 'front'

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
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : LIGHT_BURST_DEFAULTS.blendMode,
    ...split,
  }
}
