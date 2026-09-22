# Star Flare

**Action Effect** — a bright central magical flare with soft horizontal and
vertical luminous streaks, anchored to a configurable position on the target.

Use it for a fantasy lens-flare / energy-flare beat. One `run()` plays one
complete flare. Recipes and Transitions own any repetition or orchestration
(e.g. a future Card Flare sequence).

## Visual purpose

```text
            │
            │
            │
      ──────✦──────
            │
            │
            │
```

Hierarchy at peak:

1. Bright four-point **central star** (brightest)
2. Soft **central halo**
3. Dominant **horizontal** luminous streak
4. Supporting **vertical** luminous streak

Rays are soft light streaks — not thin geometric lines. They fade and taper
toward their tips. The horizontal ray may extend well beyond the target width.

## Difference from Rising Star

| | Star Flare | Rising Star |
|---|---|---|
| Motion | Anchored (no travel) | Travels along a direction |
| Role | Central impact / lens flare | Floating magical particles |
| Count | One flare per `run()` | Many rising instances |

Do not use Star Flare for upward-traveling stars.

## Category

Action Effect (`enable` → `run` → finish → `run` again).

## One run = one flare

There is no `repeatCount` or internal loop. A single:

```ts
effect.run()
```

performs exactly one flare animation.

## Usage

```ts
import {
  StarFlareEffect,
  STAR_FLARE_DEFAULTS,
  type StarFlareOptions,
} from 'phaser-vfx-effects'

const flare = new StarFlareEffect({
  width: 220,
  height: 320,
  color: 0xfff4dd,
  intensity: 1.15,
  opacity: 0.95,
  horizontalLength: 400,
  verticalLength: 380,
  horizontalThickness: 16,
  verticalThickness: 11,
  glowRadius: 34,
  positionX: 0.5,
  positionY: 0.5,
  fadeInDuration: 50,
  holdDuration: 60,
  fadeOutDuration: 400,
  position: 'front',
})

flare.enable({ scene, target })
flare.onFinish(() => {
  // natural completion
})
flare.run()
```

Registry id: `star-flare`.

## Configuration

| Name | Default | Description |
|---|---:|---|
| `width` / `height` | `220` / `320` | Target frame (for normalized position) |
| `color` | `0xfff4dd` | Warm white tint |
| `intensity` | `1.15` | Peak brightness |
| `opacity` | `0.95` | Peak alpha multiplier |
| `horizontalLength` | `400` | Tip-to-tip horizontal streak (px) |
| `verticalLength` | `380` | Tip-to-tip vertical streak (px) |
| `horizontalThickness` | `16` | Soft mid thickness of H streak (px) |
| `verticalThickness` | `11` | Soft mid thickness of V streak (px) |
| `glowRadius` | `34` | Central soft halo radius (px); drives core size |
| `positionX` | `0.5` | Normalized X on the target (0 left → 1 right) |
| `positionY` | `0.5` | Normalized Y on the target (0 top → 1 bottom) |
| `fadeInDuration` | `50` | Rise to peak (ms) |
| `holdDuration` | `60` | Hold at peak (ms) |
| `fadeOutDuration` | `400` | Soft disappearance (ms) |
| `position` | `'front'` | `'front'` / `'back'` layering |

### Normalized positioning

```ts
{ positionX: 0.5, positionY: 0.5 }  // exact center
{ positionX: 0.5, positionY: 0.25 } // upper center
```

Offsets are computed in local target space:

`(positionX - 0.5) * width`, `(positionY - 0.5) * height`.

### Ray dimensions

Horizontal and vertical lengths / thicknesses are **independent** (pixels).
Defaults favor a dominant horizontal flare with a clear vertical component.

### Timing

```ts
// Quick impact + soft exit
{ fadeInDuration: 50, holdDuration: 60, fadeOutDuration: 400 }

// Longer magical bloom
{ fadeInDuration: 120, holdDuration: 140, fadeOutDuration: 700 }
```

Sequence: invisible → fast build → bright peak → short hold → longer fade → invisible.

During fade-in, rays grow subtly (~55% → 100% length). Not an expanding explosion.

## Rendering

Drawn with Phaser `Graphics` + ADD blend:

- layered soft circles for the halo / hot core;
- segmented axis-aligned trapezoids for H/V rays (alpha + taper toward tips);
- four-point star polygons for the bright center.

Components share color and envelope so they read as one flare.

## Lifecycle

| Method | Behavior |
|---|---|
| `enable(ctx)` | Prepare, remain invisible |
| `run()` | Reset and play **one** flare |
| `stop()` | Hide immediately (no `onFinish`) |
| `onFinish(cb)` | Fires once on natural completion |
| `disable` / `destroy` | Release visuals / listeners |

`run()` while active restarts cleanly. First armed frame samples `elapsed = 0`
(invisible) — no initial flicker.

## Layering / target usage

Uses generic `EffectContext` `{ scene, target }`. The flare is a child of the
target, so it tracks move/scale. No `Card` dependency.

`position: 'front' | 'back'` controls draw order among the target's children.

## Replay

```ts
flare.run() // first
flare.run() // restart / replay
```

Repetition belongs to a Transition / recipe.

## Playground

**Action Effects → Star Flare**. Each click runs one flare.

## Out of scope

- Card Flare recipe
- Converging Frame / Light Burst integration
- Upward travel (Rising Star)
- Repeat / delay inside the effect
- Camera shake / sound
