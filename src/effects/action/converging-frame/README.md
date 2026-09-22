# Converging Frame

**Action Effect** — a luminous Edge Glow-like frame that starts slightly larger
than the target and contracts inward once per `run()`.

Optionally, after reaching `endScale`, the frame can remain fitted to the target
while opacity fades out as a short **residual ghost**.

Use it for a single quick converge, a slow magical contraction, or as a building
block that a Transition / recipe can fire repeatedly for a tunnel-like sequence.

## Visual purpose

```text
CONVERGENCE                         GHOST / RESIDUAL

startScale ───────────► endScale
                             │
                             │ scale stays fixed
                             │
                             ├──────────────────────►
                             │
opacity                      █████▓▓▒▒░░──────────► 0
                             ◄── fadeOutDuration ──►
```

- Frame appears outside the target.
- Contracts smoothly toward the target dimensions.
- Optionally remains fitted and fades away (ghost).
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

performs exactly one complete convergence (plus optional residual fade).

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
  startScale: 1.3,
  endScale: 1,
  duration: 380,
  fadeInDuration: 50,
  fadeOutDuration: 200,
  position: 'front',
})

frame.enable({ scene, target })
frame.onFinish(() => {
  // fires after residual ghost reaches opacity 0
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
| `duration` | `420` | Convergence movement only (ms) |
| `fadeInDuration` | `50` | Opacity rise at the start (ms) |
| `fadeOutDuration` | `0` | Residual ghost fade after `endScale` (ms) |
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

### Duration and total lifetime

```text
total lifetime = duration + fadeOutDuration
```

| Phase | Controls | Scale | Opacity |
|---|---|---|---|
| Convergence | `duration` | `startScale → endScale` | fade-in, then full |
| Ghost | `fadeOutDuration` | **frozen at `endScale`** | fade → 0 |

```ts
{ duration: 180 }                 // fast pulse, no residual (default)
{ duration: 380, fadeOutDuration: 200 }  // converge then ghost
{ duration: 900 }                 // slower magical converge
```

### Fade timing

`fadeInDuration` and `fadeOutDuration` are independent and sequential:

1. Start invisible (strength `0`).
2. Fade in cleanly during early convergence.
3. Converge (scale `startScale → endScale` over `duration`).
4. If `fadeOutDuration > 0`: stay at `endScale` and fade residual to 0.
5. Opacity reaches 0 → finish → `onFinish()`.

Default `fadeOutDuration: 0` preserves the previous “converge → finish” behavior
for callers that omit the option.

**Semantic change:** previously `fadeOutDuration` faded opacity during the last
portion of `duration` while scale was still moving. It now runs **after**
convergence, with scale frozen. Callers that already pass a positive
`fadeOutDuration` get a residual ghost instead of a mid-convergence fade.

No initial-frame flicker — opacity is reset before playback is armed.

## Relationship with Edge Glow

Rendering reuses `EDGE_GLOW_FRAGMENT_SHADER` (WebGL) and the same corner-weighted
Graphics fallback as Soft Glow Pulse / Edge Glow.

The persistent **Edge Glow** effect is not modified. Converging Frame is a
temporary action that shares the visual language, not the persistent lifecycle.

| | Converging Frame | Soft Glow Pulse | Edge Glow |
|---|---|---|---|
| Role | Action, one converge (+ optional ghost) | Action, opacity breath | Persistent |
| Motion | Scale inward, then freeze | Opacity only | Static (optional pulse) |
| Shader | Edge Glow | Edge Glow | Edge Glow |

## Lifecycle

| Method | Behavior |
|---|---|
| `enable(ctx)` | Prepare, remain invisible |
| `run()` | Reset and play **one** convergence (+ optional ghost) |
| `stop()` | Stop immediately, hide (no `onFinish`) |
| `onFinish(cb)` | Fires once after residual reaches opacity 0 |
| `disable` / `destroy` | Release visuals / listeners / resources |

Calling `run()` while already converging **or** during the ghost fade restarts
cleanly from `startScale` / opacity 0.

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
The medium preset demonstrates residual ghost fade after the frame settles.

## Out of scope

Not included in this effect:

- `holdDuration` / `repeatCount` / `repeatDelay`
- Card Flare recipe integration
- Light Burst / Star Flare / camera shake / sound
- Card-specific behavior
