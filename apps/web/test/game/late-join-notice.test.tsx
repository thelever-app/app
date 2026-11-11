import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoomContent } from '../../src/screens/room-screen.tsx';
import { aGame } from '../support/game.ts';
import { renderWithProviders } from '../support/render.tsx';

const JOINED_LATE = { pathname: '/rooms/test-room-id', state: { joinedLate: true } };

/** Luis has just joined the third round of the game Ana hosts. */
const thirdRound = aGame({
  playerId: 'test-luis-id',
  round: {
    position: 2,
    phase: 'decision',
    endsAt: '2026-11-09T10:01:00.000Z',
    revealedBy: null,
    movedOnBy: null,
  },
});

describe('the notice of who joins once the game has started', () => {
  it('should tell who joined late where they come in and, in a nominal room, that they only vote', async () => {
    // Act
    const { t } = await renderWithProviders(<RoomContent />, {
      game: thirdRound,
      at: JOINED_LATE,
    });

    // Assert
    expect(screen.getByRole('heading', { name: t('lateJoin.title') })).toBeDefined();
    expect(screen.getByText(t('lateJoin.room', { host: 'Ana' }))).toBeDefined();
    const text = `${t('lateJoin.round', { position: 3, total: 3 })} ${t('lateJoin.onlyVote')}`;
    expect(screen.getByText(text)).toBeDefined();
  });

  it('should not tell who joins an anonymous room that they only vote', async () => {
    // Arrange
    const anonymous = aGame({
      ...thirdRound,
      players: thirdRound.players.map((player) => ({ ...player, answered: null })),
    });

    // Act
    const { t } = await renderWithProviders(<RoomContent />, { game: anonymous, at: JOINED_LATE });

    // Assert
    expect(screen.getByText(t('lateJoin.round', { position: 3, total: 3 }))).toBeDefined();
    expect(screen.queryByText(t('lateJoin.onlyVote'), { exact: false })).toBeNull();
  });

  it('should take the player into the round, and not show the notice again', async () => {
    // Arrange
    const { t } = await renderWithProviders(<RoomContent />, {
      game: thirdRound,
      at: JOINED_LATE,
    });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('lateJoin.enter') }));

    // Assert
    expect(screen.queryByRole('heading', { name: t('lateJoin.title') })).toBeNull();
    expect(screen.getByText('Texto del dilema 3')).toBeDefined();
  });

  it('should go straight to the round for whoever did not just join it late', async () => {
    // Act
    const { t } = await renderWithProviders(<RoomContent />, { game: thirdRound });

    // Assert
    expect(screen.queryByRole('heading', { name: t('lateJoin.title') })).toBeNull();
  });
});
