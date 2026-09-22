# Card Flare (recipe)

Educational playground recipe — **not** part of `phaser-vfx-effects`.

This recipe shows how independent reusable Action Effects can be orchestrated
into one short energetic card event. Copy or adapt it for your own game
transitions; do not expect a package export named `CardFlareTransition`.

## Visual goal

A blue / cyan magical flare with clear progression:

```text
TUNNEL                         IMPACT                    DECAY

Frame 1 ──────────► ▒ ghost
       Frame 2 ──────────► ▒
              Frame 3 ──────────► ▒▒

                           Star Flare ────────►

                           Light Burst ───────────────────►

                           Radial Glow ─────────────►
```

It should feel like: **tunnel → IMPACT → layered decay**.

## Four visual layers

| # | Effect | Role |
|---|---|---|
| 1 | **Converging Frame** ×3 | Tunnel / anticipation / fitted residual ghost |
| 2 | **Star Flare** | Concentrated central impact |
| 3 | **Light Burst** | Large directional rays + long expanding tail |
| 4 | **Radial Glow** | Subtle expanding optical halo ring |

Radial Glow begins during **impact**, not during the initial tunnel.

## Phases

### Phase 1 — Tunnel / anticipation

Three staggered `ConvergingFrameEffect` passes dominate the opening.

- First frame starts **clearly larger** than the card (`startScale ≈ 1.30`).
- Each pass overlaps the previous so **two frames at different scales** are visible.
- Bright luminous blue / cyan — substantial soft edge glow, not a thin border.
- After each frame reaches `endScale`, a short residual ghost may remain fitted.
- Impact effects do **not** start here.

### Phase 2 — Flare impact

Near the end of the tunnel (final frame still approaching / settling on the card):

- `StarFlareEffect` — small hot core, thin streaks (short lifetime).
- `LightBurstEffect` — front radial rays crossing the artwork (longer lifetime).
- `RadialGlowEffect` — subtle thin cyan optical halo (atmospheric support).

Brightness peaks land approximately together (~400 ms). At climax you should see
frames / residual + card + star + burst rays + halo ring at once.

### Phase 3 — Layered decay

Approximate order (overlapping, not hard cuts):

1. Star Flare fades relatively quickly (still expanding).
2. Converging Frame residuals fade.
3. Radial Glow expands while fading smoothly to zero.
4. Light Burst continues its longer expanding translucent tail, then clears.

## Effects used

| Effect | Role | Count |
|---|---|---:|
| **Converging Frame** | Tunnel / depth / residual | 3 instances |
| **Light Burst** | Directional radial energy + long tail | 1 |
| **Star Flare** | Short focal impact | 1 |
| **Radial Glow** | Subtle optical halo | 1 |

```ts
import {
  ConvergingFrameEffect,
  LightBurstEffect,
  RadialGlowEffect,
  StarFlareEffect,
  Transition,
} from 'phaser-vfx-effects'
```

## Why Converging Frame is repeated by the recipe

`ConvergingFrameEffect.run()` performs **one** convergence (+ optional ghost).

Repetition is owned here: three separate instances on a `Transition` timeline.
They are deliberately staggered and overlapping — not sequential one-after-another.

```text
FRAME 1 ───────────►
       FRAME 2 ───────────►
              FRAME 3 ───────────►
```

## Approximate timeline

```text
0 ms      Converging Frame 1   (1.32 → 1.0, 420 ms + 160 ms ghost)
120 ms    Converging Frame 2   (1.30 → 1.0, 400 ms + 160 ms ghost)
240 ms    Converging Frame 3   (1.26 → 1.0, 380 ms + 200 ms ghost)
300 ms    Light Burst          (~820 ms, continuous expand)
305 ms    Radial Glow          (~435 ms: 100 + 55 + 280)
310 ms    Star Flare           (~400 ms, continuous expand)

≈ 402–405 ms  shared opacity peak (impact)
≈ 710 ms      star gone; halo still fading; burst expanding
≈ 740 ms      Radial Glow natural completion (smooth fade to 0)
≈ 820 ms      Frame 3 ghost done (~240 + 380 + 200)
≈ 1120 ms     Light Burst finishes (end of transition)
```

```text
TIME ─────────────────────────────────────────────►

Frame 1
██████████████▒▒

       Frame 2
       ██████████████▒▒

              Frame 3
              ██████████████▒▒▒▒

                         STAR
                         ███████████

                         LIGHT BURST
                         ███████████████████

                         RADIAL GLOW
                         ░░██████████████▒▒░░
```

## Intensity hierarchy

```text
1. Star Flare hot center          ← strongest focal point
2. Light Burst / central cyan
3. Converging Frame residual
4. Radial Glow optical halo       ← atmospheric support
```

Radial Glow must stay subtle/translucent — never neon-bright enough to compete
with the star or make Light Burst unreadable as rays.

## Light Burst vs Radial Glow

Distinct jobs — keep them visually distinguishable:

```text
Light Burst                  Radial Glow

  \   |   /                    .-----------.
   \  |  /                  .                 .
───── ✦ ─────             .                     .
   /  |  \                 .                     .
  /   |   \                  .                 .
                               '-----------'
```

## Radial Glow (recipe config)

```ts
position: 'front'
color: 0x4ec8ff
intensity: 0.3
opacity: 0.82
radius: 125
ringWidth: 1.5
rimIntensity: 2.4
innerTrail: 0.5
outerGlow: 0.09
startScale: 0.72
endScale: 1.18
fadeInDuration: 100
holdDuration: 55
fadeOutDuration: 280
```

Peak ≈ `radialGlowAt + fadeInDuration` ≈ 405 ms. Continuous expansion during
fade-out; Transition waits for natural completion so the smooth fade is not cut off.

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

## How to tune

| Knob | What it changes |
|---|---|
| Frame `startScale` / `duration` | Tunnel depth and overlap |
| Frame `fadeOutDuration` | Fitted residual after converge |
| `frame2At` / `frame3At` | How stacked the tunnel feels |
| `lightBurstAt` / `starFlareAt` / `radialGlowAt` | Impact sync |
| Radial Glow `intensity` / `opacity` | Halo presence (keep subtle) |
| Radial Glow `fadeIn` / `hold` / `fadeOut` | Halo peak window & soft exit |
| Burst `duration` / `endScale` | Length of expanding decay |

## Usage in this playground

Panel → **Transitions** → **Card Flare**.

Replay: clicking again while active restarts the full composition.

## Cleanup

On natural finish or `stop()` / `destroy()`:

- all three frames, Light Burst, Radial Glow, and Star Flare are stopped/hidden;
- timeline listeners are cleared;
- no Graphics residue and no stale finish callbacks remain.

Natural finish waits until **every** scheduled Action Effect completes —
including Radial Glow’s smooth fade-out and Light Burst’s long tail.
