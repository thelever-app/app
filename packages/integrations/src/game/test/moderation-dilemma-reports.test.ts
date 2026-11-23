import { describe, expect, it } from 'vitest';
import {
  ReceiveDilemmaReportUseCase,
  ReceiveNicknameReportUseCase,
  type ModeratedDilemmas,
} from '@thelever-app/moderation';
import { InMemoryIssueRepository, InMemoryOutbox } from '@thelever-app/moderation/in-memory';
import { ModerationDilemmaReports } from '../moderation-dilemma-reports.ts';
import { ModerationNicknameReports } from '../moderation-nickname-reports.ts';

const AT = new Date('2026-11-21T10:00:00Z');

/** Dilemmas, as Moderation sees them: nothing to find, hide or withdraw here. */
const NO_DILEMMAS: ModeratedDilemmas = {
  dilemmaOf: async () => null,
  familyOf: async (dilemmaId) => [dilemmaId],
  textOf: async () => null,
  hide: async () => {},
  restore: async () => {},
  withdraw: async () => {},
};

function moderation() {
  const issues = new InMemoryIssueRepository();
  let next = 1;
  const ports = {
    issues,
    outbox: new InMemoryOutbox(),
    dilemmas: NO_DILEMMAS,
    idGenerator: { generate: () => `TestId${next++}` },
  };
  return {
    issues,
    dilemmaReports: new ModerationDilemmaReports(new ReceiveDilemmaReportUseCase(ports)),
    nicknameReports: new ModerationNicknameReports(new ReceiveNicknameReportUseCase(ports)),
  };
}

describe('ModerationDilemmaReports', () => {
  it('should hand Moderation the report of a player, with when and in which language', async () => {
    // Arrange
    const { issues, dilemmaReports } = moderation();

    // Act
    await dilemmaReports.report({
      dilemmaId: 'TestDilemma',
      version: 2,
      reason: 'mistranslated',
      comment: 'TestComment',
      language: 'fr',
      identity: 'TestIdentity',
      at: AT,
    });

    // Assert
    const [issue] = issues.all();
    expect(issue?.content).toEqual({ kind: 'dilemma', dilemmaId: 'TestDilemma' });
    expect(issue?.dilemmaReports).toEqual([
      {
        id: 'TestId1',
        dilemmaId: 'TestDilemma',
        version: 2,
        reason: 'mistranslated',
        comment: 'TestComment',
        language: 'fr',
        identity: 'TestIdentity',
        reportedAt: AT,
      },
    ]);
  });

  it.each(['offensive', 'confusing', 'mistranslated', 'illegal', 'other'] as const)(
    'should hand Moderation a report for the reason %s as that same reason',
    async (reason) => {
      // Arrange
      const { issues, dilemmaReports } = moderation();

      // Act
      await dilemmaReports.report({
        dilemmaId: 'TestDilemma',
        version: 1,
        reason,
        comment: null,
        language: 'es',
        identity: 'TestIdentity',
        at: AT,
      });

      // Assert
      expect(issues.all()[0]?.dilemmaReports[0]?.reason).toBe(reason);
    },
  );
});

describe('ModerationNicknameReports', () => {
  it.each(['offensive', 'impersonation', 'illegal', 'other'] as const)(
    'should hand Moderation who goes by the nickname and who reports it, for the reason %s',
    async (reason) => {
      // Arrange
      const { issues, nicknameReports } = moderation();

      // Act
      await nicknameReports.report({
        nickname: 'TestNickname',
        owner: 'TestOwner',
        reason,
        comment: null,
        identity: 'TestIdentity',
        at: AT,
      });

      // Assert
      const [issue] = issues.all();
      expect(issue?.content).toEqual({
        kind: 'nickname',
        nickname: 'TestNickname',
        owner: 'TestOwner',
      });
      expect(issue?.nicknameReports[0]).toMatchObject({ reason, identity: 'TestIdentity' });
    },
  );
});
