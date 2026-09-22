# Streak Burst

**Action Effect** — thin luminous streaks / light sticks expelled outward from
around a target once per `run()`.

## Visual purpose

```text
          ╱      │

     ──  ┌──────────┐   ╱
         │          │
   ╲     │  TARGET  │      ──
         │          │
     ╱   └──────────┘   ╲

          │      ──
```

Each streak:

- spawns near the target (usually the perimeter);
- travels radially outward;
- keeps its long axis aligned with travel;
- appears quickly;
- fades while still moving;
- reaches opacity 0 before completion.

The burst is energetic but elegant — impact release, not continuous emission.

## Distinction from related effects

| | Streak Burst | Light Burst | Fragment Burst | Sparkle Burst |
|---|---|---|---|---|
| Shape | Thin light sticks | Anchored rays | Feathers / shards | Stars / diamonds |
| Motion | Individual travel | Scale of ray field | Drift + spin | Twinkle / drift |
| Spawn | Edge / mixed | N/A (origins) | Edge / mixed | Ring / edge |
| Role | Moving expelled light | Central directional energy | Soft debris | Sparkle accents |

## Category

Action Effect (`enable` → `run` → finish → `run` again).

## One run = one burst

No `repeatCount`, no continuous emission, no internal loop.

## Usage

```ts
import {
  StreakBurstEffect,
  STREAK_BURST_DEFAULTS,
  type StreakBurstOptions,
} from 'phaser-vfx-effects'

const burst = new StreakBurstEffect({
  width: 220,
  height: 320,
  color: 0xc8f4ff,
  intensity: 1.15,
  opacity: 0.9,
  streakCount: 20,
  minLength: 38,
  maxLength: 80,
  minThickness: 1.2,
  maxThickness: 2.6,
  minTravel: 55,
  maxTravel: 130,
  duration: 520,
  stagger: 90,
  fadeInPortion: 0.08,
  fadeStart: 0.32,
  spawnRegion: 'mixed',
  angularVariation: 0.4,
  seed: 7,
  position: 'front',
})

burst.enable({ scene, target })
burst.run()
```

Registry id: `streak-burst`.

## Configuration

| Name | Default | Description |
|---|---:|---|
| `width` / `height` | `220` / `320` | Target frame (spawn space) |
| `color` | `0xc8f4ff` | Pale cyan streak tint |
| `intensity` | `1.15` | Peak brightness |
| `opacity` | `0.9` | Global alpha multiplier |
| `streakCount` | `20` | Number of streaks |
| `duration` | `520` | Approx. per-streak lifetime (ms) |
| `minTravel` / `maxTravel` | `55` / `130` | Outward travel (px) |
| `minLength` / `maxLength` | `38` / `80` | Streak length (px) — elongated light sticks |
| `minThickness` / `maxThickness` | `1.2` / `2.6` | Core thickness (px) — stay thin |
| `spawnRegion` | `'mixed'` | `center` / `edge` / `area` / `mixed` |
| `spawnInset` | `0.1` | Inward pull from edge |
| `spawnJitter` | `8` | Extra position jitter (px) |
| `angularVariation` | `0.4` | Max deviation from outward (rad) |
| `fadeInPortion` | `0.08` | Fraction of life for appear |
| `fadeStart` | `0.32` | When fade-out begins (0..1) |
| `stagger` | `90` | Max start-delay spread (ms) |
| `seed` | `1` | Deterministic layout |
| `position` | `'front'` | `'front'` / `'back'` |

Total effect lifetime ≈ latest streak delay + that streak's life.

### Spawn regions

| Region | Behavior |
|---|---|
| `center` | Origins clustered near the middle |
| `area` | Broad coverage across the target interior |
| `edge` | Origins along the perimeter |
| `mixed` | ~58% `area` + ~42% `edge` — interior streaks that cross the border + perimeter streaks |

`mixed` is intentionally **not** edge-biased. Card Flash-like presets rely on streaks that begin inside the artwork and travel outward across the silhouette.

## Motion and fade

```text
TIME ─────────────────────────►

streak 1   ███████▒▒
streak 2    ███████▒▒
streak 3      ███████▒▒

travel: fast launch → ease-out
opacity: quick appear → readable → fade while moving → 0
```

Orientation stays travel-aligned (no spin).

## Rendering

Procedural Phaser Graphics:

```text
soft outer glow
+
mid glow
+
thin tapered bright core
```

ADD blend. No textures. No physics. No motion trails.

## Lifecycle

| Method | Behavior |
|---|---|
| `enable(ctx)` | Prepare, remain invisible |
| `run()` | Reset and play **one** burst |
| `stop()` | Hide immediately (no `onFinish`) |
| `onFinish(cb)` | After last streak reaches opacity 0 |
| `disable` / `destroy` | Release visuals / listeners |

Same `seed` → same pattern on every `run()`.

## Playground

**Action Effects → Streak Burst**. One click = one burst.

- Card 1: Card Flash-like — long thin streaks, `mixed` spawn
- Card 2: `edge` — perimeter-only origins (validate vs mixed)
- Card 3: `area` — broad interior origins (validate vs mixed)

## Out of scope

- Card Flash recipe
- Light Burst / Fragment Burst / Sparkle Burst sharing
- Continuous emission / trails / physics
- Shared Action Effect helpers
