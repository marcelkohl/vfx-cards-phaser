# Feather (recipe)

Educational playground recipe — **not** part of `phaser-vfx-effects`.

## Visual goal

A magical card reveal: soft edge aura appears first, then feather-like fragments peel away, sparkles glitter around the frame, and rising stars lift while the aura is still breathing — one continuous event.

## Effects combined

| Effect | Role |
|---|---|
| **Soft Glow Pulse** (aura) | Foundation — quick rise, long fade under everything |
| **Fragment Burst** | Feather / shard pieces leaving the card |
| **Sparkle Burst** | Tiny magical stars around the silhouette |
| **Rising Star** (×2 waves) | Vertical luminous stars at staggered moments |

Composition only — all rendering lives in the package Action Effects.

## Why playground-only

The package ships reusable building blocks (`SoftGlowPulseEffect`, `FragmentBurstEffect`, …) plus the generic `Transition` orchestrator.

Feather is a **didactic recipe**: one polished way to schedule those blocks. Copy it into your game, retune timings, or write a different composition — do not treat this folder as a library export.

## Timeline (defaults)

```text
0 ms      Soft Glow Pulse (aura)
90 ms     Fragment Burst
200 ms    Sparkle Burst
280 ms    Rising Star (first wave)
520 ms    Rising Star (second wave)
```

Aura fade-out is long so it remains the visual bed while bursts play. Exact milliseconds are tunable via `auraAt` / `fragmentAt` / …

## Adapt for your game

```ts
import {
  SoftGlowPulseEffect,
  FragmentBurstEffect,
  SparkleBurstEffect,
  RisingStarEffect,
  Transition,
} from 'phaser-vfx-effects'
```

Tune:

- `aura` / `fragmentBurst` / `sparkleBurst` / `risingStar` / `risingStarLate`;
- `auraAt` / `fragmentAt` / `sparkleAt` / `risingStarAt` / `risingStarLateAt`;
- frame geometry (`width` / `height` / `cornerRadius`).

## Usage in this playground

Panel → **Transitions** → **Feather**.
