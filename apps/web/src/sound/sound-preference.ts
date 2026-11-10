/** Where the device keeps whether its player muted the game. */
const KEY = 'thelever.muted';

/** The storage of the device, read when it is needed: a browser that blocks it throws on reading it. */
type DeviceStorage = () => Pick<Storage, 'getItem' | 'setItem'>;

const deviceStorage: DeviceStorage = () => localStorage;

/** Whether the game sounds on this device, one setting for sound and vibration alike. */
export interface SoundPreference {
  readonly isMuted: () => boolean;
  readonly setMuted: (muted: boolean) => void;
  /** Tells `onChange` every time the player changes it; returns how to stop telling. */
  readonly subscribe: (onChange: () => void) => () => void;
}

/**
 * The game sounds unless the player of this device muted it, and the choice stays on the device.
 * A browser that keeps nothing remembers it only until the page closes.
 */
export function soundPreference(storage: DeviceStorage = deviceStorage): SoundPreference {
  const listeners = new Set<() => void>();
  let muted = read(storage);
  return {
    isMuted: () => muted,
    setMuted: (next) => {
      muted = next;
      try {
        storage().setItem(KEY, String(next));
      } catch {
        // Private mode, blocked or full storage: the choice lasts until the page closes.
      }
      listeners.forEach((notify) => notify());
    },
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}

function read(storage: DeviceStorage): boolean {
  try {
    return storage().getItem(KEY) === 'true';
  } catch {
    return false;
  }
}
