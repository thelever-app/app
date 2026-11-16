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
  /** The publisher id of AdSense, ca-pub-…, which ads.txt declares; none until there is an account. */
  readonly adsenseClient?: string;
}

/** A page changes at most once a day, when the site is generated again. */
const CACHE = 'public, max-age=300, s-maxage=3600';
const HTML = 'text/html; charset=utf-8';
const NOINDEX = { 'X-Robots-Tag': 'noindex' } as const;
const FALLBACK_LANGUAGE = 'es';

/**
 * How the service answers an address of the public web: a page as it was generated; the address
 * of a dilemma whose name or category changed, with a permanent redirect to the new one; the
 * address of a withdrawn dilemma, with 410 and the page that says so; and anything else, with 404.
 * In dev, and for the pages that may not be indexed, it tells search engines to leave them out.
 */
export async function respond(
  path: string,
  site: PublishedSite,
  { environment, origin, adsenseClient }: RespondOptions,
): Promise<SiteResponse> {
  if (path === '/robots.txt') return robots(environment, origin);
  if (path === '/ads.txt') return adsTxt(adsenseClient);
  if (path === '/sitemap.xml') {
    return page(200, await site.read(SITEMAP_FILE), 'application/xml; charset=utf-8', environment);
  }

  const { manifest } = site;
  const language = languageIn(path);
  if (language && path === `/${language}` && manifest.pages[`${path}/`]) {
    return redirect(`${path}/`);
  }
  const found = manifest.pages[path];
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
  if (body === undefined) return { status: 404, headers: { ...NOINDEX } };
  const kept = environment === 'prod' && indexable ? {} : NOINDEX;
  return {
    status,
    headers: { 'Content-Type': contentType, 'Cache-Control': CACHE, ...kept },
    body,
  };
}

function redirect(location: string): SiteResponse {
  return { status: 301, headers: { Location: location, 'Cache-Control': CACHE } };
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
