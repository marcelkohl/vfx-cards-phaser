# Expanding Frame

**Action Effect** — a luminous rounded-rect energy frame that starts near the
target bounds and **expands outward** once per `run()`, fading as energy is
released.

Optional translucent **interior fill** (`fillIntensity`) can wash the enclosed
area while the boundary stays denser.

## Visual purpose

```text
TARGET BOUNDS
     ↓
     ↓ expand
     ↓
OUTSIDE + FADE
```

```text
FRAME GEOMETRY
├── interior fill   (optional, translucent)
├── luminous boundary
└── outer glow
```

### Transparent center (`fillIntensity: 0`)

```text
┌───────────────────┐
│                   │
│      TARGET       │
│                   │
└───────────────────┘
 ↑ boundary only
```

### Filled plate (`fillIntensity > 0`)

```text
┌───────────────────┐
│░░░░░░░░░░░░░░░░░░░│
│░░░░░ TARGET ░░░░░░│
│░░░░░░░░░░░░░░░░░░░│
└───────────────────┘
 ↑ denser border + translucent wash
```

The fill scales with the frame — it is part of the expanding rectangle, not a
separate tint on the target.

## Incoming vs outgoing

| | Converging Frame | Expanding Frame |
|---|---|---|
| Motion | Outside → target | Target → outside |
| Role | Tunnel / incoming | Release / shockwave |
| Default scale | `1.10 → 1.0` | `1.0 → 1.18` |

They share a similar luminous-frame visual language but are **independent**
Action Effects. Do not treat one as a mode of the other.

## Category

Action Effect (`enable` → `run` → finish → `run` again).

## One run = one expansion

There is no `repeatCount` or internal loop. Recipes own any repetition.

## Usage

```ts
import {
  ExpandingFrameEffect,
  EXPANDING_FRAME_DEFAULTS,
  type ExpandingFrameOptions,
} from 'phaser-vfx-effects'

const wave = new ExpandingFrameEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0x4ec8ff,
  intensity: 1.35,
  startScale: 1,
  endScale: 1.18,
  fadeInDuration: 35,
  holdDuration: 70,
  fadeOutDuration: 280,
  innerCoverage: 0.12,
  softness: 0.85,
  cornerFocus: 0.88,
  outerSpread: 6,
  outerIntensity: 0.22,
  fillIntensity: 0.7,
  opacity: 0.95,
  position: 'front',
})

wave.enable({ scene, target })
wave.run()
```

Registry id: `expanding-frame`.

## Configuration

| Name | Default | Description |
|---|---:|---|
| `width` / `height` | `220` / `320` | Target frame size |
| `cornerRadius` | `18` | Target corner radius |
| `color` | `0x4ec8ff` | Glow + fill tint |
| `intensity` | `1.35` | Peak band brightness |
| `startScale` | `1.0` | Initial scale (near target) |
| `endScale` | `1.18` | Final scale (outward) |
| `fadeInDuration` | `35` | Fast appear (ms) |
| `holdDuration` | `70` | Peak opacity hold (ms) |
| `fadeOutDuration` | `280` | Fade while expanding (ms) |
| `innerCoverage` | `0.12` | Inward glow reach (fraction of min side) |
| `softness` | `0.85` | Falloff softness |
| `cornerFocus` | `0.88` | Corner concentration |
| `outerSpread` | `6` | Outer aura (px) |
| `outerIntensity` | `0.22` | Outer aura strength |
| `fillIntensity` | `0` | Interior luminous fill (`0` = transparent center) |
| `opacity` | `0.95` | Peak alpha multiplier |
| `position` | `'front'` | `'front'` / `'back'` |

Resolved lifetime = `fadeInDuration + holdDuration + fadeOutDuration` (default **385** ms).

### `fillIntensity`

Relative translucent wash inside the rounded rectangle.

```text
fill contribution ≈ fillIntensity × intensity × opacity × envelope
```

The boundary remains stronger than the fill. Package default `0` preserves the
original transparent-center look. Card-flash-style presets use ~`0.6`–`0.75`.

## Expansion and opacity

```text
TIME ─────────────────────────────────────►

scale
1.0 ───────────────────────────────────► 1.18


boundary + fill opacity
0       ╭───────╮
       ╱         ╲
_____/             ╲____________________ 0
     fade-in  hold   fade-out
```

Scale progresses continuously across **all** phases — including hold and fade-out.
Fill uses the same envelope (no separate fill timing). Opacity reaches true zero
before `onFinish`.

## Rendering

- **WebGL:** local `EXPANDING_FRAME_FRAGMENT_SHADER` — rounded-rect SDF with rim +
  outer glow + optional interior fill (`uFillIntensity`). Same visual family as
  Edge Glow; does **not** modify the shared Edge Glow shader.
- **Canvas:** translucent `fillRoundedRect` under soft corner-weighted strokes.

ADD blend. Target stays visible through the fill. No rays or particles.

## Lifecycle

| Method | Behavior |
|---|---|
| `enable(ctx)` | Prepare, remain invisible |
| `run()` | Reset and play **one** expansion |
| `stop()` | Stop immediately, hide (no `onFinish`) |
| `onFinish(cb)` | Fires once after opacity reaches 0 |
| `disable` / `destroy` | Release visuals / listeners |

Calling `run()` while already expanding restarts cleanly from `startScale` / opacity 0.

## Layering

`position: 'front' | 'back'`. Front is typical when the fill should illuminate
artwork.

## Playground

**Action Effects → Expanding Frame**.

- Card 1: filled Card Flash-like cyan wave (`fillIntensity ≈ 0.7`)
- Card 2: transparent-center frame (`fillIntensity: 0`)
- Card 3: fast filled impact

## Out of scope

- Card Flash recipe (composition lives in the playground later)
- Separate `FlashEffect` inside this Action Effect
- Rays / streak particles / Radial Glow behavior
- Shared base class with Converging Frame
- Repetition / `repeatCount`
