# Dissolve Reveal

**Action Effect** — revelação progressiva por dissolve orgânico (ruído / energia).

Uma cobertura opaca sobre o frame se dissolve em ilhas irregulares com borda luminosa até o alvo ficar totalmente visível. Não é fade, wipe linear nem círculo.

## Categoria

Action Effect (`enable` → `run` → finish → `run` de novo).

## Target genérico

O efeito **não** depende de `Card` nem de assets do playground.

Ele adiciona um cover (shader WebGL, ou fallback Graphics) como filho de `context.target` (`Phaser.GameObjects.Container`). O conteúdo já presente no container (arte, background, etc.) permanece por baixo e é “revelado” conforme o cover dissolve.

O consumidor só precisa fornecer:

```ts
dissolve.enable({ scene, target: container })
```

com `width` / `height` / `cornerRadius` nas options alinhados à geometria do target.

## Idle (após `enable`, após finish, após `stop`)

- Alvo **totalmente visível**
- Nenhuma cobertura, glow ou máscara residual
- Cover inativo (`uActive = 0` / graphics limpo)

## Uso

```ts
import { DissolveRevealEffect } from 'phaser-vfx-effects'

const dissolve = new DissolveRevealEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  duration: 920,
  edgeColor: 0xc8fff4,
  coverColor: 0x101018, // área ainda não revelada (não precisa ser preto)
  seed: 42,
})

dissolve.enable({ scene, target })

dissolve.onFinish(() => {
  console.log('revelado')
})

dissolve.run()
```

## Configuração

| Nome | Padrão | Descrição |
|---|---:|---|
| `width` / `height` | `220` / `320` | Frame do alvo |
| `cornerRadius` | `18` | Cantos (clip do cover) |
| `duration` | `920` | Duração total (ms) |
| `edgeColor` | `0xc8fff4` | Cor da borda luminosa |
| `edgeIntensity` | `1.35` | Força da borda (0..3) |
| `edgeWidth` | `0.07` | Espessura suave da fronteira (espaço do noise) |
| `noiseScale` | `4.2` | Escala do FBM (maior = ilhas menores) |
| `variation` | `0.55` | Dessincroniza centro / bordas / cantos |
| `seed` | `1` | Padrão determinístico |
| `coverColor` | `0x050508` | **Cor do preenchimento** da área ainda não revelada |
| `coverOpacity` | `1` | Opacidade desse preenchimento (0..1) |

Alias de tipo público: `DissolveRevealEffectOptions` (= `DissolveRevealOptions`).

## Progressão visual

1. `run()` → cover cobre o frame (alvo oculto)
2. Ilhas luminosas irregulares aparecem
3. Regiões expandem e se conectam
4. Cantos / bordas / centro avançam em ritmos diferentes
5. Alvo fica 100% visível; cover some por completo

## Seed

O campo FBM é estável por `seed`. Mesmo seed → mesmo mapa de dissolve. Mudar o seed muda o padrão entre instâncias / runs (se reconfigurado).

A animação **não** re-randomiza a cada frame.

## Lifecycle

| Método | Comportamento |
|---|---|
| `enable(ctx)` | Monta cover idle (alvo visível) |
| `run()` | Reinicia revelação do zero |
| `stop()` | Estado idle limpo (visível, sem cover); sem `onFinish` |
| `onFinish(cb)` | Fim natural; retorna unsubscribe |
| `disable` / `destroy` | Remove shader/graphics e listeners |

### Replay / restart

Após terminar, `run()` de novo. Se `run()` for chamado no meio, reinicia limpo.

## Transition

```ts
import { DissolveRevealEffect, Transition } from 'phaser-vfx-effects'

dissolve.enable(context)

const transition = new Transition()
transition.add({ at: 0, effect: dissolve })
transition.run()
// scene update: transition.update(time, delta)
```

## Playground

Painel **Action Effects** → **Dissolve Reveal**.  
1º clique monta + `run()`; cliques seguintes reiniciam.

## Limitações

- WebGL: dissolve FBM com borda luminosa.
- Canvas / sem WebGL: fallback simplificado (véu + stroke) — menos orgânico.
- Não captura textura do alvo; revela o que já está desenhado sob o cover no container.
- Sem partículas, shake ou composição Flash+Dissolve+Bloom (futuro).
