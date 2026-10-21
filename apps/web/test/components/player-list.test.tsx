import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayerList } from '../../src/components/player-list.tsx';
import { aGame } from '../support/game.ts';
import { renderWithProviders } from '../support/render.tsx';

/** Ana is the player using the screen; Luis has finished; Marta goes last. */
const PLAYERS = [
  { playerId: 'test-ana-id', nickname: 'Ana', progress: 2 },
  { playerId: 'test-luis-id', nickname: 'Luis', progress: 6 },
  { playerId: 'test-marta-id', nickname: 'Marta', progress: 1 },
];

function renderList(players = PLAYERS) {
  return renderWithProviders(<PlayerList players={players} dilemmaCount={6} />, {
    game: aGame({ playerId: 'test-ana-id' }),
  });
}

describe('PlayerList', () => {
  it('should list who has not finished, the least advanced first', async () => {
    // Act
    const { t } = await renderList();

    // Assert
    const pending = screen.getByRole('region', { name: t('playerList.pending', { count: 2 }) });
    expect(
      within(pending)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      `Marta${t('playerList.progressCount', { progress: 1, total: 6 })}`,
      `${t('playerList.you')}${t('playerList.progressCount', { progress: 2, total: 6 })}`,
    ]);
  });

  it('should show the progress of each one as a bar', async () => {
    // Act
    const { t } = await renderList();

    // Assert
    const bar = screen.getByRole<HTMLProgressElement>('progressbar', {
      name: t('playerList.progressOf', { name: 'Marta' }),
    });
    expect([bar.value, bar.max]).toEqual([1, 6]);
  });

  it('should list who has finished', async () => {
    // Act
    const { t } = await renderList();

    // Assert
    const done = screen.getByRole('region', { name: t('playerList.done', { count: 1 }) });
    expect(within(done).getByRole('listitem').textContent).toContain('Luis');
    expect(within(done).getByRole('img', { name: t('playerList.finished') })).toBeDefined();
  });

  it('should call the player by the word for "you", not by their nickname', async () => {
    // Act
    const { t } = await renderList();

    // Assert
    expect(screen.queryByText('Ana')).toBeNull();
    expect(screen.getByText(t('playerList.you'))).toBeDefined();
  });

  it('should not show who is missing when everyone has finished', async () => {
    // Act
    const { t } = await renderList(PLAYERS.map((player) => ({ ...player, progress: 6 })));

    // Assert
    expect(screen.getAllByRole('region')).toHaveLength(1);
    expect(screen.getByRole('region', { name: t('playerList.done', { count: 3 }) })).toBeDefined();
  });
});
