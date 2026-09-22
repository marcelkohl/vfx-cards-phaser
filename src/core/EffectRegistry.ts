import type { VfxEffect } from './Effect'
import type { EffectKind } from './EffectKind'

export type EffectCreateOptions = Record<string, unknown>

export interface EffectDefinition {
  id: string
  name: string
  description?: string
  kind: EffectKind
  create: (options?: EffectCreateOptions) => VfxEffect
}

/**
 * @deprecated Use `EffectDefinition`.
 */
export type CardEffectDefinition = EffectDefinition

/**
 * @deprecated Use `EffectCreateOptions`.
 */
export type CardEffectCreateOptions = EffectCreateOptions

export class EffectRegistry {
  private readonly definitions = new Map<string, EffectDefinition>()

  public register(definition: EffectDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Effect already registered: ${definition.id}`)
    }

    this.definitions.set(definition.id, definition)
  }

  public has(id: string): boolean {
    return this.definitions.has(id)
  }

  public get(id: string): EffectDefinition | undefined {
    return this.definitions.get(id)
  }

  public list(): EffectDefinition[] {
    return Array.from(this.definitions.values())
  }

  public create(id: string, options?: EffectCreateOptions): VfxEffect {
    const definition = this.definitions.get(id)

    if (!definition) {
      throw new Error(`Unknown effect: ${id}`)
    }

    return definition.create(options)
  }
}

/**
 * @deprecated Use `EffectRegistry`.
 */
export class CardEffectRegistry extends EffectRegistry {}
