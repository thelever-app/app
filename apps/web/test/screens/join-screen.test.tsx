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
  playerCount: 4,
};

async function renderJoin(previewRoom: (code: string) => Promise<typeof PREVIEW>) {
  return renderAtRoute(<JoinScreen />, {
    api: fakeRoomApi({ previewRoom: vi.fn(previewRoom) }),
    at: '/join/K7M2Q',
    path: '/join/:code',
  });
}

describe('JoinScreen', () => {
  it('should show whose room it is, how many are in it and what kind it is, before joining', async () => {
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
    expect(screen.getByTestId('room-variant').textContent).toContain(t('variant.anonymous.name'));
    expect(screen.getByTestId('room-adults-only').textContent).toBe(t('joinRoom.adultsOnly'));
    expect(screen.getByRole('textbox', { name: t('joinRoom.nickname') })).toBeDefined();
  });

  it('should tell the player when no room has that code, and take them back to the start', async () => {
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
    expect(location()).toBe('/');
  });
});
