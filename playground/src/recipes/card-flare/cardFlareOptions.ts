import type {
  ConvergingFrameOptions,
  LightBurstOptions,
  RadialGlowOptions,
  StarFlareOptions,
} from 'phaser-vfx-effects'

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

function resolveCornerRadius(
  requested: number,
  width: number,
  height: number,
): number {
  const maxRadius = Math.min(width / 2, height / 2)
  if (!Number.isFinite(requested) || requested < 0) {
    return 0
  }
  return Math.min(requested, maxRadius)
}

export interface CardFlareOptions {
  width?: number
  height?: number
  cornerRadius?: number
  /** First converging pass. */
  frame1?: ConvergingFrameOptions
  /** Second converging pass. */
  frame2?: ConvergingFrameOptions
  /** Third converging pass. */
  frame3?: ConvergingFrameOptions
  lightBurst?: LightBurstOptions
  starFlare?: StarFlareOptions
  radialGlow?: RadialGlowOptions
  /** Offset (ms) for frame 1 start. Default 0. */
  frame1At?: number
  /** Offset (ms) for frame 2 start. Default 120. */
  frame2At?: number
  /** Offset (ms) for frame 3 start. Default 240. */
  frame3At?: number
  /** Offset (ms) for Light Burst start. Default 300. */
  lightBurstAt?: number
  /** Offset (ms) for Star Flare start. Default 310. */
  starFlareAt?: number
  /** Offset (ms) for Radial Glow start. Default 305. */
  radialGlowAt?: number
}

export interface ResolvedCardFlareOptions {
  width: number
  height: number
  cornerRadius: number
  frame1: ConvergingFrameOptions
  frame2: ConvergingFrameOptions
  frame3: ConvergingFrameOptions
  lightBurst: LightBurstOptions
  starFlare: StarFlareOptions
  radialGlow: RadialGlowOptions
  frame1At: number
  frame2At: number
  frame3At: number
  lightBurstAt: number
  starFlareAt: number
  radialGlowAt: number
}

/**
 * Coherent blue / cyan palette for the whole event.
 * Frames = luminous blue; burst = softer cyan; star core = pale hot spot;
 * halo = same cyan family, low energy.
 */
const FRAME_BLUE = 0x4ec8ff
const BURST_CYAN = 0x66ddff
const STAR_HOT = 0xf2fcff
const HALO_CYAN = 0x4ec8ff

/**
 * Tunnel base — large start scale, long enough that staggered passes overlap.
 * Bright soft edge glow (not a subtle border).
 * `fadeOutDuration` is residual ghost after endScale (Converging Frame semantics).
 */
const FRAME_BASE: ConvergingFrameOptions = {
  color: FRAME_BLUE,
  intensity: 1.35,
  startScale: 1.3,
  endScale: 1,
  duration: 420,
  fadeInDuration: 45,
  fadeOutDuration: 160,
  innerCoverage: 0.1,
  softness: 0.88,
  cornerFocus: 0.92,
  opacity: 0.95,
  position: 'front',
}

export const CARD_FLARE_FRAME1_DEFAULTS: ConvergingFrameOptions = {
  ...FRAME_BASE,
  startScale: 1.32,
  intensity: 1.25,
  opacity: 0.92,
}

export const CARD_FLARE_FRAME2_DEFAULTS: ConvergingFrameOptions = {
  ...FRAME_BASE,
  startScale: 1.3,
  intensity: 1.4,
  opacity: 0.96,
  duration: 400,
}

export const CARD_FLARE_FRAME3_DEFAULTS: ConvergingFrameOptions = {
  ...FRAME_BASE,
  startScale: 1.26,
  intensity: 1.3,
  opacity: 0.94,
  duration: 380,
  fadeOutDuration: 200,
}

/**
 * Large-area radial energy — visible but translucent, long expanding tail.
 * Peaks with the star; outlives it. Stronger than a subtle accent so rays
 * read clearly over artwork and against the cyan frames.
 */
export const CARD_FLARE_LIGHT_BURST_DEFAULTS: LightBurstOptions = {
  color: BURST_CYAN,
  intensity: 0.78,
  rayCount: 12,
  rayLength: 118,
  rayWidth: 14,
  tipFlare: 3.3,
  duration: 820,
  originInset: 0.3,
  spreadJitter: 0.5,
  lengthJitter: 0.28,
  position: 'front',
  scaleMode: 'continuous',
  startScale: 0.5,
  endScale: 1.45,
  // Absolute peak ≈ lightBurstAt + 0.125 * duration ≈ 300 + 103 ≈ 403 ms
  peakAt: 0.125,
}

/**
 * Focal impact — compact hot core, readable thin streaks, clearly opaque peak.
 * Longer than a blink (~400 ms) so the viewer registers the ✦; still shorter
 * than the Light Burst tail. Continuous expand while fading.
 */
export const CARD_FLARE_STAR_FLARE_DEFAULTS: StarFlareOptions = {
  color: STAR_HOT,
  intensity: 1.65,
  opacity: 1,
  horizontalLength: 320,
  verticalLength: 180,
  horizontalThickness: 5,
  verticalThickness: 3.5,
  glowRadius: 10,
  positionX: 0.5,
  positionY: 0.5,
  fadeInDuration: 50,
  holdDuration: 45,
  fadeOutDuration: 305,
  // total ≈ 400 ms → absolute peak ≈ starFlareAt + 0.23 * 400 ≈ 310 + 92 ≈ 402 ms
  position: 'front',
  scaleMode: 'continuous',
  startScale: 0.4,
  endScale: 1.12,
  peakAt: 0.23,
}

/**
 * Subtle expanding optical halo — atmospheric support for the impact.
 * Keeps the standalone Radial Glow subtle intensity; shorter fade-in so the
 * peak lands in the shared impact window (~400 ms absolute).
 *
 * Lifetime ≈ 100 + 55 + 280 = 435 ms
 * Absolute peak ≈ radialGlowAt + 100 ≈ 405 ms
 * Ends ≈ 305 + 435 = 740 ms (after star, before Light Burst finishes)
 */
export const CARD_FLARE_RADIAL_GLOW_DEFAULTS: RadialGlowOptions = {
  color: HALO_CYAN,
  intensity: 0.3,
  opacity: 0.82,
  radius: 125,
  aspect: 1.1,
  ringWidth: 1.5,
  rimIntensity: 2.4,
  innerTrail: 0.5,
  outerGlow: 0.09,
  positionX: 0.5,
  positionY: 0.5,
  startScale: 0.72,
  endScale: 1.18,
  fadeInDuration: 100,
  holdDuration: 55,
  fadeOutDuration: 280,
  softness: 0.68,
  position: 'front',
}

export const CARD_FLARE_DEFAULTS: ResolvedCardFlareOptions = {
  width: 220,
  height: 320,
  cornerRadius: 18,
  frame1: { ...CARD_FLARE_FRAME1_DEFAULTS },
  frame2: { ...CARD_FLARE_FRAME2_DEFAULTS },
  frame3: { ...CARD_FLARE_FRAME3_DEFAULTS },
  lightBurst: { ...CARD_FLARE_LIGHT_BURST_DEFAULTS },
  starFlare: { ...CARD_FLARE_STAR_FLARE_DEFAULTS },
  radialGlow: { ...CARD_FLARE_RADIAL_GLOW_DEFAULTS },
  // Phase 1 — tunnel establishes first
  frame1At: 0,
  frame2At: 120,
  frame3At: 240,
  // Phase 2 — impact near end of tunnel (frame 3 still approaching card)
  lightBurstAt: 300,
  radialGlowAt: 305,
  starFlareAt: 310,
}

export function resolveCardFlareOptions(
  options: CardFlareOptions | undefined,
): ResolvedCardFlareOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? CARD_FLARE_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? CARD_FLARE_DEFAULTS.height, 1, 4096)

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? CARD_FLARE_DEFAULTS.cornerRadius),
      width,
      height,
    ),
    frame1: {
      ...CARD_FLARE_FRAME1_DEFAULTS,
      ...(raw.frame1 ?? {}),
    },
    frame2: {
      ...CARD_FLARE_FRAME2_DEFAULTS,
      ...(raw.frame2 ?? {}),
    },
    frame3: {
      ...CARD_FLARE_FRAME3_DEFAULTS,
      ...(raw.frame3 ?? {}),
    },
    lightBurst: {
      ...CARD_FLARE_LIGHT_BURST_DEFAULTS,
      ...(raw.lightBurst ?? {}),
    },
    starFlare: {
      ...CARD_FLARE_STAR_FLARE_DEFAULTS,
      ...(raw.starFlare ?? {}),
    },
    radialGlow: {
      ...CARD_FLARE_RADIAL_GLOW_DEFAULTS,
      ...(raw.radialGlow ?? {}),
    },
    frame1At: clamp(raw.frame1At ?? CARD_FLARE_DEFAULTS.frame1At, 0, 10_000),
    frame2At: clamp(raw.frame2At ?? CARD_FLARE_DEFAULTS.frame2At, 0, 10_000),
    frame3At: clamp(raw.frame3At ?? CARD_FLARE_DEFAULTS.frame3At, 0, 10_000),
    lightBurstAt: clamp(
      raw.lightBurstAt ?? CARD_FLARE_DEFAULTS.lightBurstAt,
      0,
      10_000,
    ),
    starFlareAt: clamp(
      raw.starFlareAt ?? CARD_FLARE_DEFAULTS.starFlareAt,
      0,
      10_000,
    ),
    radialGlowAt: clamp(
      raw.radialGlowAt ?? CARD_FLARE_DEFAULTS.radialGlowAt,
      0,
      10_000,
    ),
  }
}
