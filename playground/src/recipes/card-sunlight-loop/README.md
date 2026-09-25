# Card SunLight Loop (recipe)

Educational playground recipe — **not** part of `phaser-vfx-effects`.

This composition shows how independent reusable effects can create a
**brighter continuous magical card state** with expanding circular light waves —
without any new package effect.

```text
Card SunLight Loop
│
├── PulsingFrameEffect          → persistent border (glow inside + outside)
├── AmbientSparklesEffect       → persistent ambient magical detail
├── LightBurstEffect × 3        → richer ray-pattern crossfade via onProgress()
└── RadialGlowEffect × 2        → successive expanding optical waves
```

The package effects do **not** know about this composition. The recipe only
chooses participants, configures them, and coordinates their public lifecycles.

Independent of **Card Star Loop** — both may share primitives and patterns, but
each recipe is self-contained.

## Layers

### Pulsing Frame

Stationary rounded contour; soft glow on **both** sides of the border; ~2s breath
between a visible low and a clearly energized high. Runs continuously while the
recipe is active.

### Ambient Sparkles

Small luminous four-point stars that spawn, stay put, and fade. Continuous
secondary detail — sparse enough not to dominate.

### Light Burst × 3

Three independent Action Effects crossfade forever through the generic
`onProgress()` API:

```ts
burstA.onProgress(0.45, () => burstB.run())
burstB.onProgress(0.45, () => burstC.run())
burstC.onProgress(0.45, () => burstA.run())
burstA.run()
```

Recipe-only intensity / ray geometry is moderately stronger than Card Star Loop
so the ray field stays present without becoming opaque cyan fog.

### Radial Glow × 2

Two independent expanding optical rings chain through `onProgress()`:

```ts
radialA.onProgress(0.55, () => radialB.run())
radialB.onProgress(0.55, () => radialA.run())
```

Thin luminous rim + soft outer glow + subtle inner trail; interior stays mostly
transparent. Scale expands continuously outward (never zooms back).

## Why multiple Action Effect instances

| Family | Count | Why |
|---|---:|---|
| Light Burst | 3 | Genuine pairwise overlap without restarting an active burst |
| Radial Glow | 2 | Successive waves overlap; A finishes before it is reused |

```text
Light Burst (duration 2000, chain @ 0.45 → start every ~900ms)

A ──────────────────── 2000
         B ────────────────────
                  C ────────────────────
                           A ────────────────────

Radial Glow (duration 1600, chain @ 0.55 → start every ~880ms)

A ──────────────── 1600
         B ────────────────
                  A ────────────────
```

| Setup | Next reuse of A | Safe? |
|---|---|---|
| Radial × 2 @ 0.55 | ~1760 ms | Yes (A ends at 1600) |
| Radial × 2 @ 0.45 | ~1440 ms | No — would restart A early |

## Desynchronized rhythms

Light Burst starts every ~900 ms. Radial Glow starts every ~880 ms, and the first
wave is kickstarted ~440 ms into the opening burst (`onProgress(0.22)`).

The two chains are **not** locked together — the composition stays continuously
alive rather than pulsing as one mechanical cycle.

## Deterministic Light Burst seeds

| Instance | Seed |
|---|---:|
| A | `101` |
| B | `9091` |
| C | `55055` |

Colors stay in one cool cyan / pale-blue family so the viewer reads **changing
ray patterns**, not alternating color themes.

## Controls

- First click → start continuous state (frame + sparkles + burst + radial chains)
- Click again while active → `stop()` all actions + disable persistents
- Pending `onProgress` callbacks guard on an `active` flag and cannot resurrect
  either chain after stop
- `enable()` clears previous subscriptions before re-registering (no duplicate
  chains on repeated enable)

## Visual hierarchy

1. Bright cyan card border
2. Atmospheric radial rays
3. Expanding circular waves
4. Small sparkle accents

Card artwork stays readable — luminous, not blown out.

## Not the same as

| Entry | Role |
|---|---|
| **Card Star Loop** | Related quieter loop (no Radial Glow waves) |
| **Pulsing Frame** (persistent panel) | Isolated frame validation |
| **Ambient Sparkles** (persistent panel) | Isolated sparkle validation |
| **Light Burst Progress Chain** | Isolated `onProgress` crossfade validation |
| **Radial Glow** (action panel) | Isolated single-wave validation |

Keep those available. Card SunLight Loop is the combined energetic look.
