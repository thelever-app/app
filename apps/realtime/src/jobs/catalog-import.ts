import Anthropic from '@anthropic-ai/sdk';
import {
  ConsoleLogger,
  type Database,
  databaseConfigFrom,
  type Logger,
  openDatabase,
  PostgresDilemmaRepository,
} from '@thelever-app/db';
import { CatalogImportFailedError, ImportCatalogUseCase } from '@thelever-app/dilemmas';
import { withdrawSeedDilemmas } from '@thelever-app/dilemmas/seed';
import { LanguageDto } from '@thelever-app/protocol';
import { CloudLoggingLogger } from '../telemetry/cloud-logging-logger.ts';
import { AnthropicTranslator } from './catalog-import/anthropic-translator.ts';
import { NotionCuratedCatalog } from './catalog-import/notion-curated-catalog.ts';

// The Cloud Run job catalog-import, which a workflow of GitHub runs by hand in each environment, and
// `pnpm catalog:import` locally: it loads the Catalog of dilemmas of Notion into the database, with
// its translations. Running it again changes only what changed in Notion. It ends with an error if
// a dilemma could not be loaded; the next run tries that one again. Once the catalog is loaded, the
// seed dilemmas the environment started with are withdrawn: the curated catalog takes their place.

/** The data source of the Catalog of dilemmas in Notion. */
const CATALOG_DATA_SOURCE_ID = 'e38ec074-29b0-4733-a02c-dd03f945dbcc';
/** How many dilemmas it translates at once: well below the limits of the translator. */
const CONCURRENCY = 8;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Cloud Logging in Cloud Run, where FIREBASE_PROJECT_ID is set; the console locally.
const projectId = process.env.FIREBASE_PROJECT_ID;
const logger: Logger = projectId ? new CloudLoggingLogger({ projectId }) : new ConsoleLogger();

// DATABASE_URL locally; CLOUD_SQL_INSTANCE and DB_USER in Cloud Run. One connection: the saves go
// one after the other while the translations, which take the time, run side by side.
const database = await openDatabase<Database>(databaseConfigFrom(process.env), {
  maxConnections: 1,
  logger,
});

try {
  const dilemmaRepository = new PostgresDilemmaRepository(database.db);
  const importCatalog = new ImportCatalogUseCase(
    new NotionCuratedCatalog({
      token: required('NOTION_TOKEN'),
      dataSourceId: CATALOG_DATA_SOURCE_ID,
    }),
    new AnthropicTranslator(new Anthropic({ apiKey: required('ANTHROPIC_API_KEY') }).messages),
    dilemmaRepository,
    LanguageDto.options,
    { concurrency: CONCURRENCY },
  );
  const output = await importCatalog.execute();
  // Only once there is a curated catalog to take its place: an empty read must not leave the
  // environment without dilemmas.
  const seedWithdrawn = output.approved > 0 ? await withdrawSeedDilemmas(dilemmaRepository) : 0;
  logger.info('the catalog was loaded', { ...output, seedWithdrawn });
} catch (error) {
  if (error instanceof CatalogImportFailedError) {
    logger.error('some dilemmas of the catalog could not be loaded', error, {
      failures: error.failures.length,
    });
  } else {
    logger.error('loading the catalog failed', error);
  }
  process.exitCode = 1;
} finally {
  await database.close();
}
