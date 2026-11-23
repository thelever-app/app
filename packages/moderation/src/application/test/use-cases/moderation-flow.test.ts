import { describe, expect, it } from 'vitest';
import { ReceiveDilemmaReportUseCase } from '../../use-cases/receive-dilemma-report.use-case.ts';
import { ReceiveNicknameReportUseCase } from '../../use-cases/receive-nickname-report.use-case.ts';
import {
  MAXIMUM_NOTICES_PER_DAY,
  ReceiveIllegalContentNoticeUseCase,
} from '../../use-cases/receive-illegal-content-notice.use-case.ts';
import { SendIssueEventUseCase } from '../../use-cases/send-issue-event.use-case.ts';
import { ReadDecisionUseCase } from '../../use-cases/read-decision.use-case.ts';
import { GetUndecidedIssuesUseCase } from '../../use-cases/get-undecided-issues.use-case.ts';
import { GetModerationNoticesUseCase } from '../../use-cases/get-moderation-notices.use-case.ts';
import { SeeModerationNoticeUseCase } from '../../use-cases/see-moderation-notice.use-case.ts';
import { TooManyNoticesError } from '../../errors/too-many-notices.error.ts';
import { ModerationNoticeNotFoundError } from '../../errors/moderation-notice-not-found.error.ts';
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
    reportDilemma: (identity: string, change: object = {}) =>
      reportDilemma.execute({
        dilemmaId: 'TestDilemma',
        version: 3,
        reason: 'offensive',
        comment: 'TestComment',
        language: 'fr',
        identity,
        reportedAt: AT,
        ...change,
      }),
    reportNickname: (identity: string) =>
      reportNickname.execute({
        nickname: 'TestNickname',
        owner: 'TestOwner',
        reason: 'impersonation',
        comment: null,
        identity,
        reportedAt: AT,
      }),
    sendNotice: (change: object = {}) =>
      sendNotice.execute({
        reference: 'https://thelever.test/es/test/test-1',
        explanation: 'TestExplanation',
        name: null,
        email: 'test@example.com',
        language: 'es',
        goodFaith: true,
        identity: 'TestNotifier',
        ...change,
      }),
    /** The job: every event of the outbox, then every decision. */
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

describe('Moderation, from a report to the decision', () => {
  it('should open one issue in the repository with the dilemma and the reason, and nothing of who reported', async () => {
    // Arrange
    const { reportDilemma, sync, tracker } = setUp();
    await reportDilemma('TestIdentity');

    // Act
    await sync();

    // Assert
    const [issue, ...others] = tracker.issues();
    expect(others).toEqual([]);
    expect(issue?.body).toContain('TestDilemma');
    expect(issue?.body).toContain('TestText of the dilemma');
    expect(issue?.body).toContain('Ofensivo');
    expect(JSON.stringify(issue)).not.toContain('TestIdentity');
    expect(JSON.stringify(issue)).not.toContain('TestComment');
  });

  it('should put a later report of the same dilemma on the same issue', async () => {
    // Arrange
    const { reportDilemma, sync, tracker } = setUp();
    await reportDilemma('Test1');
    await sync();

    // Act
    await reportDilemma('Test2', { reason: 'confusing' });
    await sync();

    // Assert
    const issues = tracker.issues();
    expect(issues).toHaveLength(1);
    expect(issues[0]?.comments).toEqual([expect.stringContaining('Confuso')]);
  });

  it('should hide the dilemma with the third player and label its issue', async () => {
    // Arrange
    const { reportDilemma, sync, tracker, dilemmas } = setUp();

    // Act
    for (const identity of ['Test1', 'Test2', 'Test3']) await reportDilemma(identity);
    await sync();

    // Assert
    expect(dilemmas.done).toEqual(['hide TestDilemma']);
    expect(tracker.issues()[0]?.labels).toEqual(['hidden-by-reports']);
  });

  it('should send nothing twice', async () => {
    // Arrange
    const { reportDilemma, sync, tracker } = setUp();
    await reportDilemma('Test1');
    await sync();

    // Act
    await sync();

    // Assert
    expect(tracker.issues()).toHaveLength(1);
    expect(tracker.issues()[0]?.comments).toEqual([]);
  });

  it('should withdraw the dilemma the team withdraws, and tell each player who reported it', async () => {
    // Arrange
    const ports = setUp();
    const { reportDilemma, sync, tracker, dilemmas, notices } = ports;
    await reportDilemma('Test1');
    await reportDilemma('Test2', { reason: 'confusing' });
    await reportDilemma('Test1', { reason: 'other' });
    await sync();
    tracker.decide(1, { label: 'withdraw', comment: REASONS });

    // Act
    await sync();

    // Assert
    expect(dilemmas.done).toEqual(['withdraw TestDilemma']);
    const [notice] = await notices.unseenOf('Test1');
    expect(notice?.toSnapshot()).toMatchObject({
      subject: {
        kind: 'report',
        content: { kind: 'dilemma', text: 'TestText of the dilemma' },
        reason: 'offensive',
      },
      outcome: 'withdrawn',
      rule: '4.2',
    });
    expect(await notices.unseenOf('Test2')).toHaveLength(1);
  });

  it('should bring back a hidden dilemma the team keeps', async () => {
    // Arrange
    const { reportDilemma, sync, tracker, dilemmas } = setUp();
    for (const identity of ['Test1', 'Test2', 'Test3']) await reportDilemma(identity);
    await sync();
    tracker.decide(1, { label: 'restore', comment: REASONS });

    // Act
    await sync();

    // Assert
    expect(dilemmas.done).toEqual(['hide TestDilemma', 'restore TestDilemma']);
  });

  it('should open a new issue for a report after the decision', async () => {
    // Arrange
    const { reportDilemma, sync, tracker } = setUp();
    await reportDilemma('Test1');
    await sync();
    tracker.decide(1, { label: 'keep', comment: REASONS });
    await sync();

    // Act
    await reportDilemma('Test2');
    await sync();

    // Assert
    expect(tracker.issues()).toHaveLength(2);
  });

  it.each([
    { problem: 'no decision label', decision: { label: 'question', comment: REASONS } },
    { problem: 'no reasons', decision: { label: 'withdraw', comment: 'Fuera' } },
  ])('should open again an issue closed with $problem, and apply nothing', async ({ decision }) => {
    // Arrange
    const { reportDilemma, sync, tracker, dilemmas, notices } = setUp();
    await reportDilemma('Test1');
    await sync();
    tracker.decide(1, decision);

    // Act
    await sync();

    // Assert
    const [issue] = tracker.issues();
    expect(issue?.closed).toBe(false);
    expect(issue?.comments.at(-1)).toContain('Lo he vuelto a abrir');
    expect(dilemmas.done).toEqual([]);
    expect(await notices.unseenOf('Test1')).toEqual([]);
  });

  it('should leave an open issue alone', async () => {
    // Arrange
    const { reportDilemma, sync, tracker } = setUp();
    await reportDilemma('Test1');
    await sync();

    // Act
    await sync();

    // Assert
    expect(tracker.issues()[0]?.comments).toEqual([]);
  });

  it('should withdraw a nickname from the rooms and tell its player why, in every language', async () => {
    // Arrange
    const { reportNickname, sync, tracker, nicknames, notices } = setUp();
    await reportNickname('Test1');
    await sync();
    tracker.decide(1, { label: 'withdraw', comment: REASONS });

    // Act
    await sync();

    // Assert
    expect(tracker.issues()[0]?.body).toContain('TestNickname');
    expect(nicknames.withdrawn).toEqual(['TestOwner TestNickname']);
    const [notice] = await notices.unseenOf('TestOwner');
    expect(notice?.toSnapshot()).toMatchObject({
      subject: {
        kind: 'nickname',
        nickname: 'TestNickname',
        reason: 'impersonation',
        facts: { es: 'TestFacts', fr: '[fr] TestFacts' },
      },
      outcome: 'withdrawn',
    });
    expect(await notices.unseenOf('Test1')).toHaveLength(1);
  });

  it('should leave a kept nickname as it is, and tell only who reported it', async () => {
    // Arrange
    const { reportNickname, sync, tracker, nicknames, notices } = setUp();
    await reportNickname('Test1');
    await sync();
    tracker.decide(1, { label: 'keep', comment: REASONS });

    // Act
    await sync();

    // Assert
    expect(nicknames.withdrawn).toEqual([]);
    expect(await notices.unseenOf('TestOwner')).toEqual([]);
    expect(await notices.unseenOf('Test1')).toHaveLength(1);
  });

  it('should put a notice on the issue of the dilemma its link points to, and acknowledge it', async () => {
    // Arrange
    const { sendNotice, sync, tracker, mailer } = setUp();

    // Act
    await sendNotice();
    await sync();

    // Assert
    const [issue] = tracker.issues();
    expect(issue?.body).toContain('TestText of the dilemma');
    expect(issue?.body).toContain('Puede ser ilegal');
    expect(JSON.stringify(issue)).not.toContain('test@example.com');
    expect(JSON.stringify(issue)).not.toContain('TestExplanation');
    expect(mailer.sent()).toEqual([
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Hemos recibido tu denuncia n.º 1',
      }),
    ]);
  });

  it('should email the decision to whoever sent a notice with an email', async () => {
    // Arrange
    const { sendNotice, sync, tracker, mailer } = setUp();
    await sendNotice({ email: 'test@example.com', language: 'en' });
    await sync();
    tracker.decide(1, { label: 'withdraw', comment: REASONS });

    // Act
    await sync();

    // Assert
    const decision = mailer.sent()[1];
    expect(decision?.subject).toBe('Decision on your notice no. 1');
    expect(decision?.text).toContain('we have withdrawn it.');
    expect(decision?.text).toContain('[en] TestFacts');
    expect(decision?.text).toContain('section 4.2 of the terms of use.');
    expect(decision?.text).toContain('privacidad@thelever.app');
  });

  it('should send no email to whoever left none', async () => {
    // Arrange
    const { sendNotice, sync, tracker, mailer } = setUp();
    await sendNotice({ email: null });
    await sync();
    tracker.decide(1, { label: 'keep', comment: REASONS });

    // Act
    await sync();

    // Assert
    expect(mailer.sent()).toEqual([]);
  });

  it('should open an issue of its own for a notice that names no dilemma', async () => {
    // Arrange
    const { sendNotice, sync, tracker } = setUp();

    // Act
    await sendNotice({ reference: 'Sala ABCD, apodo TestNickname' });
    await sendNotice({ reference: 'Sala ABCD, apodo TestNickname' });
    await sync();

    // Assert
    expect(tracker.issues().map(({ body }) => body)).toEqual([
      expect.stringContaining('Sala ABCD, apodo TestNickname'),
      expect.stringContaining('Sala ABCD, apodo TestNickname'),
    ]);
  });

  it(`should take no more than ${MAXIMUM_NOTICES_PER_DAY} notices a day from one identity`, async () => {
    // Arrange
    const { sendNotice } = setUp();
    for (let sent = 0; sent < MAXIMUM_NOTICES_PER_DAY; sent++) await sendNotice();

    // Act & Assert
    await expect(sendNotice()).rejects.toThrow(TooManyNoticesError);
  });

  it('should take notices again the day after', async () => {
    // Arrange
    const { sendNotice, clock } = setUp();
    for (let sent = 0; sent < MAXIMUM_NOTICES_PER_DAY; sent++) await sendNotice();
    clock.set(new Date(AT.getTime() + 24 * 60 * 60 * 1000 + 1));

    // Act & Assert
    await expect(sendNotice()).resolves.toBeUndefined();
  });
});

describe('Moderation notices', () => {
  async function decided() {
    const ports = setUp();
    await ports.reportDilemma('Test1');
    await ports.sync();
    ports.tracker.decide(1, { label: 'withdraw', comment: REASONS });
    await ports.sync();
    return {
      ...ports,
      get: new GetModerationNoticesUseCase(ports.notices),
      see: new SeeModerationNoticeUseCase(ports.notices, ports.clock),
    };
  }

  it('should give a player their notices until they see them', async () => {
    // Arrange
    const { get, see } = await decided();
    const [notice] = await get.execute('Test1');

    // Act
    await see.execute({ identity: 'Test1', noticeId: notice!.id });

    // Assert
    expect(await get.execute('Test1')).toEqual([]);
  });

  it('should not let a player see the notice of another', async () => {
    // Arrange
    const { get, see } = await decided();
    const [notice] = await get.execute('Test1');

    // Act & Assert
    await expect(see.execute({ identity: 'Test2', noticeId: notice!.id })).rejects.toThrow(
      ModerationNoticeNotFoundError,
    );
  });
});
