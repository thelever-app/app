import {
  databaseConfigFrom,
  openDatabase,
  PostgresWorldResultRepository,
  type Database,
} from '@thelever-app/db';
import { PublishWorldResultsUseCase } from '@thelever-app/dilemmas';
import { CloudLoggingLogger } from '../telemetry/cloud-logging-logger.ts';

// The Cloud Run job publish-world-results, which Cloud Scheduler runs once a day: the world result
// of every dilemma the app shows is the one of that moment until the next day, so nobody can tell
// a vote from the next one by watching the counts. It ends with an error if publishing failed, so
// the alert of the job fires and the results of the day before stay.
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not set');
const logger = new CloudLoggingLogger({ projectId });

// DATABASE_URL locally; CLOUD_SQL_INSTANCE and DB_USER in Cloud Run, as for the room server. One
// connection, the one of close-rooms in the budget of deploy-environment.yml: its schedule never
// runs it at the same time.
const database = await openDatabase<Database>(databaseConfigFrom(process.env), {
  maxConnections: 1,
  logger,
});

try {
  await new PublishWorldResultsUseCase(new PostgresWorldResultRepository(database.db)).execute();
  logger.info('the world results were published', {});
} catch (error) {
  logger.error('publishing the world results failed', error);
  process.exitCode = 1;
} finally {
  await database.close();
}
