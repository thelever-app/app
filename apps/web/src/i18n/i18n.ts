import i18next, { type BackendModule, type i18n } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { LanguageDto } from '@thelever-app/protocol';
import { initReactI18next } from 'react-i18next';

/** The languages of the interface, the same a player can read the dilemmas in. */
export const SUPPORTED_LANGUAGES = LanguageDto.options;
/** The language the catalogs are written in, and the one used when a catalog is missing. */
export const SOURCE_LANGUAGE: LanguageDto = 'es';

const catalogs = import.meta.glob<{ default: object }>('./locales/*.json');

/** Loads `locales/<language>.json` only when that language is needed. */
const catalogBackend: BackendModule = {
  type: 'backend',
  init() {},
  read(language, _namespace, callback) {
    const load = catalogs[`./locales/${language}.json`];
    if (!load) {
      callback(new Error(`There is no catalog for ${language}`), false);
      return;
    }
    load().then(
      (catalog) => callback(null, catalog.default),
      (error: unknown) => callback(error as Error, false),
    );
  },
};

/** Without a language, it takes the one of the device. */
export async function createI18n(language?: string): Promise<i18n> {
  const instance = i18next.createInstance().use(catalogBackend).use(initReactI18next);
  if (language === undefined) instance.use(LanguageDetector);

  await instance.init({
    ...(language === undefined ? {} : { lng: language }),
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: SOURCE_LANGUAGE,
    interpolation: { escapeValue: false },
    detection: { order: ['navigator'], caches: [] },
  });

  // The language the text is actually read in, which screen readers use to pronounce it.
  const setPageLanguage = () => {
    document.documentElement.lang = instance.resolvedLanguage ?? SOURCE_LANGUAGE;
  };
  setPageLanguage();
  instance.on('languageChanged', setPageLanguage);
  return instance;
}
