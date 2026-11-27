import Anthropic from '@anthropic-ai/sdk';
import {
  type Database,
  databaseConfigFrom,
  inTransaction,
  openDatabase,
  PostgresDilemmaRepository,
  PostgresIssueRepository,
  PostgresModerationNoticeRepository,
  PostgresOutbox,
  PostgresPlayerNotifier,
  PostgresRoomRepository,
} from '@thelever-app/db';
import {
  CONTACT_EMAIL,
  GetUndecidedIssuesUseCase,
  ReadDecisionUseCase,
  SendIssueEventUseCase,
} from '@thelever-app/moderation';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createTransport } from 'nodemailer';
import {
  catalogDilemmasForModeration,
  roomNicknamesForModeration,
} from '../composition/moderation.ts';
import { RandomIdGenerator } from '../rooms/random-id-generator.ts';
import { SystemClock } from '../rooms/system-clock.ts';
import { CloudLoggingLogger } from '../telemetry/cloud-logging-logger.ts';
import { AnthropicFactsTranslator } from './sync-moderation/anthropic-facts-translator.ts';
import { GitHubIssueTracker } from './sync-moderation/github-issue-tracker.ts';
import { personalDataUseCases } from '../composition/privacy.ts';
import { SmtpMailer } from '../email/smtp-mailer.ts';
import { FirebaseAuthUsers } from '../identity/firebase-auth-users.ts';
import { erasePersonalData } from './erase-personal-data/erase.ts';
import { privacyDependenciesIn } from './privacy-dependencies.ts';
import { syncModeration } from './sync-moderation/sync.ts';

// The Cloud Run job sync-moderation, which Cloud Scheduler runs every hour: it takes the issues of
// the reports and notices to the private moderation repository, reads the decisions of the team
// there and applies them, and sends the emails of the notices. Then it deletes what the pending
// deletions of the deletion log ask for, in every personal data store and in Firebase Auth, within
// hours of the request and well inside the month the law gives: one job and one schedule for both,
// so no other runs every day. It runs with an account of its own: only it reads the token of
// GitHub, the password of the mailbox and the key of Anthropic, and may delete users of Firebase
// Auth, which the public room server never can. It ends with an error if anything failed; the next
// run tries it again.

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const projectId = required('FIREBASE_PROJECT_ID');
const logger = new CloudLoggingLogger({ projectId });

// One connection: it does one thing after the other. It counts in the budget of connections of
// deploy-environment.yml.
const database = await openDatabase<Database>(databaseConfigFrom(process.env), {
  maxConnections: 1,
  logger,
});
const db = database.db;

let failed = false;
try {
  const issues = new PostgresIssueRepository(db);
  const outbox = new PostgresOutbox(db);
  const dilemmas = catalogDilemmasForModeration(new PostgresDilemmaRepository(db));
  const tracker = new GitHubIssueTracker({
    repository: required('MODERATION_REPOSITORY'),
    token: required('GITHUB_TOKEN'),
    ...(process.env.MODERATION_ENVIRONMENT && {
      environment: process.env.MODERATION_ENVIRONMENT,
    }),
  });
  const mailer = new SmtpMailer(
    createTransport({
      host: required('SMTP_HOST'),
      port: 465,
      secure: true,
      auth: { user: required('SMTP_USER'), pass: required('SMTP_PASSWORD') },
    }),
    { from: `TheLever <${required('SMTP_USER')}>`, replyTo: CONTACT_EMAIL },
  );
  // The job serves no connection: the repository never saves one under this name.
  const rooms = new PostgresRoomRepository(db, 'sync-moderation');
  await syncModeration({
    sendIssueEvent: new SendIssueEventUseCase({ issues, outbox, tracker, mailer, dilemmas }),
    getUndecidedIssues: new GetUndecidedIssuesUseCase(issues),
    readDecision: new ReadDecisionUseCase({
      issues,
      outbox,
      tracker,
      dilemmas,
      nicknames: roomNicknamesForModeration(rooms, new PostgresPlayerNotifier(db)),
      notices: new PostgresModerationNoticeRepository(db),
      translator: new AnthropicFactsTranslator(
        new Anthropic({ apiKey: required('ANTHROPIC_API_KEY') }).messages,
      ),
      idGenerator: new RandomIdGenerator(),
      clock: new SystemClock(),
    }),
    runCommand: (command) => inTransaction(db, command),
    logger,
  });
} catch (error) {
  logger.error('syncing moderation failed', error);
  failed = true;
}

// Whatever happened to moderation, the deletions go on.
try {
  const { deletionsToErase, erasePersonalData: erase } = personalDataUseCases(
    privacyDependenciesIn(db, 'sync-moderation'),
    new FirebaseAuthUsers(getAuth(initializeApp({ projectId }))),
  );
  await erasePersonalData(
    {
      deletionsToErase,
      erasePersonalData: erase,
      runCommand: (command) => inTransaction(db, command),
      logger,
    },
    { again: false },
  );
} catch (error) {
  logger.error('erasing personal data failed', error);
  failed = true;
} finally {
  await database.close();
}
if (failed) process.exitCode = 1;
