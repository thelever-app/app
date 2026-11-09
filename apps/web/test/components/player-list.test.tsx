import { screen, within } from '@testing-library/react';
import type { GameStateDto } from '@thelever-app/protocol';
import { describe, expect, it } from 'vitest';
import { PlayerList } from '../../src/components/player-list.tsx';
import { aGame } from '../support/game.ts';
import { renderWithProviders } from '../support/render.tsx';

/** Ana is the player using the screen; Luis answered the dilemma of the round; Pablo left. */
const PLAYERS: GameStateDto['players'] = [
  {
    playerId: 'test-ana-id',
    nickname: 'Ana',
    avatar: { face: 'face-01', color: 'teal' },
    answered: false,
    connected: true,
    left: false,
  },
  {
    playerId: 'test-luis-id',
    nickname: 'Luis',
    avatar: { face: 'face-02', color: 'rust' },
    answered: true,
    connected: true,
    left: false,
  },
  {
    playerId: 'test-marta-id',
    nickname: 'Marta',
    avatar: { face: 'face-03', color: 'olive' },
    answered: false,
    connected: true,
    left: false,
  },
  {
    playerId: 'test-pablo-id',
    nickname: 'Pablo',
    avatar: { face: 'face-04', color: 'cyan' },
    answered: false,
    connected: false,
    left: true,
  },
];

function renderList(players = PLAYERS, anonymous = false) {
  const answeredCount = players.filter(({ answered }) => answered).length;
  return renderWithProviders(
    <PlayerList game={{ players, answeredCount }} anonymous={anonymous} />,
    { game: aGame({ playerId: 'test-ana-id' }) },
  );
}

const anonymized = (answeredCount: number) =>
  renderList(
    PLAYERS.map((player) => ({ ...player, answered: null })),
    true,
  ).then((result) => ({ ...result, answeredCount }));

describe('PlayerList', () => {
  it('should list who has not answered the round, leaving out who left', async () => {
    // Act
    const { t } = await renderList();

    // Assert
    const pending = screen.getByRole('region', { name: t('playerList.pending', { count: 2 }) });
    expect(
      within(pending)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([t('playerList.you', { name: 'Ana' }), 'Marta']);
  });

  it('should say who has not answered and is disconnected, after their name', async () => {
    // Arrange
    const players = PLAYERS.map((player) =>
      player.nickname === 'Marta' ? { ...player, connected: false } : player,
    );

    // Act
    const { t } = await renderList(players);

    // Assert
    const pending = screen.getByRole('region', { name: t('playerList.pending', { count: 2 }) });
    const [ana, marta] = within(pending).getAllByRole('listitem');
    expect(marta?.textContent).toBe(`Marta · ${t('playerList.disconnected')}`);
    expect(ana?.textContent).not.toContain(t('playerList.disconnected'));
  });

  it('should list who has answered', async () => {
    // Act
    const { t } = await renderList();

    // Assert
    const done = screen.getByRole('region', { name: t('playerList.done', { count: 1 }) });
    expect(within(done).getByRole('listitem').textContent).toContain('Luis');
    expect(within(done).getByRole('img', { name: t('playerList.answered') })).toBeDefined();
  });

  it('should not show who is missing when everyone has answered', async () => {
    // Act
    const { t } = await renderList(PLAYERS.map((player) => ({ ...player, answered: true })));

    // Assert
    expect(screen.getAllByRole('region')).toHaveLength(1);
    expect(screen.getByRole('region', { name: t('playerList.done', { count: 4 }) })).toBeDefined();
  });

  it('should only say how many answered in an anonymous room, and who is in it', async () => {
    // Act
    const { t } = await anonymized(0);

    // Assert
    expect(screen.queryByRole('img', { name: t('playerList.answered') })).toBeNull();
    expect(screen.queryByText(t('playerList.pending', { count: 3 }))).toBeNull();
    expect(screen.getByText(t('playerList.anonymousNote'))).toBeDefined();
    const inRoom = screen.getByRole('region', { name: t('playerList.inRoom', { count: 3 }) });
    expect(within(inRoom).getAllByRole('listitem')).toHaveLength(3);
  });
});
