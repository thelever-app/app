import { act, fireEvent, screen, within } from '@testing-library/react';
import type { GameStateDto } from '@thelever-app/protocol';
import { playedDilemmas } from '../../src/game/played-dilemmas.ts';
import { describe, expect, it } from 'vitest';
import { ResultsPhase } from '../../src/phases/results-phase.tsx';
import { fakeConnection } from '../support/fake-connection.ts';
import { aGame } from '../support/game.ts';
import { renderWithProviders } from '../support/render.tsx';

/** Ana uses the screen; Luis and Marta play with her in an anonymous room, and Pablo left. */
const PLAYERS: GameStateDto['players'] = ['Ana', 'Luis', 'Marta', 'Pablo'].map((nickname) => ({
  playerId: `test-${nickname.toLowerCase()}-id`,
  nickname,
  avatar: { face: 'face-01', color: 'teal' },
  answered: null,
  connected: true,
  left: nickname === 'Pablo',
}));

/** Luis and Marta tie at the top; Ana comes third. */
const RANKING: NonNullable<GameStateDto['ranking']> = [
  { playerId: 'test-luis-id', points: 250, position: 1, mentalist: true },
  { playerId: 'test-marta-id', points: 250, position: 1, mentalist: true },
  { playerId: 'test-ana-id', points: 180, position: 3, mentalist: false },
];

function atStage(kind: 'results' | 'ended', ranking = RANKING): GameStateDto {
  const game = aGame();
  return aGame({
    players: PLAYERS,
    round: { ...game.round, position: 2, phase: 'reveal', revealedBy: 'host' },
    stage: { kind, movedOnBy: 'test-luis-id' },
    ranking,
  });
}

async function renderPhase(game: GameStateDto) {
  const fake = fakeConnection();
  const { t } = await renderWithProviders(<ResultsPhase onShowQr={() => {}} />, {
    connection: fake.connection,
  });
  act(() => fake.deliver(game));
  return { ...fake, t };
}

describe('ResultsPhase', () => {
  describe('the ranking of who reads the group best', () => {
    it('should rank everyone still in the game by their points, sharing a position on a tie', async () => {
      // Act
      const { t } = await renderPhase(atStage('results'));

      // Assert
      expect(screen.getByRole('heading', { name: t('ranking.title') })).toBeDefined();
      const rows = within(screen.getByRole('list', { name: t('ranking.title') })).getAllByRole(
        'listitem',
      );
      expect(rows.map((row) => row.textContent)).toEqual([
        expect.stringContaining('Luis'),
        expect.stringContaining('Marta'),
        expect.stringContaining('Ana'),
      ]);
      expect(rows[0]?.textContent).toContain(t('ranking.position', { position: 1 }));
      expect(rows[1]?.textContent).toContain(t('ranking.position', { position: 1 }));
      expect(rows[2]?.textContent).toContain(t('ranking.position', { position: 3 }));
      expect(rows[2]?.textContent).toContain(t('ranking.points', { points: 180 }));
    });

    it('should mark El Mentalista, all of them on a tie', async () => {
      // Act
      const { t } = await renderPhase(atStage('results'));

      // Assert
      expect(screen.getAllByRole('img', { name: t('ranking.mentalist') })).toHaveLength(2);
    });

    it('should take everyone from the ranking to the end of the game', async () => {
      // Arrange
      const { connection, t } = await renderPhase(atStage('results'));

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('ranking.next') }));

      // Assert
      expect(connection.send).toHaveBeenCalledWith({ type: 'move-on', fromPosition: 3 });
    });
  });

  describe('the end of the game', () => {
    it('should tell the player their place reading the group', async () => {
      // Act
      const { t } = await renderPhase(atStage('ended'));

      // Assert
      expect(screen.getByRole('heading', { name: t('end.title') })).toBeDefined();
      expect(
        screen.getByText(t('end.place', { position: 3, players: 3, count: 180 })),
      ).toBeDefined();
    });

    it('should tell El Mentalista that nobody read the group better', async () => {
      // Arrange
      const ranking = [
        { playerId: 'test-ana-id', points: 300, position: 1, mentalist: true },
        { playerId: 'test-luis-id', points: 100, position: 2, mentalist: false },
      ];

      // Act
      const { t } = await renderPhase(atStage('ended', ranking));

      // Assert
      expect(screen.getByText(t('end.placeMentalist', { players: 2, count: 300 }))).toBeDefined();
      expect(screen.getByText(t('ranking.mentalist'))).toBeDefined();
    });

    it('should show who is still in the room and who has left', async () => {
      // Act
      const { t } = await renderPhase(atStage('ended'));

      // Assert
      const room = screen.getByRole('region', { name: t('end.inRoom', { count: 3 }) });
      expect(within(room).getAllByRole('listitem')).toHaveLength(3);
      expect(within(room).getByText(t('end.gone', { count: 1, names: 'Pablo' }))).toBeDefined();
    });

    it('should keep on the device the dilemmas the player played', async () => {
      // Arrange
      localStorage.clear();

      // Act
      await renderPhase(atStage('ended'));

      // Assert
      expect(playedDilemmas()).toEqual(atStage('ended').dilemmas.map(({ dilemmaId }) => dilemmaId));
    });

    it('should let the player leave the room', async () => {
      // Arrange
      const { connection, t } = await renderPhase(atStage('ended'));

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('end.leave') }));

      // Assert
      expect(connection.send).toHaveBeenCalledWith({ type: 'leave-room' });
    });
  });
});
