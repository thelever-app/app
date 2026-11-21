import { LanguageDto } from '@thelever-app/protocol';
import { languageOfTheLink } from './i18n.ts';

/** Where the device keeps the language its player chose in the settings. */
const KEY = 'thelever.language';

/** The storage of the device, read when it is needed: a browser that blocks it throws on reading it. */
type DeviceStorage = () => Pick<Storage, 'getItem' | 'setItem'>;

const deviceStorage: DeviceStorage = () => localStorage;

/** The language the player chose on this device, if they chose one the app has. */
export function chosenLanguage(storage: DeviceStorage = deviceStorage): LanguageDto | undefined {
  try {
    return LanguageDto.safeParse(storage().getItem(KEY)).data;
  } catch {
    return undefined;
  }
}

/** Keeps on the device the language the player chose. */
export function chooseLanguage(
  language: LanguageDto,
  storage: DeviceStorage = deviceStorage,
): void {
  try {
    storage().setItem(KEY, language);
  } catch {
    // A device that keeps nothing uses the language until the page closes.
  }
}

/**
 * The language the app opens in: the one the player chose, else the one of the link from the
 * public web; with neither, the device decides.
 */
export function startingLanguage(
  search: string,
  storage: DeviceStorage = deviceStorage,
): LanguageDto | undefined {
  return chosenLanguage(storage) ?? languageOfTheLink(search);
}
