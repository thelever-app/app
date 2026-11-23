import { languageIn, numberIn } from './addresses.ts';
import { goneFileOf, notFoundFileOf, SITEMAP_FILE, type SiteManifest } from './build-site.ts';

/** dev keeps every page out of search engines; prod, only the dilemmas without reviewed arguments. */
export type Environment = 'dev' | 'prod';

export interface SiteResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
}

/** The site as the service reads it: its manifest, and its files by name. */
export interface PublishedSite {
  readonly manifest: SiteManifest;
  read(file: string): Promise<string | undefined>;
}

export interface RespondOptions {
  readonly environment: Environment;
  readonly origin: string;
  /** The languages of the web, in the order the root falls back on them: the first one last. */
  readonly languages: readonly string[];
  /** The publisher id of AdSense, ca-pub-…, which ads.txt declares; none until there is an account. */
  readonly adsenseClient?: string;
}

/** A page changes at most once a day, when the site is generated again. */
const CACHE = 'public, max-age=300, s-maxage=3600';
/**
 * An address that moved, is gone or does not exist may change with the next generation, and an
 * instance may answer it with an old manifest: only a minute in the browser, never in the CDN.
 */
const SHORT_CACHE = 'public, max-age=60';
const HTML = 'text/html; charset=utf-8';
const NOINDEX = { 'X-Robots-Tag': 'noindex' } as const;
const FALLBACK_LANGUAGE = 'es';

/**
 * How the service answers an address of the public web: a page as it was generated; the address
 * of a dilemma whose name or category changed, with a permanent redirect to the new one; the
 * address of a withdrawn dilemma, with 410 and the page that says so; the root of the domain, with
 * the home in the language of the browser; and anything else, with 404.
 * In dev, and for the pages that may not be indexed, it tells search engines to leave them out.
 */
export async function respond(
  path: string,
  site: PublishedSite,
  { environment, origin, adsenseClient, languages }: RespondOptions,
  acceptLanguage = '',
): Promise<SiteResponse> {
  if (path === '/') return home(languageFor(acceptLanguage, languages));
  if (path === '/robots.txt') return robots(environment, origin);
  if (path === '/ads.txt') return adsTxt(adsenseClient);
  if (path === '/.well-known/security.txt') return securityTxt(origin);
  if (path === '/sitemap.xml') {
    return page(200, await site.read(SITEMAP_FILE), 'application/xml; charset=utf-8', environment);
  }

  const { manifest } = site;
  const language = languageIn(path);
  const found = manifest.pages[path];
  // The same address with or without the slash at the end, as a visitor may type it.
  const other = path.endsWith('/') ? path.slice(0, -1) : `${path}/`;
  if (!found && manifest.pages[other]) return redirect(other);
  if (found) {
    return page(200, await site.read(found.file), HTML, environment, found.indexable);
  }

  const number = numberIn(path);
  const pagesIn = language === undefined ? undefined : manifest.dilemmas[language];
  if (number !== undefined && pagesIn) {
    const moved = pagesIn[number];
    if (moved) return redirect(moved);
    const category = manifest.withdrawn[number];
    if (category) {
      return page(410, await site.read(goneFileOf(language!, category)), HTML, environment, false);
    }
  }
  const shownIn = pagesIn ? language! : FALLBACK_LANGUAGE;
  return page(404, await site.read(notFoundFileOf(shownIn)), HTML, environment, false);
}

function page(
  status: number,
  body: string | undefined,
  contentType: string,
  environment: Environment,
  indexable = true,
): SiteResponse {
  if (body === undefined) {
    return { status: 404, headers: { 'Cache-Control': SHORT_CACHE, ...NOINDEX } };
  }
  const kept = environment === 'prod' && indexable ? {} : NOINDEX;
  const cache = status === 200 ? CACHE : SHORT_CACHE;
  return {
    status,
    headers: { 'Content-Type': contentType, 'Cache-Control': cache, ...kept },
    body,
  };
}

function redirect(location: string): SiteResponse {
  return { status: 301, headers: { Location: location, 'Cache-Control': SHORT_CACHE } };
}

/**
 * The root sends each visitor to the home in their language: temporary, since another browser goes
 * elsewhere, and never kept by the CDN, which would send everyone to the first one.
 */
function home(language: string): SiteResponse {
  return {
    status: 302,
    headers: {
      Location: `/${language}/`,
      'Cache-Control': 'private, no-store',
      Vary: 'Accept-Language',
    },
  };
}

/**
 * The first language of the web the browser asks for, by its preference; the first language of
 * the web if it asks for none of them.
 */
export function languageFor(acceptLanguage: string, languages: readonly string[]): string {
  const asked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const quality = params.find((param) => param.trim().startsWith('q='));
      return {
        language: tag.split('-')[0]!.toLowerCase(),
        q: quality ? Number(quality.trim().slice(2)) : 1,
      };
    })
    .filter(({ language, q }) => language !== '' && q > 0)
    .sort((a, b) => b.q - a.q);
  return asked.find(({ language }) => languages.includes(language))?.language ?? languages[0]!;
}

/** The only seller of the ads of the web, as AdSense asks every site to declare at its root. */
function adsTxt(adsenseClient: string | undefined): SiteResponse {
  if (!adsenseClient) return { status: 404, headers: { ...NOINDEX } };
  return {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': CACHE },
    body: `google.com, ${adsenseClient.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`,
  };
}

/**
 * Until when security.txt holds, as RFC 9116 asks: under a year away. A test fails once it is
 * near, so it is renewed before it lapses.
 */
export const SECURITY_TXT_EXPIRES = '2027-11-23T00:00:00.000Z';

/** Where to report a vulnerability (RFC 9116): the contact mailbox and the policy of the repository. */
function securityTxt(origin: string): SiteResponse {
  return {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': CACHE },
    body: [
      'Contact: mailto:privacidad@thelever.app',
      `Expires: ${SECURITY_TXT_EXPIRES}`,
      'Preferred-Languages: es, en',
      `Canonical: ${origin}/.well-known/security.txt`,
      'Policy: https://github.com/thelever-app/app/blob/main/SECURITY.md',
      '',
    ].join('\n'),
  };
}

/** dev keeps every crawler out; prod lets them in, and tells them where the sitemap is. */
function robots(environment: Environment, origin: string): SiteResponse {
  const body =
    environment === 'prod'
      ? `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n';
  return {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': CACHE },
    body,
  };
}
