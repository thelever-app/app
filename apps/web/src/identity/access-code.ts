/** Where the device keeps the access code of a closed environment, once the player wrote it. */
const KEY = 'thelever.accessCode';

/** The storage of the device, read when it is needed: a browser that blocks it throws on reading it. */
type DeviceStorage = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const deviceStorage: DeviceStorage = () => localStorage;

/** The access code this device enters a closed environment with, if the player wrote one. */
export interface AccessCode {
  current(): string | undefined;
  remember(code: string): void;
  /** The room server turned it down: the device asks for it again. */
  forget(): void;
}

/**
 * The access code stays on the device, so the player writes it once. A browser that keeps nothing
 * remembers it only until the page closes.
 */
export function deviceAccessCode(storage: DeviceStorage = deviceStorage): AccessCode {
  let code = read(storage);
  return {
    current: () => code,
    remember: (next) => {
      code = next.trim();
      try {
        storage().setItem(KEY, code);
      } catch {
        // Private mode, blocked or full storage: the code lasts until the page closes.
      }
    },
    forget: () => {
      code = undefined;
      try {
        storage().removeItem(KEY);
      } catch {
        // Nothing was kept.
      }
    },
  };
}

function read(storage: DeviceStorage): string | undefined {
  try {
    return storage().getItem(KEY) || undefined;
  } catch {
    return undefined;
  }
}
