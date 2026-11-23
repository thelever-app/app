import { describe, expect, it } from 'vitest';
import {
  IllegalContentNotice,
  type IllegalContentNoticeInput,
} from '../../entities/illegal-content-notice.ts';
import { InvalidEntryError } from '../../errors/invalid-entry.error.ts';

const NOTICE: IllegalContentNoticeInput = {
  id: 'TestNotice',
  reference: 'https://thelever.app/es/test/test-1',
  explanation: 'TestExplanation',
  name: 'TestName',
  email: 'test@example.com',
  language: 'es',
  identity: 'TestIdentity',
  sentAt: new Date('2026-11-22T10:00:00Z'),
  goodFaith: true,
};

describe('IllegalContentNotice', () => {
  it('should keep what the person sent, without the declaration it needs', () => {
    // Act
    const notice = IllegalContentNotice.receive(NOTICE);

    // Assert
    expect(notice.toSnapshot()).toEqual({
      id: 'TestNotice',
      reference: 'https://thelever.app/es/test/test-1',
      explanation: 'TestExplanation',
      name: 'TestName',
      email: 'test@example.com',
      language: 'es',
      identity: 'TestIdentity',
      sentAt: NOTICE.sentAt,
    });
  });

  it('should take a notice without a name or an email', () => {
    // Act
    const notice = IllegalContentNotice.receive({ ...NOTICE, name: '  ', email: '' });

    // Assert
    expect(notice.toSnapshot()).toMatchObject({ name: null, email: null });
  });

  it('should trim what the person wrote', () => {
    // Act
    const notice = IllegalContentNotice.receive({ ...NOTICE, reference: '  TestReference ' });

    // Assert
    expect(notice.toSnapshot().reference).toBe('TestReference');
  });

  it.each([
    { field: 'the declaration of good faith', change: { goodFaith: false } },
    { field: 'a reference', change: { reference: ' ' } },
    { field: 'a reference that short', change: { reference: 'a'.repeat(501) } },
    { field: 'an explanation', change: { explanation: '' } },
    { field: 'an explanation that short', change: { explanation: 'a'.repeat(2001) } },
    { field: 'a name that short', change: { name: 'a'.repeat(101) } },
    { field: 'an email that works', change: { email: 'not an email' } },
  ])('should not take a notice without $field', ({ change }) => {
    // Act & Assert
    expect(() => IllegalContentNotice.receive({ ...NOTICE, ...change })).toThrow(InvalidEntryError);
  });
});
