import { ConsoleLogger } from '@thelever-app/db';
import { SendingIssueEventFailedError } from '@thelever-app/moderation';
import { describe, expect, it } from 'vitest';
import { syncModeration } from '../../../jobs/sync-moderation/sync.ts';

/** `events`: the issue of each event of the outbox, in order; `failing`: what fails to send or read. */
function runner(events: readonly string[], failing: readonly string[] = []) {
  const done: string[] = [];
  const outbox = [...events];
  return {
    done,
    sync: {
      sendIssueEvent: {
        execute: async (skipping: ReadonlySet<string> = new Set()) => {
          const next = outbox.findIndex((issueId) => !skipping.has(issueId));
          if (next === -1) return false;
          const issueId = outbox[next]!;
          if (failing.includes(issueId)) {
            throw new SendingIssueEventFailedError(issueId, new Error(`TestFailure ${issueId}`));
          }
          outbox.splice(next, 1);
          done.push(`sent ${issueId}`);
          return true;
        },
      },
      getUndecidedIssues: { execute: async () => ['TestIssue1', 'TestIssue2'] },
      readDecision: {
        execute: async (issueId: string) => {
          if (failing.includes(issueId)) throw new Error(`TestFailure ${issueId}`);
          done.push(`read ${issueId}`);
        },
      },
      runCommand: async <T>(command: () => Promise<T>) => command(),
      logger: new ConsoleLogger(),
    },
  };
}

describe('syncModeration', () => {
  it('should send the outbox, then read every undecided issue', async () => {
    // Arrange
    const { done, sync } = runner(['TestIssue1', 'TestIssue2']);

    // Act
    const result = await syncModeration(sync);

    // Assert
    expect(done).toEqual([
      'sent TestIssue1',
      'sent TestIssue2',
      'read TestIssue1',
      'read TestIssue2',
    ]);
    expect(result).toEqual({ sent: 2, read: 2 });
  });

  it('should read the rest when one decision fails, and fail at the end', async () => {
    // Arrange
    const { done, sync } = runner([], ['TestIssue1']);

    // Act & Assert
    await expect(syncModeration(sync)).rejects.toThrow('TestFailure TestIssue1');
    expect(done).toEqual(['read TestIssue2']);
  });

  it('should send the events of the other issues when one of an issue fails, and fail at the end', async () => {
    // Arrange
    const { done, sync } = runner(['TestIssue3', 'TestIssue4', 'TestIssue3'], ['TestIssue3']);

    // Act & Assert
    await expect(syncModeration(sync)).rejects.toThrow(SendingIssueEventFailedError);
    expect(done).toEqual(['sent TestIssue4', 'read TestIssue1', 'read TestIssue2']);
  });
});
