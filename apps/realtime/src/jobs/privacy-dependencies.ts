import { PUBLISHED_VERSIONS } from '@thelever-app/consent';
import {
  type DatabaseClient,
  PostgresAcceptanceRepository,
  PostgresAnalyticsEventRepository,
  PostgresAnalyticsObjectionRepository,
  PostgresDataDeletionRepository,
  PostgresDilemmaLikes,
  PostgresFirstAccessRepository,
  PostgresGameRepository,
  PostgresIssueRepository,
  PostgresModerationNoticeRepository,
  PostgresPlayerNotifier,
  PostgresRoomRepository,
  PostgresWorldResultRepository,
} from '@thelever-app/db';
import type { PrivacyDependencies } from '../composition/privacy.ts';
import { RandomIdGenerator } from '../rooms/random-id-generator.ts';
import { SystemClock } from '../rooms/system-clock.ts';

/**
 * Every store of personal data in PostgreSQL, for a job. It serves no connection: the room
 * repository never saves one under its name, and what changes in a room reaches its players
 * through the other instances, as the notifier publishes it.
 */
export function privacyDependenciesIn(db: DatabaseClient, jobName: string): PrivacyDependencies {
  return {
    firstAccesses: new PostgresFirstAccessRepository(db),
    acceptances: new PostgresAcceptanceRepository(db),
    analyticsObjections: new PostgresAnalyticsObjectionRepository(db),
    analyticsEvents: new PostgresAnalyticsEventRepository(db),
    dataDeletions: new PostgresDataDeletionRepository(db),
    worldResults: new PostgresWorldResultRepository(db),
    likes: new PostgresDilemmaLikes(db),
    roomRepository: new PostgresRoomRepository(db, jobName),
    gameRepository: new PostgresGameRepository(db),
    issues: new PostgresIssueRepository(db),
    moderationNotices: new PostgresModerationNoticeRepository(db),
    notifier: new PostgresPlayerNotifier(db),
    idGenerator: new RandomIdGenerator(),
    clock: new SystemClock(),
    published: PUBLISHED_VERSIONS,
  };
}
