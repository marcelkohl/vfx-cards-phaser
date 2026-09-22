import Phaser from 'phaser'
import type { Card } from '../cards/Card'
import type {
  CardEffectDefinition,
  CardEffectRegistry,
} from 'phaser-vfx-effects'

export interface TransitionMenuItem {
  id: string
  name: string
  /** Short label shown as a badge (e.g. TRANSITION). */
  badge: string
}

export interface EffectPanelOptions {
  registry: CardEffectRegistry
  transitions?: ReadonlyArray<TransitionMenuItem>
  onEffectSelected: (effectId: string) => void
  onTransitionSelected?: (transitionId: string) => void
  width?: number
}

interface EffectButton {
  kind: 'effect'
  definition: CardEffectDefinition
  container: Phaser.GameObjects.Container
  background: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
}

interface TransitionButton {
  kind: 'transition'
  item: TransitionMenuItem
  container: Phaser.GameObjects.Container
  background: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
  badge: Phaser.GameObjects.Text
}

type PanelButton = EffectButton | TransitionButton

const PANEL_BG = 0x1a1a1a
const PANEL_BORDER = 0x3a3a3a
const BUTTON_BG = 0x2a2a2a
const BUTTON_BG_ACTIVE = 0x3d3420
const BUTTON_BG_DISABLED = 0x222222
const BUTTON_BORDER = 0x555555
const BUTTON_BORDER_ACTIVE = 0xf0c040
const TRANSITION_BORDER = 0x6a8cbf
const TRANSITION_BG_ACTIVE = 0x243044
const TEXT_COLOR = '#f2f2f2'
const MUTED_COLOR = '#9a9a9a'
const BADGE_COLOR = '#8ab4f8'
const HEADER_HEIGHT = 112
const BUTTON_HEIGHT = 40
const TRANSITION_BUTTON_HEIGHT = 48
const BUTTON_GAP = 8
const SECTION_GAP = 14
const SECTION_LABEL_HEIGHT = 22

export class EffectPanel {
  public readonly width: number

  private readonly root: Phaser.GameObjects.Container
  private readonly background: Phaser.GameObjects.Rectangle
  private readonly border: Phaser.GameObjects.Graphics
  private readonly titleText: Phaser.GameObjects.Text
  private readonly selectedLabel: Phaser.GameObjects.Text
  private readonly selectedValue: Phaser.GameObjects.Text
  private readonly listContainer: Phaser.GameObjects.Container
  private readonly buttons: PanelButton[] = []
  private readonly onEffectSelected: (effectId: string) => void
  private readonly onTransitionSelected: ((transitionId: string) => void) | null
  private readonly scene: Phaser.Scene
  private readonly activeTransitionIds = new Set<string>()

  private selectedCard: Card | null = null
  private panelHeight = 0
  private listScrollY = 0
  private listContentHeight = 0
  private listViewHeight = 0

  constructor(scene: Phaser.Scene, options: EffectPanelOptions) {
    this.scene = scene
    this.width = options.width ?? 220
    this.onEffectSelected = options.onEffectSelected
    this.onTransitionSelected = options.onTransitionSelected ?? null

    this.root = scene.add.container(0, 0)
    this.root.setDepth(2000)
    this.root.setScrollFactor(0)

    this.background = scene.add.rectangle(0, 0, this.width, 100, PANEL_BG, 0.96)
    this.background.setOrigin(0, 0)

    this.border = scene.add.graphics()

    this.titleText = scene.add.text(16, 18, 'EFEITOS', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '18px',
      color: TEXT_COLOR,
      fontStyle: 'bold',
    })

    this.selectedLabel = scene.add.text(16, 52, 'Carta selecionada:', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '13px',
      color: MUTED_COLOR,
    })

    this.selectedValue = scene.add.text(16, 72, 'Nenhuma', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '15px',
      color: TEXT_COLOR,
    })

    this.listContainer = scene.add.container(16, HEADER_HEIGHT)

    this.root.add([
      this.background,
      this.border,
      this.titleText,
      this.selectedLabel,
      this.selectedValue,
      this.listContainer,
    ])

    this.buildList(scene, options.registry.list(), options.transitions ?? [])
    this.layout(scene.scale.width, scene.scale.height)
    this.refresh()

    scene.input.on('wheel', this.handleWheel, this)
  }

  public setSelectedCard(card: Card | null): void {
    this.selectedCard = card
    this.refresh()
  }

  public setActiveTransitionIds(ids: Iterable<string>): void {
    this.activeTransitionIds.clear()
    for (const id of ids) {
      this.activeTransitionIds.add(id)
    }
    this.refresh()
  }

  public refresh(): void {
    this.selectedValue.setText(
      this.selectedCard ? this.selectedCard.label : 'Nenhuma',
    )

    const enabled = this.selectedCard !== null

    for (const button of this.buttons) {
      if (button.kind === 'effect') {
        const active =
          enabled &&
          this.selectedCard?.hasEffect(button.definition.id) === true

        button.background
          .setFillStyle(
            !enabled
              ? BUTTON_BG_DISABLED
              : active
                ? BUTTON_BG_ACTIVE
                : BUTTON_BG,
          )
          .setStrokeStyle(
            1,
            active ? BUTTON_BORDER_ACTIVE : BUTTON_BORDER,
            enabled ? 1 : 0.45,
          )

        button.label
          .setText(
            active ? `✓ ${button.definition.name}` : button.definition.name,
          )
          .setAlpha(enabled ? 1 : 0.45)

        button.container.setAlpha(enabled ? 1 : 0.7)
        this.syncButtonInteraction(button.background, enabled)
        continue
      }

      const active =
        enabled && this.activeTransitionIds.has(button.item.id)

      button.background
        .setFillStyle(
          !enabled
            ? BUTTON_BG_DISABLED
            : active
              ? TRANSITION_BG_ACTIVE
              : BUTTON_BG,
        )
        .setStrokeStyle(
          1,
          active ? BUTTON_BORDER_ACTIVE : TRANSITION_BORDER,
          enabled ? 1 : 0.45,
        )

      button.label
        .setText(active ? `✓ ${button.item.name}` : button.item.name)
        .setAlpha(enabled ? 1 : 0.45)
      button.badge.setAlpha(enabled ? 1 : 0.45)

      button.container.setAlpha(enabled ? 1 : 0.7)
      this.syncButtonInteraction(button.background, enabled)
    }
  }

  public layout(viewWidth: number, viewHeight: number): void {
    const panelWidth = Math.min(this.width, Math.max(160, viewWidth * 0.28))
    this.panelHeight = viewHeight
    this.listViewHeight = Math.max(40, viewHeight - HEADER_HEIGHT - 16)

    this.background.setSize(panelWidth, this.panelHeight)

    this.border.clear()
    this.border.lineStyle(1, PANEL_BORDER, 1)
    this.border.strokeRect(0.5, 0.5, panelWidth - 1, this.panelHeight - 1)

    this.root.setPosition(viewWidth - panelWidth, 0)

    const buttonWidth = panelWidth - 32
    for (const button of this.buttons) {
      const height =
        button.kind === 'transition' ? TRANSITION_BUTTON_HEIGHT : BUTTON_HEIGHT
      button.background.setSize(buttonWidth, height)
      if (button.kind === 'effect') {
        button.label.setPosition(buttonWidth / 2, BUTTON_HEIGHT / 2)
      } else {
        button.badge.setPosition(10, 8)
        button.label.setPosition(10, 24)
      }
      this.syncButtonInteraction(
        button.background,
        this.selectedCard !== null,
      )
    }

    this.clampScroll()
    this.applyScroll()
  }

  public getWidthForLayout(viewWidth: number): number {
    return Math.min(this.width, Math.max(160, viewWidth * 0.28))
  }

  public destroy(): void {
    this.scene.input.off('wheel', this.handleWheel, this)

    for (const button of this.buttons) {
      button.background.removeAllListeners()
    }

    this.root.destroy(true)
  }

  private buildList(
    scene: Phaser.Scene,
    definitions: CardEffectDefinition[],
    transitions: ReadonlyArray<TransitionMenuItem>,
  ): void {
    const persistent = definitions.filter((d) => d.kind === 'persistent')
    const action = definitions.filter((d) => d.kind === 'action')

    let y = 0

    y = this.addSection(scene, 'Persistent Effects', y)
    for (const definition of persistent) {
      y = this.addEffectButton(scene, definition, y)
    }

    y += SECTION_GAP
    y = this.addSection(scene, 'Action Effects', y)
    for (const definition of action) {
      y = this.addEffectButton(scene, definition, y)
    }

    if (transitions.length > 0) {
      y += SECTION_GAP
      y = this.addSection(scene, 'Transitions', y)
      for (const item of transitions) {
        y = this.addTransitionButton(scene, item, y)
      }
    }

    this.listContentHeight = y
  }

  private addSection(
    scene: Phaser.Scene,
    label: string,
    y: number,
  ): number {
    const text = scene.add.text(0, y, label.toUpperCase(), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: MUTED_COLOR,
      fontStyle: 'bold',
    })
    this.listContainer.add(text)
    return y + SECTION_LABEL_HEIGHT
  }

  private addEffectButton(
    scene: Phaser.Scene,
    definition: CardEffectDefinition,
    y: number,
  ): number {
    const container = scene.add.container(0, y)

    const background = scene.add.rectangle(
      0,
      0,
      this.width - 32,
      BUTTON_HEIGHT,
      BUTTON_BG,
    )
    background.setOrigin(0, 0)
    background.setStrokeStyle(1, BUTTON_BORDER)

    const label = scene.add.text(0, 0, definition.name, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '14px',
      color: TEXT_COLOR,
    })
    label.setOrigin(0.5, 0.5)

    background.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.selectedCard) {
        return
      }
      this.onEffectSelected(definition.id)
    })

    container.add([background, label])
    this.listContainer.add(container)
    this.buttons.push({ kind: 'effect', definition, container, background, label })

    return y + BUTTON_HEIGHT + BUTTON_GAP
  }

  private addTransitionButton(
    scene: Phaser.Scene,
    item: TransitionMenuItem,
    y: number,
  ): number {
    const container = scene.add.container(0, y)

    const background = scene.add.rectangle(
      0,
      0,
      this.width - 32,
      TRANSITION_BUTTON_HEIGHT,
      BUTTON_BG,
    )
    background.setOrigin(0, 0)
    background.setStrokeStyle(1, TRANSITION_BORDER)

    const badge = scene.add.text(10, 8, item.badge, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '10px',
      color: BADGE_COLOR,
      fontStyle: 'bold',
    })
    badge.setOrigin(0, 0)

    const label = scene.add.text(10, 24, item.name, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '14px',
      color: TEXT_COLOR,
    })
    label.setOrigin(0, 0)

    background.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.selectedCard || !this.onTransitionSelected) {
        return
      }
      this.onTransitionSelected(item.id)
    })

    container.add([background, badge, label])
    this.listContainer.add(container)
    this.buttons.push({
      kind: 'transition',
      item,
      container,
      background,
      label,
      badge,
    })

    return y + TRANSITION_BUTTON_HEIGHT + BUTTON_GAP
  }

  private handleWheel = (
    _pointer: Phaser.Input.Pointer,
    _currentlyOver: unknown,
    _deltaX: number,
    deltaY: number,
  ): void => {
    if (this.listContentHeight <= this.listViewHeight) {
      return
    }

    this.listScrollY -= deltaY * 0.35
    this.clampScroll()
    this.applyScroll()
  }

  private clampScroll(): void {
    const minScroll = Math.min(0, this.listViewHeight - this.listContentHeight)
    this.listScrollY = Phaser.Math.Clamp(this.listScrollY, minScroll, 0)
  }

  private applyScroll(): void {
    this.listContainer.setY(HEADER_HEIGHT + this.listScrollY)
  }

  private syncButtonInteraction(
    background: Phaser.GameObjects.Rectangle,
    enabled: boolean,
  ): void {
    if (!enabled) {
      background.disableInteractive()
      return
    }

    background.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, background.width, background.height),
      Phaser.Geom.Rectangle.Contains,
    )
    background.input!.cursor = 'pointer'
  }
}
