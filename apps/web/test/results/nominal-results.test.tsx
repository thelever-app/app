import { act, fireEvent, screen, within } from '@testing-library/react';
import type { GameStateDto } from '@thelever-app/protocol';
import { describe, expect, it } from 'vitest';
import { playedDilemmas } from '../../src/game/played-dilemmas.ts';
import { ResultsPhase } from '../../src/phases/results-phase.tsx';
import { describeCard, groupCardOf, personalCardOf } from '../../src/results/card-content.ts';
import { fakeConnection } from '../support/fake-connection.ts';
import { aGame } from '../support/game.ts';
import { renderWithProviders } from '../support/render.tsx';

/** Ana uses the screen in a nominal room with Luis and Marta. */
const PLAYERS: GameStateDto['players'] = ['Ana', 'Luis', 'Marta'].map((nickname) => ({
  playerId: `test-${nickname.toLowerCase()}-id`,
  nickname,
  avatar: { face: 'face-01', color: 'teal' },
  answered: false,
  connected: true,
  left: false,
}));

const RESULTS: NonNullable<GameStateDto['results']> = {
  titles: [
    {
      title: 'almas-gemelas',
      winners: [{ playerIds: ['test-ana-id', 'test-marta-id'], count: 4, of: 6 }],
      runnersUp: [],
    },
    {
      title: 'verso-suelto',
      winners: [{ playerIds: ['test-marta-id'], count: 2, of: 3 }],
      runnersUp: [{ playerIds: ['test-ana-id'], count: 1, of: 3 }],
    },
    {
      title: 'el-mentalista',
      winners: [
        { playerIds: ['test-ana-id'], count: 120, of: null },
        { playerIds: ['test-luis-id'], count: 120, of: null },
      ],
      runnersUp: [],
    },
  ],
  knownBestBy: { playerIds: ['test-luis-id', 'test-marta-id'], points: 66 },
  mostDivisiveDilemma: null,
};

const RANKING: NonNullable<GameStateDto['ranking']> = [
  { playerId: 'test-ana-id', points: 120, position: 1, mentalist: true },
  { playerId: 'test-luis-id', points: 120, position: 1, mentalist: true },
  { playerId: 'test-marta-id', points: 55, position: 3, mentalist: false },
];

function atStep(step: number | null, overrides: Partial<GameStateDto> = {}): GameStateDto {
  const game = aGame();
  return aGame({
    players: PLAYERS,
    round: { ...game.round, position: 2, phase: 'reveal', revealedBy: 'host' },
    stage:
      step === null
        ? { kind: 'ended', movedOnBy: 'test-luis-id', step: null }
        : { kind: 'results', movedOnBy: 'test-luis-id', step },
    ranking: RANKING,
    results: RESULTS,
    ...overrides,
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

describe('ResultsPhase, in a nominal room', () => {
  it('should show each title on a screen of its own, with its winners, their fact and the runner-up', async () => {
    // Act
    const { t } = await renderPhase(atStep(1));

    // Assert
    expect(screen.getByRole('heading', { name: t('results.titles.verso-suelto') })).toBeDefined();
    expect(screen.getByTestId('title-winner').textContent).toContain('Marta');
    expect(screen.getByTestId('title-winner').textContent).toContain(
      t('results.facts.verso-suelto', { count: 2, of: 3 }),
    );
    expect(screen.getByTestId('title-runner-up').textContent).toContain('Ana');
    expect(screen.getByText(t('results.label', { step: 2, total: 5 }))).toBeDefined();
  });

  it('should share a title among every winner on a tie, and show both members of a pair', async () => {
    // Act
    await renderPhase(atStep(2));

    // Assert
    expect(screen.getAllByTestId('title-winner').map(({ textContent }) => textContent)).toEqual([
      expect.stringContaining('Ana'),
      expect.stringContaining('Luis'),
    ]);
  });

  it('should take everyone from a screen of the results to the next one', async () => {
    // Arrange
    const { connection, t } = await renderPhase(atStep(1));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('results.next') }));

    // Assert
    expect(connection.send).toHaveBeenCalledWith({ type: 'move-on', fromPosition: 4 });
  });

  it('should let who only watches the results, out of the game, see them without moving anyone on', async () => {
    // Act
    const { t } = await renderPhase(atStep(1, { inGame: false }));
    const onRanking = await renderPhase(atStep(4, { inGame: false }));

    // Assert
    expect(screen.queryByRole('button', { name: t('results.next') })).toBeNull();
    expect(screen.queryByRole('button', { name: onRanking.t('ranking.next') })).toBeNull();
  });

  it('should tell the player alone who knows them best, after the titles', async () => {
    // Act
    const { t } = await renderPhase(atStep(3));

    // Assert
    expect(screen.getByRole('heading', { name: t('results.knowsTitle') })).toBeDefined();
    expect(screen.getByTestId('known-best-names').textContent).toBe('Luis y Marta');
    expect(screen.getByText(t('results.onlyYou'))).toBeDefined();
  });

  it('should end with the ranking, with the badges of the titles each one won', async () => {
    // Act
    const { t } = await renderPhase(atStep(4));

    // Assert
    const rows = within(screen.getByRole('list', { name: t('ranking.nominalTitle') })).getAllByRole(
      'listitem',
    );
    expect(
      within(rows[0]!)
        .getAllByRole('img')
        .map((badge) => badge.getAttribute('aria-label')),
    ).toEqual([t('results.titles.almas-gemelas'), t('results.titles.el-mentalista')]);
    expect(within(rows[2]!).getAllByRole('img')).toHaveLength(2);
  });
});

describe('EndScreen', () => {
  it('should let the host start the rematch, and tell the others who can', async () => {
    // Arrange
    const { connection, t } = await renderPhase(atStep(null));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('end.rematch') }));

    // Assert
    expect(connection.send).toHaveBeenCalledWith({ type: 'start-rematch' });
  });

  it('should tell a guest the host can start the rematch, without the button', async () => {
    // Act
    const { t } = await renderPhase(atStep(null, { hostId: 'test-luis-id' }));

    // Assert
    expect(screen.queryByRole('button', { name: t('end.rematch') })).toBeNull();
    expect(screen.getByText(t('end.rematchGuest', { host: 'Luis' }))).toBeDefined();
  });

  it('should tell the player their place and who knows them best', async () => {
    // Act
    const { t } = await renderPhase(atStep(null));

    // Assert
    expect(screen.getByTestId('end-place').textContent).toBe(
      `${t('end.placeNominal', { position: 1, players: 3, count: 120 })} ${t('end.knownBest', {
        names: 'Luis y Marta',
      })}`,
    );
  });

  it('should open the card of the player, with the nicknames of the others hidden until shown', async () => {
    // Arrange
    const { t } = await renderPhase(atStep(null));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('end.shareCard') }));

    // Assert
    const card = await screen.findByTestId('share-card');
    expect(card.getAttribute('aria-label')).not.toContain('Luis');
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByTestId('share-card').getAttribute('aria-label')).toContain('Luis');
  });

  it('should keep nothing played for who joined once the game had ended, nor offer a card', async () => {
    // Arrange
    localStorage.clear();

    // Act
    const { t } = await renderPhase(atStep(null, { inGame: false, ranking: RANKING }));

    // Assert
    expect(playedDilemmas()).toEqual([]);
    expect(screen.queryByRole('button', { name: t('end.shareCard') })).toBeNull();
    expect(screen.getByText(t('end.notInGame'))).toBeDefined();
  });
});

describe('the cards', () => {
  const t = ((key: string, options?: Record<string, unknown>) =>
    `${key}${options ? JSON.stringify(options) : ''}`) as unknown as Parameters<
    typeof personalCardOf
  >[1];

  it('should put on the card of the player their place, who knows them best and their titles with the partner', () => {
    // Act
    const shown = personalCardOf(atStep(null), t, true);
    const hidden = personalCardOf(atStep(null), t, false);

    // Assert
    expect(shown.headline).toBe('card.place{"position":1,"players":3}');
    expect(shown.sections).toEqual([
      {
        kind: 'people',
        label: 'card.knowsMe',
        people: [
          { avatar: PLAYERS[1]!.avatar, name: 'Luis' },
          { avatar: PLAYERS[2]!.avatar, name: 'Marta' },
        ],
      },
      {
        kind: 'chips',
        label: 'card.myTitles',
        chips: [
          {
            text: 'results.titles.almas-gemelas',
            people: [{ avatar: PLAYERS[2]!.avatar, name: 'Marta' }],
          },
          { text: 'results.titles.el-mentalista', people: [] },
        ],
      },
    ]);
    expect(describeCard(shown, t)).toContain(
      'card.withPartner{"title":"results.titles.almas-gemelas","name":"Marta"}',
    );
    expect(describeCard(hidden, t)).not.toContain('Marta');
    expect(describeCard(hidden, t)).toContain(
      'card.withPartner{"title":"results.titles.almas-gemelas","name":"card.someone"}',
    );
  });

  it('should put on the card of the group the dilemma that divided it most, with the gap as «alguien del grupo»', () => {
    // Arrange
    const game = atStep(null, {
      dilemmas: [
        {
          dilemmaId: 'test-dilemma-1',
          personInTheGap: 'test-luis-id',
          text: 'Si {gap} miente, ¿qué haces?',
          options: [
            { optionId: 'test-option-a', text: 'Decírselo a {gap}' },
            { optionId: 'test-option-b', text: 'Callar' },
          ],
        },
      ],
      results: {
        titles: [],
        knownBestBy: null,
        mostDivisiveDilemma: {
          dilemmaId: 'test-dilemma-1',
          distribution: [
            { optionId: 'test-option-a', count: 2 },
            { optionId: 'test-option-b', count: 1 },
          ],
        },
      },
    });

    // Act
    const card = groupCardOf(game, t);

    // Assert
    expect(card.sections).toEqual([
      {
        kind: 'dilemma',
        label: 'card.mostDivisive',
        text: 'Si pickDilemmas.someone miente, ¿qué haces?',
        bars: [
          { text: 'Decírselo a pickDilemmas.someone', percent: 67 },
          { text: 'Callar', percent: 33 },
        ],
      },
    ]);
  });
});
