# Transitions

The package exports a generic **`Transition`** orchestrator.

It schedules `ActionEffect.run()` on a timeline. It does **not** render and contains no effect-specific logic.

```ts
import { ShineSweepEffect, Transition } from 'phaser-vfx-effects'

shine.enable(context)

const transition = new Transition()
transition.add({ at: 0, effect: shine })
transition.add({ at: 200, effect: anotherAction })
transition.run()

// scene update:
transition.update(time, delta)
```

## Concrete compositions live in the playground

Game-specific sequences (e.g. Card Flash Burst, Card Dissolve Reveal) are **recipes** under:

[`playground/src/recipes/`](../../playground/src/recipes/README.md)

They demonstrate how to combine package effects. They are not part of the `phaser-vfx-effects` public API — copy and adapt them in your own project.
