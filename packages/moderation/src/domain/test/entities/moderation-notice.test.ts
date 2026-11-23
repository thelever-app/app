import { describe, expect, it } from 'vitest';
import { ModerationNotice } from '../../entities/moderation-notice.ts';

const NOTICE = {
  id: 'TestNotice',
  identity: 'TestIdentity',
  subject: {
    kind: 'report',
    content: { kind: 'dilemma', text: 'TestText' },
    reason: 'offensive',
    reportedAt: new Date('2026-11-21T10:00:00Z'),
  },
  outcome: 'withdrawn',
  rule: '4.2',
  decidedAt: new Date('2026-11-22T10:00:00Z'),
} as const;

describe('ModerationNotice', () => {
  it('should wait unseen until the player opens the app', () => {
    // Act
    const notice = ModerationNotice.create(NOTICE);

    // Assert
    expect(notice.toSnapshot()).toEqual({ ...NOTICE, seenAt: null });
  });

  it('should keep the first time it was seen', () => {
    // Arrange
    const notice = ModerationNotice.create(NOTICE);
    const first = new Date('2026-11-23T10:00:00Z');
    notice.seen(first);

    // Act
    notice.seen(new Date('2026-11-24T10:00:00Z'));

    // Assert
    expect(notice.toSnapshot().seenAt).toEqual(first);
  });
});
