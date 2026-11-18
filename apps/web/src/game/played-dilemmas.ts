import { MAXIMUM_PLAYED_DILEMMAS, type GameStateDto } from '@thelever-app/protocol';

/** Where the device keeps the dilemmas its player played, without how they voted. */
const KEY = 'thelever.playedDilemmas';

/** The storage of the device, read when it is needed: a browser that blocks it throws on reading it. */
type DeviceStorage = () => Pick<Storage, 'getItem' | 'setItem'>;

const deviceStorage: DeviceStorage = () => localStorage;

/**
 * The dilemmas the player of this device played, the latest last, which it sends on entering a
 * room so the games there put first what nobody played; none if the browser keeps nothing.
 */
export function playedDilemmas(storage: DeviceStorage = deviceStorage): string[] {
  try {
    const kept: unknown = JSON.parse(storage().getItem(KEY) ?? '[]');
    return Array.isArray(kept)
      ? kept.filter((dilemmaId): dilemmaId is string => typeof dilemmaId === 'string')
      : [];
  } catch {
    return [];
  }
}

/** The dilemmas of the game whose round the player played: not those revealed before they joined. */
export function playedIn(game: Pick<GameStateDto, 'dilemmas' | 'didNotVote'>): string[] {
  const beforeJoining = new Set(
    game.didNotVote.flatMap(({ dilemmaId, reason }) => (reason === 'joined-late' ? dilemmaId : [])),
  );
  return game.dilemmas.flatMap(({ dilemmaId }) => (beforeJoining.has(dilemmaId) ? [] : dilemmaId));
}

/**
 * Adds the dilemmas of a game that ended to the ones the device keeps, each once and the latest
 * last, up to as many as a room takes. A browser that keeps nothing loses them.
 */
export function rememberPlayed(
  dilemmaIds: readonly string[],
  storage: DeviceStorage = deviceStorage,
): void {
  const added = new Set(dilemmaIds);
  const kept = [...playedDilemmas(storage).filter((id) => !added.has(id)), ...added];
  try {
    storage().setItem(KEY, JSON.stringify(kept.slice(-MAXIMUM_PLAYED_DILEMMAS)));
  } catch {
    // Private mode, blocked or full storage: the next rooms may play them again, nothing else changes.
  }
}
