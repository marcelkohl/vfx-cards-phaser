import Phaser from 'phaser'
import { Card } from '../cards/Card'
import type { CardFrameGeometry } from '../cards/Card'
import {
  createDefaultEffectRegistry,
  isActionEffect,
} from 'phaser-vfx-effects'
import {
  CardDissolveRevealTransition,
  CardFlashBurstTransition,
  CardFlareTransition,
  FeatherTransition,
} from '../recipes'
import { EffectPanel } from '../ui/EffectPanel'
import { SelectionIndicator } from '../ui/SelectionIndicator'

const CARD_GAP = 36
const SCREEN_PADDING = 32
const CARD_FLASH_BURST_ID = 'card-flash-burst'
const CARD_DISSOLVE_REVEAL_ID = 'card-dissolve-reveal'
const FEATHER_ID = 'feather'
const CARD_FLARE_ID = 'card-flare'

/**
 * Shared geometry descriptions for the demo.
 * Used both to build each card frame and to style/effect options stay aligned.
 */
const DEMO_FRAMES: ReadonlyArray<
  CardFrameGeometry & { id: string; label: string }
> = [
  {
    id: 'card-1',
    label: 'Card 1',
    width: 168,
    height: 290,
    cornerRadius: 2,
  },
  {
    id: 'card-2',
    label: 'Card 2',
    width: 220,
    height: 320,
    cornerRadius: 18,
  },
  {
    id: 'card-3',
    label: 'Card 3',
    width: 250,
    height: 330,
    cornerRadius: 46,
  },
]

/** Style-only presets. Geometry is injected from each card's frame. */
const DEMO_STYLE_OPTIONS: ReadonlyArray<
  Record<string, Record<string, unknown>>
> = [
  {
    highlight: { color: 0xf0c040 },
    'card-rim-line': {
      color: 0x5ce1ff,
      loopDuration: 3200,
      glowStrength: 0.75,
    },
    'card-rim-line-shader': {
      color: 0x5ce1ff,
      glowStrength: 0.75,
      loopDuration: 3200,
    },
    'rim-line-double': {
      color: 0x5ce1ff,
      intensity: 0.7,
      glowStrength: 0.75,
    },
    'edge-glow': {
      color: 0x66dd99,
      innerCoverage: 0.06,
      intensity: 0.95,
      softness: 0.8,
      cornerFocus: 0.9,
      opacity: 0.9,
      outerSpread: 0,
      outerIntensity: 0,
    },
    'shine-sweep': {
      color: 0x66dd99,
      bandWidth: 40,
      speed: 2000,
      intensity: 0.7,
      opacity: 0.75,
      softness: 0.45,
      dispersion: 0,
      orientation: 'diagonal',
      direction: 'forward',
    },
    flash: {
      color: 0x66dd99,
      intensity: 1,
      fadeInDuration: 45,
      holdDuration: 160,
      fadeOutDuration: 320,
    },
    'light-burst': {
      color: 0xccffe8,
      intensity: 0.7,
      rayCount: 11,
      rayLength: 78,
      rayWidth: 13,
      tipFlare: 3.4,
      position: 'front',
      originInset: 0.32,
      duration: 720,
      scaleMode: 'continuous',
      startScale: 0.55,
      endScale: 1.35,
      peakAt: 0.35,
    },
    'bloom-fade': {
      color: 0xccffe8,
      intensity: 0.48,
      padding: 10,
      fadeInDuration: 60,
      holdDuration: 80,
      fadeOutDuration: 580,
      expansion: 1,
      position: 'back',
      shape: 'organic',
    },
    'dissolve-reveal': {
      edgeColor: 0xccffe8,
      edgeIntensity: 1.4,
      duration: 1680,
      noiseScale: 4.0,
      variation: 0.6,
      seed: 11,
      coverColor: 0x0a1620,
    },
    'fragment-burst': {
      color: 0xccffe8,
      intensity: 0.8,
      fragmentCount: 16,
      duration: 1200,
      minTravel: 42,
      maxTravel: 110,
      curvature: 26,
      seed: 11,
      spawnRegion: 'mixed',
    },
    'sparkle-burst': {
      color: 0xccffe8,
      intensity: 1,
      opacity: 0.9,
      sparkleCount: 20,
      duration: 880,
      minTravel: 12,
      maxTravel: 34,
      minSize: 3.5,
      maxSize: 10,
      seed: 21,
      spawnRegion: 'ring',
    },
    'rising-star': {
      color: 0xccffe8,
      intensity: 1.05,
      opacity: 0.95,
      starCount: 10,
      duration: 1050,
      direction: 'up',
      minRise: 12,
      maxRise: 66,
      verticalLength: 120,
      horizontalLength: 4,
      seed: 11,
      spawnRegion: 'mixed',
    },
    'soft-glow-pulse': {
      color: 0x66dd99,
      intensity: 0.95,
      innerCoverage: 0.10,
      softness: 0.8,
      cornerFocus: 0.9,
      opacity: 0.9,
      outerSpread: 0,
      pulseCount: 1,
      fadeInDuration: 60,
      fadeOutDuration: 1200,
      position: 'front',
    },
    'converging-frame': {
      color: 0x66dd99,
      intensity: 0.95,
      innerCoverage: 0.1,
      softness: 0.8,
      cornerFocus: 0.9,
      opacity: 0.9,
      startScale: 1.12,
      endScale: 1,
      duration: 180,
      fadeInDuration: 40,
      fadeOutDuration: 0,
      position: 'front',
    },
    'star-flare': {
      color: 0xccffe8,
      intensity: 1.2,
      opacity: 0.95,
      horizontalLength: 320,
      verticalLength: 260,
      horizontalThickness: 11,
      verticalThickness: 7,
      glowRadius: 28,
      positionX: 0.5,
      positionY: 0.5,
      fadeInDuration: 45,
      holdDuration: 40,
      fadeOutDuration: 520,
      scaleMode: 'continuous',
      startScale: 0.55,
      endScale: 1.15,
      peakAt: 0.4,
      position: 'front',
    },
    'radial-glow': {
      color: 0x4ec8ff,
      intensity: 0.3,
      opacity: 0.85,
      radius: 125,
      aspect: 1.1,
      ringWidth: 1.5,
      rimIntensity: 2.4,
      innerTrail: 0.5,
      outerGlow: 0.09,
      positionX: 0.5,
      positionY: 0.5,
      startScale: 0.72,
      endScale: 1.18,
      fadeInDuration: 360,
      holdDuration: 90,
      fadeOutDuration: 160,
      softness: 0.68,
      position: 'front',
    },
  },
  {
    highlight: { color: 0xf0c040 },
    'card-rim-line': {
      color: 0xffcc44,
      loopDuration: 2800,
    },
    'card-rim-line-shader': {
      color: 0xffcc44,
      loopDuration: 2800,
    },
    'rim-line-double': {
      color: 0xffcc44,
      intensity: 0.78,
    },
    'edge-glow': {
      color: 0x78aaff,
      innerCoverage: 0.06,
      intensity: 0.95,
      softness: 0.8,
      cornerFocus: 0.9,
      opacity: 0.9,
      outerSpread: 0,
      outerIntensity: 0,
    },
    'shine-sweep': {
      color: 0xffffff,
      bandWidth: 46,
      speed: 2000,
      intensity: 0.85,
      opacity: 0.7,
      softness: 0.8,
      dispersion: 0.15,
      orientation: 'horizontal',
      direction: 'forward',
    },
    flash: {
      color: 0xffffff,
      intensity: 0.95,
      fadeInDuration: 50,
      holdDuration: 50,
      fadeOutDuration: 260,
    },
    'light-burst': {
      color: 0xfff4dd,
      intensity: 0.7,
      rayCount: 12,
      rayLength: 84,
      rayWidth: 14,
      tipFlare: 3.2,
      position: 'back',
      originInset: 0.32,
      duration: 420,
    },
    'bloom-fade': {
      color: 0xfff4dd,
      intensity: 0.36,
      padding: 18,
      fadeInDuration: 70,
      holdDuration: 90,
      fadeOutDuration: 640,
      expansion: 4,
      position: 'back',
      shape: 'organic',
    },
    'dissolve-reveal': {
      edgeColor: 0xc8fff4,
      edgeIntensity: 1.35,
      duration: 920,
      noiseScale: 4.2,
      variation: 0.55,
      seed: 42,
      coverColor: 0x101018,
    },
    'fragment-burst': {
      color: 0xc8fff4,
      intensity: 0.85,
      fragmentCount: 18,
      duration: 1100,
      minTravel: 48,
      maxTravel: 120,
      curvature: 28,
      seed: 42,
      spawnRegion: 'mixed',
    },
    'sparkle-burst': {
      color: 0xfff6e0,
      intensity: 1,
      opacity: 0.92,
      sparkleCount: 16,
      duration: 900,
      minTravel: 14,
      maxTravel: 38,
      seed: 42,
      spawnRegion: 'ring',
    },
    'rising-star': {
      color: 0xfff4d8,
      intensity: 1.05,
      opacity: 0.95,
      starCount: 5,
      duration: 1100,
      direction: 'up',
      minRise: 48,
      maxRise: 110,
      verticalLength: 36,
      horizontalLength: 12,
      seed: 42,
      spawnRegion: 'mixed',
    },
    'soft-glow-pulse': {
      color: 0x78aaff,
      intensity: 0.95,
      innerCoverage: 0.06,
      softness: 0.8,
      cornerFocus: 0.9,
      opacity: 0.9,
      outerSpread: 0,
      pulseCount: 2,
      fadeInDuration: 350,
      fadeOutDuration: 350,
      position: 'front',
    },
    'converging-frame': {
      color: 0x78aaff,
      intensity: 0.95,
      innerCoverage: 0.09,
      softness: 0.85,
      cornerFocus: 0.9,
      opacity: 0.9,
      startScale: 1.3,
      endScale: 1,
      duration: 380,
      fadeInDuration: 50,
      fadeOutDuration: 200,
      position: 'front',
    },
    'star-flare': {
      color: 0xfff4dd,
      intensity: 1.15,
      opacity: 0.95,
      horizontalLength: 420,
      verticalLength: 360,
      horizontalThickness: 12,
      verticalThickness: 8,
      glowRadius: 34,
      positionX: 0.5,
      positionY: 0.5,
      fadeInDuration: 50,
      holdDuration: 60,
      fadeOutDuration: 400,
      position: 'front',
    },
    'radial-glow': {
      color: 0x78aaff,
      intensity: 0.26,
      opacity: 0.82,
      radius: 135,
      aspect: 1.0,
      ringWidth: 1.8,
      rimIntensity: 2.15,
      innerTrail: 0.52,
      outerGlow: 0.1,
      positionX: 0.5,
      positionY: 0.5,
      startScale: 0.68,
      endScale: 1.22,
      fadeInDuration: 420,
      holdDuration: 100,
      fadeOutDuration: 160,
      softness: 0.75,
      position: 'front',
    },
  },
  {
    highlight: { color: 0xff88aa, lineWidth: 5 },
    'card-rim-line': {
      color: 0xff66aa,
      segmentLength: 0.28,
      loopDuration: 2200,
      glowStrength: 1.2,
    },
    'card-rim-line-shader': {
      color: 0xff66aa,
      segmentLength: 0.22,
      loopDuration: 2200,
      glowStrength: 1.2,
    },
    'rim-line-double': {
      color: 0xff66aa,
      segmentLength: 0.2,
      loopDuration: 2200,
      intensity: 0.85,
      glowStrength: 1.15,
    },
    'edge-glow': {
      color: 0xd4a017,
      innerCoverage: 0.06,
      intensity: 0.95,
      softness: 0.8,
      cornerFocus: 0.9,
      opacity: 0.9,
      outerSpread: 0,
      outerIntensity: 0,
    },
    'shine-sweep': {
      color: 0xfff2cc,
      bandWidth: 52,
      speed: 2000,
      intensity: 0.9,
      opacity: 0.72,
      softness: 0.78,
      dispersion: 0.55,
      orientation: 'vertical',
      direction: 'backward',
    },
    flash: {
      color: 0xfff5e6,
      intensity: 1.1,
      fadeInDuration: 35,
      holdDuration: 35,
      fadeOutDuration: 200,
    },
    'light-burst': {
      color: 0xffe0aa,
      intensity: 0.75,
      rayCount: 13,
      rayLength: 92,
      rayWidth: 15,
      tipFlare: 3.5,
      position: 'front',
      duration: 460,
    },
    'bloom-fade': {
      color: 0xffe8c8,
      intensity: 0.48,
      padding: 26,
      fadeInDuration: 75,
      holdDuration: 100,
      fadeOutDuration: 700,
      expansion: 6,
      position: 'back',
      shape: 'organic',
    },
    'dissolve-reveal': {
      edgeColor: 0xffe0aa,
      edgeIntensity: 1.45,
      duration: 980,
      noiseScale: 4.6,
      variation: 0.58,
      seed: 77,
      coverColor: 0x1a1208,
    },
    'fragment-burst': {
      color: 0xffe0aa,
      intensity: 0.9,
      fragmentCount: 22,
      duration: 1250,
      minTravel: 55,
      maxTravel: 135,
      curvature: 34,
      seed: 77,
      spawnRegion: 'edge',
    },
    'sparkle-burst': {
      color: 0xffe8c8,
      intensity: 1.1,
      opacity: 0.95,
      sparkleCount: 20,
      duration: 980,
      minTravel: 16,
      maxTravel: 44,
      seed: 77,
      spawnRegion: 'mixed',
    },
    'rising-star': {
      color: 0xffe8c8,
      intensity: 1.15,
      opacity: 0.96,
      starCount: 6,
      duration: 1200,
      direction: 'up',
      minRise: 55,
      maxRise: 125,
      verticalLength: 42,
      horizontalLength: 14,
      seed: 77,
      spawnRegion: 'top',
    },
    'soft-glow-pulse': {
      color: 0xd4a017,
      intensity: 0.95,
      innerCoverage: 0.06,
      softness: 0.8,
      cornerFocus: 0.9,
      opacity: 0.9,
      outerSpread: 0,
      pulseCount: 3,
      fadeInDuration: 600,
      fadeOutDuration: 100,
      position: 'front',
    },
    'converging-frame': {
      color: 0xd4a017,
      intensity: 1,
      innerCoverage: 0.08,
      softness: 0.9,
      cornerFocus: 0.95,
      opacity: 0.92,
      startScale: 1.18,
      endScale: 1,
      duration: 900,
      fadeInDuration: 120,
      fadeOutDuration: 280,
      position: 'front',
    },
    'star-flare': {
      color: 0xffe8c8,
      intensity: 1.35,
      opacity: 0.96,
      horizontalLength: 520,
      verticalLength: 280,
      horizontalThickness: 14,
      verticalThickness: 8,
      glowRadius: 40,
      positionX: 0.5,
      positionY: 0.28,
      fadeInDuration: 80,
      holdDuration: 100,
      fadeOutDuration: 520,
      position: 'front',
    },
    'radial-glow': {
      color: 0xffb86c,
      intensity: 0.3,
      opacity: 0.84,
      radius: 118,
      aspect: 1.28,
      ringWidth: 1.4,
      rimIntensity: 2.5,
      innerTrail: 0.48,
      outerGlow: 0.08,
      positionX: 0.5,
      positionY: 0.55,
      startScale: 0.75,
      endScale: 1.15,
      fadeInDuration: 280,
      holdDuration: 70,
      fadeOutDuration: 110,
      softness: 0.6,
      position: 'front',
    },
  },
]

export class MainScene extends Phaser.Scene {
  private cards: Card[] = []
  private selectedCard: Card | null = null
  private selectionIndicator!: SelectionIndicator
  private effectPanel!: EffectPanel
  private readonly effectRegistry = createDefaultEffectRegistry()
  private readonly cardFlashBursts = new Map<string, CardFlashBurstTransition>()
  private readonly cardDissolveReveals = new Map<
    string,
    CardDissolveRevealTransition
  >()
  private readonly featherTransitions = new Map<string, FeatherTransition>()
  private readonly cardFlares = new Map<string, CardFlareTransition>()

  constructor() {
    super('MainScene')
  }

  public preload(): void {
    Card.preload(this)
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x101010)

    this.effectPanel = new EffectPanel(this, {
      registry: this.effectRegistry,
      transitions: [
        {
          id: CARD_FLASH_BURST_ID,
          name: 'Card Flash Burst',
          badge: 'TRANSITION',
        },
        {
          id: CARD_DISSOLVE_REVEAL_ID,
          name: 'Card Dissolve Reveal',
          badge: 'TRANSITION',
        },
        {
          id: FEATHER_ID,
          name: 'Feather',
          badge: 'TRANSITION',
        },
        {
          id: CARD_FLARE_ID,
          name: 'Card Flare',
          badge: 'TRANSITION',
        },
      ],
      onEffectSelected: (effectId) => this.handleEffectSelected(effectId),
      onTransitionSelected: (transitionId) =>
        this.handleTransitionSelected(transitionId),
    })

    this.selectionIndicator = new SelectionIndicator(this)

    this.cards = DEMO_FRAMES.map((frame) => {
      const card = new Card(
        this,
        {
          id: frame.id,
          label: frame.label,
          x: 0,
          y: 0,
          width: frame.width,
          height: frame.height,
          cornerRadius: frame.cornerRadius,
        },
        this.effectRegistry,
      )

      card.on(Card.SELECTED_EVENT, this.handleCardSelected, this)
      return card
    })

    this.layout(this.scale.gameSize)
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this)
  }

  public update(time: number, delta: number): void {
    for (const card of this.cards) {
      card.update(time, delta)
    }

    for (const burst of this.cardFlashBursts.values()) {
      burst.update(time, delta)
    }

    for (const reveal of this.cardDissolveReveals.values()) {
      reveal.update(time, delta)
    }

    for (const feather of this.featherTransitions.values()) {
      feather.update(time, delta)
    }

    for (const flare of this.cardFlares.values()) {
      flare.update(time, delta)
    }

    this.refreshTransitionPanelState()
    this.selectionIndicator.update()
  }

  private handleCardSelected(card: Card): void {
    this.selectedCard = card
    this.selectionIndicator.setTarget(card)
    this.effectPanel.setSelectedCard(card)
  }

  private handleEffectSelected(effectId: string): void {
    if (!this.selectedCard) {
      return
    }

    const definition = this.effectRegistry.get(effectId)

    if (!definition) {
      return
    }

    const options = this.getStyleOptionsForSelectedCard(effectId)

    // Action effects: first click mounts + run(); later clicks run() again.
    if (definition.kind === 'action') {
      this.handleActionEffectSelected(effectId, options)
      this.effectPanel.refresh()
      return
    }

    this.selectedCard.toggleEffect(effectId, options)
    this.effectPanel.refresh()
  }

  private handleTransitionSelected(transitionId: string): void {
    if (!this.selectedCard) {
      return
    }

    if (transitionId === CARD_FLASH_BURST_ID) {
      this.handleCardFlashBurstSelected()
      return
    }

    if (transitionId === CARD_DISSOLVE_REVEAL_ID) {
      this.handleCardDissolveRevealSelected()
      return
    }

    if (transitionId === FEATHER_ID) {
      this.handleFeatherSelected()
      return
    }

    if (transitionId === CARD_FLARE_ID) {
      this.handleCardFlareSelected()
    }
  }

  private handleCardFlashBurstSelected(): void {
    const card = this.selectedCard
    if (!card) {
      return
    }

    let burst = this.cardFlashBursts.get(card.cardId)
    if (!burst) {
      burst = new CardFlashBurstTransition({
        width: card.cardWidth,
        height: card.cardHeight,
        cornerRadius: card.cornerRadius,
      })
      burst.enable(card.getEffectContext())
      this.cardFlashBursts.set(card.cardId, burst)
    }

    burst.run()
    this.refreshTransitionPanelState()
  }

  private handleCardDissolveRevealSelected(): void {
    const card = this.selectedCard
    if (!card) {
      return
    }

    let reveal = this.cardDissolveReveals.get(card.cardId)
    if (!reveal) {
      reveal = new CardDissolveRevealTransition({
        width: card.cardWidth,
        height: card.cardHeight,
        cornerRadius: card.cornerRadius,
      })
      reveal.enable(card.getEffectContext())
      this.cardDissolveReveals.set(card.cardId, reveal)
    }

    reveal.run()
    this.refreshTransitionPanelState()
  }

  private handleFeatherSelected(): void {
    const card = this.selectedCard
    if (!card) {
      return
    }

    let feather = this.featherTransitions.get(card.cardId)
    if (!feather) {
      feather = new FeatherTransition({
        width: card.cardWidth,
        height: card.cardHeight,
        cornerRadius: card.cornerRadius,
      })
      feather.enable(card.getEffectContext())
      this.featherTransitions.set(card.cardId, feather)
    }

    feather.run()
    this.refreshTransitionPanelState()
  }

  private handleCardFlareSelected(): void {
    const card = this.selectedCard
    if (!card) {
      return
    }

    let flare = this.cardFlares.get(card.cardId)
    if (!flare) {
      flare = new CardFlareTransition({
        width: card.cardWidth,
        height: card.cardHeight,
        cornerRadius: card.cornerRadius,
      })
      flare.enable(card.getEffectContext())
      this.cardFlares.set(card.cardId, flare)
    }

    flare.run()
    this.refreshTransitionPanelState()
  }

  private refreshTransitionPanelState(): void {
    const active = new Set<string>()
    if (this.selectedCard) {
      const burst = this.cardFlashBursts.get(this.selectedCard.cardId)
      if (burst?.isRunning()) {
        active.add(CARD_FLASH_BURST_ID)
      }
      const reveal = this.cardDissolveReveals.get(this.selectedCard.cardId)
      if (reveal?.isRunning()) {
        active.add(CARD_DISSOLVE_REVEAL_ID)
      }
      const feather = this.featherTransitions.get(this.selectedCard.cardId)
      if (feather?.isRunning()) {
        active.add(FEATHER_ID)
      }
      const flare = this.cardFlares.get(this.selectedCard.cardId)
      if (flare?.isRunning()) {
        active.add(CARD_FLARE_ID)
      }
    }
    this.effectPanel.setActiveTransitionIds(active)
  }

  private handleActionEffectSelected(
    effectId: string,
    options: Record<string, unknown> | undefined,
  ): void {
    if (!this.selectedCard) {
      return
    }

    const existing = this.selectedCard.getEffect(effectId)
    if (existing && isActionEffect(existing)) {
      existing.run()
      return
    }

    this.selectedCard.applyEffect(effectId, options)
    const mounted = this.selectedCard.getEffect(effectId)
    if (mounted && isActionEffect(mounted)) {
      mounted.run()
    }
  }

  private getStyleOptionsForSelectedCard(
    effectId: string,
  ): Record<string, unknown> | undefined {
    if (!this.selectedCard) {
      return undefined
    }

    const cardIndex = this.cards.indexOf(this.selectedCard)

    if (cardIndex < 0) {
      return undefined
    }

    return DEMO_STYLE_OPTIONS[cardIndex]?.[effectId]
  }

  private layout = (gameSize: Phaser.Structs.Size): void => {
    const width = gameSize.width
    const height = gameSize.height

    this.effectPanel.layout(width, height)

    const panelWidth = this.effectPanel.getWidthForLayout(width)
    const availableWidth = Math.max(
      120,
      width - panelWidth - SCREEN_PADDING * 2,
    )
    const naturalWidth =
      this.cards.reduce((sum, card) => sum + card.cardWidth, 0) +
      (this.cards.length - 1) * CARD_GAP
    const maxCardHeight = Math.max(...this.cards.map((card) => card.cardHeight))

    const scale = Math.min(
      1,
      availableWidth / naturalWidth,
      (height - SCREEN_PADDING * 2) / maxCardHeight,
    )
    const safeScale = Math.max(0.1, scale)
    const scaledContentWidth =
      this.cards.reduce((sum, card) => sum + card.cardWidth * safeScale, 0) +
      (this.cards.length - 1) * CARD_GAP * safeScale
    let cursorX =
      SCREEN_PADDING + Math.max(0, (availableWidth - scaledContentWidth) / 2)

    this.cards.forEach((card) => {
      const scaledWidth = card.cardWidth * safeScale
      card.setPosition(cursorX + scaledWidth / 2, height / 2)
      card.setBaseScale(safeScale)
      cursorX += scaledWidth + CARD_GAP * safeScale
    })

    this.selectionIndicator.update()
  }

  private handleShutdown = (): void => {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this)

    for (const card of this.cards) {
      card.off(Card.SELECTED_EVENT, this.handleCardSelected, this)
    }

    for (const burst of this.cardFlashBursts.values()) {
      burst.destroy()
    }
    this.cardFlashBursts.clear()

    for (const reveal of this.cardDissolveReveals.values()) {
      reveal.destroy()
    }
    this.cardDissolveReveals.clear()

    for (const feather of this.featherTransitions.values()) {
      feather.destroy()
    }
    this.featherTransitions.clear()

    for (const flare of this.cardFlares.values()) {
      flare.destroy()
    }
    this.cardFlares.clear()

    this.selectionIndicator.destroy()
    this.effectPanel.destroy()
  }
}
