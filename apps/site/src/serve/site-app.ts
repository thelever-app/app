import express, { type Express } from 'express';
import { respond, type RespondOptions } from '../respond.ts';
import { ASSETS } from './assets.ts';
import type { CachedSite } from './cached-site.ts';

export interface SiteAppOptions extends RespondOptions {
  /** The site as it was last published; none before the first generation. */
  readonly site: CachedSite;
}

/** The assets change only with a new image, which the deploy brings: a day in the caches. */
const ASSET_CACHE = 'public, max-age=86400';
/**
 * Sent with every answer, the same as Firebase Hosting sends for the app (firebase.json): no page
 * is framed by another site, nothing is sniffed into another type, links tell other sites only
 * the origin, and no page uses the camera, the microphone or the location. The policy leaves
 * scripts alone: the ads and the cookie manager of Google load what they need.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

/** How old the manifest may be before an answer other than a page reads it again. */
const RECHECK_AFTER_MS = 10_000;

/**
 * The service of the public web: the pages and the sitemap the job generated, the robots.txt and
 * the ads.txt of the environment, and the assets of the pages under /_site/.
 */
export function createSiteApp({ site, ...options }: SiteAppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set(SECURITY_HEADERS);
    next();
  });

  app.get('/health', (_req, res) => {
    res.status(200).send('ok');
  });

  app.get('/_site/{*asset}', async (req, res) => {
    const asset = ASSETS.get(req.path.slice('/_site/'.length));
    if (!asset) {
      res.status(404).end();
      return;
    }
    res
      .status(200)
      .set({ 'Content-Type': asset.type, 'Cache-Control': ASSET_CACHE })
      .send(asset.content);
  });

  app.get('/{*path}', async (req, res) => {
    const published = await site.current();
    if (!published) {
      res.status(503).set('Retry-After', '3600').end();
      return;
    }
    const acceptLanguage = req.get('Accept-Language') ?? '';
    let answer = await respond(req.path, published, options, acceptLanguage);
    // An address that moved or does not exist may only be news to this instance: it asks again.
    if (answer.status !== 200) {
      const newer = await site.newerThan(RECHECK_AFTER_MS);
      if (newer && newer !== published) {
        answer = await respond(req.path, newer, options, acceptLanguage);
      }
    }
    res.status(answer.status).set(answer.headers);
    if (answer.body === undefined) res.end();
    else res.send(answer.body);
  });

  return app;
}
