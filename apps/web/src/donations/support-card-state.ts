/** Where the device keeps that its player closed the card to support TheLever: their own choice. */
const KEY = 'thelever.supportCardClosed';

/** The storage of the device, read when it is needed: a browser that blocks it throws on reading it. */
type DeviceStorage = () => Pick<Storage, 'getItem' | 'setItem'>;

const deviceStorage: DeviceStorage = () => localStorage;

/** Whether the player of this device closed the card; not, where the browser keeps nothing. */
export function supportCardClosed(storage: DeviceStorage = deviceStorage): boolean {
  try {
    return storage().getItem(KEY) === 'true';
  } catch {
    return false;
  }
}

export function closeSupportCard(storage: DeviceStorage = deviceStorage): void {
  try {
    storage().setItem(KEY, 'true');
  } catch {
    // A device that keeps nothing shows the card again on the next visit, which is only a notice.
  }
}
