import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
} from '../../../core/effectConfig'

export type RisingBubblesPosition = 'back' | 'front'

/**
 * Frame bounds behavior for rising bubbles.
 * - `overflow` — bubbles may exit above/beside the target (current default)
 * - `contained` — visible geometry stays inside the configured width×height
 */
export type RisingBubblesBoundsMode = 'overflow' | 'contained'

export interface RisingBubblesOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Base bubble tint as 0xRRGGBB. Default pale cyan. */
  color?: number
  /** Peak brightness multiplier (0..2). Default 0.95. */
  intensity?: number
  /** Global opacity multiplier (0..1). Default 0.9. */
  opacity?: number
  /** Complete run lifetime in milliseconds. Default 2200. */
  duration?: number
  /**
   * Number of bubble groups (singles or clusters). Default 11.
   * Each group may contain 1–4 individual bubbles.
   */
  groupCount?: number
  /** Minimum bubble radius in pixels. Default 6. */
  minRadius?: number
  /** Maximum bubble radius in pixels. Default 20. */
  maxRadius?: number
  /** Minimum bubbles per group. Default 1. */
  minGroupSize?: number
  /** Maximum bubbles per group. Default 4. */
  maxGroupSize?: number
  /**
   * How far each group travels upward (px).
   * Default ≈ height × 0.9.
   * In `contained` mode, travel is further limited so fade finishes inside.
   */
  travelDistance?: number
  /**
   * How far bubbles may draw above the top edge (px).
   * Default 56. Drawing margin only — not the fade mechanism.
   * Ignored for visibility when `boundsMode` is `contained`.
   */
  topOverflow?: number
  /**
   * Frame bounds behavior. Default `overflow` (preserves original look).
   * `contained` keeps all visible bubble geometry inside the target frame.
   */
  boundsMode?: RisingBubblesBoundsMode
  /**
   * Peak horizontal sway amplitude in pixels. Default 10.
   * Subtle buoyant drift — not wandering.
   * In `contained` mode, sway is reduced if needed so the cluster stays inside.
   */
  swayAmount?: number
  /**
   * Sway frequency scale (cycles over a group lifetime). Default 1.15.
   */
  swaySpeed?: number
  /**
   * Soft local halo around bubble rims (0..1.5). Default 0.28.
   * Kept minimal so clusters do not become glowing clouds.
   */
  glowIntensity?: number
  /**
   * Deterministic seed. Same seed + options → same layout.
   * Default 1.
   */
  seed?: number
  /**
   * Draw order relative to other children of the target.
   * `front` = over artwork (default).
   */
  position?: RisingBubblesPosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedRisingBubblesOptions {
  width: number
  height: number
  color: number
  intensity: number
  opacity: number
  duration: number
  groupCount: number
  minRadius: number
  maxRadius: number
  minGroupSize: number
  maxGroupSize: number
  travelDistance: number
  topOverflow: number
  boundsMode: RisingBubblesBoundsMode
  swayAmount: number
  swaySpeed: number
  glowIntensity: number
  seed: number
  position: RisingBubblesPosition
  blendMode: number
}

/** One soap-bubble circle within a rising group. */
export interface RisingBubble {
  /** Offset from the group center (local). */
  ox: number
  oy: number
  radius: number
  /** Relative brightness 0..1. */
  brightness: number
  /** Tint shift −1..1 (deeper / paler around base color). */
  tintShift: number
  /** Highlight arc start angle (radians). */
  highlightAngle: number
  /** Subtle start scale (≈0.9–1). */
  startScale: number
  /** End scale (≈1–1.08). */
  endScale: number
  /** Tiny relative sway multiplier for organic cluster flex. */
  swayMul: number
}

/**
 * One rising group: a single bubble or an intentionally attached cluster.
 * Members share delay/lifetime/travel; slight relative sway is allowed.
 */
export interface RisingBubbleGroup {
  /** Group center X at spawn. */
  x: number
  /**
   * Group center Y at spawn (+Y down).
   * Biased toward lower / lower-middle.
   */
  startY: number
  bubbles: RisingBubble[]
  /** Delay before this group appears (ms). */
  delayMs: number
  /** Lifetime after delay (ms). */
  lifeMs: number
  /** Upward travel of the group center (px). */
  travel: number
  /** Horizontal sway amplitude (px). */
  swayAmp: number
  /** Sway phase (radians). */
  swayPhase: number
  /** Sway cycles over lifetime. */
  swayCycles: number
  /** Local lifetime progress when fade-out begins. */
  fadeStart: number
  /** Group brightness 0..1. */
  brightness: number
}

export interface RisingBubbleGroupSample {
  x: number
  y: number
  alpha: number
  scale: number
  visible: boolean
}

const BLEND_ADD = 1

export const RISING_BUBBLES_DEFAULTS: ResolvedRisingBubblesOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  color: 0xb8ecff,
  intensity: 0.95,
  opacity: 0.9,
  duration: 2200,
  groupCount: 11,
  minRadius: 6,
  maxRadius: 20,
  minGroupSize: 1,
  maxGroupSize: 4,
  travelDistance: 288,
  topOverflow: 56,
  boundsMode: 'overflow',
  swayAmount: 10,
  swaySpeed: 1.15,
  glowIntensity: 0.28,
  seed: 1,
  position: 'front',
  blendMode: BLEND_ADD,
}

/** Deterministic pseudo-random in [0, 1). */
export function risingBubblesHash01(seed: number, salt: number): number {
  let n = (seed * 374761393 + salt * 668265263) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n >>> 0) % 10_000) / 10_000
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(edge1 - edge0, 1e-6))
  return t * t * (3 - 2 * t)
}

export function getRisingBubblesDurationMs(
  options: ResolvedRisingBubblesOptions,
): number {
  return Math.max(options.duration, 1)
}

/**
 * Samples one group's upward pose + sway + independent opacity.
 * Motion continues for the full lifetime while alpha dissolves mid-life.
 */
export function sampleRisingBubbleGroup(
  group: RisingBubbleGroup,
  elapsedMs: number,
  swaySpeed: number,
): RisingBubbleGroupSample {
  const local = elapsedMs - group.delayMs
  if (local < 0) {
    return {
      x: group.x,
      y: group.startY,
      alpha: 0,
      scale: group.bubbles[0]?.startScale ?? 1,
      visible: false,
    }
  }

  const life = Math.max(group.lifeMs, 1)
  if (local >= life) {
    return {
      x: group.x,
      y: group.startY - group.travel,
      alpha: 0,
      scale: group.bubbles[0]?.endScale ?? 1,
      visible: false,
    }
  }

  const t = local / life
  const moveT = 1 - (1 - t) * (1 - t)
  const y = group.startY - group.travel * moveT

  const cycles = group.swayCycles * Math.max(swaySpeed, 0.2)
  const x =
    group.x +
    group.swayAmp * Math.sin(t * cycles * Math.PI * 2 + group.swayPhase)

  const fadeIn = smoothstep(0, 0.12, t)
  const fadeStart = clamp(group.fadeStart, 0.28, 0.78)
  let fadeOut = 1
  if (t > fadeStart) {
    const u = (t - fadeStart) / Math.max(1 - fadeStart, 1e-4)
    fadeOut = 1 - smoothstep(0, 1, u)
  }
  const alpha = Math.max(0, fadeIn * fadeOut)

  // Mild shared scale growth for the group.
  const scale =
    (group.bubbles[0]?.startScale ?? 0.92) +
    ((group.bubbles[0]?.endScale ?? 1.04) -
      (group.bubbles[0]?.startScale ?? 0.92)) *
      smoothstep(0, 0.55, t)

  return {
    x,
    y,
    alpha,
    scale,
    visible: alpha > 0.01,
  }
}

/** Soft cyan/white tint variation around the configured base. */
export function risingBubbleTintColor(
  baseColor: number,
  shift: number,
): number {
  const hex = baseColor >>> 0
  let r = (hex >> 16) & 0xff
  let g = (hex >> 8) & 0xff
  let b = hex & 0xff
  const s = clamp(shift, -1, 1)

  if (s < 0) {
    const t = -s
    r = Math.round(r * (1 - 0.2 * t))
    g = Math.round(g * (1 - 0.1 * t))
    b = Math.round(Math.min(255, b * (1 - 0.05 * t) + 12 * t))
  } else if (s > 0) {
    const t = s
    r = Math.round(r + (230 - r) * t * 0.55)
    g = Math.round(g + (248 - g) * t * 0.55)
    b = Math.round(b + (255 - b) * t * 0.45)
  }

  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
}

/**
 * Weighted cluster size: mostly singles, several pairs, occasional 3, rare 4.
 */
function pickGroupSize(
  seed: number,
  salt: number,
  minSize: number,
  maxSize: number,
): number {
  const u = risingBubblesHash01(seed, salt)
  let size = 1
  if (u < 0.52) {
    size = 1
  } else if (u < 0.82) {
    size = 2
  } else if (u < 0.95) {
    size = 3
  } else {
    size = 4
  }
  return clamp(size, minSize, maxSize)
}

function packClusterBubbles(
  count: number,
  options: ResolvedRisingBubblesOptions,
  seed: number,
  saltBase: number,
): RisingBubble[] {
  const bubbles: RisingBubble[] = []
  const radiusSpan = Math.max(options.maxRadius - options.minRadius, 0)

  for (let i = 0; i < count; i += 1) {
    const r =
      options.minRadius +
      risingBubblesHash01(seed, saltBase + i * 11 + 1) * radiusSpan

    let ox = 0
    let oy = 0

    if (i === 0) {
      ox = 0
      oy = 0
    } else {
      // Attach to a previous bubble (usually the largest so far).
      let anchor = 0
      let bestR = bubbles[0].radius
      for (let j = 1; j < bubbles.length; j += 1) {
        if (bubbles[j].radius > bestR) {
          bestR = bubbles[j].radius
          anchor = j
        }
      }
      const parent = bubbles[anchor]
      const angle =
        risingBubblesHash01(seed, saltBase + i * 11 + 2) * Math.PI * 2 +
        i * 1.7
      // Touch / slight overlap / tiny gap.
      const contact =
        parent.radius +
        r *
          (0.88 +
            risingBubblesHash01(seed, saltBase + i * 11 + 3) * 0.2)
      ox = parent.ox + Math.cos(angle) * contact
      oy = parent.oy + Math.sin(angle) * contact
    }

    bubbles.push({
      ox,
      oy,
      radius: r,
      brightness:
        0.55 + risingBubblesHash01(seed, saltBase + i * 11 + 4) * 0.45,
      tintShift:
        (risingBubblesHash01(seed, saltBase + i * 11 + 5) - 0.5) * 1.4,
      highlightAngle:
        -Math.PI * 0.75 +
        risingBubblesHash01(seed, saltBase + i * 11 + 6) * 0.7,
      startScale:
        0.9 + risingBubblesHash01(seed, saltBase + i * 11 + 7) * 0.06,
      endScale:
        1.0 + risingBubblesHash01(seed, saltBase + i * 11 + 8) * 0.08,
      swayMul:
        0.55 + risingBubblesHash01(seed, saltBase + i * 11 + 9) * 0.7,
    })
  }

  return bubbles
}

/** Local AABB of a cluster including radius (group-local coords). */
function clusterLocalExtents(bubbles: RisingBubble[]): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const b of bubbles) {
    minX = Math.min(minX, b.ox - b.radius)
    maxX = Math.max(maxX, b.ox + b.radius)
    minY = Math.min(minY, b.oy - b.radius)
    maxY = Math.max(maxY, b.oy + b.radius)
  }
  return { minX, maxX, minY, maxY }
}

/**
 * Builds the deterministic rising-bubble group table for one run.
 */
export function buildRisingBubbleGroups(
  options: ResolvedRisingBubblesOptions,
  seed: number = options.seed,
): RisingBubbleGroup[] {
  const count = options.groupCount
  const halfW = options.width * 0.5
  const halfH = options.height * 0.5
  const duration = Math.max(options.duration, 1)
  const contained = options.boundsMode === 'contained'
  // Scale + faint halo pad used when planning contained placement.
  const scaleMax = 1.12
  const glowPad = contained
    ? 1.5 + options.glowIntensity * 2.5
    : 0
  const groups: RisingBubbleGroup[] = []

  for (let i = 0; i < count; i += 1) {
    const size = pickGroupSize(
      seed,
      i * 41 + 1,
      options.minGroupSize,
      options.maxGroupSize,
    )
    const bubbles = packClusterBubbles(size, options, seed, i * 97 + 20)
    const ext = clusterLocalExtents(bubbles)

    const leftReach = -ext.minX * scaleMax + glowPad
    const rightReach = ext.maxX * scaleMax + glowPad
    const topReach = -ext.minY * scaleMax + glowPad
    const bottomReach = ext.maxY * scaleMax + glowPad

    let desiredSway =
      options.swayAmount *
      (0.55 + risingBubblesHash01(seed, i * 41 + 7) * 0.7)
    // Member flex is ≈ 0.18 × group sway — include in containment budget.
    const swayBudgetFactor = 1.2

    let x: number
    let startY: number
    let swayAmp: number
    let travel: number
    let fadeStart: number

    if (!contained) {
      // Original overflow behavior — unchanged.
      x =
        (risingBubblesHash01(seed, i * 41 + 2) - 0.5) * 2 * (halfW - 18)
      const spawnT = Math.pow(risingBubblesHash01(seed, i * 41 + 3), 0.65)
      startY = halfH * (0.05 + spawnT * 0.72)
      swayAmp = desiredSway
      travel =
        options.travelDistance *
        (0.72 + risingBubblesHash01(seed, i * 41 + 6) * 0.4)
      fadeStart =
        0.32 + risingBubblesHash01(seed, i * 41 + 10) * 0.4
    } else {
      // --- Contained: plan spawn / sway / travel so geometry stays inside ---
      const framePad = 1

      // Reduce sway until a horizontal spawn band exists.
      let totalSway = desiredSway * swayBudgetFactor
      let safeXMin = -halfW + framePad + leftReach + totalSway
      let safeXMax = halfW - framePad - rightReach - totalSway
      let guard = 0
      while (safeXMin > safeXMax - 1 && desiredSway > 0.5 && guard < 8) {
        desiredSway *= 0.72
        totalSway = desiredSway * swayBudgetFactor
        safeXMin = -halfW + framePad + leftReach + totalSway
        safeXMax = halfW - framePad - rightReach - totalSway
        guard += 1
      }
      if (safeXMin > safeXMax) {
        const mid = (safeXMin + safeXMax) * 0.5
        safeXMin = mid - 0.5
        safeXMax = mid + 0.5
        desiredSway = 0
        totalSway = 0
      }

      const xT = risingBubblesHash01(seed, i * 41 + 2)
      x = safeXMin + xT * (safeXMax - safeXMin)
      swayAmp = desiredSway

      // Vertical spawn: lower/lower-middle, still fully inside at spawn.
      const safeYMin = -halfH + framePad + topReach
      const safeYMax = halfH - framePad - bottomReach
      const spanY = Math.max(safeYMax - safeYMin, 1)
      // Bias toward lower region within the safe band.
      const spawnT = Math.pow(risingBubblesHash01(seed, i * 41 + 3), 0.65)
      startY = safeYMin + spanY * (0.35 + spawnT * 0.62)
      startY = clamp(startY, safeYMin, safeYMax)

      // Travel so at t=1 (fully faded) the cluster top is still inside.
      // easeOut ends at travel; alpha→0 at end of life — no top overflow.
      const maxTravel = Math.max(
        startY - (-halfH + framePad + topReach),
        8,
      )
      const wanted =
        options.travelDistance *
        (0.55 + risingBubblesHash01(seed, i * 41 + 6) * 0.35)
      travel = Math.min(wanted, maxTravel * 0.92)

      // Fade earlier so most opacity is gone before the upper region.
      fadeStart =
        0.28 + risingBubblesHash01(seed, i * 41 + 10) * 0.28
    }

    const delayMs =
      (0.02 + risingBubblesHash01(seed, i * 41 + 4) * 0.42) * duration
    let lifeMs =
      (0.48 + risingBubblesHash01(seed, i * 41 + 5) * 0.42) * duration
    lifeMs = Math.min(lifeMs, Math.max(duration - delayMs, duration * 0.35))

    const swayPhase =
      risingBubblesHash01(seed, i * 41 + 8) * Math.PI * 2
    const swayCycles =
      0.7 + risingBubblesHash01(seed, i * 41 + 9) * 0.9

    const brightness =
      0.55 + risingBubblesHash01(seed, i * 41 + 11) * 0.45

    groups.push({
      x,
      startY,
      bubbles,
      delayMs,
      lifeMs,
      travel,
      swayAmp,
      swayPhase,
      swayCycles,
      fadeStart,
      brightness,
    })
  }

  return groups
}

export function resolveRisingBubblesOptions(
  options: RisingBubblesOptions | undefined,
): ResolvedRisingBubblesOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? RISING_BUBBLES_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? RISING_BUBBLES_DEFAULTS.height, 1, 4096)
  const position: RisingBubblesPosition =
    raw.position === 'back' ? 'back' : 'front'
  const boundsMode: RisingBubblesBoundsMode =
    raw.boundsMode === 'contained' ? 'contained' : 'overflow'

  let minRadius = clamp(
    raw.minRadius ?? RISING_BUBBLES_DEFAULTS.minRadius,
    2,
    64,
  )
  let maxRadius = clamp(
    raw.maxRadius ?? RISING_BUBBLES_DEFAULTS.maxRadius,
    2,
    64,
  )
  if (maxRadius < minRadius) {
    const swap = minRadius
    minRadius = maxRadius
    maxRadius = swap
  }

  let minGroupSize = Math.floor(
    clamp(raw.minGroupSize ?? RISING_BUBBLES_DEFAULTS.minGroupSize, 1, 4),
  )
  let maxGroupSize = Math.floor(
    clamp(raw.maxGroupSize ?? RISING_BUBBLES_DEFAULTS.maxGroupSize, 1, 4),
  )
  if (maxGroupSize < minGroupSize) {
    const swap = minGroupSize
    minGroupSize = maxGroupSize
    maxGroupSize = swap
  }

  return {
    width,
    height,
    color: (raw.color ?? RISING_BUBBLES_DEFAULTS.color) >>> 0,
    intensity: clamp(
      raw.intensity ?? RISING_BUBBLES_DEFAULTS.intensity,
      0,
      2,
    ),
    opacity: clamp01(raw.opacity ?? RISING_BUBBLES_DEFAULTS.opacity),
    duration: clamp(
      raw.duration ?? RISING_BUBBLES_DEFAULTS.duration,
      400,
      12_000,
    ),
    groupCount: Math.floor(
      clamp(raw.groupCount ?? RISING_BUBBLES_DEFAULTS.groupCount, 3, 28),
    ),
    minRadius,
    maxRadius,
    minGroupSize,
    maxGroupSize,
    travelDistance: clamp(
      raw.travelDistance ?? Math.max(height * 0.9, 100),
      40,
      4096,
    ),
    topOverflow: clamp(
      raw.topOverflow ?? RISING_BUBBLES_DEFAULTS.topOverflow,
      0,
      256,
    ),
    boundsMode,
    swayAmount: clamp(
      raw.swayAmount ?? RISING_BUBBLES_DEFAULTS.swayAmount,
      0,
      48,
    ),
    swaySpeed: clamp(
      raw.swaySpeed ?? RISING_BUBBLES_DEFAULTS.swaySpeed,
      0.2,
      4,
    ),
    glowIntensity: clamp(
      raw.glowIntensity ?? RISING_BUBBLES_DEFAULTS.glowIntensity,
      0,
      1.5,
    ),
    seed: Math.floor(
      clamp(raw.seed ?? RISING_BUBBLES_DEFAULTS.seed, 0, 1e9),
    ),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : RISING_BUBBLES_DEFAULTS.blendMode,
  }
}
