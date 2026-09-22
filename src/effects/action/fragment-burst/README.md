# Fragment Burst

**Action Effect** — leve explosão de fragmentos (penas, folhas, lascas) ao redor do frame.

Os fragmentos nascem perto do alvo, saem em direções variadas por trajetórias levemente curvas, giram, perdem opacidade e desaparecem. Visual elegante / mágico — não uma explosão de partículas quadradas.

Independente de Flash, Light Burst e Dissolve; combina bem em recipes futuras.

## Categoria

Action Effect (`enable` → `run` → finish → `run` de novo).

## Uso

```ts
import { FragmentBurstEffect } from 'phaser-vfx-effects'

const burst = new FragmentBurstEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0xc8fff4,
  fragmentCount: 18,
  duration: 1100,
  seed: 42,
})

burst.enable({ scene, target })

burst.onFinish(() => {
  console.log('fragment burst finished')
})

burst.run()
```

## Configuração

| Nome | Padrão | Descrição |
|---|---:|---|
| `width` / `height` | `220` / `320` | Frame emissor |
| `cornerRadius` | `18` | Raio do frame (referência) |
| `color` | `0xc8fff4` | Cor / tint dos fragmentos |
| `intensity` | `0.85` | Pico de brilho (0..2) |
| `fragmentCount` | `18` | Quantidade de fragmentos |
| `duration` | `1100` | Duração total (ms) |
| `minTravel` / `maxTravel` | `48` / `120` | Distância de viagem (px) |
| `minSize` / `maxSize` | `10` / `22` | Comprimento dos fragmentos (px) |
| `rotationAmount` | `2.4` | Spin máximo (\|radianos\|) |
| `curvature` | `28` | Amplitude do arco lateral (px) |
| `spawnInset` | `0.22` | Quanto “para dentro” do frame |
| `spawnJitter` | `10` | Jitter de spawn (px) |
| `spawnRegion` | `'mixed'` | `center` / `edge` / `area` / `mixed` |
| `fadeStart` | `0.45` | Progresso (0..1) em que o fade começa |
| `startDelaySpread` | `180` | Atraso máximo entre fragmentos (ms) |
| `seed` | `1` | Seed determinística |
| `position` | `'front'` | `'front'` / `'back'` |
| `textureKeys` | `[]` | Texturas opcionais já carregadas na scene |

## Formas procedurais

Sem assets externos. Cada fragmento recebe uma forma leve:

- **feather** — lâmina alongada / curva
- **leaf** — losango pontiagudo
- **shard** — lasca irregular
- **petal** — lóbulo arredondado

Halo suave + núcleo (ADD) evitam leitura de “quadradinhos”.

## Texturas opcionais

Se `textureKeys` apontar para chaves válidas em `scene.textures`, esses sprites substituem o desenho procedural (cíclicos por índice). Sem texturas válidas, o fallback procedural permanece.

## Seed

O mesmo `seed` produz o mesmo layout, delays, curvas e spins. Ideal para demos e presets reproduzíveis.

## Geometria

Só options — sem `Card`. Coordenadas locais centradas no `target`. Fragmentos **podem** sair além do retângulo configurado. O container do target cuida de posição / escala.

## Lifecycle

| Método | Comportamento |
|---|---|
| `enable(ctx)` | Monta invisível |
| `run()` | Reinicia do zero (também se já estiver tocando) |
| `stop()` | Some na hora (sem `onFinish`) |
| `onFinish(cb)` | Fim natural; retorna unsubscribe |
| `disable` / `destroy` | Remove visuals / limpa listeners e sprites |

## Transition

```ts
import { FragmentBurstEffect, Transition } from 'phaser-vfx-effects'

burst.enable(context)

const transition = new Transition()
transition.add({ at: 0, effect: burst })
transition.run()
```

## Playground

No painel, **Fragment Burst**: 1º clique monta + `run()`; cliques seguintes chamam `run()` de novo. Presets por carta variam cor, seed e contagem.

## Limitações

- Graphics procedural (ou Images opcionais) — sem sistema de partículas Phaser.
- Sem física, câmera shake, som, bloom integrado ou recipe final “feather”.
- Texturas customizadas devem já estar carregadas na scene.
