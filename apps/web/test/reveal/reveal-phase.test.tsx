import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { GameStateDto } from '@thelever-app/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RevealPhase } from '../../src/phases/reveal-phase.tsx';
import { REVEAL_INTRO_MS } from '../../src/reveal/reveal-intro.tsx';
import { aGame } from '../support/game.ts';
import { fakeConnection } from '../support/fake-connection.ts';
import { providersFor } from '../support/render.tsx';

const AVATAR = { face: 'face-01', color: 'teal' } as const;

/** Ana uses the screen; Luis and Marta play with her, and Pablo did not vote. */
const PLAYERS: GameStateDto['players'] = ['Ana', 'Luis', 'Marta', 'Pablo'].map((nickname) => ({
  playerId: `test-${nickname.toLowerCase()}-id`,
  nickname,
  avatar: AVATAR,
  answered: nickname !== 'Pablo',
  connected: true,
  left: false,
}));

type Reveal = NonNullable<GameStateDto['reveal']>;

/** The reveal of the first dilemma of a nominal room: Ana and Marta pulled, Luis did nothing. */
const NOMINAL_REVEAL: Reveal = {
  position: 0,
  dilemmaId: 'test-dilemma-1',
  distribution: [
    { optionId: 'test-option-1a', count: 2 },
    { optionId: 'test-option-1b', count: 1 },
  ],
  tooFewVotes: false,
  voteCount: 3,
  didNotVoteCount: 1,
  votes: [
    { playerId: 'test-ana-id', vote: 'test-option-1a' },
    { playerId: 'test-luis-id', vote: 'test-option-1b' },
    { playerId: 'test-marta-id', vote: 'test-option-1a' },
    { playerId: 'test-pablo-id', vote: null },
  ],
  votePredictions: [
    { playerId: 'test-ana-id', aboutId: 'test-luis-id', vote: 'test-option-1b', right: true },
    { playerId: 'test-ana-id', aboutId: 'test-marta-id', vote: 'test-option-1b', right: false },
    { playerId: 'test-marta-id', aboutId: 'test-ana-id', vote: 'test-option-1a', right: true },
    { playerId: 'test-luis-id', aboutId: 'test-ana-id', vote: 'test-option-1a', right: true },
  ],
  personInTheGap: null,
  addedBy: 'test-luis-id',
};

function revealed(reveal: Reveal, overrides: Partial<GameStateDto> = {}): GameStateDto {
  return aGame({
    players: PLAYERS,
    answeredCount: 3,
    round: {
      position: reveal.position,
      phase: 'reveal',
      endsAt: '2026-11-09T10:01:00.000Z',
      revealedBy: 'time',
      movedOnBy: null,
    },
    reveal,
    ...overrides,
  });
}

/** The same reveal in an anonymous room, which never tells who voted what. */
const ANONYMOUS_REVEAL: Reveal = {
  ...NOMINAL_REVEAL,
  votes: [],
  votePredictions: [],
  addedBy: null,
};
const ANONYMOUS_PLAYERS = PLAYERS.map((player) => ({ ...player, answered: null }));

/** Renders the phase with the clock faked once the translations are loaded, and lets the passage go. */
async function renderReveal(game: GameStateDto, { pastTheIntro = true } = {}) {
  const fake = fakeConnection();
  const { Providers, t } = await providersFor({ connection: fake.connection });
  vi.useFakeTimers();
  render(<RevealPhase onShowQr={() => {}} />, { wrapper: Providers });
  act(() => fake.deliver(game));
  if (pastTheIntro) act(() => vi.advanceTimersByTime(REVEAL_INTRO_MS));
  return { ...fake, t };
}

describe('RevealPhase', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should first mark the passage from the decision to the reveal, for a moment', async () => {
    // Act
    const { t } = await renderReveal(revealed(NOMINAL_REVEAL), { pastTheIntro: false });
    const intro = screen.queryByRole('heading', { name: t('reveal.introTitle') });
    const answered = screen.queryByText(t('reveal.introAnswered', { count: 3, total: 4 }), {
      exact: false,
    });
    act(() => vi.advanceTimersByTime(REVEAL_INTRO_MS));

    // Assert
    expect(intro).not.toBeNull();
    expect(answered).not.toBeNull();
    expect(screen.queryByRole('heading', { name: t('reveal.introTitle') })).toBeNull();
    expect(screen.getByRole('main', { name: t('reveal.region') })).toBeDefined();
  });

  it('should count in the passage only who was asked the dilemma, not who joined after it', async () => {
    // Arrange: Pedro joined once the dilemma was revealed.
    const pedro = { ...PLAYERS[0]!, playerId: 'test-pedro-id', nickname: 'Pedro' };

    // Act
    const { t } = await renderReveal(
      revealed(NOMINAL_REVEAL, { players: [...PLAYERS, pedro], answeredCount: 1 }),
      { pastTheIntro: false },
    );

    // Assert
    expect(
      screen.getByText(t('reveal.introAnswered', { count: 3, total: 4 }), { exact: false }),
    ).toBeDefined();
  });

  describe('nominal room', () => {
    it('should show each option in the order the player saw it, how many chose it and who', async () => {
      // Act
      const { t } = await renderReveal(revealed(NOMINAL_REVEAL));

      // Assert
      const options = screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent);
      expect(options).toEqual(['Opción 1A', 'Opción 1B']);
      const pulled = screen.getByRole('heading', { name: 'Opción 1A' }).closest('section')!;
      expect(within(pulled).getByText('A')).toBeDefined();
      expect(
        within(pulled).getByText(t('reveal.optionCount', { count: 2, percent: '67%' })),
      ).toBeDefined();
      expect(
        within(pulled)
          .getAllByRole('listitem')
          .map((item) => item.getAttribute('aria-label')),
      ).toEqual([
        t('playerList.you', { name: 'Ana' }),
        t('reveal.voterMissed', { name: 'Marta', letter: 'B' }),
      ]);
      const nothing = screen.getByRole('heading', { name: 'Opción 1B' }).closest('section')!;
      expect(within(nothing).getByRole('listitem').getAttribute('aria-label')).toBe(
        t('reveal.voterRight', { name: 'Luis' }),
      );
    });

    it('should tell the player what they said about whoever they missed, next to their vote', async () => {
      // Act
      const { t } = await renderReveal(revealed(NOMINAL_REVEAL));

      // Assert
      const marta = screen.getByRole('listitem', {
        name: t('reveal.voterMissed', { name: 'Marta', letter: 'B' }),
      });
      expect(
        within(marta).getByText(t('reveal.guessed', { letter: 'B' }), { exact: false }),
      ).toBeDefined();
    });

    it('should sum up the predictions about those who voted, naming who the player missed', async () => {
      // Arrange: Ana also predicted Pablo, who did not vote: that one does not count.
      const reveal = {
        ...NOMINAL_REVEAL,
        votePredictions: [
          ...NOMINAL_REVEAL.votePredictions,
          {
            playerId: 'test-ana-id',
            aboutId: 'test-pablo-id',
            vote: 'test-option-1a',
            right: false,
          },
        ],
      };

      // Act
      const { t } = await renderReveal(revealed(reveal));

      // Assert
      const summary = screen.getByRole('region', { name: t('reveal.yourHitsRegion') });
      expect(
        within(summary).getByText(t('reveal.hitsCount', { right: 1, count: 2 })),
      ).toBeDefined();
      expect(within(summary).getByText(t('reveal.missedOne', { name: 'Marta' }))).toBeDefined();
    });

    it('should celebrate when the player read everyone right', async () => {
      // Arrange
      const votePredictions = NOMINAL_REVEAL.votePredictions.map((prediction) =>
        prediction.aboutId === 'test-marta-id'
          ? { ...prediction, vote: 'test-option-1a', right: true }
          : prediction,
      );

      // Act
      const { t } = await renderReveal(revealed({ ...NOMINAL_REVEAL, votePredictions }));

      // Assert
      const summary = screen.getByRole('region', { name: t('reveal.yourHitsRegion') });
      expect(summary.getAttribute('data-all')).toBe('true');
      expect(within(summary).getByText(t('reveal.hitsAll'))).toBeDefined();
      expect(
        within(summary).getByText(t('reveal.hitsCount', { right: 2, count: 2 })),
      ).toBeDefined();
    });

    it('should say so when the player read nobody right', async () => {
      // Arrange
      const votePredictions = NOMINAL_REVEAL.votePredictions.map((prediction) =>
        prediction.playerId === 'test-ana-id' ? { ...prediction, right: false } : prediction,
      );

      // Act
      const { t } = await renderReveal(revealed({ ...NOMINAL_REVEAL, votePredictions }));

      // Assert
      const summary = screen.getByRole('region', { name: t('reveal.yourHitsRegion') });
      expect(within(summary).getByText(t('reveal.missedAll'))).toBeDefined();
    });

    it('should say so of an option nobody chose', async () => {
      // Arrange
      const distribution = [
        { optionId: 'test-option-1a', count: 3 },
        { optionId: 'test-option-1b', count: 0 },
      ];
      const votes = NOMINAL_REVEAL.votes.map((vote) =>
        vote.vote === 'test-option-1b' ? { ...vote, vote: 'test-option-1a' } : vote,
      );

      // Act
      const { t } = await renderReveal(revealed({ ...NOMINAL_REVEAL, distribution, votes }));

      // Assert
      const nothing = screen.getByRole('heading', { name: 'Opción 1B' }).closest('section')!;
      expect(within(nothing).getByText(t('reveal.nobodyChose'))).toBeDefined();
    });

    it('should say who did not vote, apart from the distribution', async () => {
      // Act
      const { t } = await renderReveal(revealed(NOMINAL_REVEAL));

      // Assert
      expect(screen.getByText(t('reveal.didNotVote', { count: 1, names: 'Pablo' }))).toBeDefined();
    });

    it('should say who did not vote in the plural when they are several', async () => {
      // Arrange
      const votes = NOMINAL_REVEAL.votes.map((vote) =>
        vote.playerId === 'test-luis-id' ? { ...vote, vote: null } : vote,
      );

      // Act
      const { t } = await renderReveal(revealed({ ...NOMINAL_REVEAL, votes }));

      // Assert
      expect(
        screen.getByText(t('reveal.didNotVote', { count: 2, names: 'Luis y Pablo' })),
      ).toBeDefined();
    });

    it('should say who added the dilemma and who it was about', async () => {
      // Act
      const { t } = await renderReveal(
        revealed({ ...NOMINAL_REVEAL, personInTheGap: 'test-marta-id' }),
      );

      // Assert
      expect(screen.getByText(t('reveal.addedBy', { name: 'Luis' }))).toBeDefined();
      expect(screen.getByText(t('reveal.about', { name: 'Marta' }))).toBeDefined();
    });
  });

  describe('anonymous room', () => {
    it('should show only how many chose each option and how many did not vote', async () => {
      // Act
      const { t } = await renderReveal(revealed(ANONYMOUS_REVEAL, { players: ANONYMOUS_PLAYERS }));

      // Assert
      expect(screen.getByText(t('reveal.optionCount', { count: 1, percent: '33%' }))).toBeDefined();
      expect(screen.queryAllByRole('listitem', { name: /acert/ })).toHaveLength(0);
      expect(
        screen.getByText(t('reveal.anonymousDidNotVote', { count: 1 }), { exact: false }),
      ).toBeDefined();
    });

    it('should say there were too few votes to show the distribution, counting only who was asked', async () => {
      // Arrange: a fifth player joined once the dilemma was revealed.
      const late = { ...ANONYMOUS_PLAYERS[0]!, playerId: 'test-pedro-id', nickname: 'Pedro' };

      // Act
      const { t } = await renderReveal(
        revealed(
          {
            ...ANONYMOUS_REVEAL,
            distribution: null,
            tooFewVotes: true,
            voteCount: 2,
            didNotVoteCount: 2,
          },
          { players: [...ANONYMOUS_PLAYERS, late] },
        ),
      );

      // Assert
      const status = screen.getByRole('status').textContent;
      expect(status).toContain(t('reveal.fewVotesTitle'));
      expect(status).toContain(t('reveal.fewVotesVoted', { count: 2 }));
      expect(screen.queryByRole('heading', { name: 'Opción 1A' })).toBeNull();
    });
  });

  it('should take everyone to the next round from this one', async () => {
    // Arrange
    const { connection, t } = await renderReveal(revealed(NOMINAL_REVEAL));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('reveal.next') }));

    // Assert
    expect(connection.send).toHaveBeenCalledWith({ type: 'move-on', fromPosition: 0 });
  });

  it('should not offer a next round on the last one', async () => {
    // Act
    const { t } = await renderReveal(
      revealed({ ...NOMINAL_REVEAL, position: 2, dilemmaId: 'test-dilemma-3' }),
    );

    // Assert
    expect(screen.queryByRole('button', { name: t('reveal.next') })).toBeNull();
  });

  it('should show no points of anyone', async () => {
    // Act
    await renderReveal(revealed(NOMINAL_REVEAL));

    // Assert
    expect(screen.queryByText(/punto/i)).toBeNull();
  });
});
