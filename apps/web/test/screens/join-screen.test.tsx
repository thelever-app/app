import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoomApiError } from '../../src/room/room-api.ts';
import { JoinScreen } from '../../src/screens/join-screen.tsx';
import { fakeRoomApi, renderAtRoute } from '../support/routing.tsx';

const PREVIEW = {
  roomId: 'test-room-id',
  hostNickname: 'Ana',
  variant: 'anonymous' as const,
  adultsOnly: true,
  players: [
    { nickname: 'Ana', avatar: { face: 'face-01' as const, color: 'teal' as const } },
    { nickname: 'Luis', avatar: { face: 'face-02' as const, color: 'khaki' as const } },
    { nickname: 'Marta', avatar: { face: 'face-03' as const, color: 'olive' as const } },
    { nickname: 'Pablo', avatar: { face: 'face-04' as const, color: 'rust' as const } },
  ],
  suggestedAvatar: { face: 'face-05' as const, color: 'cyan' as const },
};

async function renderJoin(
  previewRoom: (code: string) => Promise<typeof PREVIEW>,
  joinRoom: () => Promise<{ playerId: string }> = async () => ({ playerId: 'test-luis-id' }),
) {
  return renderAtRoute(<JoinScreen />, {
    api: fakeRoomApi({ previewRoom: vi.fn(previewRoom), joinRoom: vi.fn(joinRoom) }),
    at: '/join/K7M2Q',
    path: '/join/:code',
  });
}

describe('JoinScreen', () => {
  it('should show whose room it is, who and how many are in it and what kind it is, before joining', async () => {
    // Act
    const { t } = await renderJoin(async () => PREVIEW);

    // Assert
    expect(await screen.findByTestId('room-of')).toHaveProperty(
      'textContent',
      t('joinRoom.roomOf', { host: 'Ana', code: 'K7M2Q' }),
    );
    expect(screen.getByTestId('player-count').textContent).toBe(
      t('joinRoom.inTheRoom', { count: 4 }),
    );
    const avatars = screen.getByTestId('room-avatars').querySelectorAll('[data-face]');
    expect([...avatars].map((avatar) => avatar.getAttribute('data-face'))).toEqual([
      'face-01',
      'face-02',
      'face-03',
      'face-04',
    ]);
    expect(screen.getByTestId('room-variant').textContent).toContain(t('variant.anonymous.name'));
    expect(screen.getByTestId('room-adults-only').textContent).toBe(t('joinRoom.adultsOnly'));
    expect(screen.getByRole('textbox', { name: t('joinRoom.nickname') })).toBeDefined();
  });

  it('should tell the player when no room has that code, and take them back to type another', async () => {
    // Arrange
    const { t, location } = await renderJoin(async () => {
      throw new RoomApiError('room-code-not-found');
    });
    const heading = await screen.findByRole('heading', {
      name: t('joinRefusal.room-code-not-found.title'),
    });

    // Act
    fireEvent.click(
      screen.getByRole('button', { name: t('joinRefusal.room-code-not-found.action') }),
    );

    // Assert
    expect(heading).toBeDefined();
    expect(location()).toBe('/join');
  });

  it('should leave the room behind, at full screen, when it turns the player away on joining', async () => {
    // Arrange
    const { t } = await renderJoin(
      async () => PREVIEW,
      async () => {
        throw new RoomApiError('player-expelled');
      },
    );
    fireEvent.change(await screen.findByRole('textbox', { name: t('joinRoom.nickname') }), {
      target: { value: 'Luis' },
    });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('joinRoom.submit') }));

    // Assert
    expect(
      await screen.findByRole('heading', { name: t('joinRefusal.player-expelled.title') }),
    ).toBeDefined();
    expect(screen.queryByTestId('room-of')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
