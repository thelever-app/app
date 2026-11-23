import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IllegalContentScreen } from '../../src/moderation/illegal-content-screen.tsx';
import { RoomApiError } from '../../src/room/room-api.ts';
import { fakeRoomApi, renderAtRoute } from '../support/routing.tsx';

/** Fills in what the form needs: the content, why, and the declaration. */
function fillIn(t: Awaited<ReturnType<typeof renderAtRoute>>['t'], { email = '' } = {}) {
  fireEvent.change(screen.getByRole('textbox', { name: t('illegalNotice.reference') }), {
    target: { value: 'https://thelever.app/es/honestidad/el-test-7' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: t('illegalNotice.explanation') }), {
    target: { value: 'TestExplanation' },
  });
  if (email) {
    fireEvent.change(screen.getByRole('textbox', { name: t('illegalNotice.email') }), {
      target: { value: email },
    });
  }
  fireEvent.click(screen.getByRole('checkbox', { name: t('illegalNotice.goodFaith') }));
}

describe('IllegalContentScreen', () => {
  it('should send the notice without a name or an email, and acknowledge it', async () => {
    // Arrange
    const sendIllegalContentNotice = vi.fn(async () => {});
    const { t } = await renderAtRoute(<IllegalContentScreen />, {
      api: fakeRoomApi({ sendIllegalContentNotice }),
    });
    fillIn(t);

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('illegalNotice.send') }));

    // Assert
    expect(
      await screen.findByRole('heading', { name: t('illegalNotice.receivedTitle') }),
    ).toBeDefined();
    expect(sendIllegalContentNotice).toHaveBeenCalledWith({
      reference: 'https://thelever.app/es/honestidad/el-test-7',
      explanation: 'TestExplanation',
      language: 'es',
      goodFaith: true,
    });
    expect(screen.getByText(new RegExp(t('illegalNotice.receivedNoEmail')))).toBeDefined();
  });

  it('should say the decision will come to the email the person left', async () => {
    // Arrange
    const { t } = await renderAtRoute(<IllegalContentScreen />, {
      api: fakeRoomApi({ sendIllegalContentNotice: vi.fn(async () => {}) }),
    });
    fillIn(t, { email: 'test@example.com' });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('illegalNotice.send') }));

    // Assert
    expect(await screen.findByText(new RegExp(t('illegalNotice.receivedEmail')))).toBeDefined();
  });

  it('should say when the person sent too many today', async () => {
    // Arrange
    const { t } = await renderAtRoute(<IllegalContentScreen />, {
      api: fakeRoomApi({
        sendIllegalContentNotice: vi.fn(async () => {
          throw new RoomApiError('too-many-notices');
        }),
      }),
    });
    fillIn(t);

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('illegalNotice.send') }));

    // Assert
    expect((await screen.findByRole('alert')).textContent).toBe(t('illegalNotice.tooMany'));
  });

  it('should keep what the person wrote when sending fails', async () => {
    // Arrange
    const { t } = await renderAtRoute(<IllegalContentScreen />, {
      api: fakeRoomApi({
        sendIllegalContentNotice: vi.fn(async () => {
          throw new Error('TestFailure');
        }),
      }),
    });
    fillIn(t, { email: 'test@example.com' });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('illegalNotice.send') }));

    // Assert
    await screen.findByRole('alert');
    const field = (label: string) =>
      (screen.getByRole('textbox', { name: label }) as HTMLInputElement).value;
    expect(field(t('illegalNotice.reference'))).toBe(
      'https://thelever.app/es/honestidad/el-test-7',
    );
    expect(field(t('illegalNotice.explanation'))).toBe('TestExplanation');
    expect(field(t('illegalNotice.email'))).toBe('test@example.com');
    expect(
      (screen.getByRole('checkbox', { name: t('illegalNotice.goodFaith') }) as HTMLInputElement)
        .checked,
    ).toBe(true);
  });
});
