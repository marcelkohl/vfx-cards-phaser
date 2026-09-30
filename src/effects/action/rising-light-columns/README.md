# Rising Light Columns

**Action Effect** — many **narrow** vertical blue/cyan light streaks that
**translate upward** through the target.

One `run()` plays one complete pass. It does not loop.

## Visual identity

```text
early                 middle                late
                         │
  │                  │   │  │                 │
 │ │ │              │ │  │ │ │                   │
│ │ │ │            │  │ │  │  │

lower / mid          rising                top overflow
```

- **Thin streaks** dominate (≈1–3 px cores), not thick columns.
- Each streak **moves upward** as a whole — it does not grow downward from a center.
- Artwork stays recognizable; no giant white bloom / central wash.
- Soft local bloom only; no separate full-card glow; no floating blocks.

## Category

Action Effect (`enable` → `run` → finish → `run` again).

## Usage

```ts
import {
  RisingLightColumnsEffect,
  RISING_LIGHT_COLUMNS_DEFAULTS,
  type RisingLightColumnsOptions,
} from 'phaser-vfx-effects'

const rising = new RisingLightColumnsEffect({
  width: 220,
  height: 320,
  color: 0x4ec8ff,
  intensity: 0.85,
  opacity: 0.82,
  duration: 1600,
  streakCount: 11,
  minStreakWidth: 1.8,
  maxStreakWidth: 4.5,
  minStreakLength: 134,
  maxStreakLength: 218,
  travelDistance: 304,
  topOverflow: 36,
  glowIntensity: 0.65,
  seed: 1,
  position: 'front',
})

rising.enable({ scene, target })
rising.run()
```

Registry id: `rising-light-columns`.

## Configuration

| Name | Default | Description |
|---|---:|---|
| `width` / `height` | `220` / `320` | Target frame |
| `color` | `0x4ec8ff` | Cyan tint |
| `intensity` | `0.85` | Peak brightness (readable, translucent) |
| `opacity` | `0.82` | Global alpha |
| `duration` | `1600` | Full lifetime (ms) |
| `streakCount` | `11` | Sparse vertical shafts |
| `minStreakWidth` / `maxStreakWidth` | `1.8` / `4.5` | Core widths (px) — narrow but readable |
| `minStreakLength` / `maxStreakLength` | `≈0.42H` / `≈0.68H` | Trail lengths (px); can span ~half+ card |
| `travelDistance` | `≈0.95 × height` | Upward tip travel (px) |
| `topOverflow` | `36` | Draw past top edge (px) — not the fade |
| `glowIntensity` | `0.65` | Local soft bloom only |
| `seed` | `1` | Deterministic layout |
| `position` | `'front'` | Layering |

## Motion model

Each streak has a bright **leading tip** and a fading **trail** hanging below it
(+Y down). Over its life:

```text
leadY = startLeadY − travel × ease(t)     // motion — full lifetime
trailY = leadY + length
alpha  = fadeIn(t) × fadeOut(t)           // visibility — independent curve
```

`length` stays fixed. The whole shaft translates toward −Y (up). Opacity begins
dissolving around mid-life (`fadeStart ≈ 0.35–0.52`) while travel continues —
disappearance is **not** driven by top clipping.

Outer streaks appear slightly later (center-out **population**), not by scaling
one giant shape.

## Lifecycle

| Method | Behavior |
|---|---|
| `enable(ctx)` | Mounts idle / invisible |
| `run()` | Clean restart from lower-region ignition |
| `stop()` | Clears immediately; no `onFinish` |
| `onProgress` / `onFinish` | Shared Action Effect semantics |

## Rendering

Phaser `Graphics` (WebGL and Canvas): per-streak soft bloom + body + narrow core
with a vertical fade toward the trailing end. Alpha is capped so additive overlap
cannot become an opaque white mass.

## Explicitly out of scope

| Concern | Status |
|---|---|
| Floating rectangular blocks | Separate future effect |
| Full-card glow / flash | Separate composition layer |
| Card Cube Up recipe | Not created here |

## Not the same as

| Effect | Difference |
|---|---|
| **Brush Line** | Horizontal scan front + hanging trails |
| **Streak Burst** | Outward flying streaks |
| **Flash** | Full-frame pulse |
