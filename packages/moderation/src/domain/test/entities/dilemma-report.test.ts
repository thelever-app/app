import { describe, expect, it } from 'vitest';
import { DilemmaReport, type DilemmaReportSnapshot } from '../../entities/dilemma-report.ts';
import { CommentTooLongError } from '../../errors/comment-too-long.error.ts';
import { InvalidEntryError } from '../../errors/invalid-entry.error.ts';

const REPORT: DilemmaReportSnapshot = {
  id: 'TestReport',
  dilemmaId: 'TestDilemma',
  version: 2,
  reason: 'mistranslated',
  comment: 'TestComment',
  language: 'fr',
  identity: 'TestIdentity',
  reportedAt: new Date('2026-11-21T10:00:00Z'),
};

describe('DilemmaReport', () => {
  it('should keep what the player reported, and when', () => {
    // Act
    const report = DilemmaReport.receive(REPORT);

    // Assert
    expect(report.toSnapshot()).toEqual(REPORT);
  });

  it('should keep a report without a comment', () => {
    // Act
    const report = DilemmaReport.receive({ ...REPORT, comment: null });

    // Assert
    expect(report.toSnapshot().comment).toBeNull();
  });

  it('should take a comment of 280 characters', () => {
    // Act
    const report = DilemmaReport.receive({ ...REPORT, comment: 'a'.repeat(280) });

    // Assert
    expect(report.toSnapshot().comment).toHaveLength(280);
  });

  it('should not take a comment longer than 280 characters', () => {
    // Act & Assert
    expect(() => DilemmaReport.receive({ ...REPORT, comment: 'a'.repeat(281) })).toThrow(
      CommentTooLongError,
    );
  });

  it('should take a dilemma that may be illegal', () => {
    // Act
    const report = DilemmaReport.receive({ ...REPORT, reason: 'illegal' });

    // Assert
    expect(report.reason).toBe('illegal');
  });

  it('should not take a reason of nicknames', () => {
    // Act & Assert
    expect(() =>
      DilemmaReport.receive({
        ...REPORT,
        reason: 'impersonation' as DilemmaReportSnapshot['reason'],
      }),
    ).toThrow(InvalidEntryError);
  });

  it('should not take a language the app does not have', () => {
    // Act & Assert
    expect(() =>
      DilemmaReport.receive({ ...REPORT, language: 'ja' as DilemmaReportSnapshot['language'] }),
    ).toThrow(InvalidEntryError);
  });

  it('should give back the report it was restored from', () => {
    // Act
    const report = DilemmaReport.fromSnapshot(REPORT);

    // Assert
    expect(report.toSnapshot()).toEqual(REPORT);
  });
});
