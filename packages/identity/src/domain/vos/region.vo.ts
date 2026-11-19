/**
 * Where who uses the app is, as the IP address of the device tells: the European Economic Area,
 * the rest of the world, or a country where TheLever is not available. Only this is kept, never
 * the address.
 */
export const REGIONS = ['eea', 'rest-of-world', 'blocked'] as const;

export type Region = (typeof REGIONS)[number];

/** A region where the app can be used. */
export type OpenRegion = Exclude<Region, 'blocked'>;

/** The countries of the European Union, and Iceland, Liechtenstein and Norway. */
const EEA_COUNTRIES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'IS',
  'LI',
  'NO',
]);

/**
 * Where TheLever is not available: the countries under sanctions of the European Union that reach
 * the whole country (Russia, Belarus, North Korea, Iran and Syria), China, Brazil and, until there
 * is revenue, the United Kingdom.
 */
const BLOCKED_COUNTRIES = new Set(['RU', 'BY', 'KP', 'IR', 'SY', 'CN', 'BR', 'GB']);

/** The minimum age to use the app in each region where it is available. */
const MINIMUM_AGES: Readonly<Record<OpenRegion, 16 | 18>> = { eea: 16, 'rest-of-world': 18 };

/**
 * The region of a country, by its ISO 3166-1 alpha-2 code. An address whose country is not known
 * counts as the rest of the world, where the minimum age is the higher one.
 */
export function regionOf(country: string | undefined): Region {
  const code = country?.toUpperCase();
  if (code === undefined) return 'rest-of-world';
  if (BLOCKED_COUNTRIES.has(code)) return 'blocked';
  return EEA_COUNTRIES.has(code) ? 'eea' : 'rest-of-world';
}

export function minimumAgeIn(region: OpenRegion): 16 | 18 {
  return MINIMUM_AGES[region];
}
