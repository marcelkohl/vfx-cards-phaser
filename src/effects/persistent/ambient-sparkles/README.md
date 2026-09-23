# Ambient Sparkles

Persistent Effect — sparse luminous four-point sparkles that appear, brighten,
and fade **in place** around a target frame.

```ts
import {
  AmbientSparklesEffect,
  AMBIENT_SPARKLES_DEFAULTS,
  type AmbientSparklesOptions,
} from 'phaser-vfx-effects'

const effect = new AmbientSparklesEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0xc8f4ff,
  maxActiveSparkles: 6,
  spawnRegion: 'mixed',
  position: 'front',
})

effect.enable(context)
// …ambient loop continues…
effect.disable()
effect.destroy()
```

Registry id: `ambient-sparkles`.

## Visual purpose

Ambient magical glints — a few small stationary stars gently appearing across
the card. Suitable as a building block for compositions such as a Card Star Loop
recipe (playground-only), but this effect is a standalone package API.

## Behavior

| Trait | Detail |
|---|---|
| Kind | **Persistent** — no `run()` / `onFinish()` |
| Motion | **Stationary** after spawn (no drift, float, or travel) |
| Density | Sparse — capped by `maxActiveSparkles` (default `6`) |
| Timing | Organic spawn intervals (`minSpawnInterval`…`maxSpawnInterval`) |
| Lifetime | Per-sparkle range (`minLifetime`…`maxLifetime`) |
| Size | Per-sparkle range (`minSize`…`maxSize`), biased toward smaller |

Each sparkle follows:

```text
fade in → readable peak → fade out → gone
```

while new sparkles continue appearing elsewhere.

## Opacity & scale envelopes

- Opacity: smoothstep fade-in / fade-out (`fadeInPortion`, `fadeOutPortion`).
- Scale: subtle grow `startScale → peakScale → endScale` (default `0.65 → 1 → 1.05`).
  No bounce / pulse oscillation.

## Spawn region

| Value | Meaning |
|---|---|
| `area` | Interior of the frame |
| `edge` | Near the perimeter |
| `mixed` | Mostly area, some edge, occasional slightly outside (`outsideAllowance`) |

Default for Card Star Loop–like looks: `mixed`.

## Determinism

`seed` drives a local hash stream (`ambientHash01`). Same seed + options → same
sequence of positions, sizes, lifetimes, and spawn intervals over time. The
spawn counter keeps advancing so short A→B→C loops do not visibly repeat.

## Layering

`position: 'front' | 'back'` — default `front` (over artwork).

## Lifecycle

1. `enable(context)` — builds a pooled sparkle buffer and begins spawning.
2. `update` — advances envelopes, spawns when slots are free, redraws.
3. `disable()` — stops immediately and clears all visuals (package Persistent
   Effect convention; no frozen stars left on screen).
4. Re-`enable` — clean restart; sequence resets from `seed`.

Object reuse: a fixed pool sized to `maxActiveSparkles` — no per-spawn allocation.

## Rendering

Procedural Phaser Graphics (ADD blend):

```text
soft halo + horizontal streak + vertical streak + four-point core
```

No textures. No particle system. No physics.

## Not the same as…

| Effect | Difference |
|---|---|
| **Sparkle Burst** | Action Effect — one finite burst with travel; `run()` / finish |
| **Star Flare** | Action Effect — single large central flare; `run()` / finish |

Ambient Sparkles does **not** depend on either effect and does not share
rendering helpers with them.

## Example (Card Star Loop–like)

```ts
new AmbientSparklesEffect({
  color: 0xc8f4ff,
  intensity: 1.05,
  opacity: 0.9,
  maxActiveSparkles: 6,
  minSpawnInterval: 140,
  maxSpawnInterval: 360,
  minLifetime: 550,
  maxLifetime: 1100,
  minSize: 8,
  maxSize: 22,
  spawnRegion: 'mixed',
  outsideAllowance: 14,
  position: 'front',
  seed: 11,
})
```

## Defaults

See `AMBIENT_SPARKLES_DEFAULTS` in `ambientSparklesOptions.ts`.
