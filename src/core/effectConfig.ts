/** Shared helpers for merging and clamping effect option objects. */

/** Default frame size used when the consumer omits width/height. */
export const EFFECT_FRAME_DEFAULTS = {
  width: 220,
  height: 320,
} as const

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

/**
 * Corner radius in local card pixels, clamped to the largest geometrically
 * valid value for the padded rounded-rect path.
 */
export function resolveCornerRadius(
  requested: number,
  width: number,
  height: number,
  outerPadding = 0,
): number {
  const maxRadius = Math.min(
    (width + outerPadding * 2) / 2,
    (height + outerPadding * 2) / 2,
  )

  if (!Number.isFinite(requested) || requested < 0) {
    return 0
  }

  return Math.min(requested, maxRadius)
}

export function wrap01(value: number): number {
  return ((value % 1) + 1) % 1
}

/** Phaser-style hex color → normalized RGB components in 0..1. */
export function colorToRgb01(color: number): [number, number, number] {
  const hex = color >>> 0
  return [
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  ]
}

export function mergeOptions<T extends object>(
  defaults: T,
  options?: Partial<T>,
): T {
  if (!options) {
    return { ...defaults }
  }

  return { ...defaults, ...options }
}
