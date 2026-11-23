import type { ModerationNoticeDto } from '@thelever-app/protocol';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lastNickname, rememberNickname } from '../../src/identity/last-nickname.ts';
import { ModerationNotices } from '../../src/moderation/moderation-notices.tsx';
import { fakeRoomApi, renderAtRoute } from '../support/routing.tsx';

const FACTS = {
  es: 'TestHechos',
  en: 'TestFacts',
  fr: 'TestFaits',
  de: 'TestSachverhalt',
  it: 'TestFatti',
  pt: 'TestFactos',
  ca: 'TestFets',
};

const ON_A_REPORT: ModerationNoticeDto = {
  id: 'test-notice-1',
  subject: {
    kind: 'report',
    content: { kind: 'dilemma', text: 'TestDilemma' },
    reason: 'offensive',
    reportedAt: '2026-11-21T10:00:00.000Z',
  },
  outcome: 'withdrawn',
  rule: '4.2',
  decidedAt: '2026-11-22T10:00:00.000Z',
};

const ON_THE_NICKNAME: ModerationNoticeDto = {
  id: 'test-notice-2',
  subject: { kind: 'nickname', nickname: 'TestNick', reason: 'impersonation', facts: FACTS },
  outcome: 'withdrawn',
  rule: '3.1',
  decidedAt: '2026-11-22T11:00:00.000Z',
};

describe('ModerationNotices', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should show the decision on a report, the rule, who decided and how to appeal, once', async () => {
    // Arrange
    const seeModerationNotice = vi.fn(async () => {});
    const api = fakeRoomApi({
      moderationNotices: vi.fn(async () => [ON_A_REPORT]),
      seeModerationNotice,
    });
    const { t } = await renderAtRoute(<ModerationNotices />, { api });
    const sheet = await screen.findByRole('dialog', { name: t('moderationNotice.reportTitle') });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('moderationNotice.understood') }));

    // Assert
    expect(sheet.textContent).toContain('TestDilemma');
    expect(sheet.textContent).toContain(t('moderationNotice.withdrawnDilemma'));
    expect(sheet.textContent).toContain(t('moderationNotice.rule', { rule: '4.2' }));
    expect(sheet.textContent).toContain(t('moderationNotice.appeal'));
    expect(seeModerationNotice).toHaveBeenCalledWith('test-notice-1');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('should show the reported nickname as text, whatever it is written with', async () => {
    // Arrange: a nickname written as markup, which the room took as it came.
    const nickname = '<strong style="color: red">Nick</strong>';
    const api = fakeRoomApi({
      moderationNotices: vi.fn(async () => [
        {
          ...ON_A_REPORT,
          subject: { ...ON_A_REPORT.subject, content: { kind: 'nickname', nickname } },
        } as ModerationNoticeDto,
      ]),
    });

    // Act
    const { t } = await renderAtRoute(<ModerationNotices />, { api });

    // Assert
    const sheet = await screen.findByRole('dialog', { name: t('moderationNotice.reportTitle') });
    expect(sheet.textContent).toContain(nickname);
  });

  it('should show the next one once the player saw the first', async () => {
    // Arrange
    const api = fakeRoomApi({
      moderationNotices: vi.fn(async () => [ON_A_REPORT, ON_THE_NICKNAME]),
      seeModerationNotice: vi.fn(async () => {}),
    });
    const { t } = await renderAtRoute(<ModerationNotices />, { api });
    await screen.findByRole('dialog', { name: t('moderationNotice.reportTitle') });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('moderationNotice.understood') }));

    // Assert
    expect(
      await screen.findByRole('dialog', { name: t('moderationNotice.nicknameTitle') }),
    ).toBeDefined();
  });

  it('should give the statement of reasons of the nickname, with the facts in the language of the app, and forget it', async () => {
    // Arrange
    rememberNickname('TestNick');
    const api = fakeRoomApi({
      moderationNotices: vi.fn(async () => [ON_THE_NICKNAME]),
      seeModerationNotice: vi.fn(async () => {}),
    });
    const { t } = await renderAtRoute(<ModerationNotices />, { api });
    const sheet = await screen.findByRole('dialog', { name: t('moderationNotice.nicknameTitle') });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('moderationNotice.understood') }));

    // Assert
    expect(sheet.textContent).toContain('TestHechos');
    expect(sheet.textContent).toContain(t('moderationNotice.reasonSentences.impersonation'));
    expect(sheet.textContent).toContain(t('moderationNotice.ruleValue', { rule: '3.1' }));
    expect(lastNickname()).toBe('');
  });

  it('should show nothing when there is no decision', async () => {
    // Act
    await renderAtRoute(<ModerationNotices />);

    // Assert
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
