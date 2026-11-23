import { describe, expect, it } from 'vitest';
import { NicknameReport, type NicknameReportSnapshot } from '../../entities/nickname-report.ts';
import { CommentTooLongError } from '../../errors/comment-too-long.error.ts';
import { InvalidEntryError } from '../../errors/invalid-entry.error.ts';

const REPORT: NicknameReportSnapshot = {
  id: 'TestReport',
  nickname: 'TestNickname',
  owner: 'TestOwner',
  reason: 'impersonation',
  comment: 'TestComment',
  identity: 'TestIdentity',
  reportedAt: new Date('2026-11-22T10:00:00Z'),
};

describe('NicknameReport', () => {
  it('should keep the nickname, who goes by it and who reports it', () => {
    // Act
    const report = NicknameReport.receive(REPORT);

    // Assert
    expect(report.toSnapshot()).toEqual(REPORT);
  });

  it('should not take a reason of dilemmas', () => {
    // Act & Assert
    expect(() =>
      NicknameReport.receive({
        ...REPORT,
        reason: 'confusing' as NicknameReportSnapshot['reason'],
      }),
    ).toThrow(InvalidEntryError);
  });

  it('should not take a comment longer than 280 characters', () => {
    // Act & Assert
    expect(() => NicknameReport.receive({ ...REPORT, comment: 'a'.repeat(281) })).toThrow(
      CommentTooLongError,
    );
  });
});
