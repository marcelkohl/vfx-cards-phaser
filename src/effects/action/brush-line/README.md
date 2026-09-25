# Brush Line

**Action Effect** — a luminous horizontal scanning / brush front that travels
**bottom → top** across the target, dragging irregular vertical light trails
behind it.

One `run()` plays one complete sweep. It does not loop. Recipes may chain or
repeat it via `onFinish` / `onProgress`.

## Visual purpose

```text
        leading edge (hot cyan → white)
────────────────████████████████████────────────────
                │ ││  │   │ │ │     vertical brush trails
                │ │   │   │ │       (irregular lengths / widths)
                  │   │     │
                  │         │
```

Not a moving filled rectangle. Not unrelated vertical rain.
The trails visually belong to the moving front.

## Category

Action Effect (`enable` → `run` → finish → `run` again).

## Usage

```ts
import {
  BrushLineEffect,
  BRUSH_LINE_DEFAULTS,
  type BrushLineOptions,
} from 'phaser-vfx-effects'

const brush = new BrushLineEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0x4ec8ff,
  intensity: 1.2,
  opacity: 0.95,
  duration: 950,
  fadeOutDuration: 380,
  lineWidth: 1.4,
  lineIntensity: 1.55,
  glowWidth: 20,
  trailCount: 28,
  seed: 1,
  position: 'front',
})

brush.enable({ scene, target })
brush.onProgress(0.5, () => {
  /* mid-sweep */
})
brush.onFinish(() => {
  /* clean idle */
})
brush.run()
```

Registry id: `brush-line`.

## Configuration

| Name | Default | Description |
|---|---:|---|
| `width` / `height` | `220` / `320` | Target frame |
| `cornerRadius` | `18` | Frame corners |
| `color` | `0x4ec8ff` | Primary cyan tint |
| `intensity` | `1.2` | Peak brightness |
| `opacity` | `0.95` | Global alpha multiplier |
| `duration` | `950` | Front travel time (ms) |
| `fadeOutDuration` | `380` | Residual trail fade after top (ms) |
| `lineWidth` | `1.4` | Leading-edge half-height (px) |
| `lineIntensity` | `1.55` | Extra edge brightness |
| `glowWidth` | `20` | Soft bloom radius around the edge (px) |
| `trailCount` | `28` | Vertical brush strokes |
| `minTrailLength` / `maxTrailLength` | `55` / `280` | Trail reach behind the front (px) |
| `minTrailWidth` / `maxTrailWidth` | `0.9` / `7.5` | Trail half-widths (px) |
| `trailIntensity` | `0.85` | Trail brightness vs the edge |
| `seed` | `1` | Deterministic brush layout |
| `position` | `'front'` | `'front'` / `'back'` layering |

Total lifetime = `duration + fadeOutDuration`.

## Lifecycle

| Method | Behavior |
|---|---|
| `enable(ctx)` | Mounts idle / invisible |
| `run()` | Restarts a clean sweep (no leftover trails) |
| `stop()` | Hides immediately; no `onFinish` |
| `onProgress(p, cb)` | Generic shared Action progress |
| `onFinish(cb)` | Natural completion only |
| `destroy()` | Full teardown |

Normalized progress = `elapsed / (duration + fadeOutDuration)`.

## Rendering

- **WebGL** — single fragment shader: bright horizontal core + bloom + hashed vertical trails + light wake haze.
- **Canvas** — Graphics approximation: soft line layers + irregular vertical rects from the same seeded trail table.

Same `seed` + options → same trail layout within a renderer. No `Math.random()`.

## Not the same as

| Effect | Difference |
|---|---|
| **Shine Sweep** | Soft reflection band; no brush trails |
| **Streak Burst** | Outward flying streaks; not a scanning front |
| **Flash** | Full-frame pulse; no travel |

## Notes

- Package-only building block — no recipe required for validation.
- Does not depend on playground `Card` classes.
