import type { Logger } from '@thelever-app/db';
import type {
  GetUndecidedIssuesUseCase,
  ReadDecisionUseCase,
  SendIssueEventUseCase,
} from '@thelever-app/moderation';

/** What a run of the job needs. */
export interface ModerationSync {
  readonly sendIssueEvent: Pick<SendIssueEventUseCase, 'execute'>;
  readonly getUndecidedIssues: Pick<GetUndecidedIssuesUseCase, 'execute'>;
  readonly readDecision: Pick<ReadDecisionUseCase, 'execute'>;
  /** Each event and each decision in a transaction of its own. */
  readonly runCommand: <T>(command: () => Promise<T>) => Promise<T>;
  readonly logger: Logger;
}

/**
 * One run of the job: the outbox first, so every issue is in the repository with all it has to
 * say; then the decision of each undecided issue, and the outbox again, for the emails of the
 * decisions. A decision that fails is logged and the rest go on: the run fails at the end, so the
 * next one tries it again and the alert of the job fires. An event that fails stops the outbox
 * there, since the next ones may need it.
 */
export async function syncModeration({
  sendIssueEvent,
  getUndecidedIssues,
  readDecision,
  runCommand,
  logger,
}: ModerationSync): Promise<{ readonly sent: number; readonly read: number }> {
  let sent = 0;
  const sendAll = async () => {
    while (await runCommand(() => sendIssueEvent.execute())) sent += 1;
  };
  await sendAll();
  let failed: unknown;
  const issueIds = await getUndecidedIssues.execute();
  for (const issueId of issueIds) {
    try {
      await runCommand(() => readDecision.execute(issueId));
    } catch (error) {
      logger.error('reading the decision on an issue failed', error, { issueId });
      failed ??= error;
    }
  }
  await sendAll();
  logger.info('moderation synced', { sent, read: issueIds.length });
  if (failed !== undefined) throw failed;
  return { sent, read: issueIds.length };
}
