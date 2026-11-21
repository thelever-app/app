import type { LobbyRoundDto } from '@thelever-app/protocol';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { soundPreference } from '../../src/sound/sound-preference.ts';
import { AS_LUIS, FOUND, renderLobby } from '../support/lobby.tsx';
import { aRoom, DEFAULT_ROUNDS } from '../support/room.ts';
import { fakeRoomApi } from '../support/routing.tsx';

/** Ana chose La palanca for round 1, round 2 is random, and round 3 is for the players. */
const MIXED_ROUNDS: LobbyRoundDto[] = [
  {
    roundId: 1,
    origin: 'specific',
    dilemma: { dilemmaId: 'test-dilemma-9', text: 'La palanca', hasGap: false },
  },
  { roundId: 2, origin: 'random', categories: null, content: [], withoutNewDilemmas: false },
  { roundId: 3, origin: 'players', dilemma: null, chosenByYou: false },
];

/** The rows of the rounds of the lobby, each one as it reads. */
function roundRowsShown(t: Awaited<ReturnType<typeof renderLobby>>['t'], count: number): string[] {
  const rounds = screen.getByRole('region', { name: t('lobby.rounds.title', { count }) });
  return within(rounds)
    .getAllByRole('listitem')
    .map((row) => row.textContent ?? '');
}

describe('LobbyScreen', () => {
  describe('compromising dilemmas', () => {
    const anonymousWith = (compromisingDilemmas: boolean) => ({
      ...aRoom().settings,
      variant: 'anonymous' as const,
      compromisingDilemmas,
    });

    it('should warn a player who enters a room with compromising dilemmas, and let them stay', async () => {
      // Arrange
      const { t } = await renderLobby(aRoom({ ...AS_LUIS, settings: anonymousWith(true) }));

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('compromisingNotice.understood') }));

      // Assert
      expect(screen.queryByRole('dialog', { name: t('compromisingNotice.title') })).toBeNull();
      expect(screen.getByText(t('lobby.compromising.name'))).toBeDefined();
    });

    it('should warn the players, not the host, when the host turns them on', async () => {
      // Arrange
      const asLuis = await renderLobby(aRoom({ ...AS_LUIS, settings: anonymousWith(false) }));

      // Act
      act(() => asLuis.deliver(aRoom({ ...AS_LUIS, settings: anonymousWith(true) })));

      // Assert
      expect(
        screen.getByRole('dialog', { name: asLuis.t('compromisingNotice.title') }),
      ).toBeDefined();
    });

    it('should never warn the host', async () => {
      // Act
      const { t } = await renderLobby(aRoom({ settings: anonymousWith(true) }));

      // Assert
      expect(screen.queryByRole('dialog', { name: t('compromisingNotice.title') })).toBeNull();
    });

    it('should take who leaves from the warning out of the room', async () => {
      // Arrange
      const { t, send } = await renderLobby(aRoom({ ...AS_LUIS, settings: anonymousWith(true) }));

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('compromisingNotice.leave') }));

      // Assert
      expect(send).toHaveBeenCalledWith({ type: 'leave-room' });
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  describe('what everyone sees', () => {
    it('should show once a player who leaves and comes back before their row has gone', async () => {
      // Arrange
      const room = aRoom();
      const { t, deliver } = await renderLobby(room);
      act(() =>
        deliver(aRoom({ roomVersion: room.roomVersion + 1, players: room.players.slice(0, 2) })),
      );

      // Act
      act(() => deliver(aRoom({ roomVersion: room.roomVersion + 2 })));
      const avatarAnimationEnds = document.querySelector('[data-player-id="test-marta-id"] img');
      if (avatarAnimationEnds) fireEvent.animationEnd(avatarAnimationEnds);

      // Assert
      const list = screen.getByRole('region', { name: t('lobby.players', { count: 3 }) });
      expect(
        within(list)
          .getAllByRole('listitem')
          .map((row) => row.textContent),
      ).toEqual([`${t('lobby.you', { name: 'Ana' })}${t('lobby.host')}`, 'Luis', 'Marta']);
      expect(document.querySelector('[data-leaving]')).toBeNull();
    });

    it('should keep a player who leaves on screen while they go, hidden from assistive technology', async () => {
      // Arrange
      const room = aRoom();
      const { t, deliver } = await renderLobby(room);
      const list = () => screen.getByRole('region', { name: t('lobby.players', { count: 2 }) });

      // Act
      act(() =>
        deliver(aRoom({ roomVersion: room.roomVersion + 1, players: room.players.slice(0, 2) })),
      );
      const leaving = document.querySelector<HTMLElement>('[data-leaving]');
      const named = within(list())
        .getAllByRole('listitem')
        .map((row) => row.textContent);
      const inside = leaving?.querySelector('img');
      if (inside) fireEvent.animationEnd(inside);
      const stillGoing = document.querySelector('[data-leaving]') !== null;
      if (leaving) fireEvent.animationEnd(leaving);

      // Assert
      expect(leaving?.textContent).toBe('Marta');
      expect(stillGoing).toBe(true);
      expect(named).toEqual([`${t('lobby.you', { name: 'Ana' })}${t('lobby.host')}`, 'Luis']);
      expect(document.querySelector('[data-leaving]')).toBeNull();
    });

    it('should let any player mute the game from the lobby, and remember it on the device', async () => {
      // Arrange
      const { t } = await renderLobby();
      const mute = screen.getByRole('button', { name: t('sound.mute') });
      const before = mute.getAttribute('aria-pressed');

      // Act
      fireEvent.click(mute);

      // Assert
      expect(before).toBe('false');
      expect(mute.getAttribute('aria-pressed')).toBe('true');
      expect(soundPreference().isMuted()).toBe(true);
    });

    it('should show the code to invite with and who is in the room, the host marked', async () => {
      // Act
      const { t } = await renderLobby();

      // Assert
      expect(screen.getByLabelText('K 7 M 2 Q')).toBeDefined();
      const players = screen.getByRole('region', { name: t('lobby.players', { count: 3 }) });
      const rows = within(players).getAllByRole('listitem');
      expect(rows.map((row) => row.textContent)).toEqual([
        `${t('lobby.you', { name: 'Ana' })}${t('lobby.host')}`,
        'Luis',
        'Marta',
      ]);
    });

    it('should sum up the configuration and the kind of room', async () => {
      // Act
      const { t } = await renderLobby(
        aRoom({ settings: { ...aRoom().settings, variant: 'anonymous' } }),
      );

      // Assert
      expect(screen.getByText(t('variant.anonymous.name'))).toBeDefined();
      expect(screen.getByTestId('room-dilemmas').textContent).toBe('8 rondas');
      expect(screen.getByTestId('room-settings').textContent).toBe('60 s por dilema');
    });

    it('should show consecutive random rounds of the same categories in one row', async () => {
      // Act
      const { t } = await renderLobby();

      // Assert
      expect(roundRowsShown(t, 8)).toEqual([
        '1–8Todas las categorías8 rondas aleatorias del catálogo',
      ]);
      expect(screen.getByText(t('lobby.rounds.hint'))).toBeDefined();
    });

    it('should show each round in its order, grouping only random rounds of the same categories', async () => {
      // Arrange
      const rounds: LobbyRoundDto[] = [
        {
          roundId: 1,
          origin: 'random',
          categories: ['honesty'],
          content: [],
          withoutNewDilemmas: false,
        },
        {
          roundId: 2,
          origin: 'random',
          categories: ['honesty'],
          content: [],
          withoutNewDilemmas: false,
        },
        {
          roundId: 3,
          origin: 'random',
          categories: ['loyalty', 'honesty'],
          content: [],
          withoutNewDilemmas: false,
        },
        {
          roundId: 4,
          origin: 'random',
          categories: ['honesty', 'loyalty'],
          content: [],
          withoutNewDilemmas: false,
        },
        {
          roundId: 5,
          origin: 'random',
          categories: ['honesty', 'loyalty', 'justice'],
          content: [],
          withoutNewDilemmas: false,
        },
        {
          roundId: 6,
          origin: 'random',
          categories: null,
          content: [],
          withoutNewDilemmas: false,
        },
      ];

      // Act
      const { t } = await renderLobby(aRoom({ rounds }));

      // Assert
      expect(roundRowsShown(t, 6)).toEqual([
        '1–2Honestidad2 rondas aleatorias, de esta categoría',
        '3–4Lealtad o Honestidad2 rondas aleatorias, de estas categorías',
        '53 categoríasAleatorio, de estas categorías',
        '6Todas las categoríasAleatorio del catálogo',
      ]);
    });

    it('should show the dilemma the host chose, and the round from the web followed by the random ones', async () => {
      // Arrange
      const rounds: LobbyRoundDto[] = [
        {
          roundId: 1,
          origin: 'specific',
          dilemma: { dilemmaId: 'test-dilemma-9', text: 'La palanca', hasGap: false },
        },
        ...DEFAULT_ROUNDS.slice(1),
      ];

      // Act
      const { t } = await renderLobby(aRoom({ ...AS_LUIS, rounds }));

      // Assert
      expect(roundRowsShown(t, 8)).toEqual([
        '1La palancaLo ha elegido Ana',
        '2–8Todas las categorías7 rondas aleatorias del catálogo',
      ]);
    });

    it('should tell the host they chose the dilemma of a specific round', async () => {
      // Act
      const { t } = await renderLobby(aRoom({ rounds: MIXED_ROUNDS }));

      // Assert
      expect(roundRowsShown(t, 3)[0]).toBe('1La palancaLo has elegido tú');
    });

    it('should show the title of a round a player filled, never who, and the hint of the secret', async () => {
      // Arrange
      const rounds: LobbyRoundDto[] = [
        ...MIXED_ROUNDS.slice(0, 2),
        {
          roundId: 3,
          origin: 'players',
          dilemma: { dilemmaId: 'test-dilemma-1', text: 'TestText1', hasGap: false },
          chosenByYou: false,
        },
      ];

      // Act
      const { t } = await renderLobby(aRoom({ ...AS_LUIS, rounds }));

      // Assert
      const [, , filled] = roundRowsShown(t, 3);
      expect(filled).toBe('3TestText1Lo ha elegido un jugador');
      expect(filled).not.toMatch(/Ana|Luis|Marta/);
      expect(screen.getByText(t('lobby.rounds.secretHint'))).toBeDefined();
      expect(
        screen.queryByRole('button', { name: t('lobby.rounds.clearLabel', { number: 3 }) }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', { name: t('lobby.rounds.chooseLabel', { number: 3 }) }),
      ).toBeNull();
    });

    it.each([
      ['anonymous', 3, 4],
      ['nominal', 2, 3],
    ] as const)(
      'should warn a %s room of %i that a dilemma about someone in the group needs %i players',
      async (variant, players, minimum) => {
        // Arrange
        const room = aRoom();
        const rounds: LobbyRoundDto[] = [
          {
            roundId: 1,
            origin: 'players',
            dilemma: { dilemmaId: 'test-dilemma-9', text: 'Le mientes a {gap}', hasGap: true },
            chosenByYou: false,
          },
        ];

        // Act
        const { t } = await renderLobby(
          aRoom({
            rounds,
            settings: { ...room.settings, variant },
            players: room.players.slice(0, players),
            minimumPlayersForTheGap: minimum,
          }),
        );

        // Assert
        const warning = screen.getByRole('status', { name: '' });
        expect(warning.textContent).toContain(t('lobby.gapWarningTitle'));
        expect(warning.textContent).toContain(t('lobby.gapWarning', { minimum }));
      },
    );

    it('should not warn of a dilemma about someone in the group with enough players', async () => {
      // Arrange
      const rounds: LobbyRoundDto[] = [
        {
          roundId: 1,
          origin: 'specific',
          dilemma: { dilemmaId: 'test-dilemma-9', text: 'Le mientes a {gap}', hasGap: true },
        },
      ];

      // Act
      const { t } = await renderLobby(aRoom({ rounds }));

      // Assert
      expect(screen.queryByText(t('lobby.gapWarningTitle'))).toBeNull();
    });

    it('should show the gap of a dilemma of a round as someone in the group', async () => {
      // Arrange
      const rounds: LobbyRoundDto[] = [
        {
          roundId: 1,
          origin: 'specific',
          dilemma: { dilemmaId: 'test-dilemma-9', text: 'Le mientes a {gap}', hasGap: true },
        },
      ];

      // Act
      const { t } = await renderLobby(aRoom({ rounds }));

      // Assert
      expect(roundRowsShown(t, 1)[0]).toContain(`Le mientes a ${t('pickDilemmas.someone')}`);
    });

    it('should let only the player who chose the dilemma of a round take it out', async () => {
      // Arrange
      const rounds: LobbyRoundDto[] = [
        ...MIXED_ROUNDS.slice(0, 2),
        {
          roundId: 3,
          origin: 'players',
          dilemma: { dilemmaId: 'test-dilemma-1', text: 'TestText1', hasGap: false },
          chosenByYou: true,
        },
      ];
      const { t, send } = await renderLobby(aRoom({ ...AS_LUIS, rounds }));
      const shown = roundRowsShown(t, 3)[2];

      // Act
      fireEvent.click(
        screen.getByRole('button', { name: t('lobby.rounds.clearLabel', { number: 3 }) }),
      );

      // Assert
      expect(shown).toBe('3TestText1Lo has elegido tú');
      expect(send).toHaveBeenCalledWith({ type: 'clear-round-dilemma', roundId: 3 });
    });

    it('should advise a video call to a group that plays remotely', async () => {
      // Act
      const { t } = await renderLobby(aRoom({ place: 'remote' }));

      // Assert
      expect(screen.getByRole('note').textContent).toBe(t('lobby.remote'));
    });

    it('should copy the invitation link where the device cannot share it', async () => {
      // Arrange
      const writeText = vi.fn(async () => {});
      vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } });
      const { t } = await renderLobby();

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('lobby.share') }));

      // Assert
      await screen.findByRole('button', { name: t('lobby.copied') });
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/join/K7M2Q`);
    });

    it('should show at full screen a QR that leads to the room', async () => {
      // Arrange
      const { t } = await renderLobby();

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('lobby.showQr') }));

      // Assert
      const qr = screen.getByRole('img', { name: t('qr.label', { code: 'K7M2Q' }) });
      expect(qr.dataset.link).toBe(`${window.location.origin}/join/K7M2Q`);
    });
  });

  describe('the host', () => {
    it('should start the game once the room has the players it needs', async () => {
      // Arrange
      const { t, send } = await renderLobby();

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('lobby.start') }));

      // Assert
      expect(send).toHaveBeenCalledWith({ type: 'start-game' });
    });

    it('should say why the game did not start, until the room changes', async () => {
      // Arrange
      const { t, deliver } = await renderLobby();

      // Act
      act(() => deliver({ type: 'error', command: 'start-game', code: 'dilemmas-missing' }));
      const shown = screen.getByRole('alert').textContent;
      act(() => deliver(aRoom({ roomVersion: 4 })));

      // Assert
      expect(shown).toBe(t('roomErrors.dilemmas-missing'));
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('should say how many players are missing, as the room says it needs', async () => {
      // Act
      const { t } = await renderLobby(aRoom({ minimumPlayers: 5 }));

      // Assert
      const start = screen.getByRole('button', { name: t('lobby.missing', { count: 2 }) });
      expect(start).toHaveProperty('disabled', true);
    });

    it('should expel a player after confirming it', async () => {
      // Arrange
      const { t, send } = await renderLobby();
      fireEvent.click(screen.getByRole('button', { name: t('lobby.toExpel', { name: 'Marta' }) }));

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('expel.confirm') }));

      // Assert
      expect(send).toHaveBeenCalledWith({ type: 'expel-player', playerId: 'test-marta-id' });
    });
  });

  describe('choosing the dilemma of a round of the players', () => {
    it('should let any player choose it, away from the dilemmas in other rounds', async () => {
      // Arrange
      const searchDilemmas = vi.fn(async () => ({
        dilemmas: [...FOUND, { ...FOUND[0]!, dilemmaId: 'test-dilemma-9', text: 'La palanca' }],
      }));
      const { t, send } = await renderLobby(
        aRoom({ ...AS_LUIS, rounds: MIXED_ROUNDS }),
        fakeRoomApi({ searchDilemmas }),
      );
      const empty = roundRowsShown(t, 3)[2];

      // Act
      fireEvent.click(
        screen.getByRole('button', { name: t('lobby.rounds.chooseLabel', { number: 3 }) }),
      );
      const picker = screen.getByRole('dialog', { name: t('pickDilemmas.title', { number: 3 }) });
      const taken = await within(picker).findByRole('radio', { name: /La palanca/ });
      fireEvent.click(taken);
      const confirm = within(picker).getByRole('button', { name: t('pickDilemmas.none') });
      const disabledWithTaken = (confirm as HTMLButtonElement).disabled;
      fireEvent.click(within(picker).getByRole('radio', { name: /TestText2/ }));
      fireEvent.click(
        within(picker).getByRole('button', { name: t('pickDilemmas.put', { number: 3 }) }),
      );

      // Assert
      expect(empty).toBe('3La elige un jugadorSi nadie la elige, será aleatoriaElegir');
      expect(taken.getAttribute('aria-disabled')).toBe('true');
      expect(taken.getAttribute('aria-checked')).toBe('false');
      expect(taken.textContent).toContain(t('pickDilemmas.taken', { number: 1 }));
      expect(disabledWithTaken).toBe(true);
      expect(send).toHaveBeenCalledWith({
        type: 'choose-round-dilemma',
        roundId: 3,
        dilemmaId: 'test-dilemma-2',
      });
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('should let the host choose it from the lobby too', async () => {
      // Arrange
      const searchDilemmas = vi.fn(async () => ({ dilemmas: [...FOUND] }));
      const { t, send } = await renderLobby(
        aRoom({ rounds: MIXED_ROUNDS }),
        fakeRoomApi({ searchDilemmas }),
      );
      fireEvent.click(
        screen.getByRole('button', { name: t('lobby.rounds.chooseLabel', { number: 3 }) }),
      );

      // Act
      fireEvent.click(await screen.findByRole('radio', { name: /TestText1/ }));
      fireEvent.click(screen.getByRole('button', { name: t('pickDilemmas.put', { number: 3 }) }));

      // Assert
      expect(send).toHaveBeenCalledWith({
        type: 'choose-round-dilemma',
        roundId: 3,
        dilemmaId: 'test-dilemma-1',
      });
    });

    it('should close the picker once someone else fills the round meanwhile', async () => {
      // Arrange
      const searchDilemmas = vi.fn(async () => ({ dilemmas: [...FOUND] }));
      const room = aRoom({ ...AS_LUIS, rounds: MIXED_ROUNDS });
      const { t, deliver } = await renderLobby(room, fakeRoomApi({ searchDilemmas }));
      fireEvent.click(
        screen.getByRole('button', { name: t('lobby.rounds.chooseLabel', { number: 3 }) }),
      );
      await screen.findByRole('radio', { name: /TestText1/ });

      // Act
      act(() =>
        deliver(
          aRoom({
            ...AS_LUIS,
            roomVersion: room.roomVersion + 1,
            rounds: [
              ...MIXED_ROUNDS.slice(0, 2),
              {
                roundId: 3,
                origin: 'players',
                dilemma: { dilemmaId: 'test-dilemma-1', text: 'TestText1', hasGap: false },
                chosenByYou: false,
              },
            ],
          }),
        ),
      );

      // Assert
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('should say why the dilemma could not be chosen', async () => {
      // Arrange
      const { t, deliver } = await renderLobby(aRoom({ ...AS_LUIS, rounds: MIXED_ROUNDS }));

      // Act
      act(() => deliver({ type: 'error', command: 'choose-round-dilemma', code: 'round-taken' }));

      // Assert
      expect(screen.getByRole('alert').textContent).toBe(t('roomErrors.round-taken'));
    });

    it('should say how many options each dilemma has and its category, and go back', async () => {
      // Arrange
      const searchDilemmas = vi.fn(async () => ({ dilemmas: [...FOUND] }));
      const { t, send } = await renderLobby(
        aRoom({ ...AS_LUIS, rounds: MIXED_ROUNDS }),
        fakeRoomApi({ searchDilemmas }),
      );
      fireEvent.click(
        screen.getByRole('button', { name: t('lobby.rounds.chooseLabel', { number: 3 }) }),
      );

      // Act
      const first = await screen.findByRole('radio', { name: /TestText1/ });
      const meta = first.textContent;
      fireEvent.click(screen.getByRole('button', { name: t('pickDilemmas.back') }));

      // Assert
      expect(meta).toContain(
        `${t('categories.honesty')} · ${t('pickDilemmas.options', { count: 2 })}`,
      );
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(send).not.toHaveBeenCalled();
    });

    it('should show the gap of a dilemma as someone in the group', async () => {
      // Arrange
      const withGap = { ...FOUND[0]!, text: 'Le mientes a {gap}' };
      const searchDilemmas = vi.fn(async () => ({ dilemmas: [withGap] }));
      const { t } = await renderLobby(
        aRoom({ ...AS_LUIS, rounds: MIXED_ROUNDS }),
        fakeRoomApi({ searchDilemmas }),
      );

      // Act
      fireEvent.click(
        screen.getByRole('button', { name: t('lobby.rounds.chooseLabel', { number: 3 }) }),
      );

      // Assert
      const card = await screen.findByRole('radio', { name: /Le mientes a/ });
      expect(card.textContent).toContain(`Le mientes a ${t('pickDilemmas.someone')}`);
      expect(card.textContent).not.toContain('{gap}');
    });

    it('should search by category and by what the player types, once they stop typing', async () => {
      // Arrange: the third search never answers.
      let calls = 0;
      const searchDilemmas = vi.fn(() =>
        calls++ < 2 ? Promise.resolve({ dilemmas: [...FOUND] }) : new Promise<never>(() => {}),
      );
      const { t } = await renderLobby(
        aRoom({ ...AS_LUIS, rounds: MIXED_ROUNDS }),
        fakeRoomApi({ searchDilemmas }),
      );
      fireEvent.click(
        screen.getByRole('button', { name: t('lobby.rounds.chooseLabel', { number: 3 }) }),
      );
      await screen.findByRole('radio', { name: /TestText1/ });
      const categories = screen.getByRole('radiogroup', { name: t('pickDilemmas.categories') });
      const search = screen.getByRole('searchbox', { name: t('pickDilemmas.search') });

      // Act
      fireEvent.click(within(categories).getByRole('radio', { name: t('categories.honesty') }));
      await waitFor(() => expect(searchDilemmas).toHaveBeenCalledTimes(2));
      for (const typed of ['f', 'fa', 'fam']) {
        fireEvent.change(search, { target: { value: typed } });
      }
      await waitFor(() => expect(searchDilemmas).toHaveBeenCalledTimes(3));

      // Assert
      expect(searchDilemmas).toHaveBeenNthCalledWith(2, 'test-room-id', { category: 'honesty' });
      expect(searchDilemmas).toHaveBeenLastCalledWith('test-room-id', {
        category: 'honesty',
        q: 'fam',
      });
      expect(screen.getByRole('radio', { name: /TestText1/ })).toBeDefined();
    });

    it('should show the next dilemmas below when the player asks for more, while there are', async () => {
      // Arrange: the first page ends where the second starts.
      const [first, second] = FOUND;
      const searchDilemmas = vi.fn(async (_roomId: string, { after }: { after?: string }) =>
        after === 'TestNext' ? { dilemmas: [second!] } : { dilemmas: [first!], next: 'TestNext' },
      );
      const { t } = await renderLobby(
        aRoom({ ...AS_LUIS, rounds: MIXED_ROUNDS }),
        fakeRoomApi({ searchDilemmas }),
      );
      fireEvent.click(
        screen.getByRole('button', { name: t('lobby.rounds.chooseLabel', { number: 3 }) }),
      );
      await screen.findByRole('radio', { name: /TestText1/ });

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('pickDilemmas.more') }));

      // Assert
      expect(await screen.findByRole('radio', { name: /TestText2/ })).toBeDefined();
      expect(screen.getByRole('radio', { name: /TestText1/ })).toBeDefined();
      expect(searchDilemmas).toHaveBeenLastCalledWith('test-room-id', { after: 'TestNext' });
      expect(screen.queryByRole('button', { name: t('pickDilemmas.more') })).toBeNull();
    });

    it('should say it could not show more, and let the player try again', async () => {
      // Arrange: the second page fails once.
      const [first, second] = FOUND;
      let failed = false;
      const searchDilemmas = vi.fn(async (_roomId: string, { after }: { after?: string }) => {
        if (after === undefined) return { dilemmas: [first!], next: 'TestNext' };
        if (!failed) {
          failed = true;
          throw new Error('TestOffline');
        }
        return { dilemmas: [second!] };
      });
      const { t } = await renderLobby(
        aRoom({ ...AS_LUIS, rounds: MIXED_ROUNDS }),
        fakeRoomApi({ searchDilemmas }),
      );
      fireEvent.click(
        screen.getByRole('button', { name: t('lobby.rounds.chooseLabel', { number: 3 }) }),
      );
      await screen.findByRole('radio', { name: /TestText1/ });

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('pickDilemmas.more') }));
      expect(await screen.findByRole('alert')).toHaveProperty(
        'textContent',
        t('pickDilemmas.moreFailed'),
      );
      fireEvent.click(screen.getByRole('button', { name: t('pickDilemmas.more') }));

      // Assert
      expect(await screen.findByRole('radio', { name: /TestText2/ })).toBeDefined();
    });
  });

  describe('another player', () => {
    it('should see the configuration without any way to change it, nor to start or expel', async () => {
      // Act
      const { t } = await renderLobby(aRoom(AS_LUIS));

      // Assert
      expect(screen.queryByRole('button', { name: t('lobby.change') })).toBeNull();
      expect(screen.queryByRole('button', { name: t('lobby.start') })).toBeNull();
      expect(screen.queryByRole('button', { name: /expulsar/ })).toBeNull();
      expect(screen.getByText(t('lobby.guestWait', { host: 'Ana' }))).toBeDefined();
    });

    it('should take any avatar, also one that someone else in the room has', async () => {
      // Arrange
      const { t, send } = await renderLobby(aRoom(AS_LUIS));
      fireEvent.click(
        screen.getByRole('button', { name: t('lobby.toChangeAvatar', { name: 'Luis' }) }),
      );

      // Act: Ana has the first face in teal.
      fireEvent.click(screen.getByRole('button', { name: t('avatarPicker.colors.teal') }));
      fireEvent.click(screen.getByRole('button', { name: t('avatarPicker.face', { number: 1 }) }));
      fireEvent.click(screen.getByRole('button', { name: t('avatarPicker.use') }));

      // Assert
      expect(send).toHaveBeenCalledWith({ type: 'change-avatar', face: 'face-01', color: 'teal' });
    });

    it('should leave out the avatar of someone with the same nickname', async () => {
      // Arrange: Luis renames himself «ana» in this lobby, where Ana has the first face in teal.
      const room = aRoom(AS_LUIS);
      const players = room.players.map((player) =>
        player.playerId === AS_LUIS.playerId ? { ...player, nickname: 'ana' } : player,
      );
      const { t } = await renderLobby({ ...room, players });
      fireEvent.click(
        screen.getByRole('button', { name: t('lobby.toChangeAvatar', { name: 'ana' }) }),
      );

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('avatarPicker.colors.teal') }));

      // Assert
      const anas = screen.getByRole('button', { name: t('avatarPicker.face', { number: 1 }) });
      expect(anas).toHaveProperty('disabled', true);
    });

    it('should say so when someone with the same nickname took that avatar meanwhile', async () => {
      // Arrange
      const { t, deliver } = await renderLobby(aRoom(AS_LUIS));

      // Act
      act(() =>
        deliver({ type: 'error', code: 'nickname-and-avatar-taken', command: 'change-avatar' }),
      );

      // Assert
      expect(screen.getByRole('alert').textContent).toBe(t('roomErrors.nickname-and-avatar-taken'));
    });
  });

  describe('the lobby of a rematch', () => {
    it('should tell the host which random round has no dilemmas left to play, and let them change it', async () => {
      // Arrange
      const rounds: LobbyRoundDto[] = [
        {
          roundId: 1,
          origin: 'random',
          categories: null,
          content: [],
          withoutNewDilemmas: false,
        },
        {
          roundId: 2,
          origin: 'random',
          categories: ['honesty'],
          content: [],
          withoutNewDilemmas: true,
        },
      ];

      // Act
      const { t } = await renderLobby(aRoom({ rounds }));

      // Assert
      expect(screen.getByTestId('rounds-without-new-dilemmas').textContent).toContain(
        t('lobby.noNewDilemmasNotice', { round: 2 }),
      );
      expect(screen.getByText(t('lobby.noNewDilemmas'))).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: t('lobby.changeCategories') }));
      expect(await screen.findByRole('dialog')).toBeDefined();
    });
  });
});
