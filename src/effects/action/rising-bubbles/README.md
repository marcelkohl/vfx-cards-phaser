# Rising Bubbles

Action Effect — a finite emission of translucent soap bubbles that rise with
subtle buoyant sway. Groups include singles and small attached clusters.

```ts
import {
  RisingBubblesEffect,
  RISING_BUBBLES_DEFAULTS,
  type RisingBubblesOptions,
} from 'phaser-vfx-effects'

const bubbles = new RisingBubblesEffect({
  width: 220,
  height: 320,
  color: 0xb8ecff,
  groupCount: 11,
  duration: 2200,
  seed: 1,
  position: 'front',
})

bubbles.enable(context)
bubbles.run()
bubbles.onFinish(() => {
  // finite emission completed
})
```

Registry id: `rising-bubbles`.

## Visual purpose

Sparse soap bubbles — hollow, delicate, buoyant — released as individuals and
small touching clusters. One `run()` is one finite emission.

Continuous bubbling belongs to **external composition** (e.g. two instances
chained with `onProgress`). This effect does **not** loop itself.

## Not the same as…

| Effect | Difference |
|---|---|
| **Rising Blocks** | Solid luminous rectangles |
| **Rising Light Columns** | Thin vertical energy streaks |
| **Sparkle Burst** | Brief star flashes |
| **Ambient Sparkles** | Persistent sparkle loop |

## Options

| Option | Default | Role |
|---|---:|---|
| `color` | `0xb8ecff` | Pale cyan soap tint |
| `intensity` / `opacity` | `0.95` / `0.9` | Global brightness |
| `duration` | `2200` | Full emission lifetime (ms) |
| `groupCount` | `11` | Singles + clusters |
| `minRadius` / `maxRadius` | `6` / `20` | Bubble size range (px) |
| `minGroupSize` / `maxGroupSize` | `1` / `4` | Cluster size clamps |
| `travelDistance` | ≈ `height×0.9` | Upward travel (px) |
| `topOverflow` | `56` | Draw margin above card (`overflow` only) |
| `boundsMode` | `'overflow'` | `'overflow'` / `'contained'` |
| `swayAmount` | `10` | Horizontal buoyant drift (px) |
| `swaySpeed` | `1.15` | Sway frequency scale |
| `glowIntensity` | `0.28` | Minimal rim halo |
| `seed` | `1` | Deterministic layout |
| `position` | `'front'` | Layering |

## Cluster model

Weighted sizes (then clamped): mostly **1**, several **2**, occasional **3**,
rare **4**. Members pack against each other at contact distance (touch /
slight overlap / tiny gap) with mixed radii.

## Bounds mode

| Mode | Behavior |
|---|---|
| `'overflow'` (default) | Bubbles may rise above the card and peek past sides; `topOverflow` applies |
| `'contained'` | Visible geometry stays inside `width×height`; travel/sway/spawn are planned so bubbles fade before crossing the top — no bounce, no edge sticking |

Containment accounts for cluster AABB, radius, mild glow pad, and sway budget.
It is **not** a rectangular mask (no sliced bubbles).

```ts
new RisingBubblesEffect({
  boundsMode: 'contained',
  // …
})
```

## Motion

```text
appear (staggered)
   ↓
rise + subtle sway
   ↓
fade while still rising
   ↓
disappear (mixed heights)
```

Fade is independent of travel. Some groups dissolve inside the card; others
near the top; some remain faint above the frame (`topOverflow`).

## Soap bubble layers

1. faint local halo  
2. nearly transparent interior veil  
3. thin circumference + soft inner ring  
4. bright highlight arc + opposite glimmer  
5. tiny specular dots  

No solid glowing orb fill.

## Lifecycle

`enable` → idle · `run` → emission · natural `onFinish` · `stop` clears without
finish · `onProgress` via `ActionRunProgress` · no loop option.
