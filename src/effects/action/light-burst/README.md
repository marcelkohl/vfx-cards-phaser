# Light Burst

**Action Effect** — explosão breve de raios de luz ao redor do frame.

Os raios nascem de dentro / atrás do objeto, **abrem nas pontas** (trapézio, não estrela), ficam mais opacos perto da origem e se dispersam (transparentes) nas pontas.

Independente do Flash Effect; combina bem com ele numa composição futura.

## Categoria

Action Effect (`enable` → `run` → finish → `run` de novo).

## Uso

```ts
import { LightBurstEffect } from 'phaser-vfx-effects'

const lightBurst = new LightBurstEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0xfff4dd,
  intensity: 0.7,
  rayCount: 12,
  rayLength: 80,
  rayWidth: 14,
  tipFlare: 3.2,
  position: 'front',
  duration: 420,
})

lightBurst.enable({ scene, target })

lightBurst.onFinish(() => {
  console.log('burst terminou')
})

lightBurst.run()
```

## Configuração

| Nome | Padrão | Descrição |
|---|---:|---|
| `width` / `height` | `220` / `320` | Frame emissor |
| `cornerRadius` | `18` | Raio do frame (referência; raios vão além) |
| `color` | `0xfff4dd` | Cor dos raios |
| `intensity` | `0.7` | Pico de brilho (0..2) — mantenha baixo para luz suave |
| `rayCount` | `12` | Quantidade de raios |
| `rayLength` | `80` | Extensão além da borda (px) |
| `rayWidth` | `14` | Largura na base (px) |
| `tipFlare` | `3.2` | Quanto a ponta abre vs a base (1 = paralelo) |
| `duration` | `420` | Duração total (ms) |
| `originInset` | `0.18` | Quanto “para dentro” começam os raios |
| `spreadJitter` | `0.55` | Irregularidade angular |
| `lengthJitter` | `0.32` | Variação de comprimento |
| `position` | `'front'` | `'front'` = por cima do target; `'back'` = atrás |

## Geometria

Só options — sem `Card`. O retângulo é a origem; os raios **podem** sair além dele.

Cada raio é um **trapézio** (base estreita → ponta aberta/reta), desenhado em segmentos com alpha caindo ao longo do comprimento. `position` controla se o Graphics fica por cima (`add`) ou atrás (`addAt(..., 0)`).

## Lifecycle

| Método | Comportamento |
|---|---|
| `enable(ctx)` | Monta invisível |
| `run()` | Reinicia do zero (também se já estiver tocando) |
| `stop()` | Some na hora (sem `onFinish`) |
| `onFinish(cb)` | Fim natural; retorna unsubscribe |
| `disable` / `destroy` | Remove visuals / limpa listeners |

Cada `run()` regenera o jitter dos raios (variação controlada, não um sol rígido).

## Transition

```ts
import { LightBurstEffect, Transition } from 'phaser-vfx-effects'

lightBurst.enable(context)

const transition = new Transition()
transition.add({ at: 0, effect: lightBurst })
transition.run()
// scene update: transition.update(time, delta)
```

## Playground

No painel, **Light Burst**: 1º clique monta + `run()`; cliques seguintes chamam `run()` de novo.

## Limitações

- Raios em Graphics (trapézios segmentados + ADD), sem partículas nem bloom externo.
- Não inclui Flash, Shine Sweep nem a composição Card Flash Burst.
