import { describe, expect, it } from 'vitest';
import { composeGame, type ComposeGameInput } from '../../services/compose-game.ts';
import { RoomSettingsVO } from '../../vos/room-settings.vo.ts';
import { FixedRandomness } from '../support/fixed-randomness.ts';

/** The values of the thresholds of exploration: 2 slots from 6 dilemmas and 3 from 11. */
const EXPLORATION_SLOTS = [
  { fromDilemmaCount: 6, slots: 2 },
  { fromDilemmaCount: 11, slots: 3 },
];

const CATALOG = Array.from({ length: 20 }, (_, index) => `TestCatalog${index + 1}`);
const EXPLORATION = ['TestNew1', 'TestNew2', 'TestNew3', 'TestNew4'];

function input(changes: Partial<ComposeGameInput> = {}): ComposeGameInput {
  return {
    settings: RoomSettingsVO.defaults('es'),
    pickedDilemmas: [],
    addedDilemmas: [],
    candidates: { inCatalog: CATALOG, inExploration: EXPLORATION },
    explorationSlots: EXPLORATION_SLOTS,
    ...changes,
  };
}

function ids(dilemmas: readonly { readonly dilemmaId: string }[]): string[] {
  return dilemmas.map(({ dilemmaId }) => dilemmaId);
}

describe('composeGame', () => {
  it('should fill the number of dilemmas of the room, without repeating any', () => {
    // Act
    const composed = composeGame(input(), new FixedRandomness());

    // Assert
    expect(composed).toHaveLength(8);
    expect(new Set(ids(composed)).size).toBe(8);
  });

  it.each([
    [6, 2],
    [8, 2],
    [10, 2],
    [12, 3],
  ] as const)('should keep room for the new dilemmas of a game of %i: %i', (count, expected) => {
    // Act
    const composed = composeGame(
      input({ settings: RoomSettingsVO.defaults('es').with({ dilemmaCount: count }) }),
      new FixedRandomness(),
    );

    // Assert
    expect(ids(composed).filter((id) => id.startsWith('TestNew'))).toHaveLength(expected);
    expect(composed).toHaveLength(count);
  });

  it('should take no dilemma in exploration when the host turns off new dilemmas', () => {
    // Act
    const composed = composeGame(
      input({ settings: RoomSettingsVO.defaults('es').with({ newDilemmas: false }) }),
      new FixedRandomness(),
    );

    // Assert
    expect(ids(composed).some((id) => id.startsWith('TestNew'))).toBe(false);
    expect(composed).toHaveLength(8);
  });

  it('should mark what the system chose as picked by the system', () => {
    // Act
    const composed = composeGame(input(), new FixedRandomness());

    // Assert
    expect(composed.every(({ origin }) => origin === 'picked-by-the-system')).toBe(true);
  });

  it('should play the dilemmas the players added first, as added by a player', () => {
    // Arrange
    const addedDilemmas = [
      { dilemmaId: 'TestAddedByLuis', minimumAge: 16, playerId: 'TestLuisId' },
      { dilemmaId: 'TestAddedByMarta', minimumAge: 16, playerId: 'TestMartaId' },
    ] as const;

    // Act
    const composed = composeGame(input({ addedDilemmas }), new FixedRandomness());

    // Assert
    expect(composed).toHaveLength(8);
    expect(composed).toEqual(
      expect.arrayContaining([
        { dilemmaId: 'TestAddedByLuis', origin: 'added-by-a-player' },
        { dilemmaId: 'TestAddedByMarta', origin: 'added-by-a-player' },
      ]),
    );
  });

  it('should play exactly the dilemmas the host picked, and no new dilemma', () => {
    // Arrange
    const pickedDilemmas = Array.from({ length: 6 }, (_, index) => ({
      dilemmaId: `TestPicked${index + 1}`,
      minimumAge: 16 as const,
    }));

    // Act
    const composed = composeGame(input({ pickedDilemmas }), new FixedRandomness());

    // Assert
    expect([...ids(composed)].sort()).toEqual(ids(pickedDilemmas).sort());
    expect(composed.every(({ origin }) => origin === 'picked-by-the-host')).toBe(true);
  });

  it('should fill from exploration when the catalog runs short', () => {
    // Act
    const composed = composeGame(
      input({
        candidates: { inCatalog: ['TestCatalog1', 'TestCatalog2'], inExploration: EXPLORATION },
      }),
      new FixedRandomness(),
    );

    // Assert
    expect(composed).toHaveLength(6);
  });

  it('should put the dilemmas in the order the randomness gives', () => {
    // Arrange: the catalog shuffle takes the first five numbers and the final order the last five.
    const settings = RoomSettingsVO.defaults('es').with({ dilemmaCount: 6, newDilemmas: false });
    const candidates = { inCatalog: CATALOG.slice(0, 6), inExploration: [] };

    // Act
    const inOrder = composeGame(input({ settings, candidates }), new FixedRandomness());
    const reversed = composeGame(
      input({ settings, candidates }),
      new FixedRandomness(0, 0, 0, 0, 0, 1, 1, 1, 1, 1),
    );

    // Assert
    expect(ids(inOrder)).not.toEqual(ids(reversed));
    expect([...ids(inOrder)].sort()).toEqual([...ids(reversed)].sort());
  });
});
