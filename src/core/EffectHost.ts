import type { VfxEffect } from './Effect'
import type { EffectContext } from './EffectContext'

/**
 * Owns enabled effects for one target. Portable — no Card dependency.
 */
export class EffectHost {
  private readonly active = new Map<string, VfxEffect>()

  constructor(private readonly createContext: () => EffectContext) {}

  public enable(effect: VfxEffect): void {
    const existing = this.active.get(effect.id)

    if (existing) {
      if (effect.kind === 'persistent') {
        return
      }

      this.teardown(existing)
      this.active.delete(effect.id)
    }

    effect.enable(this.createContext())
    this.active.set(effect.id, effect)
  }

  /** @deprecated Use `enable`. */
  public apply(effect: VfxEffect): void {
    this.enable(effect)
  }

  public disable(effectId: string): void {
    const effect = this.active.get(effectId)

    if (!effect) {
      return
    }

    this.teardown(effect)
    this.active.delete(effectId)
  }

  /** @deprecated Use `disable`. */
  public remove(effectId: string): void {
    this.disable(effectId)
  }

  public disableAll(): void {
    for (const effect of this.active.values()) {
      this.teardown(effect)
    }

    this.active.clear()
  }

  /** @deprecated Use `disableAll`. */
  public removeAll(): void {
    this.disableAll()
  }

  public has(effectId: string): boolean {
    return this.active.has(effectId)
  }

  public getActive(): VfxEffect[] {
    return Array.from(this.active.values())
  }

  public get(effectId: string): VfxEffect | undefined {
    return this.active.get(effectId)
  }

  public reconfigure(
    effectId: string,
    options: Record<string, unknown>,
  ): boolean {
    const effect = this.active.get(effectId)

    if (!effect?.reconfigure) {
      return false
    }

    effect.reconfigure(options, this.createContext())
    return true
  }

  public update(time: number, delta: number): void {
    for (const effect of [...this.active.values()]) {
      effect.update?.(time, delta)
    }
  }

  public destroy(): void {
    this.disableAll()
  }

  private teardown(effect: VfxEffect): void {
    effect.disable()
    effect.destroy()
  }
}
