import Phaser from 'phaser'
import type {
  EffectContext,
  EffectRegistry,
  VfxEffect,
} from 'phaser-vfx-effects'
import cardArtUrl from '../assets/card-01.png'
import { CardEffectHost } from './CardEffectHost'

/** Matches the stroke used for the visible card border. */
const BORDER_WIDTH = 2
/** Extra inset so artwork stays clearly inside the border stroke. */
const INNER_PADDING = 1

export interface CardFrameGeometry {
  width: number
  height: number
  cornerRadius: number
}

export interface CardConfig {
  id: string
  label?: string
  x: number
  y: number
  width?: number
  height?: number
  /** Frame corner radius in local pixels. `0` = sharp corners. */
  cornerRadius?: number
}

/**
 * Demo card used by this playground only.
 * It injects its frame geometry into effect options so the portable
 * effects library receives explicit width/height/cornerRadius values.
 */
export class Card extends Phaser.GameObjects.Container {
  public static readonly SELECTED_EVENT = 'card-selected'
  public static readonly ART_TEXTURE_KEY = 'card-demo-art'

  public readonly cardId: string
  public readonly label: string
  public readonly cardWidth: number
  public readonly cardHeight: number
  public readonly cornerRadius: number
  public readonly background: Phaser.GameObjects.Graphics
  public readonly border: Phaser.GameObjects.Graphics
  public readonly artwork: Phaser.GameObjects.Image

  private readonly effectHost: CardEffectHost
  private readonly registry: EffectRegistry
  private readonly artworkMaskTextureKey: string
  private baseScale = 1
  private isHovered = false

  public static preload(scene: Phaser.Scene): void {
    if (!scene.textures.exists(Card.ART_TEXTURE_KEY)) {
      scene.load.image(Card.ART_TEXTURE_KEY, cardArtUrl)
    }
  }

  constructor(
    scene: Phaser.Scene,
    config: CardConfig,
    registry: EffectRegistry,
  ) {
    super(scene, config.x, config.y)

    this.cardId = config.id
    this.label = config.label ?? config.id
    this.cardWidth = config.width ?? 220
    this.cardHeight = config.height ?? 320
    this.cornerRadius = Math.min(
      Math.max(0, config.cornerRadius ?? 18),
      Math.min(this.cardWidth, this.cardHeight) / 2,
    )
    this.registry = registry
    this.artworkMaskTextureKey = `card-art-mask:${this.cardId}`

    const left = -this.cardWidth / 2
    const top = -this.cardHeight / 2
    const radius = this.cornerRadius
    const content = this.getContentBounds()

    this.background = scene.add.graphics()
    this.background.fillStyle(0x1d1d1d)
    this.background.fillRoundedRect(left, top, this.cardWidth, this.cardHeight, radius)

    this.artwork = scene.add.image(0, 0, Card.ART_TEXTURE_KEY)
    this.layoutArtwork(content)
    this.applyArtworkMask(scene, content)

    this.border = scene.add.graphics()
    this.border.lineStyle(BORDER_WIDTH, 0xc8c8c8)
    this.border.strokeRoundedRect(left, top, this.cardWidth, this.cardHeight, radius)

    // Artwork under the border; no mask GameObject on the display list.
    this.add([this.background, this.artwork, this.border])

    // Container input: Phaser always adds displayOrigin (width/2, height/2)
    // before testing the hit area. Visual children are centered on (0, 0), so
    // the hit rect must be (0, 0, w, h) — NOT (-w/2, -h/2), which double-offsets.
    this.setSize(this.cardWidth, this.cardHeight)
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.cardWidth, this.cardHeight),
      Phaser.Geom.Rectangle.Contains,
    )
    if (this.input) {
      this.input.cursor = 'pointer'
    }

    this.effectHost = new CardEffectHost(() => this.createEffectContext())

    this.on(Phaser.Input.Events.POINTER_OVER, this.handlePointerOver, this)
    this.on(Phaser.Input.Events.POINTER_OUT, this.handlePointerOut, this)
    this.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this)

    scene.add.existing(this)
  }

  public getFrameGeometry(): CardFrameGeometry {
    return {
      width: this.cardWidth,
      height: this.cardHeight,
      cornerRadius: this.cornerRadius,
    }
  }

  public setBaseScale(scale: number): this {
    this.baseScale = scale
    this.setScale(scale * (this.isHovered ? 1.05 : 1))
    return this
  }

  public getBaseScale(): number {
    return this.baseScale
  }

  public applyEffect(
    effectId: string,
    options?: Record<string, unknown>,
  ): this {
    if (this.effectHost.has(effectId)) {
      return this
    }

    const effect = this.registry.create(
      effectId,
      this.withFrameGeometry(options),
    )
    this.effectHost.apply(effect)
    return this
  }

  public playEffect(
    effectId: string,
    options?: Record<string, unknown>,
  ): this {
    const effect = this.registry.create(
      effectId,
      this.withFrameGeometry(options),
    )
    this.effectHost.apply(effect)
    return this
  }

  public removeEffect(effectId: string): this {
    this.effectHost.remove(effectId)
    return this
  }

  public removeAllEffects(): this {
    this.effectHost.removeAll()
    return this
  }

  public toggleEffect(
    effectId: string,
    options?: Record<string, unknown>,
  ): this {
    if (this.effectHost.has(effectId)) {
      this.removeEffect(effectId)
    } else {
      this.applyEffect(effectId, options)
    }

    return this
  }

  /**
   * Update options on an active effect (e.g. after a consumer-side geometry change).
   * Re-injects this card's frame geometry so alignment stays coherent in the demo.
   */
  public reconfigureEffect(
    effectId: string,
    options?: Record<string, unknown>,
  ): this {
    this.effectHost.reconfigure(effectId, this.withFrameGeometry(options))
    return this
  }

  public hasEffect(effectId: string): boolean {
    return this.effectHost.has(effectId)
  }

  public getEffect(effectId: string): VfxEffect | undefined {
    return this.effectHost.get(effectId)
  }

  public getActiveEffects(): VfxEffect[] {
    return this.effectHost.getActive()
  }

  public update(time: number, delta: number): void {
    this.effectHost.update(time, delta)
  }

  public destroy(fromScene?: boolean): void {
    const textures = this.scene?.textures
    this.effectHost.destroy()
    super.destroy(fromScene)

    if (textures?.exists(this.artworkMaskTextureKey)) {
      textures.remove(this.artworkMaskTextureKey)
    }
  }

  /**
   * Inner image area derived from the same frame geometry as the border:
   * inset by border stroke + padding; radius shrinks with the inset.
   */
  private getContentBounds(): {
    width: number
    height: number
    radius: number
  } {
    const inset = BORDER_WIDTH + INNER_PADDING
    const width = Math.max(1, this.cardWidth - inset * 2)
    const height = Math.max(1, this.cardHeight - inset * 2)
    const radius = Math.min(
      Math.max(0, this.cornerRadius - inset),
      Math.min(width, height) / 2,
    )

    return { width, height, radius }
  }

  /**
   * Cover-fit into the content box: fill fully, keep aspect ratio, center crop.
   * Display size matches the content box so the mask aligns 1:1.
   */
  private layoutArtwork(content: {
    width: number
    height: number
  }): void {
    const srcW = this.artwork.width
    const srcH = this.artwork.height
    const coverScale = Math.max(content.width / srcW, content.height / srcH)
    const cropW = content.width / coverScale
    const cropH = content.height / coverScale
    const cropX = (srcW - cropW) / 2
    const cropY = (srcH - cropH) / 2

    this.artwork.setCrop(cropX, cropY, cropW, cropH)
    this.artwork.setDisplaySize(content.width, content.height)
  }

  /**
   * Phaser 4 WebGL masking: GeometryMask is Canvas-only.
   * Use an internal Mask filter with a per-card rounded-rect texture.
   */
  private applyArtworkMask(
    scene: Phaser.Scene,
    content: { width: number; height: number; radius: number },
  ): void {
    if (scene.textures.exists(this.artworkMaskTextureKey)) {
      scene.textures.remove(this.artworkMaskTextureKey)
    }

    const shape = scene.make.graphics(undefined, false)
    shape.fillStyle(0xffffff, 1)
    shape.fillRoundedRect(0, 0, content.width, content.height, content.radius)
    shape.generateTexture(
      this.artworkMaskTextureKey,
      Math.ceil(content.width),
      Math.ceil(content.height),
    )
    shape.destroy()

    this.artwork.enableFilters()
    this.artwork.filters!.internal.addMask(this.artworkMaskTextureKey)
  }

  /**
   * Playground integration: always pass explicit frame geometry into the
   * portable effect options. Style keys from `options` are preserved.
   */
  private withFrameGeometry(
    options?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      ...options,
      width: this.cardWidth,
      height: this.cardHeight,
      cornerRadius: this.cornerRadius,
    }
  }

  private createEffectContext(): EffectContext {
    return {
      scene: this.scene,
      target: this,
    }
  }

  /** Public attachment point for composed transitions (same as effects). */
  public getEffectContext(): EffectContext {
    return this.createEffectContext()
  }

  private handlePointerOver(): void {
    this.isHovered = true
    this.tweenToScale(this.baseScale * 1.05)
  }

  private handlePointerOut(): void {
    this.isHovered = false
    this.tweenToScale(this.baseScale)
  }

  private handlePointerDown(): void {
    console.log(`Carta clicada: ${this.cardId}`)
    this.emit(Card.SELECTED_EVENT, this)
  }

  private tweenToScale(scale: number): void {
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.add({
      targets: this,
      scale,
      duration: 120,
      ease: 'Sine.easeOut',
    })
  }
}
