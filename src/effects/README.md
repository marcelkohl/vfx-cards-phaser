# Effects

Visual building blocks for `phaser-vfx-effects`.

```text
effects/
├── persistent/   # enable until disable
└── action/       # run → finish → run again
```

Import from the package root:

```ts
import { EdgeGlowEffect, ShineSweepEffect } from 'phaser-vfx-effects'
```

| Effect | Kind | Docs |
|---|---|---|
| Highlight | persistent | [persistent/highlight/README.md](./persistent/highlight/README.md) |
| Card Rim Line | persistent | [persistent/rim-line/README.md](./persistent/rim-line/README.md) |
| Card Rim Line Shader | persistent | [persistent/rim-line/SHADER.md](./persistent/rim-line/SHADER.md) |
| Rim Line Double | persistent | [persistent/rim-line-double/README.md](./persistent/rim-line-double/README.md) |
| Edge Glow | persistent | [persistent/edge-glow/README.md](./persistent/edge-glow/README.md) |
| Flash | action | [action/flash/README.md](./action/flash/README.md) |
| Light Burst | action | [action/light-burst/README.md](./action/light-burst/README.md) |
| Bloom Fade | action | [action/bloom-fade/README.md](./action/bloom-fade/README.md) |
| Dissolve Reveal | action | [action/dissolve-reveal/README.md](./action/dissolve-reveal/README.md) |
| Fragment Burst | action | [action/fragment-burst/README.md](./action/fragment-burst/README.md) |
| Sparkle Burst | action | [action/sparkle-burst/README.md](./action/sparkle-burst/README.md) |
| Rising Star | action | [action/rising-star/README.md](./action/rising-star/README.md) |
| Soft Glow Pulse | action | [action/soft-glow-pulse/README.md](./action/soft-glow-pulse/README.md) |
| Converging Frame | action | [action/converging-frame/README.md](./action/converging-frame/README.md) |
| Star Flare | action | [action/star-flare/README.md](./action/star-flare/README.md) |
| Shine Sweep | action | [action/shine-sweep/README.md](./action/shine-sweep/README.md) |

Orchestration lives in [`../transitions/`](../transitions/). Contracts live in [`../core/`](../core/).
