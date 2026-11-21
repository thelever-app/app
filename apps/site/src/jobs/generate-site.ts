import {
  ConsoleLogger,
  type Database,
  databaseConfigFrom,
  openDatabase,
  PostgresDilemmaRepository,
} from '@thelever-app/db';
import { GetPublicCatalogUseCase } from '@thelever-app/dilemmas';
import { buildSite } from '../build-site.ts';
import { CloudStorageSiteFiles } from '../files/cloud-storage-site-files.ts';
import { publishSite } from '../files/publish-site.ts';
import { LANGUAGES } from '../texts/index.ts';

// The Cloud Run job generate-site, which Cloud Scheduler runs every day and the workflow Import the
// catalog runs after each load: it reads the public catalog of the database and writes the public
// web into the bucket of the environment, which the service site answers from. Running it again
// writes only what changed. It ends with an error if it could not finish, so the alert fires and
// the service keeps the site it had.

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const logger = new ConsoleLogger();

// DATABASE_URL locally; CLOUD_SQL_INSTANCE and DB_USER in Cloud Run, with a user that only reads
// the tables of Dilemmas. One connection: it reads the catalog once.
const database = await openDatabase<Database>(databaseConfigFrom(process.env), {
  maxConnections: 1,
  logger,
});

try {
  const catalog = await new GetPublicCatalogUseCase(
    new PostgresDilemmaRepository(database.db),
  ).execute();
  const adsenseClient = process.env.ADSENSE_CLIENT?.trim();
  // The ad units of AdSense, all three or none: until AdSense has them, the web shows no ads.
  const [phone, top, side] = ['ADSENSE_SLOT_PHONE', 'ADSENSE_SLOT_TOP', 'ADSENSE_SLOT_SIDE'].map(
    (name) => process.env[name]?.trim(),
  );
  const site = buildSite(catalog, LANGUAGES, {
    origin: required('SITE_ORIGIN'),
    appBase: process.env.APP_BASE?.trim() ?? '',
    // Secrets of the environment: the repository is public, and they are not in it.
    owner: {
      name: required('LEGAL_OWNER_NAME'),
      taxId: required('LEGAL_OWNER_TAX_ID'),
      address: required('LEGAL_OWNER_ADDRESS'),
    },
    donationUrl: required('DONATION_URL'),
    ...(adsenseClient && { adsenseClient }),
    ...(phone && top && side && { adSlots: { phone, top, side } }),
  });
  const { written, removed } = await publishSite(
    site,
    new CloudStorageSiteFiles(required('SITE_BUCKET')),
  );
  logger.info('the public web was generated', {
    dilemmas: catalog.dilemmas.length,
    withdrawn: catalog.withdrawn.length,
    files: site.files.size,
    written,
    removed,
  });
} catch (error) {
  logger.error('generating the public web failed', error);
  process.exitCode = 1;
} finally {
  await database.close();
}
