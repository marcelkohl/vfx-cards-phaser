# Flash

**Action Effect** — flash intenso que cobre o frame e some.

Burst rápido de luz vinda do próprio objeto: sobe quase instantaneamente, segura um instante e faz fade-out suave até transparente.

## Categoria

Action Effect (`enable` → `run` → finish → `run` de novo).

## Uso

```ts
import { FlashEffect } from 'phaser-vfx-effects'

const flash = new FlashEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0xffffff,
  intensity: 1,
  fadeInDuration: 45,
  holdDuration: 40,
  fadeOutDuration: 220,
})

flash.enable({ scene, target })

flash.onFinish(() => {
  console.log('flash terminou')
})

flash.run()
```

## Configuração

| Nome | Padrão | Descrição |
|---|---:|---|
| `width` / `height` | `220` / `320` | Geometria do frame (obrigatória na prática) |
| `cornerRadius` | `18` | Cantos arredondados (`0` = retos) |
| `color` | `0xffffff` | Cor do flash |
| `intensity` | `1` | Pico de brilho (0..2) |
| `fadeInDuration` | `45` | Subida até o pico (ms) |
| `holdDuration` | `40` | Tempo no pico (ms) |
| `fadeOutDuration` | `220` | Queda até transparente (ms) |

## Geometria

Recebe `width`, `height`, `cornerRadius` por options. Sem dependência de `Card`.

O overlay é um `fillRoundedRect` centrado em `(0,0)`, alinhado ao mesmo sistema local dos outros efeitos. Não ultrapassa o retângulo arredondado configurado.

## Lifecycle

| Método | Comportamento |
|---|---|
| `enable(ctx)` | Monta o overlay **invisível** (idle) |
| `run()` | Reinicia o flash do zero |
| `stop()` | Interrompe e some (não dispara `onFinish`) |
| `onFinish(cb)` | Dispara ao fim natural; retorna unsubscribe |
| `disable()` / `destroy()` | Remove visuals / limpa listeners |

### Replay

Após terminar, chame `run()` de novo na mesma instância.

Se `run()` for chamado enquanto já está tocando, a animação **reinicia** do início.

### `stop()`

Volta ao idle transparente, sem callback de finish.

### `onFinish()`

Só no término natural. Listeners persistem entre runs (não acumule o mesmo callback sem unsubscribe).

## Transition

```ts
import { FlashEffect, Transition } from 'phaser-vfx-effects'

flash.enable(context)

const transition = new Transition()
transition.add({ at: 0, effect: flash })
transition.run()
// scene update: transition.update(time, delta)
```

## Playground

No painel, **Flash**: 1º clique monta + `run()`; cliques seguintes chamam `run()` de novo.

## Limitações

- Overlay sólido (Graphics + ADD), sem raios externos nem bloom.
- Parte do futuro *Card Flash Burst*; raios/bloom/shine não estão neste efeito.
