import {
  clamp,
  EFFECT_FRAME_DEFAULTS,
  resolveCornerRadius,
} from '../../../core/effectConfig'

export type RisingStarPosition = 'back' | 'front'

export type RisingStarDirection = 'up' | 'down' | 'left' | 'right'

export type RisingStarSpawnRegion =
  | 'top'
  | 'sides'
  | 'area'
  | 'mixed'

export interface RisingStarOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Corner radius matching the target frame. `0` = sharp. */
  cornerRadius?: number
  /** Star tint as 0xRRGGBB. Default soft warm white. */
  color?: number
  /** Peak brightness multiplier (0..2). Default 1.05. */
  intensity?: number
  /** Global opacity multiplier (0..1). Default 0.95. */
  opacity?: number
  /** Number of rising stars. Default 5. */
  starCount?: number
  /** Total animation duration in milliseconds. Default 1100. */
  duration?: number
  /**
   * Travel direction of the star.
   * `'up'` | `'down'` | `'left'` | `'right'`. Default `'up'`.
   */
  direction?: RisingStarDirection
  /** Minimum travel distance in pixels. Default 48. */
  minRise?: number
  /** Maximum travel distance in pixels. Default 110. */
  maxRise?: number
  /** Minimum star-core size in pixels. Default 6. */
  minSize?: number
  /** Maximum star-core size in pixels. Default 14. */
  maxSize?: number
  /**
   * Vertical streak length in pixels (tip to tip, local Y).
   * Example: `7`. Default 36.
   */
  verticalLength?: number
  /**
   * Horizontal streak / glint length in pixels (tip to tip, local X).
   * Example: `2`. Default 12. Set `0` to hide the horizontal arm.
   */
  horizontalLength?: number
  /** Soft halo radius as a multiple of star-core size. Default 1.45. */
  haloScale?: number
  /** Max |perpendicular drift| over the travel, in pixels. Default 8. */
  driftAmount?: number
  /** Extra spawn position jitter in pixels. Default 10. */
  spawnJitter?: number
  /**
   * Where stars originate.
   * - `mixed` / `area` — balanced across the frame (regions + seeded variation)
   * - `top` — evenly along the upper edge
   * - `sides` — alternating left/right, spaced top → bottom
   */
  spawnRegion?: RisingStarSpawnRegion
  /**
   * Normalized progress (0..1) within each star's life when fade-out begins.
   * Default 0.38.
   */
  fadeStart?: number
  /**
   * Fraction of each star's life spent fading in. Default 0.12.
   */
  fadeInPortion?: number
  /**
   * Max start-delay spread across stars, in milliseconds. Default 280.
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
  position?: RisingStarPosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedRisingStarOptions {
  width: number
  height: number
  cornerRadius: number
  color: number
  intensity: number
  opacity: number
  starCount: number
  duration: number
  direction: RisingStarDirection
  minRise: number
  maxRise: number
  minSize: number
  maxSize: number
  verticalLength: number
  horizontalLength: number
  haloScale: number
  driftAmount: number
  spawnJitter: number
  spawnRegion: RisingStarSpawnRegion
  fadeStart: number
  fadeInPortion: number
  startDelaySpread: number
  seed: number
  position: RisingStarPosition
  blendMode: number
}

export interface RisingStarInstance {
  originX: number
  originY: number
  /** Unit travel vector. */
  moveX: number
  moveY: number
  /** Unit perpendicular vector (for soft drift). */
  perpX: number
  perpY: number
  travelDistance: number
  drift: number
  size: number
  /** Full tip-to-tip vertical streak length in pixels. */
  verticalLength: number
  /** Full tip-to-tip horizontal streak length in pixels. */
  horizontalLength: number
  haloScale: number
  delayMs: number
  lifeMs: number
  fadeStart: number
  fadeInPortion: number
  alphaScale: number
  peakScale: number
}

const BLEND_ADD = 1

export const RISING_STAR_DEFAULTS: ResolvedRisingStarOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  cornerRadius: 18,
  color: 0xfff4d8,
  intensity: 1.05,
  opacity: 0.95,
  starCount: 5,
  duration: 1100,
  direction: 'up',
  minRise: 48,
  maxRise: 110,
  minSize: 6,
  maxSize: 14,
  verticalLength: 36,
  horizontalLength: 12,
  haloScale: 1.45,
  driftAmount: 8,
  spawnJitter: 10,
  spawnRegion: 'mixed',
  fadeStart: 0.38,
  fadeInPortion: 0.12,
  startDelaySpread: 280,
  seed: 1,
  position: 'front',
  blendMode: BLEND_ADD,
}

/**
 * Deterministic pseudo-random in [0, 1) from integer seeds.
 * Stable for a given seed + star salt.
 */
export function risingStarHash01(seed: number, salt: number): number {
  let n = (seed * 374761393 + salt * 668265263) | 0
  n = (n ^ (n >>> 13)) * 1274126177
  n = n ^ (n >>> 16)
  return ((n >>> 0) % 10000) / 10000
}

export function risingStarDirectionVectors(direction: RisingStarDirection): {
  moveX: number
  moveY: number
  perpX: number
  perpY: number
} {
  switch (direction) {
    case 'down':
      return { moveX: 0, moveY: 1, perpX: 1, perpY: 0 }
    case 'left':
      return { moveX: -1, moveY: 0, perpX: 0, perpY: 1 }
    case 'right':
      return { moveX: 1, moveY: 0, perpX: 0, perpY: 1 }
    case 'up':
    default:
      return { moveX: 0, moveY: -1, perpX: 1, perpY: 0 }
  }
}

function seededShuffleIndices(
  length: number,
  seed: number,
  saltBase: number,
): number[] {
  const indices = Array.from({ length }, (_, i) => i)
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.floor(risingStarHash01(seed, saltBase + i) * (i + 1))
    const tmp = indices[i]!
    indices[i] = indices[j]!
    indices[j] = tmp
  }
  return indices
}

/**
 * Broad frame regions in normalized half-size coordinates (-1..1).
 * Covers upper / mid / lower and left / right, plus an occasional center.
 */
const AREA_REGIONS: ReadonlyArray<{
  x0: number
  x1: number
  y0: number
  y1: number
}> = [
  { x0: -0.92, x1: -0.3, y0: -0.92, y1: -0.38 }, // upper left
  { x0: -0.28, x1: 0.28, y0: -0.92, y1: -0.38 }, // upper mid
  { x0: 0.3, x1: 0.92, y0: -0.92, y1: -0.38 }, // upper right
  { x0: -0.92, x1: -0.3, y0: -0.34, y1: 0.34 }, // mid left
  { x0: 0.3, x1: 0.92, y0: -0.34, y1: 0.34 }, // mid right
  { x0: -0.92, x1: -0.3, y0: 0.38, y1: 0.92 }, // lower left
  { x0: -0.28, x1: 0.28, y0: 0.38, y1: 0.92 }, // lower mid
  { x0: 0.3, x1: 0.92, y0: 0.38, y1: 0.92 }, // lower right
  { x0: -0.22, x1: 0.22, y0: -0.22, y1: 0.22 }, // center
]

function sampleInNormalizedRegion(
  region: { x0: number; x1: number; y0: number; y1: number },
  halfW: number,
  halfH: number,
  seed: number,
  starIndex: number,
  attempt: number,
): { x: number; y: number } {
  const rx = risingStarHash01(seed, starIndex * 31 + attempt * 7 + 3)
  const ry = risingStarHash01(seed, starIndex * 31 + attempt * 7 + 5)
  // Bias slightly toward region center so edges don't all hug the same wall.
  const u = 0.18 + rx * 0.64
  const v = 0.18 + ry * 0.64
  return {
    x: (region.x0 + (region.x1 - region.x0) * u) * halfW,
    y: (region.y0 + (region.y1 - region.y0) * v) * halfH,
  }
}

/**
 * Balanced full-frame spawn for `mixed` / `area`.
 * Region order is shuffled by seed; points avoid obvious diagonals/grids
 * and keep a soft minimum separation.
 */
function spawnBalancedAreaPoints(
  options: ResolvedRisingStarOptions,
  seed: number,
  count: number,
): Array<{ x: number; y: number }> {
  const halfW = options.width / 2
  const halfH = options.height / 2
  const jitter = options.spawnJitter
  const minDist =
    Math.min(options.width, options.height) *
    (count <= 4 ? 0.22 : count <= 8 ? 0.16 : 0.12)

  const regionPool = AREA_REGIONS
  const shuffled = seededShuffleIndices(regionPool.length, seed, 400)
  const regionOrder = pickDiverseRegionOrder(shuffled, count, seed)

  const points: Array<{ x: number; y: number }> = []

  for (let i = 0; i < count; i += 1) {
    const region = regionPool[regionOrder[i]!]!
    let chosen = sampleInNormalizedRegion(region, halfW, halfH, seed, i, 0)

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = sampleInNormalizedRegion(
        region,
        halfW,
        halfH,
        seed,
        i,
        attempt,
      )
      const softened = minDist * (attempt < 6 ? 1 : 0.55)
      const ok = points.every(
        (p) => Math.hypot(candidate.x - p.x, candidate.y - p.y) >= softened,
      )
      if (ok) {
        chosen = candidate
        break
      }

      // If this region is crowded, try another shuffled region.
      if (attempt === 5) {
        const altIndex =
          shuffled[(i + attempt) % shuffled.length]!
        const alt = regionPool[altIndex]!
        const altPoint = sampleInNormalizedRegion(
          alt,
          halfW,
          halfH,
          seed,
          i,
          attempt + 11,
        )
        const altOk = points.every(
          (p) => Math.hypot(altPoint.x - p.x, altPoint.y - p.y) >= softened,
        )
        if (altOk) {
          chosen = altPoint
          break
        }
      }
    }

    chosen.x += (risingStarHash01(seed, i * 11 + 4) - 0.5) * 2 * jitter
    chosen.y += (risingStarHash01(seed, i * 11 + 5) - 0.5) * 2 * jitter

    const padX = halfW * 0.04
    const padY = halfH * 0.04
    chosen.x = clamp(chosen.x, -halfW + padX, halfW - padX)
    chosen.y = clamp(chosen.y, -halfH + padY, halfH - padY)
    points.push(chosen)
  }

  return points
}

/**
 * Build a region index list of length `count` from a seeded shuffle,
 * biasing toward covering left+right and upper+mid+lower early.
 */
function pickDiverseRegionOrder(
  shuffled: number[],
  count: number,
  _seed: number,
): number[] {
  // Columns: L=0,3,5  C=1,6,8  R=2,4,7
  // Rows:    U=0,1,2  M=3,4,8  Lo=5,6,7
  const sideOf = (idx: number): 'L' | 'C' | 'R' => {
    if (idx === 0 || idx === 3 || idx === 5) return 'L'
    if (idx === 2 || idx === 4 || idx === 7) return 'R'
    return 'C'
  }
  const bandOf = (idx: number): 'U' | 'M' | 'Lo' => {
    if (idx <= 2) return 'U'
    if (idx === 3 || idx === 4 || idx === 8) return 'M'
    return 'Lo'
  }

  const picked: number[] = []
  const used = new Set<number>()

  const tryTake = (predicate: (idx: number) => boolean): boolean => {
    for (const idx of shuffled) {
      if (used.has(idx)) continue
      if (!predicate(idx)) continue
      picked.push(idx)
      used.add(idx)
      return true
    }
    return false
  }

  if (count >= 1) {
    tryTake((idx) => sideOf(idx) === 'L') || tryTake(() => true)
  }
  if (count >= 2) {
    tryTake((idx) => sideOf(idx) === 'R') || tryTake(() => true)
  }
  if (count >= 3) {
    const hasUpper = picked.some((idx) => bandOf(idx) === 'U')
    const hasLower = picked.some((idx) => bandOf(idx) === 'Lo')
    if (!hasUpper) {
      tryTake((idx) => bandOf(idx) === 'U') || tryTake(() => true)
    } else if (!hasLower) {
      tryTake((idx) => bandOf(idx) === 'Lo') || tryTake(() => true)
    } else {
      tryTake((idx) => bandOf(idx) === 'M' || sideOf(idx) === 'C') ||
        tryTake(() => true)
    }
  }
  if (count >= 4) {
    const hasUpper = picked.some((idx) => bandOf(idx) === 'U')
    const hasLower = picked.some((idx) => bandOf(idx) === 'Lo')
    const hasMid = picked.some((idx) => bandOf(idx) === 'M')
    if (!hasUpper) tryTake((idx) => bandOf(idx) === 'U')
    else if (!hasLower) tryTake((idx) => bandOf(idx) === 'Lo')
    else if (!hasMid) tryTake((idx) => bandOf(idx) === 'M')
    else tryTake(() => true)
  }

  // Fill remaining: unused regions first, then cycle the shuffle.
  let cursor = 0
  while (picked.length < count) {
    let added = false
    for (let step = 0; step < shuffled.length; step += 1) {
      const idx = shuffled[(cursor + step) % shuffled.length]!
      if (!used.has(idx)) {
        picked.push(idx)
        used.add(idx)
        cursor = (cursor + step + 1) % shuffled.length
        added = true
        break
      }
    }
    if (!added) {
      const idx = shuffled[picked.length % shuffled.length]!
      picked.push(idx)
    }
  }

  return picked
}

function spawnEdgePoint(
  options: ResolvedRisingStarOptions,
  seed: number,
  index: number,
  count: number,
): { x: number; y: number } {
  const halfW = options.width / 2
  const halfH = options.height / 2
  const jitter = options.spawnJitter
  const region = options.spawnRegion
  const t = count <= 1 ? 0.5 : index / (count - 1)
  const slotJitter =
    (risingStarHash01(seed, index * 11 + 1) - 0.5) *
    (count <= 1 ? 0 : 0.35 / count)
  const u = clamp(t + slotJitter, 0, 1)

  let x = 0
  let y = 0

  if (region === 'top') {
    const margin = halfW * 0.08
    x = -halfW + margin + u * (2 * halfW - 2 * margin)
    y =
      -halfH +
      (risingStarHash01(seed, index * 11 + 2) - 0.35) * halfH * 0.22
  } else {
    // sides
    const onLeft = index % 2 === 0
    const sideSlots = Math.max(Math.ceil(count / 2), 1)
    const sideIndex = Math.floor(index / 2)
    const sideT =
      sideSlots <= 1 ? 0.5 : sideIndex / Math.max(sideSlots - 1, 1)
    const sideU = clamp(
      sideT +
        (risingStarHash01(seed, index * 11 + 2) - 0.5) * (0.3 / sideSlots),
      0,
      1,
    )
    x = (onLeft ? -halfW : halfW) * 0.9
    x += (risingStarHash01(seed, index * 11 + 3) - 0.5) * halfW * 0.1
    const margin = halfH * 0.1
    y = -halfH + margin + sideU * (2 * halfH - 2 * margin)
  }

  x += (risingStarHash01(seed, index * 11 + 4) - 0.5) * 2 * jitter
  y += (risingStarHash01(seed, index * 11 + 5) - 0.5) * 2 * jitter
  return { x, y }
}

function buildSpawnOrigins(
  options: ResolvedRisingStarOptions,
  seed: number,
): Array<{ x: number; y: number }> {
  const count = options.starCount
  if (options.spawnRegion === 'top' || options.spawnRegion === 'sides') {
    return Array.from({ length: count }, (_, i) =>
      spawnEdgePoint(options, seed, i, count),
    )
  }
  return spawnBalancedAreaPoints(options, seed, count)
}

export function buildRisingStars(
  options: ResolvedRisingStarOptions,
  seed: number = options.seed,
): RisingStarInstance[] {
  const stars: RisingStarInstance[] = []
  const riseSpan = Math.max(options.maxRise - options.minRise, 0)
  const sizeSpan = Math.max(options.maxSize - options.minSize, 0)
  const vectors = risingStarDirectionVectors(options.direction)
  const count = options.starCount
  const origins = buildSpawnOrigins(options, seed)

  for (let i = 0; i < count; i += 1) {
    const origin = origins[i]!
    const delayMs =
      risingStarHash01(seed, i * 13 + 6) * options.startDelaySpread
    const remaining = Math.max(options.duration - delayMs, 80)
    const lifeMs = remaining * (0.58 + risingStarHash01(seed, i * 13 + 7) * 0.42)
    const size = options.minSize + risingStarHash01(seed, i * 13 + 8) * sizeSpan

    stars.push({
      originX: origin.x,
      originY: origin.y,
      moveX: vectors.moveX,
      moveY: vectors.moveY,
      perpX: vectors.perpX,
      perpY: vectors.perpY,
      travelDistance:
        options.minRise + risingStarHash01(seed, i * 13 + 9) * riseSpan,
      drift:
        (risingStarHash01(seed, i * 13 + 10) - 0.5) * 2 * options.driftAmount,
      size,
      verticalLength:
        options.verticalLength *
        (0.88 + risingStarHash01(seed, i * 13 + 11) * 0.24),
      horizontalLength:
        options.horizontalLength *
        (0.88 + risingStarHash01(seed, i * 13 + 12) * 0.24),
      haloScale:
        options.haloScale *
        (0.9 + risingStarHash01(seed, i * 13 + 13) * 0.2),
      delayMs,
      lifeMs,
      fadeStart:
        options.fadeStart * (0.88 + risingStarHash01(seed, i * 13 + 14) * 0.24),
      fadeInPortion:
        options.fadeInPortion *
        (0.75 + risingStarHash01(seed, i * 13 + 15) * 0.5),
      alphaScale: 0.6 + risingStarHash01(seed, i * 13 + 16) * 0.4,
      peakScale: 1.05 + risingStarHash01(seed, i * 13 + 17) * 0.25,
    })
  }

  return stars
}

export interface RisingStarSample {
  x: number
  y: number
  scale: number
  alpha: number
  visible: boolean
  finished: boolean
}

export function sampleRisingStar(
  star: RisingStarInstance,
  elapsedMs: number,
): RisingStarSample {
  const local = elapsedMs - star.delayMs
  if (local < 0) {
    return {
      x: star.originX,
      y: star.originY,
      scale: 0.4,
      alpha: 0,
      visible: false,
      finished: false,
    }
  }

  const life = Math.max(star.lifeMs, 1)
  if (local >= life) {
    return {
      x:
        star.originX +
        star.moveX * star.travelDistance +
        star.perpX * star.drift,
      y:
        star.originY +
        star.moveY * star.travelDistance +
        star.perpY * star.drift,
      scale: star.peakScale,
      alpha: 0,
      visible: false,
      finished: true,
    }
  }

  const t = local / life
  const eased = 1 - Math.pow(1 - t, 1.75)
  const x =
    star.originX +
    star.moveX * star.travelDistance * eased +
    star.perpX * star.drift * eased
  const y =
    star.originY +
    star.moveY * star.travelDistance * eased +
    star.perpY * star.drift * eased

  const fadeIn = clamp(star.fadeInPortion, 0.04, 0.35)
  const fadeStart = clamp(star.fadeStart, fadeIn + 0.05, 0.95)

  let alpha: number
  if (t < fadeIn) {
    const u = t / fadeIn
    alpha = u * u * star.alphaScale
  } else if (t < fadeStart) {
    alpha = star.alphaScale
  } else {
    const ft = (t - fadeStart) / (1 - fadeStart)
    const faded = 1 - ft * ft * (3 - 2 * ft)
    alpha = Math.max(0, faded) * star.alphaScale
  }

  let scale: number
  if (t < fadeIn) {
    const u = t / fadeIn
    scale = 0.4 + (star.peakScale - 0.4) * (u * (2 - u))
  } else if (t < fadeStart) {
    scale = star.peakScale
  } else {
    const ft = (t - fadeStart) / (1 - fadeStart)
    scale = star.peakScale * (1 - 0.18 * ft)
  }

  return {
    x,
    y,
    scale,
    alpha,
    visible: alpha > 0.004,
    finished: false,
  }
}

export function sampleRisingStarFinished(
  elapsedMs: number,
  options: ResolvedRisingStarOptions,
): boolean {
  return elapsedMs >= Math.max(options.duration, 1)
}

function resolveSpawnRegion(
  value: RisingStarSpawnRegion | undefined,
): RisingStarSpawnRegion {
  if (
    value === 'top' ||
    value === 'sides' ||
    value === 'area' ||
    value === 'mixed'
  ) {
    return value
  }
  return RISING_STAR_DEFAULTS.spawnRegion
}

function resolveDirection(
  value: RisingStarDirection | undefined,
): RisingStarDirection {
  if (
    value === 'up' ||
    value === 'down' ||
    value === 'left' ||
    value === 'right'
  ) {
    return value
  }
  return RISING_STAR_DEFAULTS.direction
}

export function resolveRisingStarOptions(
  options: RisingStarOptions | undefined,
): ResolvedRisingStarOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? RISING_STAR_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? RISING_STAR_DEFAULTS.height, 1, 4096)
  const minRise = clamp(raw.minRise ?? RISING_STAR_DEFAULTS.minRise, 4, 512)
  const maxRise = clamp(
    raw.maxRise ?? RISING_STAR_DEFAULTS.maxRise,
    minRise,
    768,
  )
  const minSize = clamp(raw.minSize ?? RISING_STAR_DEFAULTS.minSize, 1, 64)
  const maxSize = clamp(
    raw.maxSize ?? RISING_STAR_DEFAULTS.maxSize,
    minSize,
    96,
  )
  const position: RisingStarPosition =
    raw.position === 'back' ? 'back' : 'front'

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? RISING_STAR_DEFAULTS.cornerRadius),
      width,
      height,
      0,
    ),
    color: (raw.color ?? RISING_STAR_DEFAULTS.color) >>> 0,
    intensity: clamp(
      raw.intensity ?? RISING_STAR_DEFAULTS.intensity,
      0,
      2,
    ),
    opacity: clamp(raw.opacity ?? RISING_STAR_DEFAULTS.opacity, 0, 1),
    starCount: Math.floor(
      clamp(raw.starCount ?? RISING_STAR_DEFAULTS.starCount, 1, 48),
    ),
    duration: clamp(
      raw.duration ?? RISING_STAR_DEFAULTS.duration,
      120,
      20_000,
    ),
    direction: resolveDirection(raw.direction),
    minRise,
    maxRise,
    minSize,
    maxSize,
    verticalLength: clamp(
      raw.verticalLength ?? RISING_STAR_DEFAULTS.verticalLength,
      0,
      256,
    ),
    horizontalLength: clamp(
      raw.horizontalLength ?? RISING_STAR_DEFAULTS.horizontalLength,
      0,
      256,
    ),
    haloScale: clamp(
      raw.haloScale ?? RISING_STAR_DEFAULTS.haloScale,
      0.5,
      4,
    ),
    driftAmount: clamp(
      raw.driftAmount ?? RISING_STAR_DEFAULTS.driftAmount,
      0,
      64,
    ),
    spawnJitter: clamp(
      raw.spawnJitter ?? RISING_STAR_DEFAULTS.spawnJitter,
      0,
      64,
    ),
    spawnRegion: resolveSpawnRegion(raw.spawnRegion),
    fadeStart: clamp(
      raw.fadeStart ?? RISING_STAR_DEFAULTS.fadeStart,
      0.1,
      0.95,
    ),
    fadeInPortion: clamp(
      raw.fadeInPortion ?? RISING_STAR_DEFAULTS.fadeInPortion,
      0.04,
      0.4,
    ),
    startDelaySpread: clamp(
      raw.startDelaySpread ?? RISING_STAR_DEFAULTS.startDelaySpread,
      0,
      2000,
    ),
    seed: Math.floor(
      clamp(raw.seed ?? RISING_STAR_DEFAULTS.seed, 0, 1_000_000),
    ),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : RISING_STAR_DEFAULTS.blendMode,
  }
}
