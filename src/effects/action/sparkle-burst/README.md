# Sparkle Burst

**Action Effect** — estrelinhas mágicas curtas ao redor do frame.

Cada sparkle aparece com fade-in rápido, cresce um pouco, flutua para fora e desaparece. Visual sutil estilo JRPG / fantasy card — **não** é o efeito de estrelas subindo (Rising Star), nem Fragment Burst.

## Categoria

Action Effect (`enable` → `run` → finish → `run` de novo).

## Uso

```ts
import { SparkleBurstEffect } from 'phaser-vfx-effects'

const sparkles = new SparkleBurstEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0xfff6e0,
  sparkleCount: 16,
  duration: 900,
  seed: 42,
})

sparkles.enable({ scene, target })

sparkles.onFinish(() => {
  console.log('sparkle burst finished')
})

sparkles.run()
```

## Configuração

| Nome | Padrão | Descrição |
|---|---:|---|
| `width` / `height` | `220` / `320` | Frame emissor |
| `cornerRadius` | `18` | Raio do frame (referência) |
| `color` | `0xfff6e0` | Cor / tint |
| `intensity` | `1` | Pico de brilho (0..2) |
| `opacity` | `0.92` | Opacidade global (0..1) |
| `sparkleCount` | `16` | Quantidade |
| `duration` | `900` | Duração total (ms) |
| `minTravel` / `maxTravel` | `14` / `38` | Drift curto (px) |
| `minSize` / `maxSize` | `3.5` / `35.5` | Tamanho (px) |
| `spawnPadding` | `0.08` | Offset relativo à silhueta |
| `spawnJitter` | `8` | Jitter de spawn (px) |
| `spawnRegion` | `'ring'` | `ring` / `edge` / `center` / `area` / `mixed` |
| `fadeStart` | `0.42` | Progresso (0..1) do fade-out |
| `fadeInPortion` | `0.14` | Fração da vida no fade-in |
| `startDelaySpread` | `220` | Atraso máximo entre sparkles (ms) |
| `seed` | `1` | Seed determinística |
| `position` | `'front'` | `'front'` / `'back'` |

## Formas procedurais

Sem assets externos. Cada sparkle recebe uma forma leve:

- **star** — estrela de quatro pontas
- **diamond** — losango alongado
- **cross** — cruz luminosa fina
- **flare** — spike estilo lens-flare

Halo suave + núcleo (ADD) para leitura mágica, sem círculos/quadrados genéricos.

## Seed

O mesmo `seed` produz o mesmo layout, delays, tamanhos e drifts.

## Geometria

Só options — sem `Card`. Coordenadas locais centradas no `target`. Sparkles **podem** sair além do retângulo. O container do target cuida de posição / escala.

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
import { SparkleBurstEffect, Transition } from 'phaser-vfx-effects'

sparkles.enable(context)

const transition = new Transition()
transition.add({ at: 0, effect: sparkles })
transition.run()
```

## Playground

No painel, **Sparkle Burst**: 1º clique monta + `run()`; cliques seguintes chamam `run()` de novo. Presets por carta variam cor, seed e contagem.

## Limitações

- Graphics procedural + ADD — sem ParticleEmitter, física, som ou shake.
- Não inclui Rising Star, Fragment Burst, Bloom nem recipes finais.
