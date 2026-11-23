import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/App.tsx';
import { fakeRoomApi, renderAtRoute } from './support/routing.tsx';

describe('App', () => {
  it('should open the start at /app', async () => {
    // Act
    const { t } = await renderAtRoute(<App />, { at: '/app' });

    // Assert
    expect(await screen.findByRole('heading', { name: t('home.title') })).toBeDefined();
  });

  it('should show the room of the code in the address before joining', async () => {
    // Arrange
    const previewRoom = vi.fn(async () => ({
      roomId: 'test-room-id',
      ambience: 'classic' as const,
      hostNickname: 'Ana',
      hostAvatar: { face: 'face-01', color: 'teal' } as const,
      variant: 'nominal' as const,
      adultsOnly: false,
      compromisingDilemmas: false,
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
    await waitFor(() => expect(location()).toBe('/app'));
  });

  it('should open the web form of illegal content without the first access', async () => {
    // Arrange
    const openApp = vi.fn(async () => {
      throw new Error('the form does not wait for the first access');
    });

    // Act
    const { t } = await renderAtRoute(<App />, { api: fakeRoomApi({ openApp }), at: '/denunciar' });

    // Assert
    expect(await screen.findByRole('heading', { name: t('illegalNotice.title') })).toBeDefined();
    expect(openApp).not.toHaveBeenCalled();
  });
});
