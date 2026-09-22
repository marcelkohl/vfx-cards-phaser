import type {
  BloomFadeOptions,
  DissolveRevealOptions,
  FlashOptions,
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

export interface CardDissolveRevealOptions {
  width?: number
  height?: number
  cornerRadius?: number
  flash?: FlashOptions
  dissolveReveal?: DissolveRevealOptions
  bloomFade?: BloomFadeOptions
  flashAt?: number
  dissolveAt?: number
  bloomAt?: number
}

export type CardDissolveRevealTransitionOptions = CardDissolveRevealOptions

export interface ResolvedCardDissolveRevealOptions {
  width: number
  height: number
  cornerRadius: number
  flash: FlashOptions
  dissolveReveal: DissolveRevealOptions
  bloomFade: BloomFadeOptions
  flashAt: number
  dissolveAt: number
  bloomAt: number
}

/**
 * Flash runs in parallel with dissolve and should finish around mid-dissolve.
 * Total envelope ≈ dissolve duration / 2 (1000ms for the 2000ms dissolve default).
 */
export const CARD_DISSOLVE_REVEAL_FLASH_DEFAULTS: FlashOptions = {
  fadeInDuration: 90,
  holdDuration: 210,
  fadeOutDuration: 700,
  color: 0x66dd99,
}

export const CARD_DISSOLVE_REVEAL_BLOOM_DEFAULTS: BloomFadeOptions = {
  color: 0x66dd99,
  intensity: 0.68,
  padding: 10,
  fadeInDuration: 60,
  holdDuration: 580,
  fadeOutDuration: 580,
  expansion: 1,
  position: 'back',
  shape: 'organic',
}

export const CARD_DISSOLVE_REVEAL_DISSOLVE_DEFAULTS: DissolveRevealOptions = {
  /** Fill of the still-hidden area — override to match scene/UI (not only black). */
  coverColor: 0xBFD5FF,
  duration: 2000,
  edgeColor: 0x3471E3,
}

export const CARD_DISSOLVE_REVEAL_DEFAULTS: ResolvedCardDissolveRevealOptions = {
  width: 220,
  height: 320,
  cornerRadius: 18,
  flash: { ...CARD_DISSOLVE_REVEAL_FLASH_DEFAULTS },
  dissolveReveal: { ...CARD_DISSOLVE_REVEAL_DISSOLVE_DEFAULTS },
  bloomFade: { ...CARD_DISSOLVE_REVEAL_BLOOM_DEFAULTS },
  /** Flash + dissolve start together. */
  flashAt: 0,
  dissolveAt: 0,
  /** Bloom joins around mid-dissolve, as flash finishes. */
  bloomAt: 1000,
}

export function resolveCardDissolveRevealOptions(
  options: CardDissolveRevealOptions | undefined,
): ResolvedCardDissolveRevealOptions {
  const raw = options ?? {}
  const width = clamp(
    raw.width ?? CARD_DISSOLVE_REVEAL_DEFAULTS.width,
    1,
    4096,
  )
  const height = clamp(
    raw.height ?? CARD_DISSOLVE_REVEAL_DEFAULTS.height,
    1,
    4096,
  )

  const dissolveReveal: DissolveRevealOptions = {
    ...CARD_DISSOLVE_REVEAL_DISSOLVE_DEFAULTS,
    ...(raw.dissolveReveal ?? {}),
  }

  const flashRaw = raw.flash ?? {}
  const hasCustomFlashEnvelope =
    flashRaw.fadeInDuration != null ||
    flashRaw.holdDuration != null ||
    flashRaw.fadeOutDuration != null

  let flash: FlashOptions = {
    ...CARD_DISSOLVE_REVEAL_FLASH_DEFAULTS,
    ...flashRaw,
  }

  // Keep flash ≈ half dissolve unless the caller overrides the flash envelope.
  if (!hasCustomFlashEnvelope) {
    const dissolveDuration =
      dissolveReveal.duration ??
      CARD_DISSOLVE_REVEAL_DISSOLVE_DEFAULTS.duration ??
      2000
    const baseIn = CARD_DISSOLVE_REVEAL_FLASH_DEFAULTS.fadeInDuration ?? 90
    const baseHold = CARD_DISSOLVE_REVEAL_FLASH_DEFAULTS.holdDuration ?? 210
    const baseOut = CARD_DISSOLVE_REVEAL_FLASH_DEFAULTS.fadeOutDuration ?? 700
    const baseTotal = baseIn + baseHold + baseOut
    const scale = dissolveDuration * 0.8 / baseTotal
    flash = {
      ...flash,
      fadeInDuration: Math.max(1, Math.round(baseIn * scale)),
      holdDuration: Math.max(0, Math.round(baseHold * scale)),
      fadeOutDuration: Math.max(1, Math.round(baseOut * scale)),
    }
  }

  const midDissolveMs = Math.round(
    (dissolveReveal.duration ??
      CARD_DISSOLVE_REVEAL_DISSOLVE_DEFAULTS.duration ??
      2000) * 0.5,
  )

  return {
    width,
    height,
    cornerRadius: resolveCornerRadius(
      Math.max(
        0,
        raw.cornerRadius ?? CARD_DISSOLVE_REVEAL_DEFAULTS.cornerRadius,
      ),
      width,
      height,
    ),
    flash,
    dissolveReveal,
    bloomFade: {
      ...CARD_DISSOLVE_REVEAL_BLOOM_DEFAULTS,
      ...(raw.bloomFade ?? {}),
    },
    flashAt: clamp(
      raw.flashAt ?? CARD_DISSOLVE_REVEAL_DEFAULTS.flashAt,
      0,
      10_000,
    ),
    dissolveAt: clamp(
      raw.dissolveAt ?? CARD_DISSOLVE_REVEAL_DEFAULTS.dissolveAt,
      0,
      10_000,
    ),
    bloomAt: clamp(raw.bloomAt ?? midDissolveMs, 0, 10_000),
  }
}
