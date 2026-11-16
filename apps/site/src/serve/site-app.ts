import { readFile } from 'node:fs/promises';
import express, { type Express } from 'express';
import { type PublishedSite, respond, type RespondOptions } from '../respond.ts';
import { ASSETS } from './assets.ts';

export interface SiteAppOptions extends RespondOptions {
  /** The site as it was last published; none before the first generation. */
  readonly site: () => Promise<PublishedSite | undefined>;
}

/** The assets change only with a new image, which the deploy brings: a day in the caches. */
const ASSET_CACHE = 'public, max-age=86400';

/**
 * The service of the public web: the pages and the sitemap the job generated, the robots.txt and
 * the ads.txt of the environment, and the assets of the pages under /_site/.
 */
export function createSiteApp({ site, ...options }: SiteAppOptions): Express {
  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (_req, res) => {
    res.status(200).send('ok');
  });

  app.get('/_site/{*asset}', async (req, res) => {
    const asset = ASSETS[req.path.slice('/_site/'.length)];
    if (!asset) {
      res.status(404).end();
      return;
    }
    res
      .status(200)
      .set({ 'Content-Type': asset.type, 'Cache-Control': ASSET_CACHE })
      .send(await readFile(asset.file));
  });

  app.get('/{*path}', async (req, res) => {
    const published = await site();
    if (!published) {
      res.status(503).set('Retry-After', '3600').end();
      return;
    }
    const answer = await respond(req.path, published, options);
    res.status(answer.status).set(answer.headers);
    if (answer.body === undefined) res.end();
    else res.send(answer.body);
  });

  return app;
}
