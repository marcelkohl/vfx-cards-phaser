# Playground

Optional demonstration project that **consumes** [`phaser-vfx-effects`](../README.md).

It is not part of the library build. Cards, UI panel, selection arrow, hover behavior, and demo art live here only.

## How it consumes the package

Local package reference:

```json
"dependencies": {
  "phaser-vfx-effects": "file:.."
}
```

Application code imports the **public API** only for effects and infrastructure:

```ts
import {
  createDefaultEffectRegistry,
  ShineSweepEffect,
  Transition,
} from 'phaser-vfx-effects'
```

Game-specific compositions live under [`src/recipes/`](src/recipes/README.md) and import the package like any other consumer:

```ts
import { CardFlashBurstTransition } from '../recipes'
```

`make dev` / `make build` rebuild the library and re-run `npm install` so the local `file:..` copy picks up a fresh `dist/`.

## Initialize

From the playground folder:

```bash
make init
```

Or from the repo root:

```bash
make playground-init
# or
make init
```

## Run

```bash
make run
# or
make dev
```

From root:

```bash
make playground
```

## Makefile commands

| Command | Intent |
|---|---|
| `make init` | Install workspace deps + build effects package |
| `make install` | Install deps only |
| `make dev` / `make run` | Start Vite dev server |
| `make build` | Build effects package, then playground |
| `make check` | TypeScript check |
| `make preview` | Preview production build |
| `make clean` | Remove playground `dist/` and `.vite` |

## Layout

```text
playground/
  index.html
  src/
    main.ts
    scenes/          # demo scene + effect presets
    cards/           # demo Card + host wrapper
    ui/              # side panel, selection indicator
    recipes/         # educational effect compositions (not package API)
    assets/          # card-01.png (demo only)
  Makefile
  package.json
```

## Notes

- Demo geometry and style presets live in `src/scenes/MainScene.ts`.
- `Card` injects `width` / `height` / `cornerRadius` into effect options — that is consumer responsibility, not the library.
- Recipes under `src/recipes/` show how to combine package effects; copy them into your own game if useful.
