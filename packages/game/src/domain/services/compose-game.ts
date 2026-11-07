import type { AddedDilemma, LobbyDilemma } from '../entities/room.ts';
import type { Randomness } from '../ports/randomness.port.ts';
import type { RoomSettingsVO } from '../vos/room-settings.vo.ts';
import { shuffle } from './random-choice.ts';

/** How a dilemma got into the game. */
export type DilemmaOrigin = 'added-by-a-player' | 'picked-by-the-host' | 'picked-by-the-system';

export interface ComposedDilemma {
  readonly dilemmaId: string;
  readonly origin: DilemmaOrigin;
}

/**
 * The exploration slots: how many dilemmas in exploration a game by category keeps room for, by
 * its number of dilemmas. Each row applies from its `fromDilemmaCount` on. The values are
 * settings, not rules of the game.
 */
export type ExplorationSlots = readonly {
  readonly fromDilemmaCount: number;
  readonly slots: number;
}[];

export interface ComposeGameInput {
  readonly settings: RoomSettingsVO;
  readonly pickedDilemmas: readonly LobbyDilemma[];
  readonly addedDilemmas: readonly AddedDilemma[];
  /** Dilemmas of the category of the room that suit it, in the general catalog and in exploration. */
  readonly candidates: {
    readonly inCatalog: readonly string[];
    readonly inExploration: readonly string[];
  };
  readonly explorationSlots: ExplorationSlots;
}

/**
 * Puts the dilemmas of a game together, in random order. With dilemmas picked by the host, the game
 * plays those and the ones the players added. Otherwise it fills the number of dilemmas of the
 * room: first what the players added, then the dilemmas in exploration it keeps room for, if the
 * room includes new dilemmas, and the rest from the catalog; when the catalog runs short, from
 * exploration.
 */
export function composeGame(input: ComposeGameInput, randomness: Randomness): ComposedDilemma[] {
  const composed: ComposedDilemma[] = [];
  const has = (dilemmaId: string): boolean =>
    composed.some((dilemma) => dilemma.dilemmaId === dilemmaId);
  const add = (dilemmaIds: readonly string[], origin: DilemmaOrigin, limit: number): void => {
    for (const dilemmaId of dilemmaIds) {
      if (composed.length >= limit) return;
      if (!has(dilemmaId)) composed.push({ dilemmaId, origin });
    }
  };
  const addedIds = input.addedDilemmas.map(({ dilemmaId }) => dilemmaId);

  if (input.pickedDilemmas.length > 0) {
    const picked = input.pickedDilemmas.map(({ dilemmaId }) => dilemmaId);
    add(picked, 'picked-by-the-host', Infinity);
    add(addedIds, 'added-by-a-player', Infinity);
    return shuffle(composed, randomness);
  }

  const count = input.settings.dilemmaCount;
  add(addedIds, 'added-by-a-player', count);
  const exploration = shuffle(input.candidates.inExploration, randomness);
  if (input.settings.newDilemmas) {
    const reserved = explorationSlotsFor(count, input.explorationSlots);
    add(exploration, 'picked-by-the-system', Math.min(count, composed.length + reserved));
  }
  add(shuffle(input.candidates.inCatalog, randomness), 'picked-by-the-system', count);
  if (input.settings.newDilemmas) add(exploration, 'picked-by-the-system', count);
  return shuffle(composed, randomness);
}

function explorationSlotsFor(count: number, table: ExplorationSlots): number {
  const rows = table.filter(({ fromDilemmaCount }) => fromDilemmaCount <= count);
  return rows.reduce(
    (found, row) => (row.fromDilemmaCount > found.fromDilemmaCount ? row : found),
    {
      fromDilemmaCount: 0,
      slots: 0,
    },
  ).slots;
}
