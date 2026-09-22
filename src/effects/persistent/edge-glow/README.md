# Edge Glow

Iluminação colorida **discreta** que nasce na borda interna do frame, com **ênfase nos cantos**: densa nas curvas e quase ausente no meio das arestas. O centro da carta permanece limpo.

**Não inclui** Brush / Light Sweep.

## Requisitos

| Item | Detalhe |
|---|---|
| Phaser | 4.x |
| Principal | WebGL Shader |
| Fallback | Graphics (faixas internas finas) |

## Uso

```ts
new EdgeGlowEffect({
  width: 220,
  height: 320,
  cornerRadius: 20,
  color: 0x66dd99,
  innerCoverage: 0.05,
  intensity: 0.45,
  softness: 0.85,
  opacity: 0.7,
  outerSpread: 0,
  outerIntensity: 0,
}).enable({ scene, target })
```

## Como a intensidade é calculada

1. SDF rounded-rect (`sd < 0` = dentro).
2. Máscara de canto: `|x|/halfW × |y|/halfH` → forte nos cantos, fraca no meio das arestas (`cornerFocus`).
3. `t = (-sd) / profundidade_local` (cantos penetram um pouco mais).
4. Falloff suave para o centro; pixels fora do frame descartados com outer off.

## Parâmetros

| Nome | Padrão | Descrição |
|---|---:|---|
| `width` / `height` / `cornerRadius` | 220 / 320 / 18 | Geometria |
| `color` | `0x66dd99` | Cor da tintura |
| `innerCoverage` | `0.06` | Profundidade ≈ 6% de `min(w,h)` |
| `intensity` | `0.95` | Força do brilho interno |
| `softness` | `0.8` | Quão gradual é a queda |
| `cornerFocus` | `0.9` | `0` = borda uniforme; `1` = cantos densos / meio das arestas quieto |
| `opacity` | `0.9` | Alpha global |
| `outerSpread` / `outerIntensity` | `0` / `0` | Aura externa (opcional, off) |
| `padding` | `0` | Expande/reduz o contorno |
| `blendMode` | `ADD` | Tonalização suave sobre a arte |

`innerIntensity` / `innerSoftness` continuam aceitos como aliases.

## Fallback

Várias strokes internas finas com alpha decrescente. Sem contornos externos no preset padrão.

## Portabilidade

Copie `src/effects/persistent/edge-glow/` + `src/core/`. Sem dependência da classe `Card`.
