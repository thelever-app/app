/** Where the device keeps the nickname its player last played with. */
const KEY = 'thelever.lastNickname';

/** The storage of the device, read when it is needed: a browser that blocks it throws on reading it. */
type DeviceStorage = () => Pick<Storage, 'getItem' | 'setItem'>;

const deviceStorage: DeviceStorage = () => localStorage;

/**
 * The nickname the player of this device last played with, to prefill the next one; empty if
 * there is none or the browser keeps nothing. It stays on the device and never travels.
 */
export function lastNickname(storage: DeviceStorage = deviceStorage): string {
  try {
    return storage().getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

/** Remembers the nickname the player entered a room with. A browser that keeps nothing loses it. */
export function rememberNickname(nickname: string, storage: DeviceStorage = deviceStorage): void {
  try {
    storage().setItem(KEY, nickname.trim());
  } catch {
    // Private mode, blocked or full storage: the next time the field starts empty, nothing else changes.
  }
}
