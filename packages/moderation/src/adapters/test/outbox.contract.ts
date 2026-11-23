import { describe, expect, it } from 'vitest';
import type { Outbox } from '../../application/ports/outbox.port.ts';

/** The outbox to test and two issues it can keep events of: in PostgreSQL, ones that exist. */
export interface OutboxSubject {
  readonly outbox: Outbox;
  readonly issueIds: readonly [string, string];
}

/** What every Outbox must do, in memory or in PostgreSQL (ADR 0002). */
export function describeOutboxContract(name: string, create: () => Promise<OutboxSubject>): void {
  describe(`${name} (Outbox contract)`, () => {
    it('should give nothing pending at first', async () => {
      // Arrange
      const { outbox } = await create();

      // Act & Assert
      expect(await outbox.pending()).toEqual([]);
    });

    it('should give the events in the order they were added, of every issue', async () => {
      // Arrange
      const {
        outbox,
        issueIds: [first, second],
      } = await create();
      await outbox.add(first, [{ type: 'opened', entryId: 'TestReport' }]);
      await outbox.add(second, [
        { type: 'opened', entryId: 'TestNotice' },
        { type: 'acknowledged', entryId: 'TestNotice' },
      ]);
      await outbox.add(first, [{ type: 'hidden' }]);

      // Act
      const pending = await outbox.pending();

      // Assert
      expect(pending.map(({ issueId, event }) => ({ issueId, event }))).toEqual([
        { issueId: first, event: { type: 'opened', entryId: 'TestReport' } },
        { issueId: second, event: { type: 'opened', entryId: 'TestNotice' } },
        { issueId: second, event: { type: 'acknowledged', entryId: 'TestNotice' } },
        { issueId: first, event: { type: 'hidden' } },
      ]);
    });

    it('should not give again an event that was sent', async () => {
      // Arrange
      const {
        outbox,
        issueIds: [issueId],
      } = await create();
      await outbox.add(issueId, [
        { type: 'opened', entryId: 'TestReport' },
        { type: 'decided', entryId: 'TestNotice' },
      ]);
      const [sent] = await outbox.pending();

      // Act
      await outbox.sent(sent!.id);

      // Assert
      expect((await outbox.pending()).map(({ event }) => event)).toEqual([
        { type: 'decided', entryId: 'TestNotice' },
      ]);
    });
  });
}
