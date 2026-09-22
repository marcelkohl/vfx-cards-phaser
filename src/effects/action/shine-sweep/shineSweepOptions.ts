import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type ShineSweepOrientation = 'diagonal' | 'horizontal' | 'vertical'
/**
 * Travel sense:
 * - `forward` — top→bottom / left→right (and TL→BR on diagonal)
 * - `backward` — bottom→top / right→left (and BR→TL on diagonal)
 */
export type ShineSweepDirection = 'forward' | 'backward'

export interface ShineSweepOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Sweep color as 0xRRGGBB. Default white. */
  color?: number
  /** Soft band half-width in local pixels (full visual width ≈ 2×). */
  bandWidth?: number
  /** Duration of one full pass in milliseconds. */
  speed?: number
  /** Visual strength of the highlight. */
  intensity?: number
  /** Final alpha multiplier (0..1). */
  opacity?: number
  /** Softness of the band falloff curve after dispersion starts (0 = sharper, 1 = gentler). */
  softness?: number
  /**
   * Where the bright core starts dispersing, as a fraction of band half-width (0..1).
   * - `0.0` — falloff from the center (even / proportional margins)
   * - `0.5` — solid core until mid-band, then soft skirts
   * - closer to `1.0` — condensed center, wide soft transition
   */
  dispersion?: number
  /** Optional inset of the clip path from the frame edge, in pixels. */
  padding?: number
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
  /**
   * Travel axis of the band.
   * - `diagonal` — TL↔BR
   * - `horizontal` — left↔right
   * - `vertical` — top↔bottom
   */
  orientation?: ShineSweepOrientation
  /**
   * Travel sense along the orientation.
   * - `forward` — top→bottom, left→right
   * - `backward` — bottom→top, right→left
   */
  direction?: ShineSweepDirection
}

export interface ResolvedShineSweepOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  bandWidth: number
  speed: number
  intensity: number
  opacity: number
  softness: number
  dispersion: number
  padding: number
  blendMode: number
  orientation: ShineSweepOrientation
  direction: ShineSweepDirection
  /** Unit travel vector in local space (+X right, +Y up). */
  dirX: number
  dirY: number
}

const BLEND_ADD = 1
const SQRT_HALF = Math.SQRT1_2

const ORIENTATIONS = new Set<ShineSweepOrientation>([
  'diagonal',
  'horizontal',
  'vertical',
])

const DIRECTIONS = new Set<ShineSweepDirection>(['forward', 'backward'])

/** Legacy aliases still accepted in resolve(). */
const DIRECTION_ALIASES: Record<string, ShineSweepDirection> = {
  forward: 'forward',
  backward: 'backward',
  'top-bottom': 'forward',
  'left-right': 'forward',
  'bottom-top': 'backward',
  'right-left': 'backward',
}

/**
 * Resolves the unit travel direction for the shine head.
 *
 * | orientation | forward           | backward          |
 * |-------------|-------------------|-------------------|
 * | diagonal    | top-left → BR     | bottom-right → TL |
 * | vertical    | top → bottom      | bottom → top      |
 * | horizontal  | left → right      | right → left      |
 */
export function resolveShineTravelDir(
  orientation: ShineSweepOrientation,
  direction: ShineSweepDirection,
): { dirX: number; dirY: number } {
  const forward = direction === 'forward'

  if (orientation === 'vertical') {
    return forward ? { dirX: 0, dirY: -1 } : { dirX: 0, dirY: 1 }
  }

  if (orientation === 'horizontal') {
    return forward ? { dirX: 1, dirY: 0 } : { dirX: -1, dirY: 0 }
  }

  return forward
    ? { dirX: SQRT_HALF, dirY: -SQRT_HALF }
    : { dirX: -SQRT_HALF, dirY: SQRT_HALF }
}

export const SHINE_SWEEP_DEFAULTS: ResolvedShineSweepOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0xffffff,
  bandWidth: 42,
  speed: 2800,
  intensity: 0.85,
  opacity: 0.7,
  softness: 0.75,
  dispersion: 0,
  padding: 0,
  blendMode: BLEND_ADD,
  orientation: 'diagonal',
  direction: 'forward',
  dirX: SQRT_HALF,
  dirY: -SQRT_HALF,
}

/**
 * Samples a single `run()` pass.
 * `finished` is true once `elapsedMs` reaches `speed`.
 */
export function sampleShinePlayback(
  elapsedMs: number,
  speed: number,
): { progress: number; finished: boolean } {
  const duration = Math.max(speed, 1)

  if (elapsedMs >= duration) {
    return { progress: 1, finished: true }
  }

  return { progress: elapsedMs / duration, finished: false }
}

export function resolveShineSweepOptions(
  options: ShineSweepOptions | undefined,
): ResolvedShineSweepOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? SHINE_SWEEP_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? SHINE_SWEEP_DEFAULTS.height, 1, 4096)
  const padding = clamp(raw.padding ?? SHINE_SWEEP_DEFAULTS.padding, -32, 64)
  const pathWidth = Math.max(1, width + padding * 2)
  const pathHeight = Math.max(1, height + padding * 2)
  const frameRadius = Math.max(
    0,
    raw.cornerRadius ?? SHINE_SWEEP_DEFAULTS.cornerRadius,
  )
  const pathRadius =
    frameRadius <= 0 ? 0 : Math.max(0, frameRadius + padding)

  const orientation = ORIENTATIONS.has(raw.orientation as ShineSweepOrientation)
    ? (raw.orientation as ShineSweepOrientation)
    : SHINE_SWEEP_DEFAULTS.orientation
  const direction =
    DIRECTION_ALIASES[String(raw.direction ?? '')] ??
    (DIRECTIONS.has(raw.direction as ShineSweepDirection)
      ? (raw.direction as ShineSweepDirection)
      : SHINE_SWEEP_DEFAULTS.direction)
  const travel = resolveShineTravelDir(orientation, direction)

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(pathRadius, pathWidth, pathHeight, 0),
    color: (raw.color ?? SHINE_SWEEP_DEFAULTS.color) >>> 0,
    bandWidth: clamp(
      raw.bandWidth ?? SHINE_SWEEP_DEFAULTS.bandWidth,
      4,
      256,
    ),
    speed: clamp(raw.speed ?? SHINE_SWEEP_DEFAULTS.speed, 400, 60_000),
    intensity: clamp(
      raw.intensity ?? SHINE_SWEEP_DEFAULTS.intensity,
      0,
      4,
    ),
    opacity: clamp01(raw.opacity ?? SHINE_SWEEP_DEFAULTS.opacity),
    softness: clamp01(raw.softness ?? SHINE_SWEEP_DEFAULTS.softness),
    dispersion: clamp01(raw.dispersion ?? SHINE_SWEEP_DEFAULTS.dispersion),
    padding,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : SHINE_SWEEP_DEFAULTS.blendMode,
    orientation,
    direction,
    dirX: travel.dirX,
    dirY: travel.dirY,
  }
}
