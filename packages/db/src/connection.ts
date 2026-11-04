import { AuthTypes, Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Logger } from './logger.ts';

/** Where the database is: a URL locally and in CI; the Cloud SQL instance and an IAM user in Cloud Run. */
export type DatabaseConfig =
  | { readonly kind: 'url'; readonly url: string }
  | {
      readonly kind: 'cloud-sql';
      readonly instance: string;
      readonly user: string;
      readonly database: string;
    };

export function databaseConfigFrom(env: NodeJS.ProcessEnv): DatabaseConfig {
  const { DATABASE_URL, CLOUD_SQL_INSTANCE, DB_USER, DB_NAME = 'thelever' } = env;
  if (DATABASE_URL) return { kind: 'url', url: DATABASE_URL };
  if (CLOUD_SQL_INSTANCE && DB_USER) {
    return { kind: 'cloud-sql', instance: CLOUD_SQL_INSTANCE, user: DB_USER, database: DB_NAME };
  }
  throw new Error('set DATABASE_URL, or CLOUD_SQL_INSTANCE and DB_USER');
}

/** The pg options for a config, and how to release what was opened to get them. */
async function clientOptions(
  config: DatabaseConfig,
): Promise<{ readonly options: pg.ClientConfig; readonly release: () => void }> {
  if (config.kind === 'url') {
    return { options: { connectionString: config.url }, release: () => {} };
  }
  const connector = new Connector();
  const options = await connector.getOptions({
    instanceConnectionName: config.instance,
    ipType: IpAddressTypes.PUBLIC,
    authType: AuthTypes.IAM,
  });
  return {
    options: { ...options, user: config.user, database: config.database },
    release: () => connector.close(),
  };
}

export async function openDatabase<DB>(
  config: DatabaseConfig,
  { maxConnections, logger }: { readonly maxConnections: number; readonly logger: Logger },
): Promise<{ readonly db: Kysely<DB>; readonly close: () => Promise<void> }> {
  const { options, release } = await clientOptions(config);
  const pool = new pg.Pool({ ...options, max: maxConnections });
  // The database may end an idle connection (a restart, maintenance): the pool drops it and opens another.
  pool.on('error', (error) =>
    logger.warn('idle database connection ended', { cause: error.message }),
  );
  const db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });
  return {
    db,
    close: async () => {
      await db.destroy();
      release();
    },
  };
}

/** A connection of its own for LISTEN, never taken from the pool, so it is never handed back (ADR 0003). */
export async function openListenClient(
  config: DatabaseConfig,
): Promise<{ readonly client: pg.Client; readonly close: () => Promise<void> }> {
  const { options, release } = await clientOptions(config);
  // It is idle for long stretches: without keepalive, a cut connection could stay open for hours.
  const client = new pg.Client({
    ...options,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  try {
    await client.connect();
  } catch (error) {
    release();
    throw error;
  }
  return {
    client,
    close: async () => {
      try {
        await client.end();
      } finally {
        release();
      }
    },
  };
}
