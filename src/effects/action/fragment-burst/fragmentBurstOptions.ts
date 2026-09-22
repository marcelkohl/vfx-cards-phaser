import {
  clamp,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type FragmentBurstPosition = 'back' | 'front'

export type FragmentBurstSpawnRegion =
  | 'center'
  | 'edge'
  | 'area'
  | 'mixed'

export type FragmentBurstShape = 'feather' | 'leaf' | 'shard' | 'petal'

export interface FragmentBurstOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Fragment tint as 0xRRGGBB. Default soft mint. */
  color?: number
  /** Peak brightness multiplier (0..2). Default 0.85. */
  intensity?: number
  /** Number of fragments. Default 18. */
  fragmentCount?: number
  /** Total animation duration in milliseconds. Default 1100. */
  duration?: number
  /** Minimum outward travel distance in pixels. Default 48. */
  minTravel?: number
  /** Maximum outward travel distance in pixels. Default 120. */
  maxTravel?: number
  /** Minimum fragment length in pixels. Default 10. */
  minSize?: number
  /** Maximum fragment length in pixels. Default 22. */
  maxSize?: number
  /**
   * Max |spin| in radians over a fragment's life. Default ~2.4 (~138°).
   * Individual fragments sample within ±this amount.
   */
  rotationAmount?: number
  /**
   * Path curvature strength in pixels (lateral drift amplitude). Default 28.
   * 0 = nearly straight radial paths.
   */
  curvature?: number
  /**
   * How far inside the frame fragments may spawn (0 = near edge, 1 = deep center).
   * Used with edge/area/mixed regions. Default 0.22.
   */
  spawnInset?: number
  /** Extra spawn position jitter in pixels. Default 10. */
  spawnJitter?: number
  /**
   * Where fragments originate.
   * - `edge` — near the frame perimeter (default reference look)
   * - `center` — near the middle
   * - `area` — anywhere inside the frame
   * - `mixed` — mostly edges with a few interior pieces
   */
  spawnRegion?: FragmentBurstSpawnRegion
  /**
   * Normalized progress (0..1) within each fragment's life when fade begins.
   * Default 0.45 — visible early, soft dissolve later.
   */
  fadeStart?: number
  /**
   * Max start-delay spread across fragments, in milliseconds. Default 180.
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
  position?: FragmentBurstPosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
  /**
   * Optional scene texture keys for custom fragment sprites.
   * When provided and loaded, those textures replace procedural shapes
   * (cycled by fragment index). Procedural shapes remain the default.
   */
  textureKeys?: string[]
}

export interface ResolvedFragmentBurstOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  intensity: number
  fragmentCount: number
  duration: number
  minTravel: number
  maxTravel: number
  minSize: number
  maxSize: number
  rotationAmount: number
  curvature: number
  spawnInset: number
  spawnJitter: number
  spawnRegion: FragmentBurstSpawnRegion
  fadeStart: number
  startDelaySpread: number
  seed: number
  position: FragmentBurstPosition
  blendMode: number
  textureKeys: string[]
}

export interface FragmentBurstFragment {
  shape: FragmentBurstShape
  originX: number
  originY: number
  angle: number
  travelDistance: number
  curvature: number
  spin: number
  startRotation: number
  size: number
  aspect: number
  delayMs: number
  lifeMs: number
  fadeStart: number
  alphaScale: number
  /** Index into `textureKeys` when custom textures are used; otherwise -1. */
  textureIndex: number
}

const BLEND_ADD = 1

const SHAPES: FragmentBurstShape[] = ['feather', 'leaf', 'shard', 'petal']

export const FRAGMENT_BURST_DEFAULTS: ResolvedFragmentBurstOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0xc8fff4,
  intensity: 0.85,
  fragmentCount: 18,
  duration: 1100,
  minTravel: 48,
  maxTravel: 120,
  minSize: 10,
  maxSize: 22,
  rotationAmount: 2.4,
  curvature: 28,
  spawnInset: 0.22,
  spawnJitter: 10,
  spawnRegion: 'mixed',
  fadeStart: 0.45,
  startDelaySpread: 180,
  seed: 1,
  position: 'front',
  blendMode: BLEND_ADD,
  textureKeys: [],
}

/**
 * Deterministic pseudo-random in [0, 1) from integer seeds.
 * Stable for a given seed + fragment salt.
 */
export function fragmentHash01(seed: number, salt: number): number {
  let n = (seed * 374761393 + salt * 668265263) | 0
  n = (n ^ (n >>> 13)) * 1274126177
  n = n ^ (n >>> 16)
  return ((n >>> 0) % 10000) / 10000
}

function pickSpawnRegion(
  region: FragmentBurstSpawnRegion,
  seed: number,
  index: number,
): FragmentBurstSpawnRegion {
  if (region !== 'mixed') {
    return region
  }
  // Mostly edges, with a few interior pieces (reference look).
  return fragmentHash01(seed, index * 17 + 3) < 0.28 ? 'area' : 'edge'
}

function spawnPoint(
  options: ResolvedFragmentBurstOptions,
  seed: number,
  index: number,
): { x: number; y: number } {
  const halfW = options.width / 2
  const halfH = options.height / 2
  const inset = options.spawnInset
  const jitter = options.spawnJitter
  const region = pickSpawnRegion(options.spawnRegion, seed, index)

  let x = 0
  let y = 0

  if (region === 'center') {
    x = (fragmentHash01(seed, index * 11 + 1) - 0.5) * halfW * 0.35
    y = (fragmentHash01(seed, index * 11 + 2) - 0.5) * halfH * 0.35
  } else if (region === 'area') {
    const innerW = halfW * (1 - inset * 0.5)
    const innerH = halfH * (1 - inset * 0.5)
    x = (fragmentHash01(seed, index * 11 + 1) - 0.5) * 2 * innerW
    y = (fragmentHash01(seed, index * 11 + 2) - 0.5) * 2 * innerH
  } else {
    // Edge: walk the rectangle perimeter, then pull slightly inward.
    const perimeter = 2 * (options.width + options.height)
    const t = fragmentHash01(seed, index * 11 + 1) * perimeter
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
    x *= 1 - inset * 0.55
    y *= 1 - inset * 0.55
  }

  x += (fragmentHash01(seed, index * 11 + 4) - 0.5) * 2 * jitter
  y += (fragmentHash01(seed, index * 11 + 5) - 0.5) * 2 * jitter
  return { x, y }
}

export function buildFragmentBurstFragments(
  options: ResolvedFragmentBurstOptions,
  seed: number = options.seed,
): FragmentBurstFragment[] {
  const fragments: FragmentBurstFragment[] = []
  const travelSpan = Math.max(options.maxTravel - options.minTravel, 0)
  const sizeSpan = Math.max(options.maxSize - options.minSize, 0)
  const textureCount = options.textureKeys.length

  for (let i = 0; i < options.fragmentCount; i += 1) {
    const origin = spawnPoint(options, seed, i)
    // Prefer outward from center, with controlled angular jitter.
    const baseAngle = Math.atan2(origin.y, origin.x)
    const angleJitter =
      (fragmentHash01(seed, i * 13 + 6) - 0.5) * Math.PI * 0.55
    // Fragments near center get a fully free direction.
    const nearCenter = Math.hypot(origin.x, origin.y) < 12
    const angle = nearCenter
      ? fragmentHash01(seed, i * 13 + 7) * Math.PI * 2
      : baseAngle + angleJitter

    const delayMs =
      fragmentHash01(seed, i * 13 + 8) * options.startDelaySpread
    const remaining = Math.max(options.duration - delayMs, 80)
    const lifeMs = remaining * (0.62 + fragmentHash01(seed, i * 13 + 9) * 0.38)

    const curveSign = fragmentHash01(seed, i * 13 + 10) < 0.5 ? -1 : 1
    const curveMag =
      options.curvature *
      (0.35 + fragmentHash01(seed, i * 13 + 11) * 0.9) *
      curveSign

    const shape =
      SHAPES[Math.floor(fragmentHash01(seed, i * 13 + 12) * SHAPES.length)]!

    fragments.push({
      shape,
      originX: origin.x,
      originY: origin.y,
      angle,
      travelDistance:
        options.minTravel + fragmentHash01(seed, i * 13 + 13) * travelSpan,
      curvature: curveMag,
      spin:
        (fragmentHash01(seed, i * 13 + 14) - 0.5) * 2 * options.rotationAmount,
      startRotation: fragmentHash01(seed, i * 13 + 15) * Math.PI * 2,
      size: options.minSize + fragmentHash01(seed, i * 13 + 16) * sizeSpan,
      aspect: 0.28 + fragmentHash01(seed, i * 13 + 17) * 0.42,
      delayMs,
      lifeMs,
      fadeStart:
        options.fadeStart * (0.85 + fragmentHash01(seed, i * 13 + 18) * 0.3),
      alphaScale: 0.55 + fragmentHash01(seed, i * 13 + 19) * 0.45,
      textureIndex: textureCount > 0 ? i % textureCount : -1,
    })
  }

  return fragments
}

export interface FragmentBurstSample {
  x: number
  y: number
  rotation: number
  alpha: number
  visible: boolean
  finished: boolean
}

export function sampleFragmentBurstFragment(
  fragment: FragmentBurstFragment,
  elapsedMs: number,
): FragmentBurstSample {
  const local = elapsedMs - fragment.delayMs
  if (local < 0) {
    return {
      x: fragment.originX,
      y: fragment.originY,
      rotation: fragment.startRotation,
      alpha: 0,
      visible: false,
      finished: false,
    }
  }

  const life = Math.max(fragment.lifeMs, 1)
  if (local >= life) {
    return {
      x: fragment.originX,
      y: fragment.originY,
      rotation: fragment.startRotation + fragment.spin,
      alpha: 0,
      visible: false,
      finished: true,
    }
  }

  const t = local / life
  // Ease-out travel so fragments decelerate elegantly.
  const eased = 1 - Math.pow(1 - t, 2.35)
  const travel = fragment.travelDistance * eased
  // Lateral arc peaks mid-flight.
  const drift = fragment.curvature * Math.sin(eased * Math.PI)

  const cos = Math.cos(fragment.angle)
  const sin = Math.sin(fragment.angle)
  const px = -sin
  const py = cos

  const x = fragment.originX + cos * travel + px * drift
  const y = fragment.originY + sin * travel + py * drift
  const rotation = fragment.startRotation + fragment.spin * eased

  const fadeStart = clamp(fragment.fadeStart, 0.05, 0.95)
  let alpha: number
  if (t < 0.08) {
    const appear = t / 0.08
    alpha = appear * appear * fragment.alphaScale
  } else if (t < fadeStart) {
    alpha = fragment.alphaScale
  } else {
    const ft = (t - fadeStart) / (1 - fadeStart)
    const faded = 1 - ft * ft * (3 - 2 * ft)
    alpha = Math.max(0, faded) * fragment.alphaScale
  }

  return {
    x,
    y,
    rotation,
    alpha,
    visible: alpha > 0.004,
    finished: false,
  }
}

export function sampleFragmentBurstFinished(
  elapsedMs: number,
  options: ResolvedFragmentBurstOptions,
): boolean {
  return elapsedMs >= Math.max(options.duration, 1)
}

function resolveSpawnRegion(
  value: FragmentBurstSpawnRegion | undefined,
): FragmentBurstSpawnRegion {
  if (
    value === 'center' ||
    value === 'edge' ||
    value === 'area' ||
    value === 'mixed'
  ) {
    return value
  }
  return FRAGMENT_BURST_DEFAULTS.spawnRegion
}

export function resolveFragmentBurstOptions(
  options: FragmentBurstOptions | undefined,
): ResolvedFragmentBurstOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? FRAGMENT_BURST_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? FRAGMENT_BURST_DEFAULTS.height, 1, 4096)
  const minTravel = clamp(
    raw.minTravel ?? FRAGMENT_BURST_DEFAULTS.minTravel,
    4,
    512,
  )
  const maxTravel = clamp(
    raw.maxTravel ?? FRAGMENT_BURST_DEFAULTS.maxTravel,
    minTravel,
    768,
  )
  const minSize = clamp(
    raw.minSize ?? FRAGMENT_BURST_DEFAULTS.minSize,
    2,
    96,
  )
  const maxSize = clamp(
    raw.maxSize ?? FRAGMENT_BURST_DEFAULTS.maxSize,
    minSize,
    128,
  )
  const position: FragmentBurstPosition =
    raw.position === 'back' ? 'back' : 'front'

  const textureKeys = Array.isArray(raw.textureKeys)
    ? raw.textureKeys.filter(
        (key): key is string => typeof key === 'string' && key.length > 0,
      )
    : []

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? FRAGMENT_BURST_DEFAULTS.cornerRadius),
      width,
      height,
      0,
    ),
    color: (raw.color ?? FRAGMENT_BURST_DEFAULTS.color) >>> 0,
    intensity: clamp(
      raw.intensity ?? FRAGMENT_BURST_DEFAULTS.intensity,
      0,
      2,
    ),
    fragmentCount: Math.floor(
      clamp(
        raw.fragmentCount ?? FRAGMENT_BURST_DEFAULTS.fragmentCount,
        1,
        96,
      ),
    ),
    duration: clamp(
      raw.duration ?? FRAGMENT_BURST_DEFAULTS.duration,
      120,
      20_000,
    ),
    minTravel,
    maxTravel,
    minSize,
    maxSize,
    rotationAmount: clamp(
      raw.rotationAmount ?? FRAGMENT_BURST_DEFAULTS.rotationAmount,
      0,
      Math.PI * 6,
    ),
    curvature: clamp(
      raw.curvature ?? FRAGMENT_BURST_DEFAULTS.curvature,
      0,
      200,
    ),
    spawnInset: clamp(
      raw.spawnInset ?? FRAGMENT_BURST_DEFAULTS.spawnInset,
      0,
      0.85,
    ),
    spawnJitter: clamp(
      raw.spawnJitter ?? FRAGMENT_BURST_DEFAULTS.spawnJitter,
      0,
      64,
    ),
    spawnRegion: resolveSpawnRegion(raw.spawnRegion),
    fadeStart: clamp(
      raw.fadeStart ?? FRAGMENT_BURST_DEFAULTS.fadeStart,
      0.05,
      0.95,
    ),
    startDelaySpread: clamp(
      raw.startDelaySpread ?? FRAGMENT_BURST_DEFAULTS.startDelaySpread,
      0,
      2000,
    ),
    seed: Math.floor(
      clamp(raw.seed ?? FRAGMENT_BURST_DEFAULTS.seed, 0, 1_000_000),
    ),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : FRAGMENT_BURST_DEFAULTS.blendMode,
    textureKeys,
  }
}
