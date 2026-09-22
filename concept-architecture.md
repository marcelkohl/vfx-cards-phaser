# VFX Architecture

## Overview

The goal of this library is to provide a collection of reusable visual effects that can be copied into any Phaser project with minimal integration effort.

The library should **not** depend on a specific card implementation, game architecture, scene structure, or entity system.

Every effect should receive its geometry and visual configuration explicitly, allowing the same effect to be applied to cards, panels, buttons, UI elements, or any other compatible object.

---

# Core Principles

## Portable

Effects should be portable between projects.

The library must never assume:

- a `Card` class exists;
- a particular scene hierarchy;
- a specific game architecture;
- a particular asset pipeline.

The application integrating the library is responsible for providing the required geometry and configuration.

---

## Decoupled

Effects should not know anything about each other.

For example:

- Rim Line should not know Edge Glow exists.
- Shine Sweep should not know Flash Burst exists.
- Edge Glow should not trigger other effects.

Each effect should have a single responsibility.

---

## Parameter Driven

Everything that affects the visual result should be configurable.

Examples:

- width
- height
- corner radius
- colors
- intensity
- speed
- duration
- padding
- glow size

Avoid hardcoded visual constants whenever possible.

---

## Self Contained

Each effect lives in its own folder.

Example:

```text
effects/

    edge-glow/
        README.md
        EdgeGlowEffect.ts
        ...

    shine-sweep/
        README.md
        ShineSweepEffect.ts
        ...

    rim-line/
        README.md
        CardRimLineEffect.ts
        ...
```

Each folder contains everything needed to understand and reuse that effect.

---

# Effect Categories

The library defines two major categories of effects.

---

# Persistent Effects

Persistent effects remain active until explicitly removed.

They usually decorate an object continuously.

Examples:

- Highlight
- Rim Line
- Rim Line Double
- Edge Glow

Typical lifecycle:

```text
create
↓

enable

↓

update every frame

↓

disable

↓

destroy
```

Example:

```ts
const glow = new EdgeGlowEffect(options);

card.addEffect(glow);

// ...

card.removeEffect(glow);
```

---

# Action Effects

Action effects execute once and finish automatically.

They do not stay active indefinitely.

Examples:

- Shine Sweep
- Flash Burst
- Spawn
- Upgrade Flash
- Destroy Flash

Typical lifecycle:

```text
run()

↓

animation

↓

finish

↓

idle
```

Suggested API:

```ts
const shine = new ShineSweepEffect(options);

shine.run();
```

Optionally:

```ts
shine.stop();

shine.onFinish(() => {

});
```

The effect should be reusable after completion.

```ts
shine.run();

...

shine.run();
```

No new instance should be required.

---

# Why separate them?

These categories solve different problems.

Persistent effects answer:

> "How should this object look while active?"

Action effects answer:

> "What animation should play right now?"

Keeping them separate makes the API much simpler.

---

# Composing Effects

Complex animations should not be implemented as giant effects.

Instead, they should be composed from smaller effects.

Example:

Instead of creating:

```text
LegendaryRevealEffect
```

build it from:

- Flash Burst
- Shine Sweep
- Edge Glow Pulse
- Particles

This keeps every building block reusable.

---

# Transitions

To coordinate multiple Action Effects, the library introduces the concept of a **Transition**.

A Transition does not render anything.

It only schedules effects.

Example:

```ts
const transition = new Transition();

transition.add({
    at: 0,
    effect: flash
});

transition.add({
    at: 120,
    effect: burst
});

transition.add({
    at: 220,
    effect: shine
});

transition.run();
```

The Transition is only an orchestrator.

It does not know how each effect works internally.

---

# Timeline

Each Action Effect is scheduled on a timeline.

Example:

```text
0 ms
Flash starts

80 ms
Burst starts

150 ms
Shine Sweep starts

350 ms
Flash finishes

600 ms
Shine finishes
```

Effects may overlap naturally.

---

# Why use a Transition?

Without a Transition:

```text
Flash

calls

Burst

calls

Shine
```

Effects become coupled.

With a Transition:

```text
Transition

↓

Flash

↓

Burst

↓

Shine
```

Each effect remains completely independent.

---

# Reusability

The same effects can be reused in many different sequences.

Example:

```text
Card Reveal

Flash

↓

Shine Sweep

↓

Edge Glow Pulse
```

Another sequence:

```text
Upgrade

Glow Pulse

↓

Flash

↓

Particles
```

Another:

```text
Fusion

Flash

↓

Energy Ring

↓

Burst

↓

Shine Sweep
```

No new visual effects are required.

Only a different timeline.

---

# Geometry

Effects never discover geometry automatically.

Instead, geometry is provided by the application.

Typical parameters:

```ts
{
    width,
    height,
    cornerRadius,
    padding
}
```

The application decides what values represent its object.

This allows the same library to work with:

- cards
- panels
- windows
- inventory slots
- buttons
- arbitrary UI elements

---

# Responsibilities

## The Effect

Responsible for:

- rendering
- animation
- lifecycle
- cleanup

Never responsible for:

- discovering object geometry
- querying application state
- finding cards
- managing scenes
- orchestrating other effects

---

## The Application

Responsible for:

- creating effects
- providing geometry
- choosing configuration
- starting Action Effects
- enabling Persistent Effects
- creating Transitions

---

# Lifecycle

Every effect should expose a predictable lifecycle.

Persistent Effect:

```text
create

↓

enable

↓

update

↓

disable

↓

destroy
```

Action Effect:

```text
create

↓

run

↓

finish

↓

run again

↓

destroy
```

---

# Documentation

Every effect should include its own `README.md`.

It should describe:

- purpose
- parameters
- geometry requirements
- usage examples
- lifecycle
- limitations

The main README should only provide an overview and point to each individual effect documentation.

---

# Design Goal

The library should feel like a collection of Lego pieces.

Each effect should do one thing well.

Complex visual presentations should emerge by combining small, reusable effects rather than creating increasingly specialized monolithic implementations.