# Pulsing Frame

Persistent Effect — a stationary luminous rounded-rect **contour** that calmly
breathes between a subtle low state and a brighter peak, with soft light
falling **inward** from the frame.

```ts
import {
  PulsingFrameEffect,
  PULSING_FRAME_DEFAULTS,
  type PulsingFrameOptions,
} from 'phaser-vfx-effects'

const frame = new PulsingFrameEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0x4ec8ff,
  minOpacity: 0.16,
  maxOpacity: 1,
  fadeInDuration: 900,
  fadeOutDuration: 1100,
  position: 'front',
})

frame.enable(context)
// …continuous pulse…
frame.disable()
```

Registry id: `pulsing-frame`.

## Visual purpose

The **frame itself** is the subject — a clearly readable luminous outline that
periodically energizes and illuminates a band just inside the border.
Suitable as a building block for compositions such as Card Star Loop
(playground-only), but this effect is a standalone package API.

## Not the same as…

| Effect | Difference |
|---|---|
| **Edge Glow / Soft Glow Pulse (“Aura”)** | Corner-weighted surface wash near the border |
| **Converging / Expanding Frame** | Action Effects that scale and finish once |
| **Highlight** | Static stroke, no pulse |

Pulsing Frame:

- stays put (no scale / motion);
- emphasizes a **uniform** contour (no intentional corner hotspots);
- soft energy falls **inward** (not a neon exterior bloom);
- does **not** fill the card center;
- loops while enabled (no `run()` / `onFinish()`).

## Pulse model

```text
LOW ──smooth rise──► HIGH ──smooth fall──► LOW ──► …
```

| Option | Default | Role |
|---|---:|---|
| `minOpacity` | `0.16` | Low luminous state (still visible / calm) |
| `maxOpacity` | `1` | Peak luminous state |
| `fadeInDuration` | `900` | Rise time (ms) |
| `fadeOutDuration` | `1100` | Fall time (ms) |
| `intensity` / `opacity` | `1.15` / `1` | Global multipliers |

Envelope uses smoothstep. Cycle length = rise + fall (~2s). No randomness.
Both the bright core and the inward glow are multiplied by the pulse envelope.

## Frame + inward glow

| Option | Default | Role |
|---|---:|---|
| `frameWidth` | `2.4` | Bright core thickness (px) |
| `glowWidth` | `26` | Inward illumination distance (px) |
| `glowIntensity` | `0.95` | Inward glow vs core |

The core reads as the contour; the glow is secondary energy **inside** the frame.
Exterior surroundings stay comparatively clean (tiny core AA only).

## Layering

`position: 'front' | 'back'` — default `front`.

## Lifecycle

1. `enable(context)` — builds visuals; pulse starts at the **low** state (no flash).
2. `update` — advances the breathing envelope.
3. `disable()` — removes all visuals cleanly.
4. Re-`enable` — fresh cycle from low; no stale opacity.

## Rendering

- WebGL: local SDF fragment shader — core on `|sd|`, glow only where `sd < 0`.
- Canvas fallback: contour stroke + inset strokes for inward glow; pulse via `setAlpha`.

No textures. No shared frame/glow infrastructure.
