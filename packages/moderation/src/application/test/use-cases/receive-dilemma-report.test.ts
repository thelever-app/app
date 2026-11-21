import { describe, expect, it } from 'vitest';
import { InMemoryDilemmaReportRepository } from '../../../adapters/in-memory/in-memory-dilemma-report-repository.ts';
import { ReceiveDilemmaReportUseCase } from '../../use-cases/receive-dilemma-report.use-case.ts';

const REPORTED_AT = new Date('2026-11-21T10:00:00Z');

function setUp() {
  const repository = new InMemoryDilemmaReportRepository();
  let next = 1;
  const idGenerator = { generate: () => `TestReport${next++}` };
  return { repository, receive: new ReceiveDilemmaReportUseCase(repository, idGenerator) };
}

describe('ReceiveDilemmaReportUseCase', () => {
  it('should keep the report with an id of its own', async () => {
    // Arrange
    const { repository, receive } = setUp();

    // Act
    await receive.execute({
      dilemmaId: 'TestDilemma',
      version: 1,
      reason: 'offensive',
      comment: 'TestComment',
      identity: 'TestIdentity',
      reportedAt: REPORTED_AT,
    });

    // Assert
    const reports = await repository.reportsOf('TestDilemma');
    expect(reports.map((report) => report.toSnapshot())).toEqual([
      {
        id: 'TestReport1',
        dilemmaId: 'TestDilemma',
        version: 1,
        reason: 'offensive',
        comment: 'TestComment',
        identity: 'TestIdentity',
        reportedAt: REPORTED_AT,
      },
    ]);
  });

  it('should keep every report of the same player, each with its own id', async () => {
    // Arrange
    const { repository, receive } = setUp();
    const report = {
      dilemmaId: 'TestDilemma',
      version: 1,
      reason: 'confusing',
      comment: null,
      identity: 'TestIdentity',
      reportedAt: REPORTED_AT,
    } as const;
    await receive.execute(report);

    // Act
    await receive.execute({ ...report, reportedAt: new Date('2026-11-21T11:00:00Z') });

    // Assert
    const reports = await repository.reportsOf('TestDilemma');
    expect(reports.map((saved) => saved.id)).toEqual(['TestReport1', 'TestReport2']);
  });
});
