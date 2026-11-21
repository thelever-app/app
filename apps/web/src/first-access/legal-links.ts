/** The pages of the public web the app opens, by what they are. */
interface LegalPaths {
  readonly terms: string;
  readonly privacy: string;
  readonly legalNotice: string;
}

/**
 * Where the public web publishes the full terms of use, the privacy policy of the app and the legal
 * notice, in each language: the same domain as the app, so they open beside it. Each title is the
 * one of its page in apps/site, which the address is made of.
 */
const PATHS: Readonly<Record<string, LegalPaths>> = {
  es: {
    terms: '/es/condiciones-de-uso',
    privacy: '/es/privacidad-de-la-app',
    legalNotice: '/es/aviso-legal',
  },
  en: { terms: '/en/terms-of-use', privacy: '/en/app-privacy', legalNotice: '/en/legal-notice' },
  fr: {
    terms: '/fr/conditions-d-utilisation',
    privacy: '/fr/confidentialite-de-l-app',
    legalNotice: '/fr/mentions-legales',
  },
  de: {
    terms: '/de/nutzungsbedingungen',
    privacy: '/de/datenschutz-der-app',
    legalNotice: '/de/impressum',
  },
  it: {
    terms: '/it/condizioni-d-uso',
    privacy: '/it/privacy-dell-app',
    legalNotice: '/it/note-legali',
  },
  pt: {
    terms: '/pt/condicoes-de-utilizacao',
    privacy: '/pt/privacidade-da-app',
    legalNotice: '/pt/aviso-legal',
  },
  ca: {
    terms: '/ca/condicions-d-us',
    privacy: '/ca/privadesa-de-l-app',
    legalNotice: '/ca/avis-legal',
  },
};

/** The pages of the terms of use, the privacy policy of the app and the legal notice, in that language or in Spanish. */
export function legalPathsIn(language: string): LegalPaths {
  return PATHS[language] ?? PATHS.es!;
}
