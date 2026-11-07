import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lastNickname } from '../../src/identity/last-nickname.ts';
import { RoomApiError } from '../../src/room/room-api.ts';
import { JoinRoomForm } from '../../src/screens/join-room-form.tsx';
import { fakeRoomApi, renderAtRoute } from '../support/routing.tsx';

const JOINED = { playerId: 'test-luis-id' };

async function renderForm(joinRoom: (roomId: string, nickname: string) => Promise<typeof JOINED>) {
  const api = fakeRoomApi({ joinRoom: vi.fn(joinRoom) });
  const rendered = await renderAtRoute(<JoinRoomForm roomId="test-room-id" />, {
    api,
    at: '/join/K7M2Q',
  });
  const { t } = rendered;
  const join = (nickname: string) => {
    fireEvent.change(screen.getByRole('textbox', { name: t('joinRoom.nickname') }), {
      target: { value: nickname },
    });
    fireEvent.click(screen.getByRole('button', { name: t('joinRoom.submit') }));
  };
  return { ...rendered, api, join };
}

describe('JoinRoomForm', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should start with the nickname the device last played with', async () => {
    // Arrange
    localStorage.setItem('thelever.lastNickname', 'Luis');

    // Act
    const { t } = await renderForm(async () => JOINED);

    // Assert
    expect(screen.getByRole('textbox', { name: t('joinRoom.nickname') })).toHaveProperty(
      'value',
      'Luis',
    );
  });

  it('should join the room, remember the nickname and enter it', async () => {
    // Arrange
    const { api, join, location } = await renderForm(async () => JOINED);

    // Act
    join('Luis');

    // Assert
    await waitFor(() => expect(location()).toBe('/rooms/test-room-id'));
    expect(api.joinRoom).toHaveBeenCalledWith('test-room-id', 'Luis');
    expect(lastNickname()).toBe('Luis');
  });

  it.each(['room-full', 'player-expelled', 'room-not-found'] as const)(
    'should tell the player %s and not let them in',
    async (code) => {
      // Arrange
      const { join, t, location } = await renderForm(async () => {
        throw new RoomApiError(code);
      });

      // Act
      join('Luis');

      // Assert
      expect(
        await screen.findByRole('heading', { name: t(`joinRefusal.${code}.title`) }),
      ).toBeDefined();
      expect(location()).toBe('/join/K7M2Q');
    },
  );

  it('should say why next to the field when the nickname is missing', async () => {
    // Arrange
    const { join, t } = await renderForm(async () => {
      throw new RoomApiError('nickname-missing');
    });

    // Act
    join('   ');

    // Assert
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      t('roomErrors.nickname-missing'),
    );
    expect(screen.getByRole('textbox', { name: t('joinRoom.nickname') })).toBeDefined();
  });
});
