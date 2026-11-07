import type { LobbyDilemma, Room } from '../../domain/entities/room.ts';
import { DilemmaNotFoundError } from '../errors/dilemma-not-found.error.ts';
import type { DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';

/**
 * The dilemmas of the general catalog with those ids, in that order, with the minimum age the room
 * checks; a dilemma that is not there is not found.
 */
export async function findLobbyDilemmas(
  dilemmaCatalog: DilemmaCatalog,
  room: Room,
  dilemmaIds: readonly string[],
): Promise<LobbyDilemma[]> {
  if (dilemmaIds.length === 0) return [];
  const found = await dilemmaCatalog.search({
    dilemmaIds,
    maximumMinimumAge: 18,
    status: 'in-catalog',
    language: room.settings.dilemmaLanguage,
  });
  return dilemmaIds.map((dilemmaId) => {
    const dilemma = found.find((candidate) => candidate.dilemmaId === dilemmaId);
    if (!dilemma) throw new DilemmaNotFoundError(dilemmaId);
    return { dilemmaId, minimumAge: dilemma.minimumAge };
  });
}
