import type { PageActivity } from '../../src/room/pause-watcher.ts';

/** A page the test shows, hides and touches when it says so. */
export class FakePageActivity implements PageActivity {
  #visible: boolean;
  readonly #visibilityListeners = new Set<(visible: boolean) => void>();
  readonly #interactionListeners = new Set<() => void>();

  constructor({ visible = true } = {}) {
    this.#visible = visible;
  }

  isVisible(): boolean {
    return this.#visible;
  }

  onVisibilityChange(listener: (visible: boolean) => void): () => void {
    this.#visibilityListeners.add(listener);
    return () => this.#visibilityListeners.delete(listener);
  }

  onInteraction(listener: () => void): () => void {
    this.#interactionListeners.add(listener);
    return () => this.#interactionListeners.delete(listener);
  }

  /** How many listeners are still attached. */
  listeners(): number {
    return this.#visibilityListeners.size + this.#interactionListeners.size;
  }

  hide(): void {
    this.#visible = false;
    for (const listener of this.#visibilityListeners) listener(false);
  }

  show(): void {
    this.#visible = true;
    for (const listener of this.#visibilityListeners) listener(true);
  }

  touch(): void {
    for (const listener of this.#interactionListeners) listener();
  }
}
