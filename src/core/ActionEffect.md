# ActionEffect

On-demand animation contract. Idle after `enable()` — call `run()` to play.

```ts
effect.enable(context)
effect.run()
effect.stop()
effect.onFinish(() => { /* natural end */ })
effect.onProgress(0.7, () => { /* 70% of this run */ })
```

## Lifecycle

```text
enable → run ─────────────────── finish → (idle)
              │
              └─ stop() → idle (no onFinish, no pending onProgress)
```

`run()` while already playing restarts from the beginning.

## `onProgress(progress, callback)`

Normalized **execution** progress over one complete `run()`:

```text
0.0 = start of this run
0.5 = halfway through total duration
1.0 = natural completion
```

Not opacity, scale, or visual peak — elapsed time / total run duration.

### Once per run

Each registration fires **exactly once** per `run()` when progress reaches or
crosses its threshold (frame jumps are OK: `0.68 → 0.73` still fires `0.7`).

### Persistent registration

```ts
effect.onProgress(0.7, () => another.run())

effect.run() // fires at 70%
effect.run() // fires again at 70%
```

You do not re-register every run. `run()` rearms fired state.

### Multiple thresholds / callbacks

```ts
effect.onProgress(0.25, a)
effect.onProgress(0.5, b)
effect.onProgress(0.75, c)
effect.onProgress(0.5, b2) // same threshold — both fire; registration order
```

If one frame crosses several thresholds, all fire in ascending progress order.

### `onProgress(0)`

Fires once at the start of each `run()` (when the run is armed), not on
`enable()` alone.

### `onProgress(1)` and `onFinish`

On natural completion:

```text
onProgress(1) callbacks
        ↓
onFinish() listeners
```

`stop()` fires neither pending progress nor `onFinish`.

### Restart / stop safety

Callbacks may call `run()`, `stop()`, or other effects' `run()`. An interrupted
run never emits leftover progress events afterward — each `run()` / `stop()`
starts a fresh progress generation.

### Composition example

```ts
burstA.onProgress(0.7, () => burstB.run())
burstB.onProgress(0.7, () => burstA.run())
burstA.run()
```

Effects do not know about each other — only callbacks.

### Invalid progress

Values are clamped to `[0, 1]`. Non-finite values become `0`.

## Persistent Effects

`onProgress` is **not** part of `PersistentEffect` (no finite `run()` timeline).
