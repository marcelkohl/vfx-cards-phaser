# Converging Frame

**Action Effect** — a luminous Edge Glow-like frame that starts slightly larger
than the target and contracts inward once per `run()`.

Use it for a single quick converge, a slow magical contraction, or as a building
block that a Transition / recipe can fire repeatedly for a tunnel-like sequence.

## Visual purpose

```text
LARGER FRAME
     ↓
     ↓
TARGET SIZE
     ↓
 disappear
```

- Frame appears outside the target.
- Contracts smoothly toward the target dimensions.
- Fades naturally while converging.
- Ends fully invisible.

At its strongest moment the look matches **Edge Glow**: soft luminous edges,
stronger corners, quieter edge centers, controlled glow spread.

## Category

Action Effect (`enable` → `run` → finish → `run` again).

## One run = one convergence

Repetition is **intentionally not** part of this effect.

There is no `repeatCount`, `repeatDelay`, or internal loop. A single:

```ts
effect.run()
```

performs exactly one complete convergence.

Repeated tunnel-like behavior should be orchestrated by a **Transition** or
recipe that calls `run()` multiple times (or creates multiple instances).

## Usage

```ts
import {
  ConvergingFrameEffect,
  CONVERGING_FRAME_DEFAULTS,
  type ConvergingFrameOptions,
} from 'phaser-vfx-effects'

const frame = new ConvergingFrameEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0x66dd99,
  intensity: 0.95,
  startScale: 1.1,
  endScale: 1,
  duration: 420,
  fadeInDuration: 50,
  fadeOutDuration: 180,
  position: 'front',
})

frame.enable({ scene, target })
frame.onFinish(() => {
  // natural completion
})
frame.run()
```

Registry id: `converging-frame`.

## Configuration

| Name | Default | Description |
|---|---:|---|
| `width` / `height` | `220` / `320` | Final target frame size |
| `cornerRadius` | `18` | Final target corner radius |
| `color` | `0x66dd99` | Glow tint (Edge Glow mint) |
| `intensity` | `0.95` | Peak band brightness |
| `startScale` | `1.10` | Initial scale (larger than target) |
| `endScale` | `1.0` | Final scale when convergence ends |
| `duration` | `420` | Overall convergence movement (ms) |
| `fadeInDuration` | `50` | Opacity rise at the start (ms) |
| `fadeOutDuration` | `180` | Opacity fall at the end (ms) |
| `innerCoverage` | `0.09` | Inward glow reach (fraction of min side) |
| `softness` | `0.9` | Falloff softness |
| `cornerFocus` | `0.9` | Corner concentration |
| `outerSpread` | `0` | Outer aura (px) — off by default |
| `outerIntensity` | `0` | Outer aura strength |
| `opacity` | `0.9` | Peak alpha multiplier |
| `position` | `'front'` | `'front'` / `'back'` |

### Geometry

`width`, `height`, and `cornerRadius` describe the **final** target geometry.
`startScale` scales that whole frame proportionally.

Example: `width: 220`, `height: 320`, `startScale: 1.10` → the luminous frame
starts ~10% larger than the target and contracts toward `endScale`.

Corner geometry stays coherent while scaling (uniform scale on the display object).

### Duration

`duration` controls the convergence movement only. It is not hard-coded for any
recipe — consumers choose fast or slow:

```ts
{ duration: 180 }  // fast tunnel-like pulse
{ duration: 900 }  // slower magical converge
```

### Fade timing

`fadeInDuration` and `fadeOutDuration` are independent.

At `run()`:

1. Start invisible (strength `0`).
2. Fade in cleanly.
3. Converge (scale `startScale → endScale` over `duration`).
4. Fade out toward the end of `duration`.
5. Finish fully invisible.

No initial-frame flicker — opacity is reset before playback is armed, and the
first update samples `elapsed = 0`.

## Relationship with Edge Glow

Rendering reuses `EDGE_GLOW_FRAGMENT_SHADER` (WebGL) and the same corner-weighted
Graphics fallback as Soft Glow Pulse / Edge Glow.

The persistent **Edge Glow** effect is not modified. Converging Frame is a
temporary action that shares the visual language, not the persistent lifecycle.

| | Converging Frame | Soft Glow Pulse | Edge Glow |
|---|---|---|---|
| Role | Action, one converge | Action, opacity breath | Persistent |
| Motion | Scale inward | Opacity only | Static (optional pulse) |
| Shader | Edge Glow | Edge Glow | Edge Glow |

## Lifecycle

| Method | Behavior |
|---|---|
| `enable(ctx)` | Prepare, remain invisible |
| `run()` | Reset and play **one** convergence |
| `stop()` | Stop immediately, hide (no `onFinish`) |
| `onFinish(cb)` | Fires once on natural completion |
| `disable` / `destroy` | Release visuals / listeners / resources |

Calling `run()` while already active restarts the convergence cleanly.

## Positioning / layering

Uses the generic `EffectContext` (`{ scene, target }`). The frame stays centered
on the target (origin `0.5, 0.5`) and follows targets that move or scale.

`position: 'front' | 'back'` controls draw order among the target's children.
The effect does not assume how a recipe will layer it.

Works with different widths, heights, and corner radii. No `Card` dependency.

## Replay

```ts
frame.run() // first convergence
// …
frame.run() // restart / replay — one more convergence
```

For a tunnel of several converges, use a Transition timeline, for example:

```ts
timeline
  .at(0, () => frame.run())
  .at(120, () => frame.run())
  .at(240, () => frame.run())
```

## Playground

**Action Effects → Converging Frame**. Each click runs one convergence.

## Out of scope

Not included in this effect:

- `repeatCount` / `repeatDelay`
- Card Flare recipe
- Light Burst / Star Flare / camera shake / sound
- Card-specific behavior
