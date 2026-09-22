# Card (playground)

Objeto de demonstração. **Não** faz parte do pacote `phaser-vfx-effects`.

## Papel

1. Desenha um frame com `width` / `height` / `cornerRadius`.
2. Exibe `card-01.png` na área interna (inset da borda), com cover + máscara arredondada.
3. Ao aplicar um efeito, **injeta esses mesmos valores** nas options da biblioteca.

```ts
import { createDefaultEffectRegistry } from 'phaser-vfx-effects'

card.applyEffect('card-rim-line-shader', {
  color: 0xffaa00,
})
```

## Geometria

```ts
new Card(scene, {
  id: 'card-1',
  width: 168,
  height: 290,
  cornerRadius: 2,
}, registry)
```

Em outro jogo, o consumidor repassa a geometria explicitamente — a biblioteca só recebe números.
