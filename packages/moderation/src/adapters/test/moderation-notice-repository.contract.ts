import { describe, expect, it } from 'vitest';
import type { ModerationNoticeRepository } from '../../application/ports/moderation-notice-repository.port.ts';
import { ModerationNotice } from '../../domain/entities/moderation-notice.ts';

const AT = new Date('2026-11-22T10:00:00.123Z');

function noticeOf(id: string, identity = 'TestIdentity', decidedAt = AT) {
  return ModerationNotice.create({
    id,
    identity,
    subject: {
      kind: 'nickname',
      nickname: 'TestNickname',
      reason: 'offensive',
      facts: { es: 'a', en: 'b', fr: 'c', de: 'd', it: 'e', pt: 'f', ca: 'g' },
    },
    outcome: 'withdrawn',
    rule: '4.2',
    decidedAt,
  });
}

/** What every ModerationNoticeRepository must do, in memory or in PostgreSQL (ADR 0002). */
export function describeModerationNoticeRepositoryContract(
  name: string,
  create: () => Promise<ModerationNoticeRepository>,
): void {
  describe(`${name} (ModerationNoticeRepository contract)`, () => {
    it('should give back a notice as it was saved', async () => {
      // Arrange
      const repository = await create();
      const notice = ModerationNotice.create({
        id: 'TestNotice',
        identity: 'TestIdentity',
        subject: {
          kind: 'report',
          content: { kind: 'dilemma', text: 'TestText' },
          reason: 'confusing',
          reportedAt: new Date('2026-11-21T10:00:00.456Z'),
        },
        outcome: 'kept',
        rule: '3',
        decidedAt: AT,
      });

      // Act
      await repository.save(notice);

      // Assert
      expect((await repository.findById('TestNotice'))?.toSnapshot()).toEqual(notice.toSnapshot());
    });

    it('should give the unseen notices of an identity, the oldest first', async () => {
      // Arrange
      const repository = await create();
      await repository.save(
        noticeOf('TestLater', 'TestIdentity', new Date('2026-11-22T11:00:00Z')),
      );
      await repository.save(noticeOf('TestEarlier'));
      await repository.save(noticeOf('TestOther', 'TestOtherIdentity'));

      // Act
      const unseen = await repository.unseenOf('TestIdentity');

      // Assert
      expect(unseen.map(({ id }) => id)).toEqual(['TestEarlier', 'TestLater']);
    });

    it('should not give a notice already seen', async () => {
      // Arrange
      const repository = await create();
      const notice = noticeOf('TestNotice');
      await repository.save(notice);
      notice.seen(AT);

      // Act
      await repository.save(notice);

      // Assert
      expect(await repository.unseenOf('TestIdentity')).toEqual([]);
      expect((await repository.findById('TestNotice'))?.toSnapshot().seenAt).toEqual(AT);
    });
  });
}
