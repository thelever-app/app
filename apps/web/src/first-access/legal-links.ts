/**
 * Where the public web publishes the full terms of use and the privacy policy of the app, in each
 * language: the same domain as the app, so they open beside it. Each title is the one of its page
 * in apps/site, which the address is made of.
 */
const PATHS: Readonly<Record<string, { readonly terms: string; readonly privacy: string }>> = {
  es: { terms: '/es/condiciones-de-uso', privacy: '/es/privacidad-de-la-app' },
  en: { terms: '/en/terms-of-use', privacy: '/en/app-privacy' },
  fr: { terms: '/fr/conditions-d-utilisation', privacy: '/fr/confidentialite-de-l-app' },
  de: { terms: '/de/nutzungsbedingungen', privacy: '/de/datenschutz-der-app' },
  it: { terms: '/it/condizioni-d-uso', privacy: '/it/privacy-dell-app' },
  pt: { terms: '/pt/condicoes-de-utilizacao', privacy: '/pt/privacidade-da-app' },
  ca: { terms: '/ca/condicions-d-us', privacy: '/ca/privadesa-de-l-app' },
};

/** The page of the terms of use and of the privacy policy of the app, in that language or in Spanish. */
export function legalPathsIn(language: string): {
  readonly terms: string;
  readonly privacy: string;
} {
  return PATHS[language] ?? PATHS.es!;
}
