# Core

Shared contracts and infrastructure. Does not depend on concrete effects or the playground.

| Module | Role |
|---|---|
| `PersistentEffect` | Continuous decoration contract |
| `ActionEffect` | On-demand animation contract |
| `EffectContext` | `{ scene, target }` attachment point |
| `EffectHost` | Owns enabled effects for one target |
| `EffectRegistry` | Named factory catalog |
| `effectConfig` | Internal clamping / color helpers |

Legacy aliases (`CardEffect`, `CardEffectRegistry`, …) remain for compatibility and are marked `@deprecated`.
