import type { LobbyRoundDto } from '@thelever-app/protocol';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FOUND, renderLobby } from '../support/lobby.tsx';
import { aRoom, DEFAULT_ROUNDS } from '../support/room.ts';
import { fakeRoomApi } from '../support/routing.tsx';

type Translate = Awaited<ReturnType<typeof renderLobby>>['t'];

/** The host opens the settings of the room from the lobby. */
async function openSettings(...args: Parameters<typeof renderLobby>) {
  const rendered = await renderLobby(...args);
  fireEvent.click(screen.getByRole('button', { name: rendered.t('lobby.change') }));
  const sheet = screen.getByRole('dialog', { name: rendered.t('settings.title') });
  return { ...rendered, sheet };
}

/** The cards of the rounds of the settings, in order. */
function roundCards(t: Translate, count: number): HTMLElement[] {
  const section = screen.getByRole('region', { name: t('settings.rounds.title', { count }) });
  return within(section).getAllByRole('listitem');
}

/** The origin of a round the host taps: Aleatorio, Concreto or Jugadores. */
function originOf(t: Translate, number: number, origin: 'random' | 'specific' | 'players') {
  const origins = screen.getByRole('radiogroup', { name: t('settings.rounds.origin', { number }) });
  return within(origins).getByRole('radio', { name: t(`settings.rounds.origins.${origin}`) });
}

/** The switch whose label starts with that text. */
const switchCalled = (label: string) =>
  screen.getByRole('switch', { name: (name) => name.startsWith(label) });

const save = (t: Translate) =>
  fireEvent.click(screen.getByRole('button', { name: t('settings.save') }));

describe('RoomSettingsSheet', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should send only what changed in the configuration', async () => {
    // Arrange
    const { t, send } = await openSettings();

    // Act
    fireEvent.click(screen.getByRole('radio', { name: t('settings.anonymous') }));
    fireEvent.click(switchCalled(t('settings.adultsOnly.label')));
    fireEvent.click(switchCalled(t('settings.newDilemmas.label')));
    save(t);

    // Assert
    expect(send).toHaveBeenCalledWith({
      type: 'change-settings',
      changes: { variant: 'anonymous', adultsOnly: true, newDilemmas: false },
    });
  });

  it('should turn compromising dilemmas off in a nominal room, and the rounds that need them to any', async () => {
    // Arrange
    const { t, send } = await openSettings(
      aRoom({
        settings: { ...aRoom().settings, variant: 'anonymous', compromisingDilemmas: true },
        rounds: [{ ...DEFAULT_ROUNDS[0]!, content: ['compromising'] } as LobbyRoundDto],
      }),
    );

    // Act
    fireEvent.click(screen.getByRole('radio', { name: t('settings.nominal') }));
    save(t);

    // Assert
    expect(send).toHaveBeenCalledWith({
      type: 'change-settings',
      changes: {
        variant: 'nominal',
        compromisingDilemmas: false,
        rounds: [{ id: 1, origin: 'random', categories: null, content: [] }],
      },
    });
  });

  it('should not let adults-only rounds be chosen in a room not for adults only', async () => {
    // Arrange
    const { t } = await openSettings();

    // Assert
    const [card] = roundCards(t, 8);
    expect(
      within(card!).getByRole('checkbox', { name: t('settings.content.adults-only') }),
    ).toHaveProperty('disabled', true);
    expect(screen.getByText(t('settings.content.needsBoth'))).toBeDefined();
  });

  it('should mark both requirements of a random round, and clear them with «Cualquiera»', async () => {
    // Arrange
    const { t, send } = await openSettings(
      aRoom({
        settings: {
          ...aRoom().settings,
          variant: 'anonymous',
          adultsOnly: true,
          compromisingDilemmas: true,
        },
      }),
    );
    const [first, second] = roundCards(t, 8);
    const requirement = (card: HTMLElement, content: 'any' | 'adults-only' | 'compromising') =>
      within(card).getByRole('checkbox', { name: t(`settings.content.${content}`) });

    // Act
    fireEvent.click(requirement(first!, 'compromising'));
    fireEvent.click(requirement(first!, 'adults-only'));
    fireEvent.click(requirement(second!, 'adults-only'));
    fireEvent.click(requirement(second!, 'any'));
    save(t);

    // Assert
    const [sent] = send.mock.calls.at(-1)!;
    expect(sent.changes.rounds.slice(0, 2)).toEqual([
      { id: 1, origin: 'random', categories: null, content: ['adults-only', 'compromising'] },
      { id: 2, origin: 'random', categories: null, content: [] },
    ]);
  });

  it('should keep the settings open when the host chooses an ambience, filled in with its configuration', async () => {
    // Arrange
    const { t, send, deliver } = await openSettings();
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(t('settings.ambience.change')) }),
    );
    const ambiences = screen.getByRole('radiogroup', { name: t('settings.ambience.label') });

    // Act
    fireEvent.click(
      within(ambiences).getByRole('radio', { name: new RegExp(t('ambience.spicy.name')) }),
    );
    act(() =>
      deliver(
        aRoom({
          roomVersion: 4,
          ambience: 'spicy',
          settings: { ...aRoom().settings, adultsOnly: true },
        }),
      ),
    );

    // Assert
    expect(send).toHaveBeenCalledWith({ type: 'choose-ambience', ambience: 'spicy' });
    expect(screen.getByRole('dialog', { name: t('settings.title') })).toBeDefined();
    expect(switchCalled(t('settings.adultsOnly.label'))).toHaveProperty('checked', true);
    const shown = screen.getByRole('button', { name: new RegExp(t('settings.ambience.change')) });
    expect(shown.textContent).toContain(t('ambience.spicy.name'));
  });

  it('should show the settings as custom once a field moves away from the ambience', async () => {
    // Arrange
    const { t } = await openSettings();

    // Act
    fireEvent.click(screen.getByRole('radio', { name: t('settings.anonymous') }));

    // Assert
    const ambience = screen.getByRole('button', {
      name: new RegExp(t('settings.ambience.change')),
    });
    expect(ambience.textContent).toContain(t('ambience.custom.name'));
  });

  it('should choose an ambience at once, but not one for adults with a minor in the room', async () => {
    // Arrange
    const { t, send } = await openSettings(aRoom({ hasPlayerUnderEighteen: true }));
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(t('settings.ambience.change')) }),
    );
    const ambiences = screen.getByRole('radiogroup', { name: t('settings.ambience.label') });

    // Act
    const spicy = within(ambiences).getByRole('radio', {
      name: new RegExp(t('ambience.spicy.name')),
    });
    const adultsOnly = switchCalled(t('settings.adultsOnly.label'));
    fireEvent.click(
      within(ambiences).getByRole('radio', { name: new RegExp(t('ambience.classic.name')) }),
    );

    // Assert
    expect(spicy).toHaveProperty('disabled', true);
    expect(adultsOnly).toHaveProperty('disabled', true);
    expect(send).toHaveBeenCalledWith({ type: 'choose-ambience', ambience: 'classic' });
  });

  it('should offer no language for the dilemmas, which each player reads in their own', async () => {
    // Act
    await openSettings();

    // Assert
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('should send nothing when the configuration did not change', async () => {
    // Arrange
    const { t, send } = await openSettings();

    // Act
    save(t);

    // Assert
    expect(send).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should show each round of the room as a card, random from every category', async () => {
    // Act
    const { t } = await openSettings();

    // Assert
    const cards = roundCards(t, 8);
    expect(cards).toHaveLength(8);
    expect(originOf(t, 1, 'random').getAttribute('aria-checked')).toBe('true');
    expect(originOf(t, 1, 'specific').getAttribute('aria-checked')).toBe('false');
    expect(
      screen.getByRole('button', {
        name: t('settings.rounds.categoriesOf', { number: 8, summary: 'De todas las categorías' }),
      }).textContent,
    ).toBe('De todas las categorías');
  });

  it('should add rounds up to 12, new ones random from every category and without an id', async () => {
    // Arrange
    const { t, send } = await openSettings();
    const add = () => screen.getByRole('button', { name: t('settings.rounds.add') });

    // Act
    for (let added = 0; added < 4; added++) fireEvent.click(add());
    const full = screen.getByRole('button', { name: t('settings.rounds.full', { maximum: 12 }) });
    const cards = roundCards(t, 12);
    const addLeft = screen.queryByRole('button', { name: t('settings.rounds.add') });
    save(t);

    // Assert
    expect(cards).toHaveLength(12);
    expect(full).toHaveProperty('disabled', true);
    expect(addLeft).toBeNull();
    expect(send).toHaveBeenCalledWith({
      type: 'change-settings',
      changes: {
        rounds: [
          ...DEFAULT_ROUNDS.map(({ roundId }) => ({
            id: roundId,
            origin: 'random',
            categories: null,
            content: [],
          })),
          ...Array.from({ length: 4 }, () => ({
            origin: 'random',
            categories: null,
            content: [],
          })),
        ],
      },
    });
  });

  it('should remove a round, but never the last one', async () => {
    // Arrange
    const rounds: LobbyRoundDto[] = DEFAULT_ROUNDS.slice(0, 2);
    const { t, send } = await openSettings(aRoom({ rounds }));

    // Act
    fireEvent.click(
      screen.getByRole('button', { name: t('settings.rounds.remove', { number: 1 }) }),
    );
    const last = screen.getByRole('button', { name: t('settings.rounds.remove', { number: 1 }) });
    save(t);

    // Assert
    expect(last).toHaveProperty('disabled', true);
    expect(send).toHaveBeenCalledWith({
      type: 'change-settings',
      changes: { rounds: [{ id: 2, origin: 'random', categories: null, content: [] }] },
    });
  });

  it('should mark the categories of a random round, every one with «Todas» or with none', async () => {
    // Arrange
    const { t, send } = await openSettings(aRoom({ rounds: DEFAULT_ROUNDS.slice(0, 1) }));
    const expander = () =>
      screen.getByRole('button', {
        name: new RegExp(`^${t('settings.rounds.categories', { number: 1 })}`),
      });
    fireEvent.click(expander());
    const chips = screen.getByRole('group', {
      name: t('settings.rounds.categories', { number: 1 }),
    });
    const chip = (name: string) => within(chips).getByRole('checkbox', { name });
    const all = () => chip(t('settings.rounds.allCategories')).getAttribute('aria-checked');
    const summaries: string[] = [];
    const summary = () => summaries.push(expander().textContent ?? '');
    const atFirst = all();

    // Act
    fireEvent.click(chip(t('categories.honesty')));
    summary();
    fireEvent.click(chip(t('categories.loyalty')));
    summary();
    fireEvent.click(chip(t('categories.justice')));
    summary();
    for (const category of ['honesty', 'loyalty', 'justice'] as const) {
      fireEvent.click(chip(t(`categories.${category}`)));
    }
    const noneLeft = all();
    for (const category of [
      'life-and-death',
      'honesty',
      'loyalty',
      'justice',
      'love-and-relationships',
      'work-and-money',
      'technology-and-the-future',
    ] as const) {
      fireEvent.click(chip(t(`categories.${category}`)));
    }
    const everyOne = all();
    fireEvent.click(chip(t('categories.loyalty')));
    fireEvent.click(chip(t('settings.rounds.allCategories')));
    const backToAll = all();
    fireEvent.click(chip(t('categories.loyalty')));
    fireEvent.click(chip(t('categories.honesty')));
    save(t);

    // Assert
    expect(atFirst).toBe('true');
    expect(summaries).toEqual(['De Honestidad', 'De Honestidad o Lealtad', 'De 3 categorías']);
    expect([noneLeft, everyOne, backToAll]).toEqual(['true', 'true', 'true']);
    expect(send).toHaveBeenCalledWith({
      type: 'change-settings',
      changes: {
        rounds: [{ id: 1, origin: 'random', categories: ['honesty', 'loyalty'], content: [] }],
      },
    });
  });

  it('should show the categories of one round at a time', async () => {
    // Arrange
    const { t } = await openSettings();
    const expander = (number: number) =>
      screen.getByRole('button', {
        name: new RegExp(`^${t('settings.rounds.categories', { number })}`),
      });
    const chipsOf = (number: number) =>
      screen.queryByRole('group', { name: t('settings.rounds.categories', { number }) });

    // Act
    fireEvent.click(expander(1));
    const firstOpen = chipsOf(1) !== null;
    fireEvent.click(expander(2));

    // Assert
    expect(firstOpen).toBe(true);
    expect(chipsOf(1)).toBeNull();
    expect(chipsOf(2)).not.toBeNull();
    expect(expander(2).getAttribute('aria-expanded')).toBe('true');
    expect(expander(1).getAttribute('aria-expanded')).toBe('false');
  });

  it('should let the host scroll the dilemmas of the picker over the settings', async () => {
    // Arrange: the list of the picker has more dilemmas than fit.
    const searchDilemmas = vi.fn(async () => ({ dilemmas: [...FOUND] }));
    const { t } = await openSettings(aRoom(), fakeRoomApi({ searchDilemmas }));
    fireEvent.click(originOf(t, 2, 'specific'));
    fireEvent.click(
      screen.getByRole('button', { name: t('settings.rounds.chooseLabel', { number: 2 }) }),
    );
    const picker = screen.getByRole('dialog', { name: t('pickDilemmas.title', { number: 2 }) });
    const dilemma = await within(picker).findByRole('radio', { name: /TestText1/ });
    const list = within(picker).getByRole('radiogroup', {
      name: t('pickDilemmas.list'),
    }).parentElement!;
    list.style.overflowY = 'auto';
    Object.defineProperty(list, 'scrollHeight', { value: 1000 });
    Object.defineProperty(list, 'clientHeight', { value: 100 });

    // Act
    const scrolled = fireEvent.wheel(dilemma, { deltaY: 100 });

    // Assert
    expect(scrolled).toBe(true);
  });

  it('should not save a specific round until the host chooses its dilemma, away from those in other rounds', async () => {
    // Arrange: round 3 has a dilemma a player chose.
    const searchDilemmas = vi.fn(async () => ({ dilemmas: [...FOUND] }));
    const rounds: LobbyRoundDto[] = [
      ...DEFAULT_ROUNDS.slice(0, 2),
      {
        roundId: 3,
        origin: 'players',
        dilemma: { dilemmaId: 'test-dilemma-1', text: 'TestText1', hasGap: false },
        chosenByYou: false,
      },
    ];
    const { t, send } = await openSettings(aRoom({ rounds }), fakeRoomApi({ searchDilemmas }));
    const saveButton = screen.getByRole('button', { name: t('settings.save') });

    // Act
    fireEvent.click(originOf(t, 2, 'specific'));
    const unfilled = (saveButton as HTMLButtonElement).disabled;
    fireEvent.click(
      screen.getByRole('button', { name: t('settings.rounds.chooseLabel', { number: 2 }) }),
    );
    const picker = screen.getByRole('dialog', { name: t('pickDilemmas.title', { number: 2 }) });
    const taken = await within(picker).findByRole('radio', { name: /TestText1/ });
    fireEvent.click(within(picker).getByRole('radio', { name: /TestText2/ }));
    fireEvent.click(
      within(picker).getByRole('button', { name: t('pickDilemmas.put', { number: 2 }) }),
    );
    const card = roundCards(t, 3)[1]!;
    const shown = card.textContent;
    save(t);

    // Assert
    expect(unfilled).toBe(true);
    expect(taken.getAttribute('aria-disabled')).toBe('true');
    expect(taken.textContent).toContain(t('pickDilemmas.taken', { number: 3 }));
    expect(shown).toContain('TestText2');
    expect(shown).toContain(
      `${t('categories.loyalty')} · ${t('pickDilemmas.options', { count: 4 })}`,
    );
    expect(send).toHaveBeenCalledWith({
      type: 'change-settings',
      changes: {
        rounds: [
          { id: 1, origin: 'random', categories: null, content: [] },
          { id: 2, origin: 'specific', dilemmaId: 'test-dilemma-2' },
          { id: 3, origin: 'players' },
        ],
      },
    });
  });

  it('should keep what the host changed, unsent, while choosing a dilemma', async () => {
    // Arrange
    const searchDilemmas = vi.fn(async () => ({ dilemmas: [...FOUND] }));
    const { t, send } = await openSettings(aRoom(), fakeRoomApi({ searchDilemmas }));
    fireEvent.click(screen.getByRole('radio', { name: t('settings.anonymous') }));
    fireEvent.click(originOf(t, 1, 'specific'));
    fireEvent.click(
      screen.getByRole('button', { name: t('settings.rounds.chooseLabel', { number: 1 }) }),
    );
    await screen.findByRole('radio', { name: /TestText1/ });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('pickDilemmas.back') }));

    // Assert
    const settings = screen.getByRole('dialog', { name: t('settings.title') });
    expect(
      (within(settings).getByRole('radio', { name: t('settings.anonymous') }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(originOf(t, 1, 'specific').getAttribute('aria-checked')).toBe('true');
    expect(send).not.toHaveBeenCalled();
  });

  it('should show the dilemma of a specific round, checked when the host goes to change it', async () => {
    // Arrange
    const searchDilemmas = vi.fn(async () => ({ dilemmas: [...FOUND] }));
    const rounds: LobbyRoundDto[] = [
      {
        roundId: 1,
        origin: 'specific',
        dilemma: { dilemmaId: 'test-dilemma-1', text: 'TestText1', hasGap: false },
      },
      ...DEFAULT_ROUNDS.slice(1, 2),
    ];
    const { t, send } = await openSettings(aRoom({ rounds }), fakeRoomApi({ searchDilemmas }));
    const shown = roundCards(t, 2)[0]!.textContent;

    // Act
    fireEvent.click(
      screen.getByRole('button', { name: t('settings.rounds.changeLabel', { number: 1 }) }),
    );
    const current = await screen.findByRole('radio', { name: /TestText1/ });
    const checked = current.getAttribute('aria-checked');
    fireEvent.click(screen.getByRole('button', { name: t('pickDilemmas.put', { number: 1 }) }));
    save(t);

    // Assert
    expect(shown).toContain('TestText1');
    expect(checked).toBe('true');
    expect(send).not.toHaveBeenCalled();
  });

  it('should say a round is for the players, and which dilemma one of them already chose', async () => {
    // Arrange
    const rounds: LobbyRoundDto[] = [
      { roundId: 1, origin: 'players', dilemma: null, chosenByYou: false },
      {
        roundId: 2,
        origin: 'players',
        dilemma: { dilemmaId: 'test-dilemma-1', text: 'La cartera encontrada', hasGap: false },
        chosenByYou: false,
      },
      ...DEFAULT_ROUNDS.slice(2, 3),
    ];
    const { t, send } = await openSettings(aRoom({ rounds }));

    // Act
    fireEvent.click(originOf(t, 3, 'players'));
    const [empty, filled, changed] = roundCards(t, 3).map((card) => card.textContent);
    save(t);

    // Assert
    expect(empty).toContain(t('settings.rounds.playersHint'));
    expect(filled).toContain('Ya la ha elegido un jugador: «La cartera encontrada».');
    expect(changed).toContain(t('settings.rounds.playersHint'));
    expect(send).toHaveBeenCalledWith({
      type: 'change-settings',
      changes: {
        rounds: [
          { id: 1, origin: 'players' },
          { id: 2, origin: 'players' },
          { id: 3, origin: 'players' },
        ],
      },
    });
  });
});
