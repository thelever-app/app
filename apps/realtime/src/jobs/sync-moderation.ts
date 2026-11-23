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
import { WithdrawNicknameUseCase } from '@thelever-app/game';
import { RoomNicknamesForModeration } from '@thelever-app/integrations/moderation';
import {
  CONTACT_EMAIL,
  GetUndecidedIssuesUseCase,
  ReadDecisionUseCase,
  SendIssueEventUseCase,
} from '@thelever-app/moderation';
import { createTransport } from 'nodemailer';
import { catalogDilemmasForModeration } from '../composition/moderation.ts';
import { RandomIdGenerator } from '../rooms/random-id-generator.ts';
import { SystemClock } from '../rooms/system-clock.ts';
import { CloudLoggingLogger } from '../telemetry/cloud-logging-logger.ts';
import { AnthropicFactsTranslator } from './sync-moderation/anthropic-facts-translator.ts';
import { GitHubIssueTracker } from './sync-moderation/github-issue-tracker.ts';
import { SmtpMailer } from './sync-moderation/smtp-mailer.ts';
import { syncModeration } from './sync-moderation/sync.ts';

// The Cloud Run job sync-moderation, which Cloud Scheduler runs every 5 minutes: it takes the
// issues of the reports and notices to the private moderation repository, reads the decisions of
// the team there and applies them, and sends the emails of the notices. It runs with an account
// of its own: only it reads the token of GitHub, the password of the mailbox and the key of
// Anthropic, which the public room server never sees. It ends with an error if anything failed;
// the next run tries it again.

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
      nicknames: new RoomNicknamesForModeration(
        new WithdrawNicknameUseCase(rooms, new PostgresPlayerNotifier(db)),
      ),
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
  process.exitCode = 1;
} finally {
  await database.close();
}
