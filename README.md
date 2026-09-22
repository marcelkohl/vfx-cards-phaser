# phaser-vfx-effects

Portable visual-effects library for [Phaser](https://phaser.io/).

```text
VFX Library
├── Effects
│   ├── Persistent   # enable → update → disable
│   └── Action       # enable → run → finish → run again
├── Transitions      # schedule action effects (no rendering)
└── Core             # contracts, host, registry
```

No dependency on a `Card` class, scene hierarchy, or game architecture.

Architecture notes: [`concept-architecture.md`](concept-architecture.md).

---

## Install / local usage

```bash
make init        # npm install + build → dist/
```

```ts
import {
  HighlightEffect,
  EdgeGlowEffect,
  FlashEffect,
  LightBurstEffect,
  BloomFadeEffect,
  DissolveRevealEffect,
  ShineSweepEffect,
  Transition,
  EffectHost,
  EffectRegistry,
  type PersistentEffect,
  type ActionEffect,
} from 'phaser-vfx-effects'
```

Do not import from internal paths.

The package provides **reusable building blocks**. Game-specific compositions (e.g. “Card Flash Burst”) live as educational recipes in the playground — see [`playground/src/recipes/`](playground/src/recipes/README.md).

---

## Architecture

### Persistent effects

Remain enabled until explicitly disabled.

```ts
const glow = new EdgeGlowEffect({ width: 220, height: 320, cornerRadius: 18 })
glow.enable({ scene, target: container })
// later:
glow.disable()
```

### Action effects

Run once, finish, and may run again on the same instance.

```ts
const shine = new ShineSweepEffect({ width: 220, height: 320, cornerRadius: 18 })
shine.enable({ scene, target: container })
shine.onFinish(() => console.log('done'))
shine.run()

const flash = new FlashEffect({ width: 220, height: 320, cornerRadius: 18 })
flash.enable({ scene, target: container })
flash.run()

const lightBurst = new LightBurstEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  tipFlare: 3.2,
  position: 'front',
})
lightBurst.enable({ scene, target: container })
lightBurst.run()

const bloom = new BloomFadeEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  padding: 18,
  expansion: 4,
  position: 'back',
  shape: 'organic',
})
bloom.enable({ scene, target: container })
bloom.run()

const dissolve = new DissolveRevealEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  seed: 42,
})
dissolve.enable({ scene, target: container })
dissolve.run()
```

### Transitions

The generic `Transition` class schedules Action Effects on a timeline. It does **not** render.

```ts
const transition = new Transition()
transition.add({ at: 0, effect: shine })
transition.onFinish(() => console.log('sequence done'))
transition.run()

// in your scene update loop:
transition.update(time, delta)
```

Effects must already be `enable()`d. Transition only calls `run()` on schedule.

**Concrete cinematic sequences** (Flash + Light Burst + Bloom, Flash + Dissolve + Bloom, …) are **not** shipped by the package. Build your own with `Transition`, or copy a recipe from [`playground/src/recipes/`](playground/src/recipes/README.md).

---

## Package structure

```text
src/
  index.ts                 # public entry
  core/                    # contracts + host + registry
  effects/
    persistent/
      highlight/
      rim-line/
      rim-line-double/
      edge-glow/
    action/
      flash/
      light-burst/
      bloom-fade/
      dissolve-reveal/
      shine-sweep/
  transitions/
    Transition.ts          # generic orchestrator only
playground/                # optional demo + composition recipes
  src/recipes/
```

---

## Effects

| Effect | Kind | Docs |
|---|---|---|
| Highlight | persistent | [highlight/README.md](src/effects/persistent/highlight/README.md) |
| Card Rim Line | persistent | [rim-line/README.md](src/effects/persistent/rim-line/README.md) |
| Card Rim Line Shader | persistent | [rim-line/SHADER.md](src/effects/persistent/rim-line/SHADER.md) |
| Rim Line Double | persistent | [rim-line-double/README.md](src/effects/persistent/rim-line-double/README.md) |
| Edge Glow | persistent | [edge-glow/README.md](src/effects/persistent/edge-glow/README.md) |
| Flash | action | [flash/README.md](src/effects/action/flash/README.md) |
| Light Burst | action | [light-burst/README.md](src/effects/action/light-burst/README.md) |
| Bloom Fade | action | [bloom-fade/README.md](src/effects/action/bloom-fade/README.md) |
| Dissolve Reveal | action | [dissolve-reveal/README.md](src/effects/action/dissolve-reveal/README.md) |
| Fragment Burst | action | [fragment-burst/README.md](src/effects/action/fragment-burst/README.md) |
| Sparkle Burst | action | [sparkle-burst/README.md](src/effects/action/sparkle-burst/README.md) |
| Rising Star | action | [rising-star/README.md](src/effects/action/rising-star/README.md) |
| Soft Glow Pulse | action | [soft-glow-pulse/README.md](src/effects/action/soft-glow-pulse/README.md) |
| Converging Frame | action | [converging-frame/README.md](src/effects/action/converging-frame/README.md) |
| Star Flare | action | [star-flare/README.md](src/effects/action/star-flare/README.md) |
| Shine Sweep | action | [shine-sweep/README.md](src/effects/action/shine-sweep/README.md) |

## Transitions

| API | Docs |
|---|---|
| `Transition` (generic orchestrator) | [transitions/README.md](src/transitions/README.md) |

Composition **recipes** (educational, playground-only):

| Recipe | Docs |
|---|---|
| Card Flash Burst | [playground/src/recipes/card-flash-burst/README.md](playground/src/recipes/card-flash-burst/README.md) |
| Card Dissolve Reveal | [playground/src/recipes/card-dissolve-reveal/README.md](playground/src/recipes/card-dissolve-reveal/README.md) |
| Feather | [playground/src/recipes/feather/README.md](playground/src/recipes/feather/README.md) |

---

## Root commands

```bash
make help
make init
make build
make check
make clean
make playground
make playground-init
make playground-build
make playground-check
```

## Optional playground

See [`playground/README.md`](playground/README.md).
