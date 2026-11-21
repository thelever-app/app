import { describe, expect, it } from 'vitest';
import { ReceiveDilemmaReportUseCase } from '@thelever-app/moderation';
import { InMemoryDilemmaReportRepository } from '@thelever-app/moderation/in-memory';
import { ModerationDilemmaReports } from '../moderation-dilemma-reports.ts';

const AT = new Date('2026-11-21T10:00:00Z');

describe('ModerationDilemmaReports', () => {
  it('should hand Moderation the report of a player, with when they made it', async () => {
    // Arrange
    const repository = new InMemoryDilemmaReportRepository();
    const reports = new ModerationDilemmaReports(
      new ReceiveDilemmaReportUseCase(repository, { generate: () => 'TestReport' }),
    );

    // Act
    await reports.report({
      dilemmaId: 'TestDilemma',
      version: 2,
      reason: 'mistranslated',
      comment: 'TestComment',
      identity: 'TestIdentity',
      at: AT,
    });

    // Assert
    const kept = await repository.reportsOf('TestDilemma');
    expect(kept.map((report) => report.toSnapshot())).toEqual([
      {
        id: 'TestReport',
        dilemmaId: 'TestDilemma',
        version: 2,
        reason: 'mistranslated',
        comment: 'TestComment',
        identity: 'TestIdentity',
        reportedAt: AT,
      },
    ]);
  });

  it.each(['offensive', 'confusing', 'mistranslated', 'other'] as const)(
    'should hand Moderation a report for the reason %s as that same reason',
    async (reason) => {
      // Arrange
      const repository = new InMemoryDilemmaReportRepository();
      const reports = new ModerationDilemmaReports(
        new ReceiveDilemmaReportUseCase(repository, { generate: () => 'TestReport' }),
      );

      // Act
      await reports.report({
        dilemmaId: 'TestDilemma',
        version: 1,
        reason,
        comment: null,
        identity: 'TestIdentity',
        at: AT,
      });

      // Assert
      const [kept] = await repository.reportsOf('TestDilemma');
      expect(kept?.toSnapshot().reason).toBe(reason);
    },
  );
});
