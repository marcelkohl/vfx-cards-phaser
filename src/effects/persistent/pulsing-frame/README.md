# Pulsing Frame

Persistent Effect — a stationary luminous rounded-rect **contour** that calmly
breathes between a subtle low state and a brighter peak, with soft light on the
configured side(s) of the frame (`inside` / `outside` / `both`).

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
- soft energy on a configurable side of the contour (`glowDirection`);
- does **not** fill the card center as a wash;
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
Both the bright core and the enabled glow region(s) are multiplied by the pulse envelope.

## Frame + glow

| Option | Default | Role |
|---|---:|---|
| `frameWidth` | `2.4` | Bright core thickness (px) |
| `glowWidth` | `26` | Soft reach (near-edge heavy; dissolves into background) |
| `glowIntensity` | `0.95` | Glow vs core |
| `glowDirection` | `'inside'` | `inside` / `outside` / `both` |

Default remains **inside**. Use `outside` for an exterior-only halo, or `both`
for a continuous border aura (Card Light Loop). One shared contour core —
modes never stack two frames. Glow falloff is nonlinear so broad `glowWidth`
does not read as a flat padded rectangle.

## Layering

`position: 'front' | 'back'` — default `front`.

## Lifecycle

1. `enable(context)` — builds visuals; pulse starts at the **low** state (no flash).
2. `update` — advances the breathing envelope.
3. `disable()` — removes all visuals cleanly.
4. Re-`enable` — fresh cycle from low; no stale opacity.

## Rendering

- WebGL: local SDF fragment shader — core on `|sd|`; soft glow gated by `glowDirection`.
- Canvas fallback: contour stroke + inset and/or outset glow strokes; pulse via `setAlpha`.

No textures. No shared frame/glow infrastructure.
