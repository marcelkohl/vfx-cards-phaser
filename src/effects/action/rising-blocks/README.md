# Rising Blocks

**Action Effect** — sparse luminous **rectangular fragments** that translate
**upward** through the target and dissolve.

One `run()` plays one complete pass. It does not loop.

## Visual identity

```text
          ▯
     ▮
               █
  ▯
        ▮
```

- Discrete short rectangles — **not** light streaks / columns.
- Whole block translates upward — **not** height stretch.
- Opacity fades independently of travel.
- Sparse negative space; artwork stays readable.
- No full-card wash. No floating physics. No particle explosion.

## Category

Action Effect (`enable` → `run` → finish → `run` again).

## Usage

```ts
import {
  RisingBlocksEffect,
  RISING_BLOCKS_DEFAULTS,
  type RisingBlocksOptions,
} from 'phaser-vfx-effects'

const blocks = new RisingBlocksEffect({
  width: 220,
  height: 320,
  color: 0x4ec8ff,
  intensity: 0.9,
  opacity: 0.85,
  duration: 1600,
  blockCount: 13,
  minBlockWidth: 8,
  maxBlockWidth: 22,
  minBlockHeight: 8,
  maxBlockHeight: 28,
  travelDistance: 230,
  topOverflow: 40,
  glowIntensity: 0.35,
  seed: 1,
  position: 'front',
})

blocks.enable({ scene, target })
blocks.run()
```

Registry id: `rising-blocks`.

## Configuration

| Name | Default | Description |
|---|---:|---|
| `width` / `height` | `220` / `320` | Target frame |
| `color` | `0x4ec8ff` | Base cyan tint |
| `intensity` | `0.9` | Peak brightness |
| `opacity` | `0.85` | Global alpha |
| `duration` | `1600` | Full lifetime (ms) |
| `blockCount` | `13` | Sparse fragment count |
| `minBlockWidth` / `maxBlockWidth` | `8` / `22` | Width range (px) |
| `minBlockHeight` / `maxBlockHeight` | `8` / `28` | Height range (px) |
| `travelDistance` | `≈0.72 × height` | Upward travel (px) |
| `topOverflow` | `40` | Draw past top (px) — not the fade |
| `glowIntensity` | `0.35` | Local soft halo only |
| `seed` | `1` | Deterministic layout |
| `position` | `'front'` | Layering |

## Motion + fade

```text
y     = startY − travel × ease(t)     // motion — full lifetime
alpha = fadeIn(t) × fadeOut(t)        // visibility — independent
```

Width/height stay fixed. Fade typically begins around **40–68%** of each
block's life while travel continues. Some blocks dissolve inside the card;
some near the top; a few remain faintly above via `topOverflow`.

## Lifecycle

| Method | Behavior |
|---|---|
| `enable(ctx)` | Mounts idle / invisible |
| `run()` | Clean restart |
| `stop()` | Clears immediately; no `onFinish` |
| `onProgress` / `onFinish` | Shared Action Effect semantics |

## Rendering

Phaser `Graphics`: optional local glow + filled rectangle + brighter inset.
Not clipped to the card bounds.

## Explicitly out of scope

| Concern | Status |
|---|---|
| Rising Light Columns | Separate effect — untouched |
| Full-card glow / Flash | Separate composition layer |
| Card Cube Up recipe | Not created here |

## Not the same as

| Effect | Difference |
|---|---|
| **Rising Light Columns** | Long soft vertical streaks |
| **Streak Burst** | Outward flying strokes |
| **Brush Line** | Horizontal scan + trails |
| **Flash** | Full-frame pulse |
