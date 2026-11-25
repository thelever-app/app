import type { LobbyRoundDto } from '@thelever-app/protocol';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FOUND, renderLobby } from '../support/lobby.tsx';
import { AMBIENCES, aRoom, DEFAULT_ROUNDS } from '../support/room.ts';
import { fakeRoomApi } from '../support/routing.tsx';

type Translate = Awaited<ReturnType<typeof renderLobby>>['t'];

/** The host opens the settings of the room from the lobby. */
async function openSettings(...args: Parameters<typeof renderLobby>) {
  const rendered = await renderLobby(...args);
  fireEvent.click(screen.getByRole('button', { name: rendered.t('lobby.configure') }));
  const sheet = screen.getByRole('dialog', { name: rendered.t('settings.title') });
  return { ...rendered, sheet };
}

/** The cards of the rounds of the settings, in order. */
function roundCards(t: Translate, count: number): HTMLElement[] {
  const section = screen.getByRole('region', { name: t('settings.rounds.title', { count }) });
  return within(section).getAllByRole('listitem');
}

/** What the element says besides its name, as its description points to it. */
function descriptionOf(element: HTMLElement): string | null | undefined {
  const id = element.getAttribute('aria-describedby');
  return id ? document.getElementById(id)?.textContent : undefined;
}

/** The summary line of a round, which unfolds it and folds it again. */
function headOf(t: Translate, number: number): HTMLElement {
  return screen.getByRole('button', {
    name: (name) => name.startsWith(t('settings.rounds.round', { number })),
  });
}

/** The host unfolds a round, to set it. */
function unfold(t: Translate, ...numbers: number[]): void {
  for (const number of numbers) fireEvent.click(headOf(t, number));
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
        rounds: [
          { ...DEFAULT_ROUNDS[0]!, content: { age: 'any', compromising: 'yes' } } as LobbyRoundDto,
        ],
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
        rounds: [
          {
            id: 1,
            origin: 'random',
            categories: null,
            content: { age: 'any', compromising: 'any' },
          },
        ],
      },
    });
  });

  it('should offer no content for the random rounds of a room without dilemmas for adults nor compromising ones', async () => {
    // Arrange
    const { t } = await openSettings();

    // Assert
    const [card] = roundCards(t, 8);
    expect(
      within(card!).queryByRole('radiogroup', { name: t('settings.content.age.label') }),
    ).toBeNull();
    expect(
      within(card!).queryByRole('radiogroup', { name: t('settings.content.compromising.label') }),
    ).toBeNull();
    expect(screen.queryByText(t('settings.content.needsAdults'))).toBeNull();
    expect(screen.queryByText(t('settings.content.needsCompromising'))).toBeNull();
  });

  it('should offer only the age in a room for adults without compromising dilemmas, and say what the rest needs', async () => {
    // Arrange
    const { t } = await openSettings(
      aRoom({ settings: { ...aRoom().settings, adultsOnly: true } }),
    );
    unfold(t, 1);

    // Assert
    const [card] = roundCards(t, 8);
    expect(
      within(card!).getByRole('radiogroup', { name: t('settings.content.age.label') }),
    ).toBeDefined();
    expect(
      within(card!).queryByRole('radiogroup', { name: t('settings.content.compromising.label') }),
    ).toBeNull();
    expect(screen.getByText(t('settings.content.needsCompromising'))).toBeDefined();
  });

  it('should set the age and whether compromising of each random round', async () => {
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
    const pick = (card: HTMLElement, axis: 'age' | 'compromising', option: string) => {
      if (
        within(card).queryByRole('radiogroup', { name: t(`settings.content.${axis}.label`) }) ===
        null
      ) {
        fireEvent.click(within(card).getAllByRole('button')[0]!);
      }
      const options = within(card).getByRole('radiogroup', {
        name: t(`settings.content.${axis}.label`),
      });
      fireEvent.click(
        within(options).getByRole('radio', {
          name: t(`settings.content.${axis}.${option}` as 'settings.content.age.any'),
        }),
      );
    };

    // Act
    pick(first!, 'age', 'adults-only');
    pick(first!, 'compromising', 'yes');
    pick(second!, 'age', 'from-16');
    pick(second!, 'compromising', 'no');
    save(t);

    // Assert
    const [sent] = send.mock.calls.at(-1)!;
    expect(sent.changes.rounds.slice(0, 2)).toEqual([
      {
        id: 1,
        origin: 'random',
        categories: null,
        content: { age: 'adults-only', compromising: 'yes' },
      },
      {
        id: 2,
        origin: 'random',
        categories: null,
        content: { age: 'from-16', compromising: 'no' },
      },
    ]);
  });

  it('should fill the settings in with the ambience the host chooses, and the room takes it on saving', async () => {
    // Arrange
    const { t, send } = await openSettings();
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(t('settings.ambience.change')) }),
    );
    const ambiences = screen.getByRole('radiogroup', { name: t('settings.ambience.label') });

    // Act
    fireEvent.click(
      within(ambiences).getByRole('radio', { name: new RegExp(`^${t('ambience.spicy.name')}`) }),
    );
    const sentOnChoosing = send.mock.calls.length;
    const adultsOnly = switchCalled(t('settings.adultsOnly.label'));
    const shown = screen.getByRole('button', { name: new RegExp(t('settings.ambience.change')) });
    save(t);

    // Assert
    expect(sentOnChoosing).toBe(0);
    expect(adultsOnly).toHaveProperty('checked', true);
    expect(shown.textContent).toContain(t('ambience.spicy.name'));
    expect(send).toHaveBeenCalledWith({
      type: 'change-settings',
      changes: { adultsOnly: true, rounds: AMBIENCES.spicy.rounds },
    });
  });

  it('should leave the room as it was when the host closes the settings after choosing an ambience', async () => {
    // Arrange
    const { t, send } = await openSettings();
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(t('settings.ambience.change')) }),
    );
    const ambiences = screen.getByRole('radiogroup', { name: t('settings.ambience.label') });
    fireEvent.click(
      within(ambiences).getByRole('radio', {
        name: new RegExp(`^${t('ambience.no-filter.name')}`),
      }),
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('settings.close') }));

    // Assert
    expect(send).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
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

  it('should not choose an ambience for adults with a minor in the room, but fill in Classic', async () => {
    // Arrange: an anonymous room, which is of no ambience.
    const { t, send } = await openSettings(
      aRoom({
        hasPlayerUnderEighteen: true,
        ambience: 'custom',
        settings: { ...aRoom().settings, variant: 'anonymous' },
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(t('settings.ambience.change')) }),
    );
    const ambiences = screen.getByRole('radiogroup', { name: t('settings.ambience.label') });

    // Act
    const spicy = within(ambiences).getByRole('radio', {
      name: new RegExp(`^${t('ambience.spicy.name')}`),
    });
    const adultsOnly = switchCalled(t('settings.adultsOnly.label'));
    fireEvent.click(
      within(ambiences).getByRole('radio', { name: new RegExp(`^${t('ambience.classic.name')}`) }),
    );

    // Assert
    expect(spicy).toHaveProperty('disabled', true);
    expect(adultsOnly).toHaveProperty('disabled', true);
    expect(screen.getByRole('radio', { name: t('settings.nominal') })).toHaveProperty(
      'checked',
      true,
    );
    const shown = screen.getByRole('button', { name: new RegExp(t('settings.ambience.change')) });
    expect(shown.textContent).toContain(t('ambience.classic.name'));
    expect(send).not.toHaveBeenCalled();
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
    unfold(t, 8);

    // Assert
    const cards = roundCards(t, 8);
    expect(cards).toHaveLength(8);
    expect(originOf(t, 8, 'random').getAttribute('aria-checked')).toBe('true');
    expect(originOf(t, 8, 'specific').getAttribute('aria-checked')).toBe('false');
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
            content: { age: 'any', compromising: 'any' },
          })),
          ...Array.from({ length: 4 }, () => ({
            origin: 'random',
            categories: null,
            content: { age: 'any', compromising: 'any' },
          })),
        ],
      },
    });
  });

  it('should remove a round, but never the last one', async () => {
    // Arrange
    const rounds: LobbyRoundDto[] = DEFAULT_ROUNDS.slice(0, 2);
    const { t, send } = await openSettings(aRoom({ rounds }));
    unfold(t, 1);

    // Act
    fireEvent.click(
      screen.getByRole('button', { name: t('settings.rounds.remove', { number: 1 }) }),
    );
    unfold(t, 1);
    const last = screen.getByRole('button', { name: t('settings.rounds.remove', { number: 1 }) });
    save(t);

    // Assert
    expect(last).toHaveProperty('disabled', true);
    expect(send).toHaveBeenCalledWith({
      type: 'change-settings',
      changes: {
        rounds: [
          {
            id: 2,
            origin: 'random',
            categories: null,
            content: { age: 'any', compromising: 'any' },
          },
        ],
      },
    });
  });

  it('should mark the categories of a random round, every one with «Todas» or with none', async () => {
    // Arrange
    const { t, send } = await openSettings(aRoom({ rounds: DEFAULT_ROUNDS.slice(0, 1) }));
    unfold(t, 1);
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
        rounds: [
          {
            id: 1,
            origin: 'random',
            categories: ['honesty', 'loyalty'],
            content: { age: 'any', compromising: 'any' },
          },
        ],
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
    unfold(t, 1);
    fireEvent.click(expander(1));
    const firstOpen = chipsOf(1) !== null;
    unfold(t, 2);
    fireEvent.click(expander(2));

    // Assert
    expect(firstOpen).toBe(true);
    expect(chipsOf(1)).toBeNull();
    expect(chipsOf(2)).not.toBeNull();
    expect(expander(2).getAttribute('aria-expanded')).toBe('true');
  });

  it('should let the host scroll the dilemmas of the picker over the settings', async () => {
    // Arrange: the list of the picker has more dilemmas than fit.
    const searchDilemmas = vi.fn(async () => ({ dilemmas: [...FOUND] }));
    const { t } = await openSettings(aRoom(), fakeRoomApi({ searchDilemmas }));
    unfold(t, 2);
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
    unfold(t, 2);
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
          {
            id: 1,
            origin: 'random',
            categories: null,
            content: { age: 'any', compromising: 'any' },
          },
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
    unfold(t, 1);
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
    const folded = roundCards(t, 2)[0]!.textContent;
    unfold(t, 1);
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
    expect(folded).toContain('«TestText1»');
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
    const folded = roundCards(t, 3).map((card) => card.textContent);
    unfold(t, 3);
    fireEvent.click(originOf(t, 3, 'players'));
    const changed = roundCards(t, 3)[2]!.textContent;
    unfold(t, 1);
    const empty = roundCards(t, 3)[0]!.textContent;
    unfold(t, 2);
    const filled = roundCards(t, 3)[1]!.textContent;
    save(t);

    // Assert
    expect(folded[0]).toContain(t('settings.rounds.summary.players'));
    expect(folded[1]).toContain('Elegido: «La cartera encontrada»');
    expect(empty).toContain(t('settings.rounds.playersHint'));
    expect(filled).toContain('Un jugador ya ha elegido «La cartera encontrada».');
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

  it('should open every round folded into a line with its number, its origin and its content', async () => {
    // Arrange: a Spicy room, whose even rounds are for adults only.
    const rounds = DEFAULT_ROUNDS.map((round, index) => ({
      ...round,
      content: { age: index % 2 === 1 ? 'adults-only' : 'any', compromising: 'any' },
    })) as LobbyRoundDto[];

    // Act
    const { t } = await openSettings(
      aRoom({ ambience: 'spicy', settings: { ...aRoom().settings, adultsOnly: true }, rounds }),
    );

    // Assert
    const heads = Array.from({ length: 8 }, (_, index) => headOf(t, index + 1));
    expect(heads.map((head) => head.getAttribute('aria-expanded'))).toEqual(
      Array.from({ length: 8 }, () => 'false'),
    );
    expect(
      screen.queryByRole('radiogroup', { name: t('settings.rounds.origin', { number: 1 }) }),
    ).toBeNull();
    expect(heads[0]!.textContent).toContain(t('settings.rounds.origins.random'));
    expect(within(heads[0]!).getByTestId('round-summary').textContent).toBe(
      t('settings.rounds.fromAll'),
    );
    expect(within(heads[1]!).getByTestId('round-summary').textContent).toBe(
      `${t('settings.rounds.fromAll')} · +18`,
    );
  });

  it('should unfold one round at a time, and fold it with «Listo»', async () => {
    // Arrange
    const { t } = await openSettings();

    // Act
    unfold(t, 2);
    const secondUnfolded = headOf(t, 2).getAttribute('aria-expanded');
    unfold(t, 5);
    const afterFifth = [headOf(t, 2), headOf(t, 5)].map((head) =>
      head.getAttribute('aria-expanded'),
    );
    fireEvent.click(screen.getByRole('button', { name: t('settings.rounds.done') }));

    // Assert
    expect(secondUnfolded).toBe('true');
    expect(afterFifth).toEqual(['false', 'true']);
    expect(headOf(t, 5).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: t('settings.rounds.done') })).toBeNull();
  });

  it('should unfold a round the host adds, and offer to remove only the unfolded one', async () => {
    // Arrange
    const { t } = await openSettings();
    const removable = () =>
      screen.queryAllByRole('button', { name: (name) => name.startsWith('Quitar la ronda') });
    const beforeAdding = removable().length;

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('settings.rounds.add') }));

    // Assert
    expect(beforeAdding).toBe(0);
    expect(headOf(t, 9).getAttribute('aria-expanded')).toBe('true');
    expect(removable().map((button) => button.getAttribute('aria-label'))).toEqual([
      t('settings.rounds.remove', { number: 9 }),
    ]);
  });

  it('should show the fewest players of each variant, and the ambience card follows the variant', async () => {
    // Arrange: a Spicy room.
    const { t } = await openSettings(
      aRoom({
        ambience: 'spicy',
        settings: { ...aRoom().settings, adultsOnly: true },
        rounds: AMBIENCES.spicy.rounds.map((round, index) => ({
          ...round,
          roundId: index + 1,
          withoutNewDilemmas: false,
        })),
      }),
    );
    const card = () =>
      screen.getByRole('button', { name: new RegExp(t('settings.ambience.change')) });
    const before = card().textContent;

    // Act
    fireEvent.click(screen.getByRole('radio', { name: t('settings.anonymous') }));

    // Assert
    expect(descriptionOf(screen.getByRole('radio', { name: t('settings.nominal') }))).toBe(
      t('badges.players', { minimum: 2 }),
    );
    expect(descriptionOf(screen.getByRole('radio', { name: t('settings.anonymous') }))).toBe(
      t('badges.players', { minimum: 3 }),
    );
    expect(before).toContain(t('ambience.spicy.name'));
    expect(before).toContain(t('badges.players', { minimum: 2 }));
    expect(before).not.toContain(t('badges.anonymous'));
    expect(card().textContent).toContain(t('ambience.custom.name'));
    expect(card().textContent).toContain(t('badges.players', { minimum: 3 }));
    expect(card().textContent).toContain(t('badges.anonymous'));
  });

  it('should show the badges of each ambience the host can choose', async () => {
    // Arrange
    const { t } = await openSettings();

    // Act
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(t('settings.ambience.change')) }),
    );

    // Assert
    const ambiences = screen.getByRole('radiogroup', { name: t('settings.ambience.label') });
    const option = (ambience: 'classic' | 'spicy' | 'no-filter') =>
      within(ambiences).getByRole('radio', {
        name: new RegExp(`^${t(`ambience.${ambience}.name`)}`),
      }).textContent;
    expect(option('classic')).toContain(t('badges.players', { minimum: 2 }));
    expect(option('spicy')).toContain(t('badges.players', { minimum: 2 }));
    expect(option('spicy')).not.toContain(t('badges.anonymous'));
    expect(option('no-filter')).toContain(t('badges.players', { minimum: 3 }));
    expect(option('no-filter')).toContain(t('badges.anonymous'));
  });
});
