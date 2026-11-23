import { describe, expect, it } from 'vitest';
import { DilemmaReport, type DilemmaReportSnapshot } from '../../entities/dilemma-report.ts';
import {
  IllegalContentNotice,
  type IllegalContentNoticeInput,
} from '../../entities/illegal-content-notice.ts';
import { Issue, REPORT_THRESHOLD } from '../../entities/issue.ts';
import { NicknameReport, type NicknameReportSnapshot } from '../../entities/nickname-report.ts';
import { ContentMismatchError } from '../../errors/content-mismatch.error.ts';
import { IssueAlreadyDecidedError } from '../../errors/issue-already-decided.error.ts';

const AT = new Date('2026-11-22T10:00:00Z');
const DILEMMA = { kind: 'dilemma', dilemmaId: 'TestDilemma' } as const;
const NICKNAME = { kind: 'nickname', nickname: 'TestNickname', owner: 'TestOwner' } as const;

function dilemmaReport(report: Partial<DilemmaReportSnapshot> = {}): DilemmaReport {
  return DilemmaReport.receive({
    id: 'TestReport',
    dilemmaId: 'TestDilemma',
    version: 1,
    reason: 'offensive',
    comment: null,
    language: 'es',
    identity: 'TestIdentity',
    reportedAt: AT,
    ...report,
  });
}

function nicknameReport(report: Partial<NicknameReportSnapshot> = {}): NicknameReport {
  return NicknameReport.receive({
    id: 'TestNicknameReport',
    nickname: 'TestNickname',
    owner: 'TestOwner',
    reason: 'offensive',
    comment: null,
    identity: 'TestIdentity',
    reportedAt: AT,
    ...report,
  });
}

function notice(input: Partial<IllegalContentNoticeInput> = {}): IllegalContentNotice {
  return IllegalContentNotice.receive({
    id: 'TestNotice',
    reference: 'TestReference',
    explanation: 'TestExplanation',
    name: null,
    email: null,
    language: 'es',
    identity: 'TestNotifier',
    sentAt: AT,
    goodFaith: true,
    ...input,
  });
}

const FACTS = {
  es: 'TestFacts',
  en: 'TestFacts',
  fr: 'TestFacts',
  de: 'TestFacts',
  it: 'TestFacts',
  pt: 'TestFacts',
  ca: 'TestFacts',
};
const DECISION = {
  outcome: 'withdrawn',
  facts: 'TestFacts',
  translatedFacts: FACTS,
  rule: '4.2',
  decidedAt: AT,
} as const;

describe('Issue', () => {
  it('should open with the first report of the content, not numbered yet', () => {
    // Act
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport(), AT);

    // Assert
    expect(issue.toSnapshot()).toMatchObject({
      id: 'TestIssue',
      content: DILEMMA,
      number: null,
      hidden: false,
      decision: null,
      openedAt: AT,
    });
    expect(issue.pullEvents()).toEqual([{ type: 'opened', entryId: 'TestReport' }]);
  });

  it('should take the later reports of the same content', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport(), AT);
    issue.pullEvents();

    // Act
    issue.receive(dilemmaReport({ id: 'TestReport2', identity: 'TestIdentity2' }));

    // Assert
    expect(issue.toSnapshot().dilemmaReports.map(({ id }) => id)).toEqual([
      'TestReport',
      'TestReport2',
    ]);
    expect(issue.pullEvents()).toEqual([{ type: 'received', entryId: 'TestReport2' }]);
  });

  it('should not take a report of another dilemma', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport(), AT);

    // Act & Assert
    expect(() => issue.receive(dilemmaReport({ id: 'TestOther', dilemmaId: 'TestOther' }))).toThrow(
      ContentMismatchError,
    );
  });

  it('should not take a report of a nickname on the issue of a dilemma', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport(), AT);

    // Act & Assert
    expect(() => issue.receive(nicknameReport())).toThrow(ContentMismatchError);
  });

  it('should take the reports of the same nickname of the same player only', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', NICKNAME, nicknameReport(), AT);

    // Act & Assert
    expect(() =>
      issue.receive(nicknameReport({ id: 'TestOther', owner: 'TestOtherOwner' })),
    ).toThrow(ContentMismatchError);
    expect(() =>
      issue.receive(nicknameReport({ id: 'TestOther2', identity: 'TestOther' })),
    ).not.toThrow();
  });

  it(`should be hidden by the reports of ${REPORT_THRESHOLD} different players`, () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport({ identity: 'Test1' }), AT);
    issue.receive(dilemmaReport({ id: 'TestReport2', identity: 'Test2' }));
    issue.pullEvents();

    // Act
    issue.receive(dilemmaReport({ id: 'TestReport3', identity: 'Test3' }));

    // Assert
    expect(issue.hidden).toBe(true);
    expect(issue.pullEvents()).toEqual([
      { type: 'received', entryId: 'TestReport3' },
      { type: 'hidden' },
    ]);
  });

  it('should count a player who reports twice once', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport({ identity: 'Test1' }), AT);
    issue.receive(dilemmaReport({ id: 'TestReport2', identity: 'Test2' }));

    // Act
    issue.receive(dilemmaReport({ id: 'TestReport3', identity: 'Test2' }));

    // Assert
    expect(issue.hidden).toBe(false);
  });

  it('should be hidden only once', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport({ identity: 'Test1' }), AT);
    for (const identity of ['Test2', 'Test3']) {
      issue.receive(dilemmaReport({ id: `TestReport-${identity}`, identity }));
    }
    issue.pullEvents();

    // Act
    issue.receive(dilemmaReport({ id: 'TestReport4', identity: 'Test4' }));

    // Assert
    expect(issue.pullEvents()).toEqual([{ type: 'received', entryId: 'TestReport4' }]);
  });

  it('should not count notices towards hiding a dilemma', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport({ identity: 'Test1' }), AT);
    issue.receive(dilemmaReport({ id: 'TestReport2', identity: 'Test2' }));

    // Act
    issue.receive(notice());

    // Assert
    expect(issue.hidden).toBe(false);
  });

  it('should never hide a nickname: the team decides on it', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', NICKNAME, nicknameReport({ identity: 'Test1' }), AT);

    // Act
    for (const identity of ['Test2', 'Test3']) {
      issue.receive(nicknameReport({ id: `TestReport-${identity}`, identity }));
    }

    // Assert
    expect(issue.hidden).toBe(false);
  });

  it('should ask for the acknowledgement of a notice with an email', () => {
    // Act
    const issue = Issue.openWith(
      'TestIssue',
      { kind: 'reference', reference: 'TestReference' },
      notice({ email: 'test@example.com' }),
      AT,
    );

    // Assert
    expect(issue.pullEvents()).toEqual([
      { type: 'opened', entryId: 'TestNotice' },
      { type: 'acknowledged', entryId: 'TestNotice' },
    ]);
  });

  it('should take a notice on the issue of the dilemma it points to', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport(), AT);

    // Act
    issue.receive(notice());

    // Assert
    expect(issue.toSnapshot().notices.map(({ id }) => id)).toEqual(['TestNotice']);
  });

  it('should keep the number the moderation repository gave it', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport(), AT);

    // Act
    issue.numbered(42);

    // Assert
    expect(issue.number).toBe(42);
  });

  it('should keep the decision of the team, and give who to tell', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport({ identity: 'Test1' }), AT);
    issue.receive(dilemmaReport({ id: 'TestReport2', identity: 'Test2' }));
    issue.receive(dilemmaReport({ id: 'TestReport3', identity: 'Test1' }));
    issue.receive(notice({ email: 'test@example.com' }));
    issue.pullEvents();

    // Act
    issue.decide(DECISION);

    // Assert
    expect(issue.toSnapshot().decision).toEqual(DECISION);
    expect(issue.reporters()).toEqual(['Test1', 'Test2']);
  });

  it('should send the decision to each notice with an email apart, so none gets it twice', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, notice({ email: 'test1@example.com' }), AT);
    issue.receive(notice({ id: 'TestNotice2' }));
    issue.receive(notice({ id: 'TestNotice3', email: 'test3@example.com' }));
    issue.pullEvents();

    // Act
    issue.decide(DECISION);

    // Assert
    expect(issue.pullEvents()).toEqual([
      { type: 'decided', entryId: 'TestNotice' },
      { type: 'decided', entryId: 'TestNotice3' },
    ]);
  });

  it('should take one report of a nickname from each player', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', NICKNAME, nicknameReport(), AT);
    issue.pullEvents();

    // Act
    issue.receive(nicknameReport({ id: 'TestNicknameReport2', reason: 'other' }));

    // Assert
    expect(issue.toSnapshot().nicknameReports.map(({ id }) => id)).toEqual(['TestNicknameReport']);
    expect(issue.pullEvents()).toEqual([]);
  });

  it('should not be decided twice', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport(), AT);
    issue.decide(DECISION);

    // Act & Assert
    expect(() => issue.decide({ ...DECISION, outcome: 'kept' })).toThrow(IssueAlreadyDecidedError);
  });

  it('should take nothing more once decided', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport(), AT);
    issue.decide(DECISION);

    // Act & Assert
    expect(() => issue.receive(dilemmaReport({ id: 'TestReport2' }))).toThrow(
      IssueAlreadyDecidedError,
    );
  });

  it('should give back the issue it was restored from, without events', () => {
    // Arrange
    const issue = Issue.openWith('TestIssue', DILEMMA, dilemmaReport(), AT);
    issue.receive(notice());
    issue.numbered(7);

    // Act
    const restored = Issue.fromSnapshot(issue.toSnapshot());

    // Assert
    expect(restored.toSnapshot()).toEqual(issue.toSnapshot());
    expect(restored.pullEvents()).toEqual([]);
  });
});
