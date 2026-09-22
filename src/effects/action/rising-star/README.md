# Rising Star

**Action Effect** — estrela mágica vertical com streak luminoso fino que sobe e some.

Cada estrela tem um núcleo em cruz de quatro pontas, um feixe vertical dominante, halo suave e um glint horizontal curto opcional. Movimento claramente para cima — não é Sparkle Burst radial, nem Fragment Burst, nem Rising Star “caindo”.

## Categoria

Action Effect (`enable` → `run` → finish → `run` de novo).

## Uso

```ts
import { RisingStarEffect } from 'phaser-vfx-effects'

const rising = new RisingStarEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0xfff4d8,
  starCount: 5,
  duration: 1100,
  direction: 'up',
  verticalLength: 7,
  horizontalLength: 2,
  seed: 42,
})

rising.enable({ scene, target })

rising.onFinish(() => {
  console.log('rising star finished')
})

rising.run()
```

## Configuração

| Nome | Padrão | Descrição |
|---|---:|---|
| `width` / `height` | `220` / `320` | Frame emissor |
| `cornerRadius` | `18` | Raio do frame (referência) |
| `color` | `0xfff4d8` | Cor / tint |
| `intensity` | `1.05` | Pico de brilho (0..2) |
| `opacity` | `0.95` | Opacidade global (0..1) |
| `starCount` | `5` | Quantidade de estrelas |
| `duration` | `1100` | Duração total (ms) |
| `direction` | `'up'` | `'up'` / `'down'` / `'left'` / `'right'` |
| `minRise` / `maxRise` | `48` / `110` | Distância de viagem (px) |
| `minSize` / `maxSize` | `6` / `14` | Tamanho do núcleo (px) |
| `verticalLength` | `36` | Comprimento do risco vertical (px, ponta a ponta) |
| `horizontalLength` | `12` | Comprimento do risco horizontal (px; `0` = off) |
| `haloScale` | `1.45` | Halo externo (× size) |
| `driftAmount` | `8` | Drift horizontal máximo (px) |
| `spawnJitter` | `10` | Jitter de spawn (px) |
| `spawnRegion` | `'mixed'` | `mixed`/`area` = regiões balanceadas; `top`; `sides` |
| `fadeStart` | `0.38` | Progresso (0..1) do fade-out |
| `fadeInPortion` | `0.12` | Fração da vida no fade-in |
| `startDelaySpread` | `280` | Atraso máximo entre estrelas (ms) |
| `seed` | `1` | Seed determinística |
| `position` | `'front'` | `'front'` / `'back'` |

## Forma procedural

Sem assets externos:

- núcleo **four-point star**;
- risco **vertical** (`verticalLength`, px ponta a ponta);
- risco **horizontal** (`horizontalLength`, px ponta a ponta);
- **halo** suave.

Movimento controlado por `direction` (`up` / `down` / `left` / `right`).
Os comprimentos vertical/horizontal são eixos locais X/Y, independentes da direção de viagem.

Desenhado em Graphics com blend ADD.

## Seed

O mesmo `seed` reproduz spawn, delays, tamanhos, rise e drift.

## Geometria

Só options — sem `Card`. Coordenadas locais centradas no `target`. Estrelas **podem** sair além do retângulo. O container do target cuida de posição / escala.

## Lifecycle

| Método | Comportamento |
|---|---|
| `enable(ctx)` | Monta invisível |
| `run()` | Reinicia do zero (também se já estiver tocando) |
| `stop()` | Some na hora (sem `onFinish`) |
| `onFinish(cb)` | Fim natural; retorna unsubscribe |
| `disable` / `destroy` | Remove visuals / limpa listeners |

## Transition

```ts
import { RisingStarEffect, Transition } from 'phaser-vfx-effects'

rising.enable(context)

const transition = new Transition()
transition.add({ at: 0, effect: rising })
transition.run()
```

## Playground

No painel, **Rising Star**: 1º clique monta + `run()`; cliques seguintes chamam `run()` de novo. Presets por carta variam cor, seed, contagem e rise.

## Limitações

- Graphics procedural + ADD — sem ParticleEmitter, física, som ou shake.
- Não inclui Sparkle Burst, Fragment Burst, Bloom nem recipes finais.
- Não é estrela caindo nem feixe de tela inteira.
