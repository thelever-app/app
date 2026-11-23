import { type Database, databaseConfigFrom, inTransaction, openDatabase } from '@thelever-app/db';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { personalDataUseCases } from '../composition/privacy.ts';
import { FirebaseAuthUsers } from '../identity/firebase-auth-users.ts';
import { CloudLoggingLogger } from '../telemetry/cloud-logging-logger.ts';
import { erasePersonalData } from './erase-personal-data/erase.ts';
import { privacyDependenciesIn } from './privacy-dependencies.ts';

// What the job sync-moderation does every 5 minutes after the moderation, run on its own: every
// pending deletion of the deletion log or, with `--again`, every deletion of the log, which is how
// it is run by hand after a backup of the database is restored, so nothing deleted comes back:
//
//   gcloud run jobs execute data-request --region europe-southwest1 --wait \
//     --args=apps/realtime/src/jobs/erase-personal-data.ts,--again
//
// It runs in the job data-request, with the account of moderation, which may delete users of
// Firebase Auth. It ends with an error if any deletion failed.

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not set');
const logger = new CloudLoggingLogger({ projectId });

// One connection: it does one thing after the other. It counts in the budget of connections of
// deploy-environment.yml.
const database = await openDatabase<Database>(databaseConfigFrom(process.env), {
  maxConnections: 1,
  logger,
});
const db = database.db;

try {
  const { deletionsToErase, erasePersonalData: erase } = personalDataUseCases(
    privacyDependenciesIn(db, 'erase-personal-data'),
    new FirebaseAuthUsers(getAuth(initializeApp({ projectId }))),
  );
  await erasePersonalData(
    {
      deletionsToErase,
      erasePersonalData: erase,
      runCommand: (command) => inTransaction(db, command),
      logger,
    },
    { again: process.argv.includes('--again') },
  );
} catch (error) {
  logger.error('erasing personal data failed', error);
  process.exitCode = 1;
} finally {
  await database.close();
}
