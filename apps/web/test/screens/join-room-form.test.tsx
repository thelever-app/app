import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lastNickname } from '../../src/identity/last-nickname.ts';
import { RoomApiError } from '../../src/room/room-api.ts';
import { JoinRoomForm } from '../../src/screens/join-room-form.tsx';
import { fakeRoomApi, renderAtRoute } from '../support/routing.tsx';

const JOINED = { playerId: 'test-luis-id' };

async function renderForm(joinRoom: (roomId: string, nickname: string) => Promise<typeof JOINED>) {
  const api = fakeRoomApi({ joinRoom: vi.fn(joinRoom) });
  const onRefused = vi.fn();
  const rendered = await renderAtRoute(
    <JoinRoomForm roomId="test-room-id" onRefused={onRefused} />,
    {
      api,
      at: '/join/K7M2Q',
    },
  );
  const { t } = rendered;
  const join = (nickname: string) => {
    fireEvent.change(screen.getByRole('textbox', { name: t('joinRoom.nickname') }), {
      target: { value: nickname },
    });
    fireEvent.click(screen.getByRole('button', { name: t('joinRoom.submit') }));
  };
  return { ...rendered, api, onRefused, join };
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
    'should hand %s over to the screen, which explains it, and not let them in',
    async (code) => {
      // Arrange
      const { join, onRefused, location } = await renderForm(async () => {
        throw new RoomApiError(code);
      });

      // Act
      join('Luis');

      // Assert
      await waitFor(() => expect(onRefused).toHaveBeenCalledWith(code));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(location()).toBe('/join/K7M2Q');
    },
  );

  it('should not let the player in, and ask for the nickname, until they write one', async () => {
    // Arrange
    const { t } = await renderForm(async () => JOINED);
    const nickname = screen.getByRole('textbox', { name: t('joinRoom.nickname') });

    // Act
    fireEvent.change(nickname, { target: { value: '   ' } });
    const blank = screen.getByRole('button');
    const whileBlank = { name: blank.textContent, disabled: blank.hasAttribute('disabled') };
    fireEvent.change(nickname, { target: { value: 'Luis' } });

    // Assert
    expect(whileBlank).toEqual({ name: t('joinRoom.missingNickname'), disabled: true });
    expect(screen.getByRole('button', { name: t('joinRoom.submit') })).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('should say why next to the field when the room server says no for another reason', async () => {
    // Arrange
    const { join, t } = await renderForm(async () => {
      throw new TypeError('Failed to fetch');
    });

    // Act
    join('Luis');

    // Assert
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', t('roomErrors.unknown'));
    expect(screen.getByRole('textbox', { name: t('joinRoom.nickname') })).toHaveProperty(
      'value',
      'Luis',
    );
  });
});
