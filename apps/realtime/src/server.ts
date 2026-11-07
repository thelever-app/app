import { randomUUID } from 'node:crypto';
import {
  type Database,
  databaseConfigFrom,
  openDatabase,
  openListenClient,
} from '@thelever-app/db';
import { initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { composeRealtimeServer } from './composition/index.ts';
import { PING_INTERVAL_MS } from './rooms/sockets/heartbeat.ts';
import { UncheckedAppCheck } from './identity/app-check-verifier.ts';
import { FirebaseAppCheckVerifier } from './identity/firebase-app-check-verifier.ts';
import { FirebaseTokenVerifier } from './identity/firebase-token-verifier.ts';
import { CloudLoggingLogger } from './telemetry/cloud-logging-logger.ts';
import { shutdownTelemetry } from './telemetry/register.ts';

const port = Number(process.env.PORT ?? 3000);
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not set');
const poolSize = Number(process.env.DB_POOL_SIZE ?? 5);
// The Firebase project of each environment is its Google Cloud project, where its traces live.
const logger = new CloudLoggingLogger({ projectId });

// With FIREBASE_AUTH_EMULATOR_HOST set, Firebase Admin trusts the tokens of the local emulator instead.
const firebase = initializeApp({ projectId });
const tokenVerifier = new FirebaseTokenVerifier(getAuth(firebase));
// The deployment of dev and prod asks for App Check; locally and in the e2e there is none.
const appCheckVerifier =
  process.env.APP_CHECK === 'required'
    ? new FirebaseAppCheckVerifier(getAppCheck(firebase))
    : new UncheckedAppCheck();

// DATABASE_URL locally and in CI; CLOUD_SQL_INSTANCE and DB_USER in Cloud Run.
const databaseConfig = databaseConfigFrom(process.env);
const database = await openDatabase<Database>(databaseConfig, {
  maxConnections: poolSize,
  logger,
});

// The origins the web is served from, separated by spaces; locally, those of Vite.
const webOrigins = (process.env.WEB_ORIGINS ?? 'http://localhost:5173 http://localhost:4173')
  .split(' ')
  .filter((origin) => origin.length > 0);

const server = await composeRealtimeServer({
  tokenVerifier,
  appCheckVerifier,
  pingIntervalMs: PING_INTERVAL_MS,
  logger,
  webOrigins,
  storage: {
    kind: 'postgres',
    db: database.db,
    openListenClient: () => openListenClient(databaseConfig),
    instanceId: randomUUID(),
    beatEveryMs: 30_000,
    silentAfterMs: 90_000,
  },
});

server.http.listen(port, () => {
  logger.info('listening', { port });
});

// Cloud Run sends SIGTERM and waits 10 s before it kills the instance; locally, Ctrl+C sends SIGINT.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    server
      .shutdown()
      .catch((error: unknown) => logger.error('leaving cleanly failed', error))
      .finally(() => {
        // Last, so the spans of leaving are sent too, even when closing the database failed.
        database
          .close()
          .catch((error: unknown) => logger.error('closing the database failed', error))
          .then(shutdownTelemetry)
          .finally(() => process.exit(0));
      });
  });
}
