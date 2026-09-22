# Rim Line Double

Dois segmentos sincronizados (`oppositeOffset`, padrão `0.5`).

## Exemplo genérico

```ts
const effect = new CardRimLineDoubleEffect({
  width: 250,
  height: 330,
  cornerRadius: 46,
  color: 0x55ddff,
  intensity: 0.78,
  oppositeOffset: 0.5,
})

effect.enable({ scene, target: container })
```

## Parâmetros extras

| Parâmetro | Padrão | Unidade | Descrição |
|---|---:|---|---|
| `intensity` | `0.78` | multiplicador | Compensa dois segmentos |
| `oppositeOffset` | `0.5` | fração | Distância no perímetro |

Demais parâmetros iguais ao [Shader](./SHADER.md), incluindo `width` / `height` / `cornerRadius`.

## Atualizar geometria

```ts
effect.reconfigure({ width: 200, height: 300, cornerRadius: 4 }, context)
```
