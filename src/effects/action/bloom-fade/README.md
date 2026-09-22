# Bloom Fade

**Action Effect** — bloom luminoso residual ao redor do frame.

Névoa luminosa residual após um impacto de luz: fina, difusa, colada à borda do alvo, sem camadas visíveis. No fade-out longo a névoa perde intensidade e encolhe de volta.

Independente de Flash e Light Burst; combina bem com eles numa composição futura (Card Flash Burst).

## Categoria

Action Effect (`enable` → `run` → finish → `run` de novo).

## Uso

```ts
import { BloomFadeEffect } from 'phaser-vfx-effects'

const bloom = new BloomFadeEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0xfff4dd,
  intensity: 0.36,
  padding: 18,
  fadeInDuration: 70,
  holdDuration: 90,
  fadeOutDuration: 640,
  expansion: 4,
  position: 'back',
  shape: 'organic',
})

bloom.enable({ scene, target })

bloom.onFinish(() => {
  console.log('bloom terminou')
})

bloom.run()
```

## Configuração

| Nome | Padrão | Descrição |
|---|---:|---|
| `width` / `height` | `220` / `320` | Frame emissor |
| `cornerRadius` | `18` | Cantos do frame (usado em `rounded-rect`) |
| `color` | `0xfff4dd` | Cor do bloom |
| `intensity` | `0.36` | Pico (0..2) — médio recomendado; suave ≈0.25, intenso ≈0.5 |
| `padding` | `18` | Alcance fino da névoa (px por lado) |
| `fadeInDuration` | `70` | Subida rápida (ms) |
| `holdDuration` | `90` | Pico breve (ms) |
| `fadeOutDuration` | `640` | Fade longo e calmo (ms) |
| `expansion` | `4` | Extra no pico; no fade-out a névoa encolhe de volta |
| `position` | `'back'` | `'back'` = atrás do frame; `'front'` = por cima |
| `shape` | `'organic'` | `'organic'` = mais largo no meio das bordas; `'rounded-rect'` = anéis `strokeRoundedRect` |

## Geometria

Só options — sem `Card`. O bloom é centrado em `(0,0)` no mesmo sistema local dos outros efeitos.

Com `position: 'back'` (padrão), o Graphics fica atrás da arte/borda — a névoa só aparece onde ultrapassa o frame.

`shape: 'organic'` usa lóbulos nos centros das bordas. `shape: 'rounded-rect'` usa anéis `strokeRoundedRect` configuráveis.

## Lifecycle

| Método | Comportamento |
|---|---|
| `enable(ctx)` | Monta invisível |
| `run()` | Reinicia do zero (também se já estiver tocando) |
| `stop()` | Some na hora (sem `onFinish`) |
| `onFinish(cb)` | Fim natural; retorna unsubscribe |
| `disable` / `destroy` | Remove visuals / limpa listeners |

### Replay

Após terminar, chame `run()` de novo. Se `run()` for chamado no meio, a animação reinicia limpa.

### `stop()`

Volta ao idle transparente, sem callback de finish.

### `onFinish()`

Só no término natural. Listeners persistem entre runs.

## Transition

```ts
import { BloomFadeEffect, Transition } from 'phaser-vfx-effects'

bloom.enable(context)

const transition = new Transition()
transition.add({ at: 0, effect: bloom })
transition.run()
// scene update: transition.update(time, delta)
```

## Playground

No painel, **Bloom Fade**: 1º clique monta + `run()`; cliques seguintes chamam `run()` de novo.

## Limitações

- Bloom aproximado com Graphics (sem post-process / bloom de câmera).
- Não inclui Flash, Light Burst nem a composição Card Flash Burst.
