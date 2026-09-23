# Light Burst Progress Chain (validation)

Playground-only demo of Action Effect `onProgress()` as a **visual crossfade**.

**Not** Card Star Loop. **Not** part of the package API.

## What it proves

```ts
burstA.onProgress(0.45, () => burstB.run())
burstB.onProgress(0.45, () => burstC.run())
burstC.onProgress(0.45, () => burstA.run())
burstA.run()
```

Three independent Light Bursts hand off while the previous is still strong:

```text
A (seed 1)     ──────────────────── 2000
B (seed 8731)           ────────────────────
C (seed 42042)                   ────────────────────
A again                                   ────────────────────
```

## Why three instances

With `duration: 2000` and chaining at `0.45` (~900ms):

| Setup | Next reuse of A | Problem |
|---|---|---|
| 2 instances | ~1800ms | A still running until 2000 → abrupt `run()` restart |
| 3 instances | ~2700ms | A finished at 2000 → clean reuse |

Two instances cannot crossfade this early without restarting an active burst.

## Timing (composition-specific)

| Option | Value | Role |
|---|---:|---|
| `duration` | `2000` | Full run lifecycle (ms) |
| `peakAt` | `0.5` | Opacity peaks near halfway (~1000ms) |
| `onProgress` | `0.45` | Next burst at ~900ms |

```text
0ms            900   1000                              2000
│───────────────│─────▲──────────────────────────────────│
   fade in      │   peak              fade out
                │
                └── next burst starts (still strong here)

Pairwise overlap ≈ 1100ms (2000 − 900).
```

## Controls

- First click → start chain
- Click again while running → `stop()` all (pending progress must not fire)

## Note

Development validation for the lifecycle primitive and crossfade composition.
Card Star Loop may later reuse the same `onProgress` pattern.
