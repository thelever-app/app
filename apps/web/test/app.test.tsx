import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/App.tsx';
import { fakeRoomApi, renderAtRoute } from './support/routing.tsx';

describe('App', () => {
  it('should open the start at /', async () => {
    // Act
    const { t } = await renderAtRoute(<App />);

    // Assert
    expect(screen.getByRole('heading', { name: t('home.title') })).toBeDefined();
  });

  it('should show the room of the code in the address before joining', async () => {
    // Arrange
    const previewRoom = vi.fn(async () => ({
      roomId: 'test-room-id',
      hostNickname: 'Ana',
      variant: 'nominal' as const,
      adultsOnly: false,
      players: [{ nickname: 'Ana', avatar: { face: 'face-01' as const, color: 'teal' as const } }],
      suggestedAvatar: { face: 'face-02' as const, color: 'teal' as const },
    }));

    // Act
    const { t } = await renderAtRoute(<App />, {
      api: fakeRoomApi({ previewRoom }),
      at: '/join/K7M2Q',
    });

    // Assert
    expect(
      await screen.findByText(t('joinRoom.roomOf', { host: 'Ana', code: 'K7M2Q' })),
    ).toBeDefined();
    expect(previewRoom).toHaveBeenCalledWith('K7M2Q');
  });

  it('should go back to the start from an address that does not exist', async () => {
    // Act
    const { location } = await renderAtRoute(<App />, { at: '/games/old-game-id' });

    // Assert
    expect(location()).toBe('/');
  });
});
