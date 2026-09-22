# Card Rim Line (Graphics)

Segmento luminoso ao longo do perímetro de um retângulo arredondado, via `Graphics`.

## Requisitos

- Phaser Graphics
- Ciclo `update`
- Consumidor fornece geometria (`width`, `height`, `cornerRadius`)

## Exemplo genérico

```ts
const effect = new CardRimLineEffect({
  width: 180,
  height: 280,
  cornerRadius: 8,
  color: 0x55ddff,
  loopDuration: 2800,
})

effect.enable({ scene, target: container })

// no update da cena:
effect.update?.(time, delta)
```

## Parâmetros

| Parâmetro | Tipo | Padrão | Unidade | Descrição |
|---|---|---:|---|---|
| `width` | `number` | `220` | pixels | Largura do frame |
| `height` | `number` | `320` | pixels | Altura do frame |
| `cornerRadius` | `number` | `18` | pixels | Raio do frame |
| `color` / `coreColor` | `number` | ciano / branco | hex | Cores |
| `lineWidth` | `number` | `14` | pixels | Espessura base |
| `outerPadding` | `number` | `1` | pixels | Afastamento |
| `loopDuration` | `number` | `2800` | ms | Uma volta |
| `segmentLength` | `number` | `0.36` | fração 0..1 | Comprimento |
| `glowStrength` | `number` | `1` | multiplicador | Intensidade |
| `direction` | `1 \| -1` | `1` | sentido | Direção |

## Atualizar geometria

```ts
effect.reconfigure({ width: 250, height: 330, cornerRadius: 46 }, context)
```

## Portabilidade

Não depende de carta/cena específica — apenas `scene` + `target` + options explícitas.
