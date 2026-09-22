# Card Dissolve Reveal (recipe)

Educational playground recipe — **not** part of `phaser-vfx-effects`.

## Visual goal

Reveal a rectangular target through an energetic dissolve: flash and dissolve rise together, then dissolve finishes alone into soft bloom.

## Effects combined

| Effect | Role |
|---|---|
| **Flash** | Bright impact that rides the first half of the dissolve |
| **Dissolve Reveal** | Main feature — irregular luminous reveal |
| **Bloom Fade** | Soft haze from mid-dissolve onward |

Composition only — all rendering lives in the package Action Effects.

## Timeline

```text
0 ms         Flash + Dissolve Reveal (parallel)
~1000 ms     Flash ends (~50% of dissolve); bloom starts
2000 ms      Dissolve ends; bloom continues fading
```

Flash envelope defaults total ~1000 ms (half of the 2000 ms dissolve). From mid-dissolve on, only dissolve (then bloom) remain.

## Adapt for your game

Copy this folder and tune:

- `flash` / `dissolveReveal` / `bloomFade` overrides;
- especially `dissolveReveal.coverColor` for the unrevealed fill (not only black);
- `flashAt` / `dissolveAt` / `bloomAt`;
- frame geometry.

```ts
import {
  FlashEffect,
  DissolveRevealEffect,
  BloomFadeEffect,
  Transition,
} from 'phaser-vfx-effects'
```

## Usage in this playground

Panel → **Transitions** → **Card Dissolve Reveal**.
