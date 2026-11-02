import { randomUUID } from 'node:crypto';
import {
  type Database,
  databaseConfigFrom,
  openDatabase,
  openListenClient,
} from '@thelever-app/db';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { composeRealtimeServer } from './composition.ts';
import { FirebaseTokenVerifier } from './identity/firebase-token-verifier.ts';

const port = Number(process.env.PORT ?? 3000);
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not set');
const poolSize = Number(process.env.DB_POOL_SIZE ?? 5);

// With FIREBASE_AUTH_EMULATOR_HOST set, Firebase Admin trusts the tokens of the local emulator instead.
const firebase = initializeApp({ projectId });
const tokenVerifier = new FirebaseTokenVerifier(getAuth(firebase));

// DATABASE_URL locally and in CI; CLOUD_SQL_INSTANCE and DB_USER in Cloud Run.
const databaseConfig = databaseConfigFrom(process.env);
const database = await openDatabase<Database>(databaseConfig, { maxConnections: poolSize });

const server = await composeRealtimeServer({
  tokenVerifier,
  pingIntervalMs: 30_000,
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
  console.log(`realtime listening on http://localhost:${port}`);
});

// Cloud Run sends SIGTERM and waits 10 s before it kills the instance; locally, Ctrl+C sends SIGINT.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    server
      .shutdown()
      .catch(console.error)
      .finally(() => {
        database.close().finally(() => process.exit(0));
      });
  });
}
