import type {
  BloomFadeOptions,
  FlashOptions,
  RisingBlocksOptions,
  RisingLightColumnsOptions,
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

export interface CardCubeUpOptions {
  width?: number
  height?: number
  cornerRadius?: number
  flash?: FlashOptions
  bloomFade?: BloomFadeOptions
  risingLightColumns?: RisingLightColumnsOptions
  risingBlocks?: RisingBlocksOptions
  /** Offset (ms) for Flash. Default 0. */
  flashAt?: number
  /** Offset (ms) for Bloom Fade. Default 0 (same ignition event). */
  bloomFadeAt?: number
  /** Offset (ms) for Rising Light Columns. Default 40. */
  risingLightColumnsAt?: number
  /** Offset (ms) for Rising Blocks. Default 80. */
  risingBlocksAt?: number
}

export interface ResolvedCardCubeUpOptions {
  width: number
  height: number
  cornerRadius: number
  flash: FlashOptions
  bloomFade: BloomFadeOptions
  risingLightColumns: RisingLightColumnsOptions
  risingBlocks: RisingBlocksOptions
  flashAt: number
  bloomFadeAt: number
  risingLightColumnsAt: number
  risingBlocksAt: number
}

/** Coherent electric-cyan family for the whole Cube Up sequence. */
const CYAN = 0x4ec8ff
const CYAN_SOFT = 0x66ddff

/**
 * Short full-card ignition wash.
 * Lifetime ≈ 35 + 55 + 240 = 330 ms.
 */
export const CARD_CUBE_UP_FLASH_DEFAULTS: FlashOptions = {
  color: CYAN,
  intensity: 0.95,
  fadeInDuration: 45,
  holdDuration: 55,
  fadeOutDuration: 240,
}

/**
 * Subtle exterior atmosphere around the ignition — not a fog cloud.
 * Lifetime ≈ 45 + 55 + 300 = 400 ms.
 */
export const CARD_CUBE_UP_BLOOM_DEFAULTS: BloomFadeOptions = {
  color: CYAN,
  intensity: 0.28,
  padding: 12,
  fadeInDuration: 45,
  holdDuration: 55,
  fadeOutDuration: 300,
  expansion: 3,
  position: 'back',
  shape: 'organic',
}

/**
 * Long vertical trails — based on the accepted Rising Light Columns
 * card-1 playground preset, slightly eased for composition balance.
 * Lifetime 1600 ms from its start offset.
 */
export const CARD_CUBE_UP_COLUMNS_DEFAULTS: RisingLightColumnsOptions = {
  color: CYAN,
  intensity: 0.78,
  opacity: 0.78,
  duration: 1600,
  streakCount: 11,
  minStreakWidth: 1.8,
  maxStreakWidth: 4.5,
  minStreakLength: 134,
  maxStreakLength: 218,
  travelDistance: 300,
  topOverflow: 36,
  glowIntensity: 0.6,
  seed: 1,
  position: 'front',
}

/**
 * Discrete rising fragments — based on the accepted Rising Blocks
 * card-1 playground preset, slightly eased for composition balance.
 * Lifetime 1600 ms from its start offset.
 */
export const CARD_CUBE_UP_BLOCKS_DEFAULTS: RisingBlocksOptions = {
  color: CYAN_SOFT,
  intensity: 0.82,
  opacity: 0.8,
  duration: 1600,
  blockCount: 13,
  minBlockWidth: 8,
  maxBlockWidth: 22,
  minBlockHeight: 8,
  maxBlockHeight: 28,
  travelDistance: 230,
  topOverflow: 40,
  glowIntensity: 0.32,
  seed: 3,
  position: 'front',
}

export const CARD_CUBE_UP_DEFAULTS: ResolvedCardCubeUpOptions = {
  width: 220,
  height: 320,
  cornerRadius: 18,
  flash: { ...CARD_CUBE_UP_FLASH_DEFAULTS },
  bloomFade: { ...CARD_CUBE_UP_BLOOM_DEFAULTS },
  risingLightColumns: { ...CARD_CUBE_UP_COLUMNS_DEFAULTS },
  risingBlocks: { ...CARD_CUBE_UP_BLOCKS_DEFAULTS },
  flashAt: 0,
  bloomFadeAt: 0,
  // Early starts: each rising effect's own per-element delay/fade-in still
  // paces emergence so first trails/blocks appear during the flash peak.
  risingLightColumnsAt: 40,
  risingBlocksAt: 80,
}

export function resolveCardCubeUpOptions(
  options: CardCubeUpOptions | undefined,
): ResolvedCardCubeUpOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? CARD_CUBE_UP_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? CARD_CUBE_UP_DEFAULTS.height, 1, 4096)

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? CARD_CUBE_UP_DEFAULTS.cornerRadius),
      width,
      height,
    ),
    flash: {
      ...CARD_CUBE_UP_FLASH_DEFAULTS,
      ...(raw.flash ?? {}),
    },
    bloomFade: {
      ...CARD_CUBE_UP_BLOOM_DEFAULTS,
      ...(raw.bloomFade ?? {}),
    },
    risingLightColumns: {
      ...CARD_CUBE_UP_COLUMNS_DEFAULTS,
      ...(raw.risingLightColumns ?? {}),
    },
    risingBlocks: {
      ...CARD_CUBE_UP_BLOCKS_DEFAULTS,
      ...(raw.risingBlocks ?? {}),
    },
    flashAt: clamp(raw.flashAt ?? CARD_CUBE_UP_DEFAULTS.flashAt, 0, 10_000),
    bloomFadeAt: clamp(
      raw.bloomFadeAt ?? CARD_CUBE_UP_DEFAULTS.bloomFadeAt,
      0,
      10_000,
    ),
    risingLightColumnsAt: clamp(
      raw.risingLightColumnsAt ?? CARD_CUBE_UP_DEFAULTS.risingLightColumnsAt,
      0,
      10_000,
    ),
    risingBlocksAt: clamp(
      raw.risingBlocksAt ?? CARD_CUBE_UP_DEFAULTS.risingBlocksAt,
      0,
      10_000,
    ),
  }
}
