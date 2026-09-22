# Soft Glow Pulse

**Action Effect** — versão temporária / animada do **Edge Glow**.

No pico, o visual deve lembrar o Edge Glow persistente: brilho perto da borda, cantos mais densos, meios de aresta mais quietos, sem névoa larga fora da carta.

## Categoria

Action Effect (`enable` → `run` → finish → `run` de novo).

## Uso

```ts
import { SoftGlowPulseEffect } from 'phaser-vfx-effects'

const glow = new SoftGlowPulseEffect({
  width: 220,
  height: 320,
  cornerRadius: 18,
  color: 0x66dd99,
  intensity: 0.95,
  innerCoverage: 0.09,
  softness: 0.9,
  cornerFocus: 0.9,
  pulseCount: 2,
  pulseDuration: 720,
})

glow.enable({ scene, target })
glow.run()
```

## Configuração

| Nome | Padrão | Descrição |
|---|---:|---|
| `width` / `height` | `220` / `320` | Frame |
| `cornerRadius` | `18` | Raio do frame |
| `color` | `0x66dd99` | Cor (Edge Glow) |
| `intensity` | `0.95` | Força da banda interna |
| `innerCoverage` | `0.09` | Alcance para dentro (fração do lado menor) |
| `softness` | `0.9` | Suavidade do falloff |
| `cornerFocus` | `0.9` | Concentração nos cantos |
| `outerSpread` | `0` | Aura externa (px) — off por padrão |
| `outerIntensity` | `0` | Força da aura externa |
| `opacity` | `0.9` | Alpha no pico |
| `pulseCount` | `2` | Respirações |
| `fadeInDuration` | `120` | Subida de **cada** pulso (ms) |
| `fadeOutDuration` | `280` | Queda de **cada** pulso (ms) |
| `pulseDuration` | `0` | Hold opcional no pico (ms) |
| `pulsePause` | `0` | Pausa opcional entre pulsos (ms) |
| `pulseValley` | `0` | Piso entre pulsos (0 = some por completo) |
| `position` | `'front'` | `'front'` / `'back'` |

## Comportamento

Cada pulso:

1. `fadeInDuration` — 0 → pico  
2. `pulseDuration` — hold opcional no pico  
3. `fadeOutDuration` — pico → piso (0 no último)  

Exemplos:

```ts
// Rápido / lento
{ fadeInDuration: 60, fadeOutDuration: 700, pulseCount: 1 }

// Lento / rápido
{ fadeInDuration: 600, fadeOutDuration: 100, pulseCount: 1 }

// Respiração equilibrada
{ fadeInDuration: 350, fadeOutDuration: 350, pulseCount: 2 }
```

`run()` e `stop()` zeram a opacidade **antes** de qualquer frame — sem flash inicial.

A **geometria não expande** — só a opacidade anima.

## Diferença vs Bloom Fade / Edge Glow

| | Soft Glow Pulse | Edge Glow | Bloom Fade |
|---|---|---|---|
| Papel | Action, temporário | Persistent | Residual pós-impacto |
| Forma | Shader Edge Glow | Shader Edge Glow | Lóbulos / mist externos |
| Outer haze | Off por padrão | Off por padrão | Sim (padding) |

## Rendering

Reutiliza `EDGE_GLOW_FRAGMENT_SHADER` (WebGL) e o mesmo desenho corner-weighted no fallback Graphics. Edge Glow persistente **não é alterado**.

## Lifecycle

| Método | Comportamento |
|---|---|
| `enable(ctx)` | Monta invisível |
| `run()` | Reinicia a sequência |
| `stop()` | Some na hora (sem `onFinish`) |
| `onFinish(cb)` | Fim natural |
| `disable` / `destroy` | Remove visuals / listeners |

## Playground

**Action Effects → Soft Glow Pulse**.

## Limitações

- Depende do shader/look do Edge Glow; não é bloom de tela.
- Sem integração com Fragment / Sparkle / Rising Star nem recipes finais.
