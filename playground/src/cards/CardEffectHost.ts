import {
  EffectHost,
  type EffectContext,
  type VfxEffect,
} from 'phaser-vfx-effects'

/**
 * Playground host wrapper — delegates to the portable `EffectHost`.
 */
export class CardEffectHost {
  private readonly host: EffectHost

  constructor(createContext: () => EffectContext) {
    this.host = new EffectHost(createContext)
  }

  public apply(effect: VfxEffect): void {
    this.host.enable(effect)
  }

  public remove(effectId: string): void {
    this.host.disable(effectId)
  }

  public removeAll(): void {
    this.host.disableAll()
  }

  public has(effectId: string): boolean {
    return this.host.has(effectId)
  }

  public getActive(): VfxEffect[] {
    return this.host.getActive()
  }

  public get(effectId: string): VfxEffect | undefined {
    return this.host.get(effectId)
  }

  public reconfigure(
    effectId: string,
    options: Record<string, unknown>,
  ): boolean {
    return this.host.reconfigure(effectId, options)
  }

  public update(time: number, delta: number): void {
    this.host.update(time, delta)
  }

  public destroy(): void {
    this.host.destroy()
  }
}
