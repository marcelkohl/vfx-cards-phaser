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
  scaleMode: 'return',
  startScale: 1,
  peakScale: 1,
  endScale: 1,
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
| `scaleMode` | `'return'` | `'return'` ou `'continuous'` (ver abaixo) |
| `startScale` | `1` | Escala em t = 0 |
| `peakScale` | `1` | Escala no pico de opacidade (`return`) |
| `endScale` | `1` | Escala em t = 1 |
| `peakAt` | derivado | Pico de opacidade como progresso `0..1` (opcional) |
| `position` | `'front'` | `'front'` = por cima do target; `'back'` = atrás |

## Scale modes

Opacidade e expansão dos raios são **independentes** (implementação local deste effect).

Opacidade:

```text
opacity
0 ─────────────► PEAK ─────────────► 0
                  ▲
                peakAt
```

### `return` (padrão)

```text
scale
start ────────────► peak ─────────────► end
```

Defaults (`startScale` / `peakScale` / `endScale` = `1`) preservam o visual
histórico (raios em comprimento cheio; só a opacidade anima).

### `continuous`

Os raios **continuam abrindo** durante toda a vida do efeito. No pico de
opacidade eles **não** param de expandir e **não** recolhem — só a opacidade
muda de direção.

```text
scale
start ────────────────────────────────► end
```

```ts
new LightBurstEffect({
  scaleMode: 'continuous',
  startScale: 0.6,
  endScale: 1.2,
  peakAt: 0.4,
  position: 'front',
  duration: 720,
})
```

```text
small burst
     ↓
rays opening + appearing
     ↓
brightness peak
     ↓
rays KEEP opening + fading
     ↓
large burst + invisible
```

O hold interno (parte do split de `duration`) **não** pausa a expansão contínua.

### `peakAt`

Progresso normalizado (`0` = início, `1` = fim) onde a opacidade atinge o pico
(início do hold).

- Quando **omitido**: o split padrão de `duration` é usado (compatível).
- Quando **definido**: fade-in / fade-out são redistribuídos para o pico cair em
  `peakAt`, preservando hold e duração total.

## Geometria

Só options — sem `Card`. O retângulo é a origem; os raios **podem** sair além dele.

Cada raio é um **trapézio** (base estreita → ponta aberta/reta), desenhado em segmentos com alpha caindo ao longo do comprimento. `position` controla se o Graphics fica por cima (`add`) ou atrás (`addAt(..., 0)`).

A escala multiplica a extensão além da borda (e suavemente a largura); a origem
permanece estável.

## Layering

`position: 'front' | 'back'` controls child order on the target container:

| Value | Display list | Visual result |
|---|---|---|
| `'front'` (default) | `add` + `bringToTop` | Rays draw **over** artwork/border; bright bases cross the card face |
| `'back'` | `addAt(0)` + `sendToBack` | Rays sit **under** the opaque frame fill; only overhang outside the card shows |

Use `'front'` when the burst must read as light over the target (e.g. future Card Flare).
There is no separate “Front Light Burst” effect.

`originInset` controls how far toward the center the bright ray bases begin.
With `'front'`, a moderate inset (e.g. `0.3`) makes the over-card crossing obvious.
With `'back'`, those same bases are hidden behind the frame.

## Lifecycle

| Método | Comportamento |
|---|---|
| `enable(ctx)` | Monta invisível |
| `run()` | Reinicia do zero (também se já estiver tocando) |
| `stop()` | Some na hora (sem `onFinish`) |
| `onFinish(cb)` | Fim natural; retorna unsubscribe |
| `disable` / `destroy` | Remove visuals / limpa listeners |

Cada `run()` regenera o jitter dos raios (variação controlada, não um sol rígido).
O primeiro frame armado fica em `elapsed = 0` (invisível, `startScale`) —
sem flicker inicial.

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

- **Card 1** — `position: 'front'` (+ continuous scale): rays must clearly cross
  over the artwork.
- **Card 2** — `position: 'back'`: same-style burst, but only the exterior
  overhang remains visible under the opaque frame.

## Limitações

- Raios em Graphics (trapézios segmentados + ADD), sem partículas nem bloom externo.
- Não inclui Flash, Shine Sweep nem a composição Card Flash Burst.
- Animação de escala é local a este effect (sem helper compartilhado com Star Flare).
