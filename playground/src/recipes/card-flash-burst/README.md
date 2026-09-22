# Card Flash Burst (recipe)

Educational playground recipe — **not** part of `phaser-vfx-effects`.

## Visual goal

A short cinematic light burst around a rectangular target: impact → rays → residual mist.

## Effects combined

| Effect | Role |
|---|---|
| **Flash** | Bright impact over the frame |
| **Light Burst** | Energy rays that explode outward |
| **Bloom Fade** | Soft residual haze that fades out |

Composition only — all rendering lives in the package Action Effects.

## Timeline

```text
0 ms     Flash
20 ms    Bloom Fade
40 ms    Light Burst
```

They overlap so the sequence feels continuous rather than three separate clips.

## Why this works

Flash sells the hit. Light Burst sells the energy. Bloom Fade softens the ending without competing with the burst.

## Adapt for your game

Copy this folder into your project and change:

- colors / intensity per effect overrides;
- `flashAt` / `lightBurstAt` / `bloomFadeAt`;
- geometry (`width`, `height`, `cornerRadius`).

```ts
import {
  FlashEffect,
  LightBurstEffect,
  BloomFadeEffect,
  Transition,
} from 'phaser-vfx-effects'

// Or reuse this recipe class as a starting point.
```

## Usage in this playground

Panel → **Transitions** → **Card Flash Burst**.
