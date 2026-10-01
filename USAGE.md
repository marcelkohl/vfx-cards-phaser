# Package Distribution and Usage

This document explains how `phaser-vfx-effects` is intended to be built, distributed, installed, and consumed by other Phaser projects.

The main principle is:

> `phaser-vfx-effects` is a reusable library.  
> The playground is a development and demonstration application, not part of the distributed library.

---

## Project Structure

The repository is organized approximately as follows:

```text
phaser-vfx-effects/
├── src/
│   ├── index.ts
│   │
│   ├── core/
│   │
│   ├── effects/
│   │   ├── persistent/
│   │   └── action/
│   │
│   └── transitions/
│
├── dist/
│
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── Makefile
│
└── playground/
    ├── src/
    │   ├── cards/
    │   ├── scenes/
    │   ├── ui/
    │   ├── assets/
    │   └── recipes/
    │
    ├── package.json
    ├── vite.config.ts
    └── README.md
```

There are two conceptually different products inside this repository:

1. the reusable VFX package;
2. the playground used to develop, inspect, and demonstrate it.

They should remain separate.

---

# The Reusable Package

The reusable package lives primarily under:

```text
src/
```

Its public API is exposed through:

```text
src/index.ts
```

This includes reusable primitives such as:

```ts
import {
  FlashEffect,
  LightBurstEffect,
  RisingBubblesEffect,
  RisingBlocksEffect,
  // ...
} from 'phaser-vfx-effects'
```

It may also expose generic infrastructure such as the package's generic `Transition` orchestrator.

The package must never require playground-specific code in order to work.

---

# The Playground Is Not the Package

The following directory:

```text
playground/
```

is a development application.

Its purposes include:

- visual validation;
- effect tuning;
- comparison between presets;
- demonstrating package features;
- testing compositions;
- documenting practical usage;
- experimenting with recipes.

The playground must NOT become a runtime dependency of the package.

In particular:

```text
src/
```

must never import from:

```text
playground/
```

The dependency direction is:

```text
playground
    │
    │ imports
    ▼
phaser-vfx-effects
```

Never:

```text
phaser-vfx-effects
    │
    │ imports
    ▼
playground
```

---

# Effects Are Reusable Library Primitives

Reusable visual primitives belong in the package.

For example:

```text
src/effects/action/
src/effects/persistent/
```

These effects should know only about their own visual behavior and the generic effect infrastructure.

They must not depend on:

- Card classes from the playground;
- playground scenes;
- playground UI;
- game-specific card implementations;
- playground recipes;
- other application-specific concepts.

Geometry and configuration should be supplied through the effect's public configuration/context rather than discovered from a playground Card implementation.

For example, concepts such as:

```ts
width
height
cornerRadius
position
```

may be supplied by the consumer.

This allows the same effect to be used on completely different Phaser objects and projects.

---

# Recipes Are Different

The playground may contain compositions such as:

```text
playground/src/recipes/
```

Examples may include compositions similar to:

```text
card-flash-burst/
card-dissolve-reveal/
feather/
card-flare/
card-flash/
card-star-loop/
card-sunlight-loop/
card-cube-up/
```

These recipes demonstrate how multiple reusable effects can be combined.

For example, a recipe may conceptually combine:

```text
FlashEffect
     +
BloomFadeEffect
     +
RisingLightColumnsEffect
     +
RisingBlocksEffect
```

The individual effects are reusable library primitives.

The composition is application-level behavior.

Therefore, playground recipes are intentionally NOT part of the package's public API.

---

# Do Not Export Playground Recipes from the Package

This should work:

```ts
import {
  FlashEffect,
  BloomFadeEffect,
  RisingBubblesEffect,
} from 'phaser-vfx-effects'
```

A playground-specific recipe should NOT automatically become available like this:

```ts
import {
  CardCubeUpTransition,
} from 'phaser-vfx-effects'
```

If another game wants to use a playground recipe, the intended workflow is:

1. inspect the recipe;
2. understand which reusable effects it combines;
3. copy or adapt the recipe into the consuming game;
4. configure it for that game's Card implementation.

Recipes are therefore:

> educational composition examples, not reusable package primitives.

This separation is intentional.

---

# Generic Transition Infrastructure

Generic orchestration infrastructure may belong to the package.

For example:

```ts
import {
  Transition,
} from 'phaser-vfx-effects'
```

A generic `Transition` can coordinate reusable actions without knowing anything about a specific game.

A concrete composition such as:

```text
CardCubeUpTransition
```

belongs to the consuming application or playground because it describes a specific visual sequence.

Conceptually:

```text
phaser-vfx-effects
│
├── Effects
│   ├── FlashEffect
│   ├── BloomFadeEffect
│   ├── LightBurstEffect
│   ├── RisingBubblesEffect
│   └── ...
│
└── Transition
    └── generic orchestration infrastructure


Game / Playground
│
└── Recipes
    ├── CardCubeUpTransition
    ├── CardFlashTransition
    └── ...
```

---

# Build Output

The package source is written under:

```text
src/
```

The build process should produce distributable output under:

```text
dist/
```

Conceptually, the resulting structure may look similar to:

```text
dist/
├── index.js
├── index.d.ts
├── core/
├── effects/
└── transitions/
```

The exact output structure depends on the current TypeScript/build configuration.

The important requirements are that consumers receive:

- executable JavaScript;
- TypeScript declarations;
- all runtime files required by exported effects;
- a valid public entry point.

The consumer should not need the repository's `src/` directory or playground in order to use the package.

---

# `dist/` Is a Build Artifact

`dist/` represents the compiled library.

However:

> The existence of a `dist/` directory alone does not guarantee that the npm package is correctly distributable.

The package metadata must also correctly describe the build.

Relevant `package.json` fields may include, depending on the current module format:

```json
{
  "main": "...",
  "module": "...",
  "types": "...",
  "exports": {
    ".": "..."
  },
  "files": [
    "dist"
  ]
}
```

The exact configuration must match the actual generated files.

Do not blindly copy these example values into `package.json`.

Inspect the current build output first.

---

# Phaser Dependency

The library is designed to run inside an existing Phaser application.

In general, Phaser should not accidentally be bundled as a private second Phaser runtime inside this library.

The package configuration should be audited so that the consuming application and `phaser-vfx-effects` use a compatible Phaser installation.

Depending on the current build setup, `phaser` will typically be a good candidate for a `peerDependency`.

For example, conceptually:

```json
{
  "peerDependencies": {
    "phaser": "<compatible-version-range>"
  }
}
```

The actual version range must be chosen based on the Phaser versions supported and tested by this repository.

Do not invent a version range without inspecting the project.

---

# Local Development Usage

During development, another local Phaser project can consume this package directly.

For example, assume:

```text
projects/
├── phaser-vfx-effects/
└── my-card-game/
```

The card game's `package.json` may reference the library using a local file dependency:

```json
{
  "dependencies": {
    "phaser-vfx-effects": "file:../phaser-vfx-effects"
  }
}
```

Then install dependencies normally:

```bash
npm install
```

The game can then use normal package imports:

```ts
import {
  RisingBubblesEffect,
  FlashEffect,
  LightBurstEffect,
} from 'phaser-vfx-effects'
```

This is also the general model used by the repository's own playground.

---

# Using an npm Package Archive

For a more realistic distribution test without publishing the package, create an npm package archive.

From the package root, the expected workflow is conceptually:

```bash
npm run build
npm pack
```

`npm pack` produces an archive similar to:

```text
phaser-vfx-effects-0.1.0.tgz
```

The exact filename depends on the package name and version.

A different Phaser project can then install that archive:

```bash
npm install ../path/to/phaser-vfx-effects-0.1.0.tgz
```

The consuming project should then be able to use the library normally:

```ts
import {
  RisingBubblesEffect,
} from 'phaser-vfx-effects'
```

This is a useful distribution method when sharing the library between private/local projects without publishing it to a registry.

---

# Why `npm pack` Is Important

Testing only through:

```json
"phaser-vfx-effects": "file:.."
```

may hide packaging mistakes because the consumer can potentially see files that would not actually be included in a published package.

`npm pack` provides a better approximation of real distribution.

Before considering the library distributable, inspect the archive contents.

Useful checks include:

```bash
npm pack --dry-run
```

and:

```bash
npm pack
```

Verify that the resulting package contains everything required at runtime.

---

# What the Package Archive Should Contain

At minimum, verify that the packed library contains the files required by its public entry points.

Typically this includes:

```text
package.json
dist/
  ...
README.md
LICENSE
```

where applicable.

It should not unnecessarily include development-only content such as:

```text
playground/
node_modules/
temporary files
screenshots
development artifacts
```

unless there is a deliberate reason.

---

# Shader and Runtime Asset Considerations

Some effects may use shader source code or other runtime resources.

Before distribution, verify whether those resources are:

1. compiled directly into the generated JavaScript; or
2. emitted as separate runtime files.

If an exported effect depends on a separate runtime file, that file must be included in the npm package.

For example, an effect must not work inside the repository but fail after `npm pack` because a shader file was accidentally excluded.

The same principle applies to any future:

- textures;
- shader files;
- JSON data;
- runtime assets.

A packaged effect must be self-contained with respect to its required library resources.

---

# TypeScript Support

Consumers should receive TypeScript declarations.

For example:

```ts
import {
  RisingBubblesEffect,
  RisingBubblesOptions,
} from 'phaser-vfx-effects'
```

should resolve the corresponding types without requiring access to this repository's source tree.

The build/distribution configuration should therefore verify that `.d.ts` files are generated and reachable through the package entry points.

---

# Public API

`src/index.ts` defines the intended public surface of the library.

Consumers should prefer:

```ts
import {
  RisingBubblesEffect,
} from 'phaser-vfx-effects'
```

rather than relying on internal paths such as:

```ts
import {
  RisingBubblesEffect,
} from 'phaser-vfx-effects/dist/effects/action/rising-bubbles/...'
```

Internal folder structure should not accidentally become part of the public contract unless explicitly documented.

When adding a new reusable effect, verify that it is exported through the intended public API.

---

# Recommended Distribution Validation

Before using a new release in another project, validate the complete package flow.

Recommended sequence:

```text
1. Build the library
        ↓
2. Verify dist/
        ↓
3. Run npm pack --dry-run
        ↓
4. Create the .tgz with npm pack
        ↓
5. Install the .tgz into a separate Phaser project
        ↓
6. Import effects only through the public package API
        ↓
7. Compile the consuming project
        ↓
8. Run it in the browser
        ↓
9. Verify WebGL and relevant fallbacks
```

This catches problems that the playground alone may not expose.

---

# Distribution Options

There are several ways this package may eventually be distributed.

## 1. Local file dependency

Useful while actively developing both projects.

```json
{
  "dependencies": {
    "phaser-vfx-effects": "file:../phaser-vfx-effects"
  }
}
```

---

## 2. npm `.tgz` archive

Useful for private distribution and realistic package testing.

Create:

```bash
npm pack
```

Install elsewhere:

```bash
npm install ../path/to/phaser-vfx-effects-x.y.z.tgz
```

This is a good default for sharing the library between private projects without introducing package-registry infrastructure.

---

## 3. npm or private registry

The package may eventually be published to a registry.

A consumer could then install it using something similar to:

```bash
npm install phaser-vfx-effects
```

Whether the package is public or private is a separate distribution decision and does not require changing the core effect architecture.

---

# Versioning

Once multiple projects depend on this package, package versions become important.

Reusable releases should have explicit versions:

```text
0.1.0
0.2.0
1.0.0
...
```

When changing the public API, consider whether the change is:

- backward-compatible;
- a new feature;
- a breaking change.

Consumers should not need to inspect repository commits to determine which effect API they are using.

---

# Adding New Effects

When a new reusable effect is created, verify all relevant integration points.

Conceptually:

```text
implement effect
      ↓
export through effect module
      ↓
register if required by package architecture
      ↓
export through public package API
      ↓
validate in playground
      ↓
build package
      ↓
verify generated declarations/runtime output
```

The playground validates the effect.

It does not define the effect.

---

# Application-Specific Compositions

A consuming card game is expected to create its own transitions and recipes using package primitives.

For example:

```ts
import {
  FlashEffect,
  BloomFadeEffect,
  RisingBubblesEffect,
  Transition,
} from 'phaser-vfx-effects'
```

The game can then define something application-specific:

```text
MyCardUpgradeTransition
```

inside the game repository.

That transition can know about:

- that game's cards;
- game-specific timing;
- game-specific state;
- sound effects;
- gameplay events;
- card rarity;
- animation sequences.

The reusable effects should not know about those concepts.

---

# Architectural Boundary

Keep this dependency model:

```text
┌──────────────────────────────────┐
│          CONSUMING GAME          │
│                                  │
│  Cards                           │
│  Game-specific transitions       │
│  Recipes                         │
│  Gameplay                        │
│                                  │
│              │                   │
│              ▼                   │
│      phaser-vfx-effects          │
│                                  │
│  Action Effects                  │
│  Persistent Effects              │
│  Generic Transition              │
│  Generic effect infrastructure   │
└──────────────────────────────────┘
```

The library provides visual building blocks.

The game decides how those building blocks are composed.

---

# Important Rules for Future Contributors and Agents

When modifying this repository:

1. Do not make reusable effects depend on the playground.
2. Do not move game-specific recipes into the package merely for convenience.
3. Do not export playground recipes from `src/index.ts`.
4. Keep reusable effects generic.
5. Pass target geometry/configuration through public effect APIs/context.
6. Keep the generic `Transition` orchestrator independent from concrete recipes.
7. Treat `dist/` as generated build output, not hand-maintained source.
8. Ensure public effects are reachable from the package's documented public API.
9. Ensure TypeScript declarations are included in distributable builds.
10. Ensure runtime shader/assets required by exported effects are actually packaged.
11. Avoid bundling an unnecessary second Phaser runtime.
12. Test distribution with `npm pack`, not only through the playground.
13. Install the resulting package into a separate project before considering distribution complete.
14. Do not introduce new dependencies solely to solve packaging issues unless genuinely necessary.
15. Inspect the current repository configuration before changing build or package metadata.

---

# Distribution Audit Checklist

Before declaring the package ready for external use, verify:

- [ ] `npm run build` succeeds.
- [ ] `dist/` contains the expected runtime output.
- [ ] TypeScript declaration files are generated.
- [ ] `package.json` entry points match the actual build output.
- [ ] `src/index.ts` exposes the intended public API.
- [ ] `npm pack --dry-run` contains the expected files.
- [ ] `playground/` is not accidentally required by the package.
- [ ] playground recipes are not exported as library primitives.
- [ ] Phaser dependency configuration is appropriate for a library.
- [ ] shaders required at runtime are included or bundled correctly.
- [ ] any other runtime assets are included.
- [ ] the generated `.tgz` installs successfully into another Phaser project.
- [ ] package imports resolve without internal `dist/...` imports.
- [ ] TypeScript types resolve in the consuming project.
- [ ] the consuming project builds successfully.
- [ ] effects execute successfully in the consuming project.
- [ ] package behavior does not depend on repository-relative paths.

---

# Summary

The intended model is:

```text
SOURCE

src/
  reusable effects
  generic infrastructure
        │
        │ build
        ▼

dist/
  compiled reusable library
        │
        │ npm pack / registry / local dependency
        ▼

OTHER PHASER PROJECT
  imports phaser-vfx-effects
        │
        │
        ├── uses reusable effects
        │
        └── creates its own recipes/transitions
```

Meanwhile:

```text
playground/
```

exists to develop, validate, demonstrate, and document those reusable primitives.

It is not the distributed product.

The core rule is:

> **Effects belong to the library. Compositions belong to the application. The playground demonstrates both without becoming a dependency of either.**
