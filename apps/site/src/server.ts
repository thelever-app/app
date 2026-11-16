import { CloudStorageSiteFiles } from './files/cloud-storage-site-files.ts';
import type { Environment } from './respond.ts';
import { cachedSite } from './serve/cached-site.ts';
import { createSiteApp } from './serve/site-app.ts';
import { LANGUAGES } from './texts/index.ts';

// The Cloud Run service site, behind Firebase Hosting, which sends it /{language}/…, /_site/…,
// /robots.txt, /sitemap.xml and /ads.txt: it answers from the bucket the job generate-site writes,
// and only reads it.

/** How long an instance keeps the manifest before reading it again. */
const MANIFEST_TTL_MS = 5 * 60 * 1000;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const environment = required('ENVIRONMENT');
if (environment !== 'dev' && environment !== 'prod') {
  throw new Error(`ENVIRONMENT must be dev or prod, not ${environment}`);
}

const adsenseClient = process.env.ADSENSE_CLIENT?.trim();
const app = createSiteApp({
  site: cachedSite(new CloudStorageSiteFiles(required('SITE_BUCKET')), MANIFEST_TTL_MS),
  environment: environment satisfies Environment,
  origin: required('SITE_ORIGIN'),
  languages: [...LANGUAGES.keys()],
  ...(adsenseClient && { adsenseClient }),
});
const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => console.log(`site listening on ${port}`));
