import {
  clamp,
  clamp01,
  EFFECT_FRAME_DEFAULTS,
} from '../../../core/effectConfig'

export type RisingBlocksPosition = 'back' | 'front'

export interface RisingBlocksOptions {
  /** Target frame width in local pixels. */
  width?: number
  /** Target frame height in local pixels. */
  height?: number
  /** Base block tint as 0xRRGGBB. Default electric cyan. */
  color?: number
  /** Peak brightness multiplier (0..2). Default 0.9. */
  intensity?: number
  /** Global opacity multiplier (0..1). Default 0.85. */
  opacity?: number
  /** Complete run lifetime in milliseconds. Default 1600. */
  duration?: number
  /** Number of rectangular fragments. Default 13. */
  blockCount?: number
  /** Minimum block width in pixels. Default 8. */
  minBlockWidth?: number
  /** Maximum block width in pixels. Default 22. */
  maxBlockWidth?: number
  /** Minimum block height in pixels. Default 8. */
  minBlockHeight?: number
  /**
   * Maximum block height in pixels. Default 28.
   * Kept short so blocks never read as light columns.
   */
  maxBlockHeight?: number
  /**
   * How far each block travels upward (px).
   * Default ≈ height × 0.72.
   */
  travelDistance?: number
  /**
   * How far blocks may draw above the top edge (px).
   * Default 40. Drawing margin only — not the fade mechanism.
   */
  topOverflow?: number
  /**
   * Soft local glow around brighter blocks (0..1.5).
   * Default 0.35 — secondary, never a full-card wash.
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
  position?: RisingBlocksPosition
  /** Phaser blend mode constant (default ADD). */
  blendMode?: number
}

export interface ResolvedRisingBlocksOptions {
  width: number
  height: number
  color: number
  intensity: number
  opacity: number
  duration: number
  blockCount: number
  minBlockWidth: number
  maxBlockWidth: number
  minBlockHeight: number
  maxBlockHeight: number
  travelDistance: number
  topOverflow: number
  glowIntensity: number
  seed: number
  position: RisingBlocksPosition
  blendMode: number
}

/**
 * One discrete rectangular light fragment that TRANSLATES upward.
 * Width/height are fixed — motion is not height stretch.
 */
export interface RisingBlock {
  /** Local X of the rectangle center. */
  x: number
  /**
   * Initial Y of the rectangle top edge (+Y down).
   * Biased toward lower / lower-middle spawn region.
   */
  startY: number
  width: number
  height: number
  /** Relative brightness 0..1. */
  brightness: number
  /**
   * Deterministic tint shift −1..1.
   * Negative → deeper blue; positive → paler cyan (from base color).
   */
  tintShift: number
  /** Delay before this block appears (ms). */
  delayMs: number
  /** Lifetime after delay (ms). */
  lifeMs: number
  /** Upward travel distance of the top edge (px). */
  travel: number
  /**
   * Local lifetime progress (0..1) when opacity fade-out begins.
   * Independent of travel.
   */
  fadeStart: number
}

export interface RisingBlockSample {
  /** Current Y of the rectangle top edge. */
  y: number
  /** Opacity envelope 0..1. */
  alpha: number
  visible: boolean
}

const BLEND_ADD = 1

export const RISING_BLOCKS_DEFAULTS: ResolvedRisingBlocksOptions = {
  width: EFFECT_FRAME_DEFAULTS.width,
  height: EFFECT_FRAME_DEFAULTS.height,
  color: 0x4ec8ff,
  intensity: 0.9,
  opacity: 0.85,
  duration: 1600,
  blockCount: 13,
  minBlockWidth: 8,
  maxBlockWidth: 22,
  minBlockHeight: 8,
  maxBlockHeight: 28,
  travelDistance: 230,
  topOverflow: 40,
  glowIntensity: 0.35,
  seed: 1,
  position: 'front',
  blendMode: BLEND_ADD,
}

/** Deterministic pseudo-random in [0, 1). */
export function risingBlocksHash01(seed: number, salt: number): number {
  let n = (seed * 374761393 + salt * 668265263) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n >>> 0) % 10_000) / 10_000
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(edge1 - edge0, 1e-6))
  return t * t * (3 - 2 * t)
}

export function getRisingBlocksDurationMs(
  options: ResolvedRisingBlocksOptions,
): number {
  return Math.max(options.duration, 1)
}

/**
 * Samples one block's upward-translating pose + independent opacity.
 * Motion continues for the full lifetime while alpha dissolves mid-life.
 * Size is fixed — no vertical stretch.
 */
export function sampleRisingBlock(
  block: RisingBlock,
  elapsedMs: number,
): RisingBlockSample {
  const local = elapsedMs - block.delayMs
  if (local < 0) {
    return { y: block.startY, alpha: 0, visible: false }
  }

  const life = Math.max(block.lifeMs, 1)
  if (local >= life) {
    return {
      y: block.startY - block.travel,
      alpha: 0,
      visible: false,
    }
  }

  const t = local / life
  const moveT = 1 - (1 - t) * (1 - t)
  const y = block.startY - block.travel * moveT

  const fadeIn = smoothstep(0, 0.14, t)
  const fadeStart = clamp(block.fadeStart, 0.25, 0.75)
  let fadeOut = 1
  if (t > fadeStart) {
    const u = (t - fadeStart) / Math.max(1 - fadeStart, 1e-4)
    fadeOut = 1 - smoothstep(0, 1, u)
  }
  const alpha = Math.max(0, fadeIn * fadeOut)

  return {
    y,
    alpha,
    visible: alpha > 0.01,
  }
}

/**
 * Derives a coherent color variant from the configured base tint.
 * `shift` −1..1 → deeper / paler within the same hue family.
 */
export function risingBlockTintColor(baseColor: number, shift: number): number {
  const hex = baseColor >>> 0
  let r = (hex >> 16) & 0xff
  let g = (hex >> 8) & 0xff
  let b = hex & 0xff
  const s = clamp(shift, -1, 1)

  if (s < 0) {
    // Deeper / more saturated blue — pull toward darker blue.
    const t = -s
    r = Math.round(r * (1 - 0.45 * t))
    g = Math.round(g * (1 - 0.25 * t))
    b = Math.round(Math.min(255, b * (1 - 0.08 * t) + 20 * t))
  } else if (s > 0) {
    // Paler cyan — lift toward white-cyan.
    const t = s
    r = Math.round(r + (210 - r) * t * 0.55)
    g = Math.round(g + (245 - g) * t * 0.55)
    b = Math.round(b + (255 - b) * t * 0.4)
  }

  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
}

/**
 * Builds the deterministic block table for one run.
 * Lower/lower-middle spawn bias; irregular X; mixed square / short vertical.
 */
export function buildRisingBlocks(
  options: ResolvedRisingBlocksOptions,
  seed: number = options.seed,
): RisingBlock[] {
  const count = options.blockCount
  const halfW = options.width * 0.5
  const halfH = options.height * 0.5
  const widthSpan = Math.max(options.maxBlockWidth - options.minBlockWidth, 0)
  const heightSpan = Math.max(
    options.maxBlockHeight - options.minBlockHeight,
    0,
  )
  const baseTravel = options.travelDistance
  const duration = Math.max(options.duration, 1)
  const blocks: RisingBlock[] = []

  for (let i = 0; i < count; i += 1) {
    // Irregular horizontal placement — avoid lanes / symmetry.
    const x =
      (risingBlocksHash01(seed, i * 29 + 1) - 0.5) * 2 * (halfW - 10)

    // Size: often near-square; sometimes taller vertical rectangles.
    const w =
      options.minBlockWidth +
      risingBlocksHash01(seed, i * 29 + 2) * widthSpan
    const tallBias = risingBlocksHash01(seed, i * 29 + 3)
    let h: number
    if (tallBias < 0.4) {
      // Square-ish
      h = w * (0.85 + risingBlocksHash01(seed, i * 29 + 4) * 0.35)
    } else if (tallBias < 0.75) {
      // Short vertical
      h =
        options.minBlockHeight +
        (0.35 + risingBlocksHash01(seed, i * 29 + 4) * 0.45) * heightSpan
    } else {
      // Medium vertical (still short of streak length)
      h =
        options.minBlockHeight +
        (0.55 + risingBlocksHash01(seed, i * 29 + 4) * 0.45) * heightSpan
    }
    h = clamp(h, options.minBlockHeight, options.maxBlockHeight)

    // Lower / lower-middle bias: top edge mostly in lower 55% of card.
    // +Y down: bottom = +halfH, mid = 0.
    const spawnT = Math.pow(risingBlocksHash01(seed, i * 29 + 5), 0.7)
    const startY = halfH * (0.05 + spawnT * 0.78) - h * 0.15

    const brightness = 0.5 + risingBlocksHash01(seed, i * 29 + 6) * 0.5
    const tintShift =
      (risingBlocksHash01(seed, i * 29 + 7) - 0.5) * 1.6

    // Compact stagger with overlap.
    const delayMs =
      (0.03 + risingBlocksHash01(seed, i * 29 + 8) * 0.28) * duration
    let lifeMs =
      (0.5 + risingBlocksHash01(seed, i * 29 + 9) * 0.4) * duration
    lifeMs = Math.min(lifeMs, Math.max(duration - delayMs, duration * 0.35))

    const travel =
      baseTravel * (0.7 + risingBlocksHash01(seed, i * 29 + 10) * 0.45)

    const fadeStart =
      0.4 + risingBlocksHash01(seed, i * 29 + 11) * 0.28

    blocks.push({
      x,
      startY,
      width: w,
      height: h,
      brightness,
      tintShift,
      delayMs,
      lifeMs,
      travel,
      fadeStart,
    })
  }

  return blocks
}

export function resolveRisingBlocksOptions(
  options: RisingBlocksOptions | undefined,
): ResolvedRisingBlocksOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? RISING_BLOCKS_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? RISING_BLOCKS_DEFAULTS.height, 1, 4096)
  const position: RisingBlocksPosition =
    raw.position === 'back' ? 'back' : 'front'

  let minBlockWidth = clamp(
    raw.minBlockWidth ?? RISING_BLOCKS_DEFAULTS.minBlockWidth,
    2,
    96,
  )
  let maxBlockWidth = clamp(
    raw.maxBlockWidth ?? RISING_BLOCKS_DEFAULTS.maxBlockWidth,
    2,
    96,
  )
  if (maxBlockWidth < minBlockWidth) {
    const swap = minBlockWidth
    minBlockWidth = maxBlockWidth
    maxBlockWidth = swap
  }

  let minBlockHeight = clamp(
    raw.minBlockHeight ?? RISING_BLOCKS_DEFAULTS.minBlockHeight,
    2,
    96,
  )
  let maxBlockHeight = clamp(
    raw.maxBlockHeight ?? RISING_BLOCKS_DEFAULTS.maxBlockHeight,
    2,
    96,
  )
  if (maxBlockHeight < minBlockHeight) {
    const swap = minBlockHeight
    minBlockHeight = maxBlockHeight
    maxBlockHeight = swap
  }

  return {
    width,
    height,
    color: (raw.color ?? RISING_BLOCKS_DEFAULTS.color) >>> 0,
    intensity: clamp(
      raw.intensity ?? RISING_BLOCKS_DEFAULTS.intensity,
      0,
      2,
    ),
    opacity: clamp01(raw.opacity ?? RISING_BLOCKS_DEFAULTS.opacity),
    duration: clamp(
      raw.duration ?? RISING_BLOCKS_DEFAULTS.duration,
      400,
      12_000,
    ),
    blockCount: Math.floor(
      clamp(raw.blockCount ?? RISING_BLOCKS_DEFAULTS.blockCount, 4, 40),
    ),
    minBlockWidth,
    maxBlockWidth,
    minBlockHeight,
    maxBlockHeight,
    travelDistance: clamp(
      raw.travelDistance ?? Math.max(height * 0.72, 80),
      20,
      4096,
    ),
    topOverflow: clamp(
      raw.topOverflow ?? RISING_BLOCKS_DEFAULTS.topOverflow,
      0,
      256,
    ),
    glowIntensity: clamp(
      raw.glowIntensity ?? RISING_BLOCKS_DEFAULTS.glowIntensity,
      0,
      1.5,
    ),
    seed: Math.floor(
      clamp(raw.seed ?? RISING_BLOCKS_DEFAULTS.seed, 0, 1e9),
    ),
    position,
    blendMode: Number.isFinite(raw.blendMode)
      ? Math.floor(raw.blendMode as number)
      : RISING_BLOCKS_DEFAULTS.blendMode,
  }
}
