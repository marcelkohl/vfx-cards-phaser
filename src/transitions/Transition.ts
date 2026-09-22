import type { ActionEffect } from '../core/ActionEffect'

export type TransitionFinishCallback = (transition: Transition) => void

export interface TransitionStep {
  /** Delay from `run()` start, in milliseconds. */
  at: number
  /** Action effect already `enable()`d on its target. */
  effect: ActionEffect
}

/**
 * Schedules Action Effects on a timeline. Does not render anything.
 * Effects stay independent — Transition only calls `run()` at the right time.
 */
export class Transition {
  private readonly steps: TransitionStep[] = []
  private readonly finishListeners = new Set<TransitionFinishCallback>()
  private elapsedMs = 0
  private running = false
  private started = new Set<ActionEffect>()
  private pendingFinishes = 0
  private unsubscribers: Array<() => void> = []

  public add(step: TransitionStep): this {
    this.steps.push(step)
    return this
  }

  public clear(): this {
    this.stop()
    this.steps.length = 0
    return this
  }

  public run(): this {
    this.stopInternal(false)
    this.running = true
    this.elapsedMs = 0
    this.started.clear()
    this.pendingFinishes = 0

    // Sort by start time so update can walk in order.
    this.steps.sort((a, b) => a.at - b.at)

    for (const step of this.steps) {
      this.pendingFinishes += 1
      const unsub = step.effect.onFinish(() => {
        this.pendingFinishes = Math.max(0, this.pendingFinishes - 1)
        this.maybeFinish()
      })
      this.unsubscribers.push(unsub)
    }

    // Kick any steps scheduled at 0 immediately.
    this.advance(0)
    this.maybeFinish()
    return this
  }

  public stop(): this {
    this.stopInternal(true)
    return this
  }

  public isRunning(): boolean {
    return this.running
  }

  public onFinish(callback: TransitionFinishCallback): () => void {
    this.finishListeners.add(callback)
    return () => {
      this.finishListeners.delete(callback)
    }
  }

  /**
   * Drive the timeline. Call from the scene/host update loop while active.
   */
  public update(_time: number, delta: number): void {
    if (!this.running) {
      return
    }

    this.elapsedMs += delta
    this.advance(this.elapsedMs)
  }

  private advance(elapsedMs: number): void {
    for (const step of this.steps) {
      if (this.started.has(step.effect)) {
        continue
      }

      if (elapsedMs >= step.at) {
        this.started.add(step.effect)
        step.effect.run()
      }
    }
  }

  private maybeFinish(): void {
    if (!this.running) {
      return
    }

    if (this.started.size < this.steps.length) {
      return
    }

    if (this.pendingFinishes > 0) {
      return
    }

    this.running = false
    this.clearUnsubscribers()
    for (const listener of [...this.finishListeners]) {
      listener(this)
    }
  }

  private stopInternal(stopEffects: boolean): void {
    this.running = false
    this.clearUnsubscribers()

    if (stopEffects) {
      for (const step of this.steps) {
        if (step.effect.isRunning()) {
          step.effect.stop()
        }
      }
    }

    this.started.clear()
    this.pendingFinishes = 0
    this.elapsedMs = 0
  }

  private clearUnsubscribers(): void {
    for (const unsub of this.unsubscribers) {
      unsub()
    }
    this.unsubscribers = []
  }
}
