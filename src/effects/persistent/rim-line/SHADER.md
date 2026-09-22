# Card Rim Line Shader

Rim line via fragment shader (SDF). Fallback Graphics sem WebGL.

## Exemplo genérico

```ts
const effect = new CardRimLineShaderEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0xffaa00,
  glowStrength: 0.8,
})

effect.enable({ scene, target: container })
```

## Parâmetros

Inclui `width`, `height`, `cornerRadius` (geometria do alvo) e os estilos:

| Parâmetro | Padrão | Unidade |
|---|---:|---|
| `outerPadding` | `1` | pixels |
| `glowPadding` | `28` | pixels |
| `loopDuration` | `2800` | ms |
| `segmentLength` | `0.16` | fração |
| `coreWidth` / `glowWidth` | `1.35` / `7.5` | pixels |
| `glowStrength` | `1` | multiplicador |

## Atualizar geometria

```ts
effect.reconfigure({ width: 260, cornerRadius: 40 }, context)
```

## Observações

- Biblioteca independente de qualquer classe de carta.
- Passe a mesma geometria usada para desenhar o frame do alvo.
