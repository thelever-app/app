/**
 * The addresses of the public web. The home is `/{language}/`, each category `/{language}/{category}/`
 * and each dilemma `/{language}/{category}/{name}-{number}`, with the category and the name in that
 * language; the number of the catalog never changes, so an old address still finds its dilemma.
 */

/** A text as part of an address: in lowercase, without accents and with hyphens between the words. */
export function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function homePath(language: string): string {
  return `/${language}/`;
}

export function categoryPath(language: string, categoryName: string): string {
  return `/${language}/${slug(categoryName)}/`;
}

export function dilemmaPath(
  language: string,
  categoryName: string,
  name: string,
  number: number,
): string {
  return `/${language}/${slug(categoryName)}/${slug(name)}-${number}`;
}

/** A page of its own, such as the privacy policy, by its title in that language. */
export function pagePath(language: string, title: string): string {
  return `/${language}/${slug(title)}`;
}

/** The number at the end of the address of a dilemma; none if it is not one. */
export function numberIn(path: string): number | undefined {
  const match = /^\/[a-z]{2}\/[a-z0-9-]+\/[a-z0-9-]*?-([1-9]\d*)$/.exec(path);
  return match ? Number(match[1]) : undefined;
}

/** The language an address is in, by its first segment. */
export function languageIn(path: string): string | undefined {
  return /^\/([a-z]{2})(\/|$)/.exec(path)?.[1];
}
