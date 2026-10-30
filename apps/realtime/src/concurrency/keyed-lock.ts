/** Gives the key back. Calling it more than once does nothing. */
export type Release = () => void;

/**
 * A lock per key: two holders of the same key never overlap, and they get it in the order they
 * asked for it. Different keys do not wait for each other.
 */
export class KeyedLock {
  /** For each key that is held or asked for, the moment its last holder releases it. */
  readonly #lastReleases = new Map<string, Promise<void>>();

  /** Waits until the key is free and returns the way to give it back. */
  async acquire(key: string): Promise<Release> {
    const previousRelease = this.#lastReleases.get(key);
    let free: () => void = () => {};
    const released = new Promise<void>((resolve) => {
      free = resolve;
    });
    this.#lastReleases.set(key, released);

    await previousRelease;

    let held = true;
    return () => {
      if (!held) return;
      held = false;
      if (this.#lastReleases.get(key) === released) this.#lastReleases.delete(key);
      free();
    };
  }
}
