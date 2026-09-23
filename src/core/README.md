# Core

Shared contracts and infrastructure. Does not depend on concrete effects or the playground.

| Module | Role |
|---|---|
| `PersistentEffect` | Continuous decoration contract |
| `ActionEffect` | On-demand animation contract (`run` / `onFinish` / `onProgress`) — see [ActionEffect.md](./ActionEffect.md) |
| `ActionRunProgress` | Internal once-per-run progress-event tracker |
| `EffectContext` | `{ scene, target }` attachment point |
| `EffectHost` | Owns enabled effects for one target |
| `EffectRegistry` | Named factory catalog |
| `effectConfig` | Internal clamping / color helpers |

Legacy aliases (`CardEffect`, `CardEffectRegistry`, …) remain for compatibility and are marked `@deprecated`.
