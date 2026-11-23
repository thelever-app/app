import { describe, expect, it } from 'vitest';
import { GetUndecidedIssuesUseCase } from '../../use-cases/get-undecided-issues.use-case.ts';
import {
  EraseModerationDataUseCase,
  ExportModerationDataUseCase,
  SendersWithEmailUseCase,
} from '../../use-cases/moderation-personal-data.use-case.ts';
import { ReadDecisionUseCase } from '../../use-cases/read-decision.use-case.ts';
import { ReceiveDilemmaReportUseCase } from '../../use-cases/receive-dilemma-report.use-case.ts';
import { ReceiveIllegalContentNoticeUseCase } from '../../use-cases/receive-illegal-content-notice.use-case.ts';
import { ReceiveNicknameReportUseCase } from '../../use-cases/receive-nickname-report.use-case.ts';
import { SendIssueEventUseCase } from '../../use-cases/send-issue-event.use-case.ts';
import { AT, moderationTestPorts } from '../moderation-test-ports.ts';

const REASONS = 'Hechos: TestFacts\nRegla: 4.2';

function setUp() {
  const ports = moderationTestPorts();
  const reportDilemma = new ReceiveDilemmaReportUseCase(ports);
  const reportNickname = new ReceiveNicknameReportUseCase(ports);
  const sendNotice = new ReceiveIllegalContentNoticeUseCase(ports);
  const send = new SendIssueEventUseCase(ports);
  const read = new ReadDecisionUseCase(ports);
  const undecided = new GetUndecidedIssuesUseCase(ports.issues);
  return {
    ...ports,
    exportData: new ExportModerationDataUseCase(ports),
    eraseData: new EraseModerationDataUseCase(ports),
    senders: new SendersWithEmailUseCase(ports.issues),
    reportDilemma: (identity: string) =>
      reportDilemma.execute({
        dilemmaId: 'TestDilemma',
        version: 3,
        reason: 'offensive',
        comment: 'TestComment',
        language: 'fr',
        identity,
        reportedAt: AT,
      }),
    reportNickname: (identity: string, owner = 'TestOwner') =>
      reportNickname.execute({
        nickname: 'TestNickname',
        owner,
        reason: 'impersonation',
        comment: 'TestNicknameComment',
        identity,
        reportedAt: AT,
      }),
    sendNotice: (identity: string) =>
      sendNotice.execute({
        reference: 'https://thelever.test/es/test/test-1',
        explanation: 'TestExplanation',
        name: 'TestName',
        email: 'Test@Example.com',
        language: 'es',
        goodFaith: true,
        identity,
      }),
    sync: async () => {
      while (await send.execute()) {
        // One more.
      }
      for (const id of await undecided.execute()) await read.execute(id);
      while (await send.execute()) {
        // One more.
      }
    },
  };
}

describe('EraseModerationDataUseCase', () => {
  it('should keep the reports of a player without them, still counting for the threshold', async () => {
    // Arrange: two players report, one deletes their data, a third reports.
    const { reportDilemma, eraseData, issues, dilemmas, sync } = setUp();
    await reportDilemma('Test1');
    await reportDilemma('Test2');
    await eraseData.execute('Test1');

    // Act
    await reportDilemma('Test3');
    await sync();

    // Assert
    const [issue] = issues.all();
    expect(
      issue?.dilemmaReports.map(({ identity, reason, comment }) => ({ identity, reason, comment })),
    ).toEqual([
      { identity: null, reason: 'offensive', comment: 'TestComment' },
      { identity: 'Test2', reason: 'offensive', comment: 'TestComment' },
      { identity: 'Test3', reason: 'offensive', comment: 'TestComment' },
    ]);
    expect(dilemmas.done).toEqual(['hide TestDilemma']);
  });

  it('should tell the decision only to the players who still have their data', async () => {
    // Arrange
    const { reportDilemma, eraseData, notices, tracker, sync } = setUp();
    await reportDilemma('Test1');
    await reportDilemma('Test2');
    await sync();
    await eraseData.execute('Test1');
    tracker.decide(1, { label: 'withdraw', comment: REASONS });

    // Act
    await sync();

    // Assert
    expect(await notices.allOf('Test1')).toEqual([]);
    expect(await notices.allOf('Test2')).toHaveLength(1);
  });

  it('should keep a reported nickname without its owner, and withdraw it from no room', async () => {
    // Arrange
    const { reportNickname, eraseData, issues, nicknames, notices, tracker, sync } = setUp();
    await reportNickname('Test1');
    await sync();
    await eraseData.execute('TestOwner');
    tracker.decide(1, { label: 'withdraw', comment: REASONS });

    // Act
    await sync();

    // Assert
    const [issue] = issues.all();
    expect(issue?.content).toEqual({ kind: 'nickname', nickname: 'TestNickname', owner: null });
    expect(issue?.nicknameReports[0]).toMatchObject({ owner: null, identity: 'Test1' });
    expect(issue?.decision?.outcome).toBe('withdrawn');
    expect(nicknames.withdrawn).toEqual([]);
    expect(await notices.allOf('TestOwner')).toEqual([]);
    expect(await notices.allOf('Test1')).toHaveLength(1);
  });

  it('should keep a notice without who sent it, nor their name or email, and write to nobody', async () => {
    // Arrange
    const { sendNotice, eraseData, issues, mailer, tracker, sync } = setUp();
    await sendNotice('TestNotifier');
    await eraseData.execute('TestNotifier');
    await sync();
    tracker.decide(1, { label: 'keep', comment: REASONS });

    // Act
    await sync();

    // Assert
    const [issue] = issues.all();
    expect(issue?.notices[0]).toMatchObject({
      reference: 'https://thelever.test/es/test/test-1',
      explanation: 'TestExplanation',
      identity: null,
      name: null,
      email: null,
    });
    expect(mailer.sent()).toEqual([]);
  });

  it('should delete the moderation notices of the identity', async () => {
    // Arrange
    const { reportDilemma, eraseData, notices, tracker, sync } = setUp();
    await reportDilemma('Test1');
    await sync();
    tracker.decide(1, { label: 'keep', comment: REASONS });
    await sync();

    // Act
    await eraseData.execute('Test1');

    // Assert
    expect(await notices.allOf('Test1')).toEqual([]);
  });
});

describe('ExportModerationDataUseCase', () => {
  it('should give what the player reported and sent, the decisions on their nickname and their notices', async () => {
    // Arrange
    const { reportDilemma, reportNickname, sendNotice, exportData, tracker, sync } = setUp();
    await reportDilemma('TestPlayer');
    await sendNotice('TestPlayer');
    await reportNickname('TestOther', 'TestPlayer');
    await sync();
    tracker.decide(2, { label: 'withdraw', comment: REASONS });
    await sync();

    // Act
    const data = await exportData.execute('TestPlayer');

    // Assert
    expect(data?.dilemmaReports).toEqual([
      {
        dilemmaId: 'TestDilemma',
        version: 3,
        reason: 'offensive',
        comment: 'TestComment',
        language: 'fr',
        reportedAt: AT.toISOString(),
      },
    ]);
    expect(data?.illegalContentNotices).toEqual([
      {
        reference: 'https://thelever.test/es/test/test-1',
        explanation: 'TestExplanation',
        name: 'TestName',
        email: 'Test@Example.com',
        language: 'es',
        sentAt: AT.toISOString(),
      },
    ]);
    expect(data?.reportsOfTheirNickname).toEqual([
      {
        nickname: 'TestNickname',
        openedAt: AT.toISOString(),
        decision: {
          outcome: 'withdrawn',
          rule: '4.2',
          facts: 'TestFacts',
          decidedAt: AT.toISOString(),
        },
      },
    ]);
    expect(JSON.stringify(data)).not.toContain('TestOther');
    expect(JSON.stringify(data)).not.toContain('TestNicknameComment');
    expect(data?.moderationNotices).toHaveLength(1);
  });

  it('should have nothing of who never reported nor was reported', async () => {
    // Arrange
    const { exportData } = setUp();

    // Act & Assert
    expect(await exportData.execute('TestPlayer')).toBeUndefined();
  });
});

describe('SendersWithEmailUseCase', () => {
  it('should find who sent notices with an email, however it is written', async () => {
    // Arrange
    const { sendNotice, senders } = setUp();
    await sendNotice('TestNotifier');

    // Act & Assert
    expect(await senders.execute(' test@example.COM ')).toEqual(['TestNotifier']);
    expect(await senders.execute('other@example.com')).toEqual([]);
  });
});
