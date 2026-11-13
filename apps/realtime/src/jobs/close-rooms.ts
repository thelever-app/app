import {
  type Database,
  databaseConfigFrom,
  openDatabase,
  inTransaction,
  PostgresGameRepository,
  PostgresInstances,
  PostgresPlayerNotifier,
  PostgresRoomRepository,
} from '@thelever-app/db';
import { DeleteClosedRoomsUseCase, DisconnectConnectionsUseCase } from '@thelever-app/game';
import { SILENT_AFTER_MS } from '../rooms/silent-instances.ts';
import { SystemClock } from '../rooms/system-clock.ts';
import { CloudLoggingLogger } from '../telemetry/cloud-logging-logger.ts';
import { sweepRooms } from './sweep-rooms.ts';

// The Cloud Run job close-rooms, which Cloud Scheduler runs every hour: no closed room lasts more
// than an hour and a quarter. It ends with an error if a room could not be deleted, so the next
// run tries again and the alert of the job fires.
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not set');
const logger = new CloudLoggingLogger({ projectId });

// DATABASE_URL locally; CLOUD_SQL_INSTANCE and DB_USER in Cloud Run, as for the room server.
const database = await openDatabase<Database>(databaseConfigFrom(process.env), {
  maxConnections: 2,
  logger,
});
const db = database.db;
// The job serves no connection: the repository never saves one under this name.
const rooms = new PostgresRoomRepository(db, 'close-rooms');

try {
  await sweepRooms({
    instances: new PostgresInstances(db),
    disconnectConnections: new DisconnectConnectionsUseCase(rooms, new PostgresPlayerNotifier(db)),
    runCommand: (command) => inTransaction(db, command),
    deleteClosedRooms: new DeleteClosedRoomsUseCase(
      rooms,
      new PostgresGameRepository(db),
      new SystemClock(),
    ),
    silentAfterMs: SILENT_AFTER_MS,
    logger,
  });
} catch (error) {
  logger.error('closing the rooms failed', error);
  process.exitCode = 1;
} finally {
  await database.close();
}
