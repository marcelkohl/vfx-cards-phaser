/**
 * Public entry point for `phaser-vfx-effects`.
 * Consumers should import from this package — not from internal folders.
 */
export type {
  ActionEffect,
  CardEffect,
  CardEffectContext,
  CardEffectCreateOptions,
  CardEffectDefinition,
  CardEffectMode,
  EffectContext,
  EffectCreateOptions,
  EffectDefinition,
  EffectId,
  EffectKind,
  PersistentEffect,
  VfxEffect,
} from './core/index'
export {
  CardEffectRegistry,
  EFFECT_IDS,
  EffectHost,
  EffectRegistry,
  isActionEffect,
  isPersistentEffect,
} from './core/index'

export { Transition } from './transitions/index'
export type { TransitionFinishCallback, TransitionStep } from './transitions/index'


export {
  CardRimLineDoubleEffect,
  CardRimLineEffect,
  CardRimLineShaderEffect,
  EdgeGlowEffect,
  EDGE_GLOW_DEFAULTS,
  HighlightEffect,
} from './effects/persistent/index'
export type {
  CardRimLineDoubleEffectOptions,
  CardRimLineEffectOptions,
  CardRimLineShaderEffectOptions,
  EdgeGlowOptions,
  HighlightEffectOptions,
} from './effects/persistent/index'

export {
  BloomFadeEffect,
  BLOOM_FADE_DEFAULTS,
  DissolveRevealEffect,
  DISSOLVE_REVEAL_DEFAULTS,
  FlashEffect,
  FLASH_DEFAULTS,
  FragmentBurstEffect,
  FRAGMENT_BURST_DEFAULTS,
  LightBurstEffect,
  LIGHT_BURST_DEFAULTS,
  ShineSweepEffect,
  SHINE_SWEEP_DEFAULTS,
  SparkleBurstEffect,
  SPARKLE_BURST_DEFAULTS,
  RisingStarEffect,
  RISING_STAR_DEFAULTS,
  SoftGlowPulseEffect,
  SOFT_GLOW_PULSE_DEFAULTS,
  ConvergingFrameEffect,
  CONVERGING_FRAME_DEFAULTS,
  StarFlareEffect,
  STAR_FLARE_DEFAULTS,
  RadialGlowEffect,
  RADIAL_GLOW_DEFAULTS,
} from './effects/action/index'
export type {
  BloomFadeOptions,
  BloomFadePosition,
  BloomFadeShape,
  DissolveRevealEffectOptions,
  DissolveRevealOptions,
  FlashOptions,
  FragmentBurstOptions,
  FragmentBurstPosition,
  FragmentBurstShape,
  FragmentBurstSpawnRegion,
  LightBurstOptions,
  LightBurstPosition,
  LightBurstScaleMode,
  ShineSweepOptions,
  SparkleBurstOptions,
  SparkleBurstPosition,
  SparkleBurstShape,
  SparkleBurstSpawnRegion,
  RisingStarOptions,
  RisingStarPosition,
  RisingStarSpawnRegion,
  RisingStarDirection,
  SoftGlowPulseOptions,
  SoftGlowPulsePosition,
  ConvergingFrameOptions,
  ConvergingFramePosition,
  StarFlareOptions,
  StarFlareLayerPosition,
  StarFlareScaleMode,
  RadialGlowOptions,
  RadialGlowPosition,
} from './effects/action/index'

import { EffectRegistry } from './core/index'
import type { EffectCreateOptions } from './core/index'
import {
  CardRimLineDoubleEffect,
  CardRimLineEffect,
  CardRimLineShaderEffect,
  EdgeGlowEffect,
  HighlightEffect,
} from './effects/persistent/index'
import type {
  CardRimLineDoubleEffectOptions,
  CardRimLineEffectOptions,
  CardRimLineShaderEffectOptions,
  EdgeGlowOptions,
  HighlightEffectOptions,
} from './effects/persistent/index'
import {
  BloomFadeEffect,
  DissolveRevealEffect,
  FlashEffect,
  FragmentBurstEffect,
  LightBurstEffect,
  ShineSweepEffect,
  SparkleBurstEffect,
  RisingStarEffect,
  SoftGlowPulseEffect,
  ConvergingFrameEffect,
  StarFlareEffect,
  RadialGlowEffect,
} from './effects/action/index'
import type {
  BloomFadeOptions,
  DissolveRevealOptions,
  FlashOptions,
  FragmentBurstOptions,
  LightBurstOptions,
  ShineSweepOptions,
  SparkleBurstOptions,
  RisingStarOptions,
  SoftGlowPulseOptions,
  ConvergingFrameOptions,
  StarFlareOptions,
  RadialGlowOptions,
} from './effects/action/index'

export function createDefaultEffectRegistry(): EffectRegistry {
  const registry = new EffectRegistry()

  registry.register({
    id: 'highlight',
    name: 'Highlight',
    description: 'Adiciona um contorno ao redor da carta.',
    kind: 'persistent',
    create: (options?: EffectCreateOptions) =>
      new HighlightEffect(options as HighlightEffectOptions | undefined),
  })

  registry.register({
    id: 'card-rim-line',
    name: 'Card Rim Line',
    description: 'Linha luminosa que percorre continuamente o contorno da carta.',
    kind: 'persistent',
    create: (options?: EffectCreateOptions) =>
      new CardRimLineEffect(options as CardRimLineEffectOptions | undefined),
  })

  registry.register({
    id: 'card-rim-line-shader',
    name: 'Card Rim Line Shader',
    description:
      'Versão com shader de uma linha luminosa que percorre o contorno da carta.',
    kind: 'persistent',
    create: (options?: EffectCreateOptions) =>
      new CardRimLineShaderEffect(
        options as CardRimLineShaderEffectOptions | undefined,
      ),
  })

  registry.register({
    id: 'rim-line-double',
    name: 'Rim Line Double',
    description:
      'Dois segmentos luminosos opostos percorrendo o contorno da carta.',
    kind: 'persistent',
    create: (options?: EffectCreateOptions) =>
      new CardRimLineDoubleEffect(
        options as CardRimLineDoubleEffectOptions | undefined,
      ),
  })

  registry.register({
    id: 'edge-glow',
    name: 'Edge Glow',
    description:
      'Iluminação suave nas bordas internas, avançando parcialmente sobre a superfície.',
    kind: 'persistent',
    create: (options?: EffectCreateOptions) =>
      new EdgeGlowEffect(options as EdgeGlowOptions | undefined),
  })

  registry.register({
    id: 'flash',
    name: 'Flash',
    description:
      'Flash branco intenso sob demanda (Action Effect: run / onFinish).',
    kind: 'action',
    create: (options?: EffectCreateOptions) =>
      new FlashEffect(options as FlashOptions | undefined),
  })

  registry.register({
    id: 'light-burst',
    name: 'Light Burst',
    description:
      'Raios de luz sob demanda (Action Effect: run / onFinish).',
    kind: 'action',
    create: (options?: EffectCreateOptions) =>
      new LightBurstEffect(options as LightBurstOptions | undefined),
  })

  registry.register({
    id: 'bloom-fade',
    name: 'Bloom Fade',
    description:
      'Bloom residual suave sob demanda (Action Effect: run / onFinish).',
    kind: 'action',
    create: (options?: EffectCreateOptions) =>
      new BloomFadeEffect(options as BloomFadeOptions | undefined),
  })

  registry.register({
    id: 'dissolve-reveal',
    name: 'Dissolve Reveal',
    description:
      'Revelação orgânica por dissolve (Action Effect: run / onFinish).',
    kind: 'action',
    create: (options?: EffectCreateOptions) =>
      new DissolveRevealEffect(options as DissolveRevealOptions | undefined),
  })

  registry.register({
    id: 'shine-sweep',
    name: 'Shine Sweep',
    description: 'Faixa de luz sob demanda (Action Effect: run / onFinish).',
    kind: 'action',
    create: (options?: EffectCreateOptions) =>
      new ShineSweepEffect(options as ShineSweepOptions | undefined),
  })

  registry.register({
    id: 'fragment-burst',
    name: 'Fragment Burst',
    description:
      'Fragmentos leves (penas / lascas) sob demanda (Action Effect: run / onFinish).',
    kind: 'action',
    create: (options?: EffectCreateOptions) =>
      new FragmentBurstEffect(options as FragmentBurstOptions | undefined),
  })

  registry.register({
    id: 'sparkle-burst',
    name: 'Sparkle Burst',
    description:
      'Estrelinhas mágicas sob demanda (Action Effect: run / onFinish).',
    kind: 'action',
    create: (options?: EffectCreateOptions) =>
      new SparkleBurstEffect(options as SparkleBurstOptions | undefined),
  })

  registry.register({
    id: 'rising-star',
    name: 'Rising Star',
    description:
      'Estrela vertical mágica sob demanda (Action Effect: run / onFinish).',
    kind: 'action',
    create: (options?: EffectCreateOptions) =>
      new RisingStarEffect(options as RisingStarOptions | undefined),
  })

  registry.register({
    id: 'soft-glow-pulse',
    name: 'Soft Glow Pulse',
    description:
      'Aura suave que respira sob demanda (Action Effect: run / onFinish).',
    kind: 'action',
    create: (options?: EffectCreateOptions) =>
      new SoftGlowPulseEffect(options as SoftGlowPulseOptions | undefined),
  })

  registry.register({
    id: 'converging-frame',
    name: 'Converging Frame',
    description:
      'Moldura luminosa que converge sob demanda (Action Effect: run / onFinish).',
    kind: 'action',
    create: (options?: EffectCreateOptions) =>
      new ConvergingFrameEffect(
        options as ConvergingFrameOptions | undefined,
      ),
  })

  registry.register({
    id: 'star-flare',
    name: 'Star Flare',
    description:
      'Flare central mágico sob demanda (Action Effect: run / onFinish).',
    kind: 'action',
    create: (options?: EffectCreateOptions) =>
      new StarFlareEffect(options as StarFlareOptions | undefined),
  })

  registry.register({
    id: 'radial-glow',
    name: 'Radial Glow',
    description:
      'Halo circular suave sob demanda (Action Effect: run / onFinish).',
    kind: 'action',
    create: (options?: EffectCreateOptions) =>
      new RadialGlowEffect(options as RadialGlowOptions | undefined),
  })

  return registry
}
