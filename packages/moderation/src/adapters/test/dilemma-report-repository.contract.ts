import { describe, expect, it } from 'vitest';
import type { DilemmaReportRepository } from '../../application/ports/dilemma-report-repository.port.ts';
import { DilemmaReport, type DilemmaReportSnapshot } from '../../domain/entities/dilemma-report.ts';

/** A version of a dilemma that can be reported: in PostgreSQL, one that exists. */
export interface ReportableDilemma {
  readonly dilemmaId: string;
  readonly version: number;
}

/** The repository to test and two dilemmas it can keep reports of. */
export interface DilemmaReportRepositorySubject {
  readonly repository: DilemmaReportRepository;
  readonly dilemmas: readonly [ReportableDilemma, ReportableDilemma];
}

const REPORTED_AT = new Date('2026-11-21T10:00:00.123Z');

function reportOf(
  { dilemmaId, version }: ReportableDilemma,
  report: Partial<DilemmaReportSnapshot> = {},
): DilemmaReport {
  return DilemmaReport.receive({
    id: 'TestReport',
    dilemmaId,
    version,
    reason: 'offensive',
    comment: 'TestComment',
    identity: 'TestIdentity',
    reportedAt: REPORTED_AT,
    ...report,
  });
}

/** What every DilemmaReportRepository must do, in memory or in PostgreSQL (ADR 0002). */
export function describeDilemmaReportRepositoryContract(
  name: string,
  create: () => Promise<DilemmaReportRepositorySubject>,
): void {
  describe(`${name} (DilemmaReportRepository contract)`, () => {
    it('should give no report of a dilemma nobody reported', async () => {
      // Arrange
      const {
        repository,
        dilemmas: [dilemma],
      } = await create();

      // Act
      const reports = await repository.reportsOf(dilemma.dilemmaId);

      // Assert
      expect(reports).toEqual([]);
    });

    it('should give back a report as it was saved', async () => {
      // Arrange
      const {
        repository,
        dilemmas: [dilemma],
      } = await create();
      const report = reportOf(dilemma, { reason: 'mistranslated' });

      // Act
      await repository.save(report);

      // Assert
      const reports = await repository.reportsOf(dilemma.dilemmaId);
      expect(reports.map((saved) => saved.toSnapshot())).toEqual([report.toSnapshot()]);
    });

    it('should keep a report without a comment', async () => {
      // Arrange
      const {
        repository,
        dilemmas: [dilemma],
      } = await create();

      // Act
      await repository.save(reportOf(dilemma, { comment: null }));

      // Assert
      const [saved] = await repository.reportsOf(dilemma.dilemmaId);
      expect(saved?.toSnapshot().comment).toBeNull();
    });

    it('should keep every report of the same player, the oldest first', async () => {
      // Arrange
      const {
        repository,
        dilemmas: [dilemma],
      } = await create();
      const later = new Date('2026-11-21T11:00:00.456Z');

      // Act
      await repository.save(reportOf(dilemma, { id: 'TestReport2', reportedAt: later }));
      await repository.save(reportOf(dilemma, { id: 'TestReport1' }));

      // Assert
      const reports = await repository.reportsOf(dilemma.dilemmaId);
      expect(reports.map((saved) => saved.id)).toEqual(['TestReport1', 'TestReport2']);
    });

    it('should keep the reports of each dilemma apart', async () => {
      // Arrange
      const {
        repository,
        dilemmas: [reported, other],
      } = await create();
      await repository.save(reportOf(reported));

      // Act
      const reports = await repository.reportsOf(other.dilemmaId);

      // Assert
      expect(reports).toEqual([]);
    });
  });
}
