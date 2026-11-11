/** Where the device keeps the access code of a closed environment, once the player wrote it. */
const KEY = 'thelever.accessCode';

/** The storage of the device, read when it is needed: a browser that blocks it throws on reading it. */
type DeviceStorage = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const deviceStorage: DeviceStorage = () => localStorage;

/** The access code this device enters a closed environment with, if the player wrote one. */
export interface AccessCode {
  current(): string | undefined;
  remember(code: string): void;
  /**
   * The room server turned that code down: the device asks for it again. A newer code, from
   * another tab or written while the call was on its way, stays.
   */
  forget(code: string): void;
}

/**
 * The access code stays on the device, so the player writes it once, and every tab reads the
 * same one. A browser that keeps nothing remembers it only until the page closes.
 */
export function deviceAccessCode(storage: DeviceStorage = deviceStorage): AccessCode {
  // Only for a browser that keeps nothing.
  let inMemory: string | undefined;
  return {
    current: () => {
      try {
        return storage().getItem(KEY) || undefined;
      } catch {
        return inMemory;
      }
    },
    remember: (next) => {
      inMemory = next.trim();
      try {
        storage().setItem(KEY, inMemory);
      } catch {
        // Private mode, blocked or full storage: the code lasts until the page closes.
      }
    },
    forget: (code) => {
      if (inMemory === code) inMemory = undefined;
      try {
        if (storage().getItem(KEY) === code) storage().removeItem(KEY);
      } catch {
        // Nothing was kept.
      }
    },
  };
}
