import { ConsoleLogger } from '@thelever-app/db';
import { describe, expect, it } from 'vitest';
import { syncModeration } from '../../../jobs/sync-moderation/sync.ts';

function runner(events: number, failing: readonly string[] = []) {
  const done: string[] = [];
  let left = events;
  return {
    done,
    sync: {
      sendIssueEvent: {
        execute: async () => {
          if (left === 0) return false;
          left -= 1;
          done.push('sent');
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
    const { done, sync } = runner(2);

    // Act
    const result = await syncModeration(sync);

    // Assert
    expect(done).toEqual(['sent', 'sent', 'read TestIssue1', 'read TestIssue2']);
    expect(result).toEqual({ sent: 2, read: 2 });
  });

  it('should read the rest when one decision fails, and fail at the end', async () => {
    // Arrange
    const { done, sync } = runner(0, ['TestIssue1']);

    // Act & Assert
    await expect(syncModeration(sync)).rejects.toThrow('TestFailure TestIssue1');
    expect(done).toEqual(['read TestIssue2']);
  });
});
