import type {
  BloomFadeOptions,
  FlashOptions,
  LightBurstOptions,
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

export interface CardFlashBurstOptions {
  width?: number
  height?: number
  cornerRadius?: number
  flash?: FlashOptions
  lightBurst?: LightBurstOptions
  bloomFade?: BloomFadeOptions
  flashAt?: number
  lightBurstAt?: number
  bloomFadeAt?: number
}

export interface ResolvedCardFlashBurstOptions {
  width: number
  height: number
  cornerRadius: number
  flash: FlashOptions
  lightBurst: LightBurstOptions
  bloomFade: BloomFadeOptions
  flashAt: number
  lightBurstAt: number
  bloomFadeAt: number
}

/** Bloom preset tuned for residual mist after the flash impact. */
export const CARD_FLASH_BURST_BLOOM_DEFAULTS: BloomFadeOptions = {
  color: 0xccffe8,
  intensity: 0.48,
  padding: 10,
  fadeInDuration: 60,
  holdDuration: 80,
  fadeOutDuration: 580,
  expansion: 1,
  position: 'back',
  shape: 'organic',
}

export const CARD_FLASH_BURST_DEFAULTS: ResolvedCardFlashBurstOptions = {
  width: 220,
  height: 320,
  cornerRadius: 18,
  flash: {},
  lightBurst: {},
  bloomFade: { ...CARD_FLASH_BURST_BLOOM_DEFAULTS },
  flashAt: 0,
  lightBurstAt: 40,
  bloomFadeAt: 20,
}

export function resolveCardFlashBurstOptions(
  options: CardFlashBurstOptions | undefined,
): ResolvedCardFlashBurstOptions {
  const raw = options ?? {}
  const width = clamp(raw.width ?? CARD_FLASH_BURST_DEFAULTS.width, 1, 4096)
  const height = clamp(raw.height ?? CARD_FLASH_BURST_DEFAULTS.height, 1, 4096)

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(0, raw.cornerRadius ?? CARD_FLASH_BURST_DEFAULTS.cornerRadius),
      width,
      height,
    ),
    flash: { ...(raw.flash ?? {}) },
    lightBurst: { ...(raw.lightBurst ?? {}) },
    bloomFade: {
      ...CARD_FLASH_BURST_BLOOM_DEFAULTS,
      ...(raw.bloomFade ?? {}),
    },
    flashAt: clamp(raw.flashAt ?? CARD_FLASH_BURST_DEFAULTS.flashAt, 0, 10_000),
    lightBurstAt: clamp(
      raw.lightBurstAt ?? CARD_FLASH_BURST_DEFAULTS.lightBurstAt,
      0,
      10_000,
    ),
    bloomFadeAt: clamp(
      raw.bloomFadeAt ?? CARD_FLASH_BURST_DEFAULTS.bloomFadeAt,
      0,
      10_000,
    ),
  }
}
