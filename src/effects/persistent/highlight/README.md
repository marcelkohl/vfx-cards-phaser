# Highlight

Contorno estático ao redor de um frame retangular (carta, sprite, container, etc.).

## Requisitos

- Phaser Graphics
- Sem WebGL obrigatório
- O consumidor fornece `width`, `height` e `cornerRadius` nas options

## Uso

```ts
import { HighlightEffect } from 'phaser-vfx-effects'

const effect = new HighlightEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0xf0c040,
})

effect.enable({
  scene,
  target: someContainer,
})
```

## Parâmetros

| Parâmetro | Tipo | Padrão | Unidade | Descrição |
|---|---|---:|---|---|
| `width` | `number` | `220` | pixels | Largura do frame alvo |
| `height` | `number` | `320` | pixels | Altura do frame alvo |
| `cornerRadius` | `number` | `20` | pixels | Raio do frame (`0` = retos) |
| `color` | `number` | `0xf0c040` | hex | Cor do contorno |
| `alpha` | `number` | `0.95` | 0..1 | Opacidade |
| `lineWidth` | `number` | `4` | pixels | Espessura |
| `outerPadding` | `number` | `8` | pixels | Afastamento externo |

## Atualizar geometria

```ts
effect.reconfigure({ width: 260, height: 340, cornerRadius: 40 }, context)
```

Ou remova e reative com novas options.

## Observações

- Este efeito **não** importa nem conhece nenhuma classe `Card`.
- `cornerRadius` deve corresponder ao frame visual do alvo.
- Com `outerPadding`, o raio do path cresce de forma concêntrica quando o frame é arredondado.
