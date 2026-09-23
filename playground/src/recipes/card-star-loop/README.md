# Card Star Loop (recipe)

Educational playground recipe — **not** part of `phaser-vfx-effects`.

This composition shows how independent reusable effects can create a
**continuous magical card state** without any new package effect.

```text
Card Star Loop
│
├── PulsingFrameEffect          → persistent inward-breathing border
├── AmbientSparklesEffect       → persistent ambient magical detail
└── LightBurstEffect × 3        → finite actions chained via onProgress()
```

The package effects do **not** know about this composition. The recipe only
chooses participants, configures them, and coordinates their public lifecycles.

## Layers

### Pulsing Frame

Stationary rounded contour; glow falls inward; ~2s breath between a visible low
and a clearly energized high. Runs continuously while the recipe is active.

### Ambient Sparkles

Small luminous four-point stars that spawn, stay put, and fade. Continuous
ambient detail — no drift or travel.

### Light Burst × 3

Three independent Action Effects crossfade forever through the generic
`onProgress()` API:

```ts
burstA.onProgress(0.45, () => burstB.run())
burstB.onProgress(0.45, () => burstC.run())
burstC.onProgress(0.45, () => burstA.run())
burstA.run()
```

No `setTimeout`, no recipe scheduler, no loop option on Light Burst.

## Why three Light Burst instances

| Setting | Value |
|---|---:|
| `duration` | `2000` ms |
| `peakAt` | `0.5` |
| chain at | `onProgress(0.45)` ≈ **900** ms |

```text
A ──────────────────── 2000
         B ────────────────────
                  C ────────────────────
                           A ────────────────────
```

| Setup | Next reuse of A | Problem |
|---|---|---|
| 2 instances | ~1800 ms | A still alive until 2000 → abrupt restart |
| 3 instances | ~2700 ms | A finished at 2000 → clean reuse |

Pairwise overlap ≈ **1100** ms (`2000 − 900`).

## Deterministic seeds

| Instance | Seed |
|---|---:|
| A | `1` |
| B | `8731` |
| C | `42042` |

Colors stay in one cool cyan / pale-blue family so the viewer reads **changing
ray patterns**, not alternating color themes.

## Controls

- First click → start continuous state (frame + sparkles + burst chain)
- Click again while active → `stop()` all three bursts + disable persistents
- Pending `onProgress` callbacks guard on an `active` flag and cannot resurrect
  the chain after stop
- `enable()` clears previous subscriptions before re-registering (no duplicate
  chains on repeated enable)

## Not the same as

| Entry | Role |
|---|---|
| **Pulsing Frame** (persistent panel) | Isolated frame validation |
| **Ambient Sparkles** (persistent panel) | Isolated sparkle validation |
| **Light Burst Progress Chain** | Isolated `onProgress` crossfade validation |

Keep those available. Card Star Loop is the combined final look.
