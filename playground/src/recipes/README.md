# Playground recipes

These folders are **educational examples** of how to compose reusable effects from `phaser-vfx-effects`.

They are **not** part of the package public API.

## What lives here

| Recipe | Combines |
|---|---|
| [card-flash-burst](card-flash-burst/README.md) | Flash + Light Burst + Bloom Fade |
| [card-dissolve-reveal](card-dissolve-reveal/README.md) | Flash + Dissolve Reveal + Bloom Fade |
| [feather](feather/README.md) | Soft Glow Pulse + Fragment Burst + Sparkle Burst + Rising Star |
| [card-flare](card-flare/README.md) | Converging Frames + Star Flare + Light Burst + Radial Glow |
| [card-flash](card-flash/README.md) | Expanding Frame + Radial Glow + Light Burst + Streak Burst |
| [card-star-loop](card-star-loop/README.md) | Pulsing Frame + Ambient Sparkles + Light Burst × 3 crossfade |
| [light-burst-progress-chain](light-burst-progress-chain/README.md) | Validation: three Light Bursts via `onProgress(0.45)` |

## Philosophy

The package ships building blocks (effects + `Transition` + host/registry).

Recipes show one way to assemble those blocks into a cinematic result. Copy a recipe into your game and customize it — or write your own from scratch.

```ts
import {
  FlashEffect,
  BloomFadeEffect,
  Transition,
} from 'phaser-vfx-effects'

// Your composition lives in your game / this recipes folder —
// not inside the library.
```

## Rules for new recipes

- Import only from `phaser-vfx-effects` (no deep package paths).
- Compose; do not reimplement shaders/graphics.
- Document timeline + intent in a local `README.md`.
