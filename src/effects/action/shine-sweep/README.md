# Shine Sweep

**Action Effect** — faixa de luz suave sob demanda. Depois de `enable()`, fica parado até `run()`. Cada `run()` faz uma passagem e dispara `onFinish`.

Para repetir, chame `run()` de novo no `onFinish` (ou quando quiser).

## Uso

```ts
import { ShineSweepEffect } from 'phaser-vfx-effects'

const shine = new ShineSweepEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0xffffff,
  bandWidth: 48,
  speed: 1200,
})

shine.enable({ scene, target })

shine.onFinish(() => {
  console.log('passagem terminou')
  // shine.run() // loop manual
})

shine.run()
```

## Com Transition

```ts
import { ShineSweepEffect, Transition } from 'phaser-vfx-effects'

shine.enable(context)
const transition = new Transition()
transition.add({ at: 0, effect: shine })
transition.run()
// scene update: transition.update(time, delta)
```

## API

| Método | Descrição |
|---|---|
| `enable(ctx)` | Monta o visual (idle) |
| `disable()` | Remove o visual |
| `run()` | Inicia / reinicia uma passagem |
| `stop()` | Para na hora (não dispara `onFinish`) |
| `isRunning()` | Se está tocando |
| `onFinish(cb)` | Callback ao fim; retorna unsubscribe |

## Parâmetros

| Nome | Padrão | Descrição |
|---|---:|---|
| `orientation` | `'diagonal'` | `diagonal` \| `horizontal` \| `vertical` |
| `direction` | `'forward'` | `forward` \| `backward` |
| `speed` | `2800` | Duração de uma passagem (ms) |
| `dispersion` | `0` | Onde o núcleo começa a cair (0..1) |

## Portabilidade

Copie `src/effects/action/shine-sweep/` + `src/core/`. Sem dependência da classe `Card`.
