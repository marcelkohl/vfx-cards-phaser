# Card Flash (recipe)

Educational playground recipe — **not** part of `phaser-vfx-effects`.

This recipe composes four reusable Action Effects into one short magical card
flash. Copy or adapt it for your own game; do not expect a package export named
`CardFlashTransition`.

Distinct from **Card Flash Burst** (Flash + Light Burst + Bloom Fade) and from
**Card Flare** (Converging Frames + Star + Burst + Radial Glow).

## Effects used

| Effect | Role |
|---|---|
| **Expanding Frame** | Central flash, blue card wash, expanding rectangular energy |
| **Radial Glow** | Soft circular optical halo / atmosphere |
| **Light Burst** | Subtle broad rays (secondary) |
| **Streak Burst** | Long thin streaks expelled from the impact |

```ts
import {
  ExpandingFrameEffect,
  RadialGlowEffect,
  LightBurstEffect,
  StreakBurstEffect,
  Transition,
} from 'phaser-vfx-effects'
```

## Visual sequence

```text
normal card
    ↓
blue energy begins (Expanding Frame fill)
    ↓
strong cyan/white card flash
    ↓
rectangular energy expands
+ circular halo expands
+ subtle rays appear
    ↓
long luminous streaks launch outward
    ↓
all elements expand while fading
    ↓
quick clean decay → normal card
```

## Approximate timeline

```text
0 ms      Expanding Frame     (~443 ms: 28 + 75 + 340)
30 ms     Radial Glow         (~470 ms)
40 ms     Light Burst         (~780 ms, continuous expand)
70 ms     Streak Burst        (~520 ms + stagger)

≈ 70–110 ms   main visual peak (frame fill + halo + rays + streak launch)
≈ 443 ms      frame gone
≈ 500 ms      radial glow gone
≈ 680 ms      streaks gone
≈ 820 ms      light burst finishes (end of transition)
```

```text
TIME ─────────────────────────────────────────────►

Frame
█████████████████▒▒▒▒

Radial Glow
   █████████████████▒▒▒

Light Burst
    █████████████████████████▒▒

Streaks
       █████████████████▒▒
```

## Intensity hierarchy

```text
1. Expanding Frame fill / boundary   ← strongest impact
2. Streak Burst                      ← thin, bright, moving
3. Radial Glow                       ← subtle optical halo
4. Light Burst                       ← faint broad rays
```

## Layering

Enable order (back → front):

1. Radial Glow (`position: 'back'`)
2. Light Burst (`front`)
3. Expanding Frame (`front`)
4. Streak Burst (`front`, on top)

## Key configuration notes

### Expanding Frame

- `startScale: 1` → `endScale: 1.2`
- `fillIntensity: 0.68` — brief cyan wash over artwork
- Fast fade-in, short hold, longer fade-out while expanding

### Radial Glow

- Thin rim + inner ghost; low intensity (~0.26)
- Starts near impact; expands continuously while fading

### Light Burst

- `intensity: 0.34` — much weaker than Card Flare
- `scaleMode: 'continuous'`, `originInset: 0.28`, `position: 'front'`

### Streak Burst

- `spawnRegion: 'mixed'` — interior + edge origins
- Long thin streaks (`40–88` px); travel `60–145`
- Some streaks begin over the card and cross the border outward

## Usage in this playground

Panel → **Transitions** → **Card Flash**.

Replay: clicking again while active restarts the full composition.

## Cleanup

On natural finish or `stop()` / `destroy()`:

- Expanding Frame, Radial Glow, Light Burst, and Streak Burst are stopped/hidden;
- timeline listeners are cleared;
- no residual wash, frame, ring, ray, or streak remains.
