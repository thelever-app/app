import type { LobbyDilemma } from '../../domain/entities/room.ts';
import { DilemmaNotFoundError } from '../errors/dilemma-not-found.error.ts';
import type { DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';

/**
 * The dilemmas of the general catalog in the language of the dilemmas of the room with those ids,
 * in that order, with what the room checks; a dilemma that is not there is not found. Whether each
 * one suits the room is for the room to say, so it finds those for adults and the compromising ones.
 */
export async function findLobbyDilemmas(
  dilemmaCatalog: DilemmaCatalog,
  dilemmaLanguage: string,
  dilemmaIds: readonly string[],
): Promise<LobbyDilemma[]> {
  const found = await findRoundDilemmas(dilemmaCatalog, dilemmaLanguage, dilemmaIds);
  return dilemmaIds.map((dilemmaId) => {
    const dilemma = found.find((candidate) => candidate.dilemmaId === dilemmaId);
    if (!dilemma) throw new DilemmaNotFoundError(dilemmaId);
    return dilemma;
  });
}

/**
 * The same, for the dilemmas of the rounds when the settings change: only those the catalog has in
 * that language, since the room leaves the others out.
 */
export async function findRoundDilemmas(
  dilemmaCatalog: DilemmaCatalog,
  dilemmaLanguage: string,
  dilemmaIds: readonly string[],
): Promise<LobbyDilemma[]> {
  if (dilemmaIds.length === 0) return [];
  const { dilemmas: found } = await dilemmaCatalog.search(
    {
      dilemmaIds,
      maximumMinimumAge: 18,
      status: 'in-catalog',
      language: dilemmaLanguage,
      includeCompromising: true,
    },
    // One page with all of them: no more than were asked for.
    { size: dilemmaIds.length },
  );
  return found.map(({ dilemmaId, minimumAge, compromising }) => ({
    dilemmaId,
    minimumAge,
    compromising,
  }));
}
