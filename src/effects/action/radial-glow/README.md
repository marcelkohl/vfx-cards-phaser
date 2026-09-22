# Radial Glow

**Action Effect** — a soft luminous circular / elliptical **expanding optical halo**.

Light concentrates on a **thin dense current rim**. A long soft ghost trail lingers inside (behind the wave front). A short outer glow bleeds slightly ahead. The far interior stays mostly transparent.

One `run()` plays one complete expanding halo. Recipes own any orchestration.

## Visual purpose

```text
                         expansion →

INNER TRAIL                CURRENT RIM        OUTER GLOW
long + subtle              thin + dense       short + soft

░░░░░░░░░░░░░░░░░░─────────│─────────░░░
                              ↑
                         current radius
```

Across one radial slice:

```text
brightness

                      thin rim
                          │
                         ██
                       ▓███▓
                    ▒▒▓█████▓▒
              ░░░▒▒▓█████████▓▒
________░░░░░░____________________░________
                                          radius →

        long inner trail       short outer glow
```

The asymmetric trail suggests outward expansion even in a still frame.

## Difference from related effects

| | Radial Glow | Light Burst | Bloom Fade | Star Flare |
|---|---|---|---|---|
| Shape | Soft halo **ring** + inward trail | Directional rays | Border / mist near frame | Cross + hot core |
| Energy | On the circumference | Along rays | Near card outline | At a focal point |
| Interior | Mostly transparent (ghost trail only) | N/A | N/A | Bright center |

## Category

Action Effect (`enable` → `run` → finish → `run` again).

## Usage

```ts
import {
  RadialGlowEffect,
  RADIAL_GLOW_DEFAULTS,
  type RadialGlowOptions,
} from 'phaser-vfx-effects'

const glow = new RadialGlowEffect({
  width: 220,
  height: 320,
  color: 0x4ec8ff,
  intensity: 0.3,
  opacity: 0.85,
  radius: 125,
  aspect: 1.1,
  ringWidth: 1.5,
  rimIntensity: 2.4,
  innerTrail: 0.5,
  outerGlow: 0.09,
  positionX: 0.5,
  positionY: 0.5,
  startScale: 0.72,
  endScale: 1.18,
  fadeInDuration: 360,
  holdDuration: 90,
  fadeOutDuration: 160,
  softness: 0.68,
  position: 'front',
})

glow.enable({ scene, target })
glow.run()
```

Registry id: `radial-glow`.

## Configuration

| Name | Default | Description |
|---|---:|---|
| `width` / `height` | `220` / `320` | Target frame (normalized position) |
| `color` | `0x4ec8ff` | Halo tint |
| `intensity` | `0.28` | Peak brightness (subtle by default) |
| `opacity` | `0.85` | Peak alpha multiplier |
| `radius` | `130` | Circumference radius at scale 1 (px, vertical) |
| `aspect` | `1.12` | Horizontal / vertical ellipse ratio |
| `ringWidth` | `1.5` | Width of the **thin** dense current rim at scale 1 (px) |
| `rimIntensity` | `2.35` | How strongly the rim stands out from the trail |
| `innerTrail` | `0.5` | Inward ghost extent as a fraction of radius |
| `outerGlow` | `0.09` | Outward soft glow extent as a fraction of radius |
| `positionX` / `positionY` | `0.5` / `0.5` | Normalized anchor on the target |
| `startScale` | `0.7` | Scale at t = 0 |
| `endScale` | `1.2` | Scale at t = 1 |
| `fadeInDuration` | `350` | Opacity fade-in (ms) |
| `holdDuration` | `80` | Peak opacity hold (ms) |
| `fadeOutDuration` | `160` | Opacity fade-out (ms) |
| `softness` | `0.7` | Soft haze / trail dissolve (does not thicken the rim core) |
| `position` | `'front'` | `'front'` / `'back'` layering |

Resolved `duration` = `fadeInDuration + holdDuration + fadeOutDuration` (default **590** ms). There is no separate public `duration` or `peakAt` — phases are the timing model.

Defaults intentionally favor `innerTrail > outerGlow` and `fadeInDuration > fadeOutDuration`.

## Spatial model

```text
inner ghost → thin dense rim → short outer glow
```

- **`ringWidth`** controls only the thin luminous core.
- Soft haze around the rim is controlled by **`softness`**, not by thickening `ringWidth`.
- **`innerTrail`** / **`outerGlow`** control the asymmetric residual / bleed.

## Temporal model

```text
opacity:

0
│
│                 ┌───────┐
│              ╱  │ PEAK  │ ╲
│           ╱     │ hold  │   ╲
│        ╱        │       │     ╲
│___╱_____________│_______│_________╲____
    fade in          hold    fast fade
```

```text
TIME ───────────────────────────────────────►

opacity:
        ╭──────────╮
      ╱              ╲
0 ──╯                  ╰── 0

scale:
small ───────────────────────────────────► large
```

**Expansion continues independently** through fade-in, hold, and fade-out. Scale never freezes during hold and never contracts.

Fade-out declines promptly via `(1 − t)²` so opacity reaches true zero by the end of `fadeOutDuration` before `onFinish` — no abrupt pop when the renderer resets.

## Radial profile

The shader treats each side of the circumference separately:

```text
d < 1   → long soft inner trail
d ≈ 1   → thin dense current rim (+ soft optical haze)
d > 1   → short soft outer glow
```

No discrete concentric rings — one continuous falloff.

## Layering

`position: 'front' | 'back'`. With `'front'`, the ring may cross the artwork while the transparent interior keeps the image readable.

## Lifecycle

| Method | Behavior |
|---|---|
| `enable(ctx)` | Prepare, remain invisible |
| `run()` | Reset and play **one** halo |
| `stop()` | Hide immediately (no `onFinish`) |
| `onFinish(cb)` | Fires once on natural completion |
| `disable` / `destroy` | Release visuals / listeners |

## Rendering

- **WebGL:** asymmetric distance-from-circumference (inner / thin rim / outer).
- **Canvas:** soft stroked ellipses — faint inner trail, soft haze, thin dense rim, few outer strokes.

ADD blend. Procedural — no textures, no frame accumulation.

## Playground

**Action Effects → Radial Glow**. Inspect around one selected card — halo should stay associated with that card, not cover the whole row.

## Out of scope

- Card Flare recipe integration
- Rays, stars, filled fog disks
- Discrete multi-ring “onion” trails
- Chromatic / rainbow lens flare colors
- Shared envelopes with other Action Effects
- Temporal framebuffer accumulation
