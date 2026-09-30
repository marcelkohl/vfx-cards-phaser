# Card Cube Up (recipe)

Educational playground recipe — **not** part of `phaser-vfx-effects`.

This recipe composes four reusable Action Effects into one upward energy
transition. Copy or adapt it for your own game; do not expect a package export
named `CardCubeUpTransition`.

## Visual goal

A short cyan ignition energizes the card, then long vertical light trails rise
and dissolve while discrete rectangular fragments join the upward motion.
The initial glow disappears early; columns and blocks remain the dominant
(reading as Cube Up energy).

## Effects used

| Effect | Role |
|---|---|
| **Flash** | Short full-card cyan surface ignition |
| **Bloom Fade** | Soft exterior atmosphere around the ignition |
| **Rising Light Columns** | Long vertical trails rising and dissolving |
| **Rising Blocks** | Discrete rectangular fragments rising independently |

```ts
import {
  FlashEffect,
  BloomFadeEffect,
  RisingLightColumnsEffect,
  RisingBlocksEffect,
  Transition,
} from 'phaser-vfx-effects'
```

`ExpandingFrameEffect` is intentionally **not** used. Flash already expresses
temporary card-wide illumination; Bloom Fade owns the exterior mist.

## Why these primitives

- **Flash** fills the card bounds with a short ADD wash — the correct interior
  ignition primitive (not a frame band, not a persistent aura).
- **Bloom Fade** draws soft mist *outside* the frame — complementary exterior
  atmosphere without washing the artwork.
- **Rising Light Columns** and **Rising Blocks** stay separate because they are
  different visual languages (continuous trails vs discrete fragments). The
  recipe only sequences and balances them.

## Approximate timeline

```text
0 ms      Flash               (~330 ms: 35 + 55 + 240)
0 ms      Bloom Fade          (~400 ms: 45 + 55 + 300)
40 ms     Rising Light Columns (~1600 ms)
80 ms     Rising Blocks        (~1600 ms)

Internal stagger (package, not recipe):
  Columns first delay ≈ 32–80 ms after run → visible ~70–120 ms absolute
  Blocks first delay  ≈ 48+ ms after run  → visible ~130–180 ms absolute

≈ 0–40 ms      ignition hit (Phase A)
≈ 40–180 ms    columns + first blocks emerge inside the flash (Phase B)
≈ 180–400 ms   flash/bloom fade; rising energy already established (Phase C)
≈ 400–1640 ms  columns + blocks continue upward (Phase D)
≈ 1640–1680 ms residual blocks finish (Phase E)

Natural completion ≈ 1680 ms (Rising Blocks ends last)
```

```text
TIME ─────────────────────────────────────────────►

Flash
████████▒▒

Bloom
█████████▒▒

Columns
  ───────────────────────────────────────▒▒

Blocks
   ──────────────────────────────────────────▒▒
```

## Layering

Enable order (back → front):

1. Bloom Fade (`position: 'back'`)
2. Flash (surface wash on the card)
3. Rising Light Columns (`front`)
4. Rising Blocks (`front`, on top for readability)

## Sequencing

Uses the package `Transition` orchestrator with millisecond `at:` offsets —
the same pattern as Card Flash / Card Flare. No custom timers or
`onProgress` chains are required for this one-shot stagger.

## Why playground-only

The package ships primitives. Recipes show how to assemble a cinematic result.
`CardCubeUpTransition` is an educational composition example, not a library
export.

## Usage in this playground

Panel → **Transitions** → **Card Cube Up**.

Replay: clicking again while active restarts the full composition.

## Cleanup

On natural finish or `stop()` / `destroy()`:

- Flash, Bloom Fade, Rising Light Columns, and Rising Blocks are stopped;
- the timeline clears pending start/finish listeners;
- no delayed step can resurrect a layer after `stop()`.
