# Card Flare (recipe)

Educational playground recipe — **not** part of `phaser-vfx-effects`.

This recipe shows how independent reusable Action Effects can be orchestrated
into one short energetic card event. Copy or adapt it for your own game
transitions; do not expect a package export named `CardFlareTransition`.

## Visual goal

A blue / cyan magical flare with clear progression:

```text
ANTICIPATION / TUNNEL          IMPACT                 DECAY

Frame 1 ──────────►
       Frame 2 ──────────►
              Frame 3 ──────────►

                           Star Flare ────────►

                           Light Burst ───────────────────►
```

It should feel like: **converge → converge → converge → IMPACT → expanding decay**.

## Phases

### Phase 1 — Tunnel / anticipation

Three staggered `ConvergingFrameEffect` passes dominate the opening.

- First frame starts **clearly larger** than the card (`startScale ≈ 1.30`).
- Each pass overlaps the previous so **two frames at different scales** are visible.
- Bright luminous blue / cyan — substantial soft edge glow, not a thin border.
- Impact effects do **not** start here.

### Phase 2 — Flare impact

Near the end of the tunnel (final frame still approaching the card):

- `StarFlareEffect` — small hot core, thin streaks (short lifetime).
- `LightBurstEffect` — front radial rays crossing the artwork (longer lifetime).

Brightness peaks land approximately together (~400 ms). At climax you should still
see at least one converging frame + card + star + burst rays at once.

### Phase 3 — Expanding decay

- Frames finish.
- Star fades out quickly while still expanding (`scaleMode: 'continuous'`).
- Light Burst keeps opening with a longer translucent tail, then clears.

## Effects used

| Effect | Role | Count |
|---|---|---:|
| **Converging Frame** | Tunnel / depth rhythm | 3 instances |
| **Light Burst** | Large radial energy + long tail | 1 |
| **Star Flare** | Short focal impact | 1 |

```ts
import {
  ConvergingFrameEffect,
  LightBurstEffect,
  StarFlareEffect,
  Transition,
} from 'phaser-vfx-effects'
```

## Why Converging Frame is repeated by the recipe

`ConvergingFrameEffect.run()` performs **one** convergence.

Repetition is owned here: three separate instances on a `Transition` timeline.
They are deliberately staggered and overlapping — not sequential one-after-another.

```text
FRAME 1 ───────────►
       FRAME 2 ───────────►
              FRAME 3 ───────────►
```

## Approximate timeline

```text
0 ms      Converging Frame 1   (scale 1.32 → 1.0, ~420 ms)
120 ms    Converging Frame 2   (scale 1.30 → 1.0, ~400 ms)
240 ms    Converging Frame 3   (scale 1.26 → 1.0, ~380 ms)
300 ms    Light Burst          (~820 ms, continuous expand)
310 ms    Star Flare           (~400 ms, continuous expand)

≈ 402 ms  shared opacity peak (impact)
≈ 710 ms  star gone; burst still expanding
≈ 1120 ms burst finishes (end of transition)
```

```text
TIME ─────────────────────────────────────────────►

Frame 1
██████████████

       Frame 2
       ██████████████

              Frame 3
              ██████████████

                         STAR
                         ███████████

                         LIGHT BURST
                         ███████████████████
```

## Color hierarchy

| Layer | Tint |
|---|---|
| Bright center | near-white / pale cyan (`0xf2fcff`) |
| Frames | luminous blue (`0x4ec8ff`) |
| Burst rays | cyan / blue, lower opacity (`0x66ddff`) |

One coherent blue magical event — not three unrelated palettes.

## Intensity hierarchy

```text
                   short duration
                        ▲
              bright central star
                  central glow
             converging frames
          large translucent rays
                        ▼
                   large area
```

Largest elements stay more transparent; the tiny center can be brightest.

## Light Burst

```ts
position: 'front'
originInset: 0.3
scaleMode: 'continuous'
intensity: 0.78
startScale: 0.5
endScale: 1.45
peakAt: 0.125   // absolute peak sync’d with star
```

Rays must be clearly readable over the card and outside it, while staying
translucent enough that artwork remains visible. Continuous expansion during fade.

## Star Flare

```ts
position: 'front'
scaleMode: 'continuous'
intensity: 1.65
opacity: 1
horizontalThickness: 5
verticalThickness: 3.5
glowRadius: 10
peakAt: 0.23
startScale: 0.4
endScale: 1.12
```

Compact hot core with a clearly visible peak (~400 ms lifetime). Continuous
expansion; still shorter than the Light Burst tail.

## How to tune

| Knob | What it changes |
|---|---|
| Frame `startScale` / `duration` | Tunnel depth and overlap |
| `frame2At` / `frame3At` | How stacked the tunnel feels |
| `lightBurstAt` / `starFlareAt` | When impact arrives after anticipation |
| Frame `intensity` / `color` | Tunnel presence |
| Star thicknesses / `glowRadius` | Core size |
| Burst `duration` / `endScale` | Length of expanding decay |
| `peakAt` (both) | Absolute impact sync |

## Usage in this playground

Panel → **Transitions** → **Card Flare**.

Replay: clicking again while active restarts the full composition.

## Cleanup

On natural finish or `stop()` / `destroy()`:

- all three frames, Light Burst, and Star Flare are stopped/hidden;
- timeline listeners are cleared;
- no Graphics residue and no stale finish callbacks remain.
