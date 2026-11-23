import { describe, expect, it } from 'vitest';
import type { IssueRepository } from '../../application/ports/issue-repository.port.ts';
import { DilemmaReport } from '../../domain/entities/dilemma-report.ts';
import { IllegalContentNotice } from '../../domain/entities/illegal-content-notice.ts';
import { Issue } from '../../domain/entities/issue.ts';
import { NicknameReport } from '../../domain/entities/nickname-report.ts';

/** A version of a dilemma that can be reported: in PostgreSQL, one that exists. */
export interface ReportableDilemma {
  readonly dilemmaId: string;
  readonly version: number;
}

/** The repository to test and two dilemmas it can keep reports of. */
export interface IssueRepositorySubject {
  readonly repository: IssueRepository;
  readonly dilemmas: readonly [ReportableDilemma, ReportableDilemma];
}

const AT = new Date('2026-11-22T10:00:00.123Z');
const FACTS = {
  es: 'TestFacts',
  en: 'TestFacts en',
  fr: 'TestFacts fr',
  de: 'TestFacts de',
  it: 'TestFacts it',
  pt: 'TestFacts pt',
  ca: 'TestFacts ca',
};

function report({ dilemmaId, version }: ReportableDilemma, id: string, identity = 'TestIdentity') {
  return DilemmaReport.receive({
    id,
    dilemmaId,
    version,
    reason: 'mistranslated',
    comment: 'TestComment',
    language: 'fr',
    identity,
    reportedAt: AT,
  });
}

function nicknameReport(id: string, owner = 'TestOwner') {
  return NicknameReport.receive({
    id,
    nickname: 'TestNickname',
    owner,
    reason: 'impersonation',
    comment: null,
    identity: 'TestIdentity',
    reportedAt: AT,
  });
}

function notice(id: string, sentAt = AT, identity = 'TestNotifier') {
  return IllegalContentNotice.receive({
    id,
    reference: 'TestReference',
    explanation: 'TestExplanation',
    name: 'TestName',
    email: 'test@example.com',
    language: 'de',
    identity,
    sentAt,
    goodFaith: true,
  });
}

/** What every IssueRepository must do, in memory or in PostgreSQL (ADR 0002). */
export function describeIssueRepositoryContract(
  name: string,
  create: () => Promise<IssueRepositorySubject>,
): void {
  describe(`${name} (IssueRepository contract)`, () => {
    it('should give back an issue as it was saved, with its reports and notices', async () => {
      // Arrange
      const {
        repository,
        dilemmas: [dilemma],
      } = await create();
      const issue = Issue.openWith(
        'TestIssue',
        { kind: 'dilemma', dilemmaId: dilemma.dilemmaId },
        report(dilemma, 'TestReport1'),
        AT,
      );
      issue.receive(report(dilemma, 'TestReport2', 'TestIdentity2'));
      issue.receive(notice('TestNotice'));
      issue.numbered(12);

      // Act
      await repository.save(issue);

      // Assert
      expect((await repository.findById('TestIssue'))?.toSnapshot()).toEqual(issue.toSnapshot());
    });

    it('should keep what changed when it is saved again', async () => {
      // Arrange
      const { repository } = await create();
      const issue = Issue.openWith(
        'TestIssue',
        { kind: 'nickname', nickname: 'TestNickname', owner: 'TestOwner' },
        nicknameReport('TestReport1'),
        AT,
      );
      await repository.save(issue);
      issue.receive(nicknameReport('TestReport2'));
      issue.numbered(3);
      issue.decide({
        outcome: 'withdrawn',
        facts: 'TestFacts',
        translatedFacts: FACTS,
        rule: '4.2',
        decidedAt: AT,
      });

      // Act
      await repository.save(issue);

      // Assert
      expect((await repository.findById('TestIssue'))?.toSnapshot()).toEqual(issue.toSnapshot());
    });

    it('should keep an issue of a reference', async () => {
      // Arrange
      const { repository } = await create();
      const issue = Issue.openWith(
        'TestIssue',
        { kind: 'reference', reference: 'TestReference' },
        notice('TestNotice'),
        AT,
      );

      // Act
      await repository.save(issue);

      // Assert
      expect((await repository.findById('TestIssue'))?.toSnapshot()).toEqual(issue.toSnapshot());
    });

    it('should give no issue that is not kept', async () => {
      // Arrange
      const { repository } = await create();

      // Act & Assert
      expect(await repository.findById('TestMissing')).toBeUndefined();
    });

    it('should find the undecided issue of a dilemma, and only of that one', async () => {
      // Arrange
      const {
        repository,
        dilemmas: [dilemma, other],
      } = await create();
      await repository.save(
        Issue.openWith(
          'TestIssue',
          { kind: 'dilemma', dilemmaId: dilemma.dilemmaId },
          report(dilemma, 'TestReport'),
          AT,
        ),
      );

      // Act & Assert
      expect(
        (await repository.undecidedOf({ kind: 'dilemma', dilemmaId: dilemma.dilemmaId }))?.id,
      ).toBe('TestIssue');
      expect(
        await repository.undecidedOf({ kind: 'dilemma', dilemmaId: other.dilemmaId }),
      ).toBeUndefined();
    });

    it('should find the undecided issue of the nickname of that player only', async () => {
      // Arrange
      const { repository } = await create();
      await repository.save(
        Issue.openWith(
          'TestIssue',
          { kind: 'nickname', nickname: 'TestNickname', owner: 'TestOwner' },
          nicknameReport('TestReport'),
          AT,
        ),
      );

      // Act & Assert
      expect(
        (
          await repository.undecidedOf({
            kind: 'nickname',
            nickname: 'TestNickname',
            owner: 'TestOwner',
          })
        )?.id,
      ).toBe('TestIssue');
      expect(
        await repository.undecidedOf({
          kind: 'nickname',
          nickname: 'TestNickname',
          owner: 'TestOtherOwner',
        }),
      ).toBeUndefined();
    });

    it('should not find a decided issue as the undecided one of its content', async () => {
      // Arrange
      const {
        repository,
        dilemmas: [dilemma],
      } = await create();
      const issue = Issue.openWith(
        'TestIssue',
        { kind: 'dilemma', dilemmaId: dilemma.dilemmaId },
        report(dilemma, 'TestReport'),
        AT,
      );
      issue.decide({
        outcome: 'kept',
        facts: 'TestFacts',
        translatedFacts: FACTS,
        rule: '4.2',
        decidedAt: AT,
      });
      await repository.save(issue);

      // Act & Assert
      expect(
        await repository.undecidedOf({ kind: 'dilemma', dilemmaId: dilemma.dilemmaId }),
      ).toBeUndefined();
    });

    it('should give the undecided issues already in the repository, the oldest first', async () => {
      // Arrange
      const { repository } = await create();
      const later = Issue.openWith(
        'TestLater',
        { kind: 'reference', reference: 'TestReference' },
        notice('TestNotice1'),
        new Date('2026-11-22T11:00:00Z'),
      );
      later.numbered(2);
      const earlier = Issue.openWith(
        'TestEarlier',
        { kind: 'reference', reference: 'TestReference' },
        notice('TestNotice2'),
        AT,
      );
      earlier.numbered(1);
      const unnumbered = Issue.openWith(
        'TestUnnumbered',
        { kind: 'reference', reference: 'TestReference' },
        notice('TestNotice3'),
        AT,
      );
      for (const issue of [later, earlier, unnumbered]) await repository.save(issue);

      // Act
      const undecided = await repository.undecidedInRepository();

      // Assert
      expect(undecided.map(({ id }) => id)).toEqual(['TestEarlier', 'TestLater']);
    });

    it('should count the notices an identity sent since then', async () => {
      // Arrange
      const { repository } = await create();
      const issue = Issue.openWith(
        'TestIssue',
        { kind: 'reference', reference: 'TestReference' },
        notice('TestNotice1', new Date('2026-11-21T09:00:00Z')),
        AT,
      );
      issue.receive(notice('TestNotice2'));
      issue.receive(notice('TestNotice3', AT, 'TestOtherNotifier'));
      await repository.save(issue);

      // Act & Assert
      expect(
        await repository.noticesSentSince('TestNotifier', new Date('2026-11-22T00:00:00Z')),
      ).toBe(1);
    });

    it('should keep the issues of a deleted player without them, and find them by identity before', async () => {
      // Arrange
      const {
        repository,
        dilemmas: [dilemma],
      } = await create();
      const dilemmaIssue = Issue.openWith(
        'TestDilemmaIssue',
        { kind: 'dilemma', dilemmaId: dilemma.dilemmaId },
        report(dilemma, 'TestReport1', 'TestPlayer'),
        AT,
      );
      dilemmaIssue.receive(report(dilemma, 'TestReport2', 'TestOther'));
      const nicknameIssue = Issue.openWith(
        'TestNicknameIssue',
        { kind: 'nickname', nickname: 'TestNickname', owner: 'TestPlayer' },
        nicknameReport('TestNicknameReport', 'TestPlayer'),
        AT,
      );
      const noticeIssue = Issue.openWith(
        'TestNoticeIssue',
        { kind: 'reference', reference: 'TestReference' },
        notice('TestNotice', AT, 'TestPlayer'),
        AT,
      );
      for (const issue of [dilemmaIssue, nicknameIssue, noticeIssue]) await repository.save(issue);
      const involving = await repository.involving('TestPlayer');

      // Act
      for (const issue of involving) {
        issue.unlink('TestPlayer');
        await repository.save(issue);
      }

      // Assert
      expect(involving.map(({ id }) => id).sort()).toEqual([
        'TestDilemmaIssue',
        'TestNicknameIssue',
        'TestNoticeIssue',
      ]);
      expect(await repository.involving('TestPlayer')).toEqual([]);
      const dilemmaReports = (await repository.findById('TestDilemmaIssue'))?.toSnapshot()
        .dilemmaReports;
      expect(dilemmaReports?.map(({ identity, comment }) => ({ identity, comment }))).toEqual([
        { identity: null, comment: 'TestComment' },
        { identity: 'TestOther', comment: 'TestComment' },
      ]);
      const nickname = (await repository.findById('TestNicknameIssue'))?.toSnapshot();
      expect(nickname?.content).toEqual({
        kind: 'nickname',
        nickname: 'TestNickname',
        owner: null,
      });
      expect(nickname?.nicknameReports[0]?.owner).toBeNull();
      const sent = (await repository.findById('TestNoticeIssue'))?.toSnapshot().notices[0];
      expect(sent).toMatchObject({
        identity: null,
        name: null,
        email: null,
        reference: 'TestReference',
      });
    });

    it('should find who sent notices with an email, however it is written', async () => {
      // Arrange
      const { repository } = await create();
      await repository.save(
        Issue.openWith(
          'TestNoticeIssue',
          { kind: 'reference', reference: 'TestReference' },
          notice('TestNotice'),
          AT,
        ),
      );

      // Act & Assert
      expect(await repository.sendersWithEmail(' TEST@example.com')).toEqual(['TestNotifier']);
      expect(await repository.sendersWithEmail('other@example.com')).toEqual([]);
    });
  });
}
